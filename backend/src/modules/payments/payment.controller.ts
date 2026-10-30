import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import {
  OrderFulfillmentStatus,
  PaymentStatus,
} from '../../config/constants';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { razorpayClient } from '../../config/razorpay';
import { BadRequestError, NotFoundError } from '../../utils/errors';
import { sendResponse } from '../../utils/response';
import { logAuditEvent } from '../audit/audit.model';
import { CheckoutService } from '../checkout/checkout.service';
import { Coupon, CouponRedemption } from '../coupons/coupon.model';
import { Order } from '../orders/order.model';
import { Payment } from './payment.model';

export const verifyRazorpayPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw new BadRequestError('Missing required payment verification parameters');
    }

    const order = await Order.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // If order already paid, return idempotent response
    if (order.paymentStatus === PaymentStatus.PAID) {
      return sendResponse({
        res,
        message: 'Payment already verified and captured',
        data: order,
      });
    }

    // Cryptographic signature verification
    const body = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    const isSignatureValid =
      Buffer.byteLength(expectedSignature) === Buffer.byteLength(razorpaySignature) &&
      crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(razorpaySignature)
      );

    const payment = await Payment.findOne({ orderId: order._id });

    if (!isSignatureValid) {
      if (payment) {
        payment.status = PaymentStatus.FAILED;
        await payment.save();
      }

      order.paymentStatus = PaymentStatus.FAILED;
      order.fulfillmentStatus = OrderFulfillmentStatus.CANCELLED;
      await order.save();

      // Release reserved stock
      await CheckoutService.releaseInventory(
        order.items.map((i) => ({
          productId: i.productId.toString(),
          variantSku: i.variantSku,
          quantity: i.quantity,
        })),
        order.orderNumber,
        order.user
      );

      throw new BadRequestError('Payment signature verification failed. Payment was rejected.');
    }

    // Signature is valid!
    if (payment) {
      payment.status = PaymentStatus.PAID;
      payment.providerPaymentId = razorpayPaymentId;
      payment.providerSignature = razorpaySignature;
      await payment.save();
    }

    order.paymentStatus = PaymentStatus.PAID;
    order.fulfillmentStatus = OrderFulfillmentStatus.CONFIRMED;
    await order.save();

    // Commit inventory
    await CheckoutService.commitInventory(
      order.items.map((i) => ({
        productId: i.productId,
        variantSku: i.variantSku,
        quantity: i.quantity,
      })),
      order.orderNumber,
      order.user
    );

    // If coupon was applied, record redemption and increment timesUsed atomically
    if (order.pricing.couponCode) {
      const coupon = await Coupon.findOne({ code: order.pricing.couponCode });
      if (coupon) {
        await Coupon.updateOne({ _id: coupon._id }, { $inc: { timesUsed: 1 } });
        await CouponRedemption.create({
          couponId: coupon._id,
          couponCode: coupon.code,
          userId: order.user,
          orderId: order._id,
          discountApplied: order.pricing.discountTotal,
        });
      }
    }

    return sendResponse({
      res,
      message: 'Payment verified successfully! Order confirmed.',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
        fulfillmentStatus: order.fulfillmentStatus,
        grandTotal: order.pricing.grandTotal,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const handleRazorpayWebhook = async (
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    if (env.RAZORPAY_WEBHOOK_SECRET && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');

      if (signature !== expectedSignature) {
        logger.warn('Razorpay webhook signature verification failed');
        return res.status(400).json({ error: 'Invalid webhook signature' });
      }
    }

    const event = req.body.event;
    const payload = req.body.payload;

    logger.info(`Received Razorpay webhook event: ${event}`);

    if (event === 'payment.captured') {
      const paymentEntity = payload.payment.entity;
      const razorpayOrderId = paymentEntity.order_id;
      const razorpayPaymentId = paymentEntity.id;

      const payment = await Payment.findOne({ providerOrderId: razorpayOrderId });
      if (payment && payment.status !== PaymentStatus.PAID) {
        payment.status = PaymentStatus.PAID;
        payment.providerPaymentId = razorpayPaymentId;
        payment.webhookEvents.push(req.body.id || `evt_${Date.now()}`);
        await payment.save();

        const order = await Order.findById(payment.orderId);
        if (order && order.paymentStatus !== PaymentStatus.PAID) {
          order.paymentStatus = PaymentStatus.PAID;
          order.fulfillmentStatus = OrderFulfillmentStatus.CONFIRMED;
          await order.save();

          await CheckoutService.commitInventory(
            order.items.map((i) => ({
              productId: i.productId,
              variantSku: i.variantSku,
              quantity: i.quantity,
            })),
            order.orderNumber,
            order.user
          );
        }
      }
    } else if (event === 'payment.failed') {
      const paymentEntity = payload.payment.entity;
      const razorpayOrderId = paymentEntity.order_id;

      const payment = await Payment.findOne({ providerOrderId: razorpayOrderId });
      if (payment && payment.status === PaymentStatus.PENDING) {
        payment.status = PaymentStatus.FAILED;
        payment.webhookEvents.push(req.body.id || `evt_${Date.now()}`);
        await payment.save();

        const order = await Order.findById(payment.orderId);
        if (order && order.paymentStatus === PaymentStatus.PENDING) {
          order.paymentStatus = PaymentStatus.FAILED;
          order.fulfillmentStatus = OrderFulfillmentStatus.CANCELLED;
          await order.save();

          await CheckoutService.releaseInventory(
            order.items.map((i) => ({
              productId: i.productId.toString(),
              variantSku: i.variantSku,
              quantity: i.quantity,
            })),
            order.orderNumber,
            order.user
          );
        }
      }
    }

    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    logger.error('Error handling Razorpay webhook:', error);
    return res.status(500).json({ error: 'Webhook processing error' });
  }
};

export const executeOrderRefund = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { orderId } = req.params;
    const { amount, reason } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (order.paymentStatus !== PaymentStatus.PAID) {
      throw new BadRequestError('Only captured/paid orders can be refunded');
    }

    const payment = await Payment.findOne({ orderId: order._id, status: PaymentStatus.PAID });
    if (!payment || !payment.providerPaymentId) {
      throw new BadRequestError('No captured payment found for this order');
    }

    const refundAmountPaise = Math.round((amount || order.pricing.grandTotal) * 100);
    if (refundAmountPaise > payment.amount) {
      throw new BadRequestError('Refund amount cannot exceed captured order amount');
    }

    let rzpRefund;
    try {
      rzpRefund = await razorpayClient.payments.refund(payment.providerPaymentId, {
        amount: refundAmountPaise,
        notes: {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          reason: reason || 'Customer return / refund',
        },
      });
    } catch (rzpErr: any) {
      throw new BadRequestError(`Razorpay refund failed: ${rzpErr.message || rzpErr}`);
    }

    payment.refunds.push({
      providerRefundId: rzpRefund.id,
      amount: refundAmountPaise,
      status: rzpRefund.status || 'processed',
      reason,
      createdAt: new Date(),
    });

    const isFullRefund = refundAmountPaise >= payment.amount;
    payment.status = isFullRefund ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED;
    await payment.save();

    order.paymentStatus = payment.status;
    await order.save();

    await logAuditEvent({
      userId: req.user!._id,
      userEmail: req.user!.email,
      userRole: req.user!.role,
      action: 'REFUND_EXECUTED',
      resource: 'Order',
      resourceId: order._id.toString(),
      newState: {
        refundId: rzpRefund.id,
        amount: refundAmountPaise / 100,
        paymentStatus: order.paymentStatus,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return sendResponse({
      res,
      message: 'Refund executed successfully via Razorpay',
      data: {
        refundId: rzpRefund.id,
        amount: refundAmountPaise / 100,
        status: payment.status,
      },
    });
  } catch (error) {
    next(error);
  }
};
