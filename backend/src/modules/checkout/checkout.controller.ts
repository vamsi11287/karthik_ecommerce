import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import {
  OrderFulfillmentStatus,
  PaymentMethod,
  PaymentStatus,
} from '../../config/constants';
import { env } from '../../config/env';
import { getRazorpayClient } from '../../config/razorpay';
import { BadRequestError } from '../../utils/errors';
import { sendResponse } from '../../utils/response';
import { Cart } from '../cart/cart.model';
import { Order } from '../orders/order.model';
import { Payment } from '../payments/payment.model';
import { CheckoutService } from './checkout.service';
import { sendOrderConfirmationEmail } from '../../utils/mailer';

export const getCheckoutQuote = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { items, couponCode, paymentMethod: rawPaymentMethod } = req.body;
    const userId = req.user?._id;
    const paymentMethod =
      rawPaymentMethod === 'ONLINE' ? PaymentMethod.RAZORPAY : rawPaymentMethod || PaymentMethod.RAZORPAY;

    const calculation = await CheckoutService.calculateTotals(
      items,
      couponCode,
      paymentMethod,
      userId
    );

    return sendResponse({
      res,
      data: calculation,
    });
  } catch (error) {
    next(error);
  }
};

export const initiateCheckout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const { items, couponCode, paymentMethod: rawPaymentMethod } = req.body;
    const paymentMethod =
      rawPaymentMethod === 'ONLINE' ? PaymentMethod.RAZORPAY : rawPaymentMethod || PaymentMethod.RAZORPAY;

    const rawAddress = req.body.shippingAddress;
    if (!rawAddress) {
      throw new BadRequestError('Shipping address is required');
    }

    const requiredAddressFields: Array<keyof typeof rawAddress> = ['fullName', 'phone', 'city', 'state', 'postalCode'];
    const missingFields = requiredAddressFields.filter(
      (f) => !rawAddress[f] || !String(rawAddress[f]).trim()
    );
    if (missingFields.length > 0) {
      throw new BadRequestError(`Shipping address is missing required fields: ${missingFields.join(', ')}`);
    }

    const street =
      rawAddress.street ||
      [rawAddress.addressLine1, rawAddress.addressLine2].filter(Boolean).join(', ') ||
      rawAddress.addressLine1 ||
      '';

    const shippingAddress = {
      fullName: rawAddress.fullName.trim(),
      phone: rawAddress.phone.trim(),
      street,
      addressLine1: rawAddress.addressLine1 || street,
      addressLine2: rawAddress.addressLine2 || '',
      city: rawAddress.city.trim(),
      state: rawAddress.state.trim(),
      postalCode: (rawAddress.postalCode || rawAddress.pincode || rawAddress.zipCode).trim(),
      country: rawAddress.country || 'India',
    };

    // 1. Calculate authoritative totals
    const calculation = await CheckoutService.calculateTotals(
      items,
      couponCode,
      paymentMethod,
      user._id
    );

    // 2. Generate unique human-readable order number
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.floor(
      1000 + Math.random() * 9000
    )}`;

    // 3. Atomically reserve inventory
    await CheckoutService.reserveInventory(items, orderNumber, user._id);

    try {
      // 4. Create internal Order record
      const order = await Order.create({
        orderNumber,
        user: user._id,
        items: calculation.items,
        shippingAddress,
        pricing: {
          subtotal: calculation.subtotal,
          discountTotal: calculation.discountTotal,
          couponCode: calculation.couponCode,
          shippingFee: calculation.shippingFee,
          taxTotal: calculation.taxTotal,
          grandTotal: calculation.grandTotal,
        },
        paymentMethod,
        paymentStatus: PaymentStatus.PENDING,
        fulfillmentStatus:
          paymentMethod === PaymentMethod.COD
            ? OrderFulfillmentStatus.CONFIRMED
            : OrderFulfillmentStatus.PENDING_PAYMENT,
        reservationExpiresAt:
          paymentMethod === PaymentMethod.RAZORPAY
            ? new Date(Date.now() + 10 * 60 * 1000)
            : undefined,
      });

      // 5. If Online Payment (Razorpay)
      if (paymentMethod === PaymentMethod.RAZORPAY) {
        const amountInPaise = Math.round(calculation.grandTotal * 100);

        let rzpOrder: any;
        const rzp = getRazorpayClient();
        const activeKeyId = process.env.RAZORPAY_KEY_ID || env.RAZORPAY_KEY_ID;

        try {
          rzpOrder = await rzp.orders.create({
            amount: amountInPaise,
            currency: 'INR',
            receipt: orderNumber,
            notes: {
              orderId: order._id.toString(),
              orderNumber: order.orderNumber,
              userId: user._id.toString(),
            },
          });
        } catch (rzpErr: any) {
          const errorDetail =
            rzpErr.error?.description ||
            rzpErr.description ||
            rzpErr.message ||
            (typeof rzpErr === 'object' ? JSON.stringify(rzpErr) : String(rzpErr));

          // If Razorpay API fails, release reserved inventory and delete pending order
          await CheckoutService.releaseInventory(items, orderNumber, user._id);
          await Order.findByIdAndDelete(order._id);
          throw new BadRequestError(
            `Razorpay order creation failed (${errorDetail}). Please verify your RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env.`
          );
        }

        const paymentAttemptId = `ATT-${crypto.randomBytes(8).toString('hex')}`;
        await Payment.create({
          orderId: order._id,
          paymentAttemptId,
          provider: 'RAZORPAY',
          providerOrderId: rzpOrder.id,
          amount: amountInPaise,
          currency: 'INR',
          status: PaymentStatus.PENDING,
        });

        // Clear user's cart
        await Cart.findOneAndUpdate({ user: user._id }, { items: [] });

        return sendResponse({
          res,
          statusCode: 201,
          message: 'Checkout initiated. Ready for Razorpay payment.',
          data: {
            order: {
              _id: order._id,
              orderNumber: order.orderNumber,
              fulfillmentStatus: order.fulfillmentStatus,
              paymentMethod: order.paymentMethod,
              grandTotal: order.pricing.grandTotal,
              reservationExpiresAt: order.reservationExpiresAt,
            },
            razorpay: {
              orderId: rzpOrder.id,
              amount: amountInPaise,
              currency: 'INR',
              keyId: activeKeyId,
            },
            customer: {
              name: user.name,
              email: user.email,
              phone: user.phone || shippingAddress.phone,
            },
          },
        });
      }

      // 6. If Cash on Delivery (COD)
      if (paymentMethod === PaymentMethod.COD) {
        // Commit inventory directly
        await CheckoutService.commitInventory(calculation.items, orderNumber, user._id);

        // Clear user's cart
        await Cart.findOneAndUpdate({ user: user._id }, { items: [] });

        // Trigger Order Confirmation Email
        sendOrderConfirmationEmail(user.email, user.name, order).catch(() => {});

        return sendResponse({
          res,
          statusCode: 201,
          message: 'Order placed successfully with Cash on Delivery.',
          data: {
            order: {
              _id: order._id,
              orderNumber: order.orderNumber,
              fulfillmentStatus: order.fulfillmentStatus,
              paymentMethod: order.paymentMethod,
              grandTotal: order.pricing.grandTotal,
            },
          },
        });
      }
    } catch (error) {
      // Release inventory on unexpected failure
      await CheckoutService.releaseInventory(items, orderNumber, user._id);
      throw error;
    }
  } catch (error) {
    next(error);
  }
};
