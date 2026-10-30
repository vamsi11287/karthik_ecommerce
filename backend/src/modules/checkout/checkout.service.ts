import crypto from 'crypto';
import mongoose from 'mongoose';
import {
  InventoryTransactionType,
  OrderFulfillmentStatus,
  PaymentMethod,
  PaymentStatus,
} from '../../config/constants';
import { BadRequestError } from '../../utils/errors';
import { Coupon, CouponRedemption, DiscountType } from '../coupons/coupon.model';
import { InventoryTransaction } from '../inventory/inventoryTransaction.model';
import { IOrderAddress, Order } from '../orders/order.model';
import { Payment } from '../payments/payment.model';
import { Product } from '../products/product.model';
import { getStoreSettings } from '../settings/storeSettings.model';

export interface CheckoutItemInput {
  productId: string;
  variantSku: string;
  quantity: number;
}

export interface CheckoutCalculationResult {
  items: Array<{
    productId: mongoose.Types.ObjectId;
    variantSku: string;
    name: string;
    image: string;
    price: number;
    quantity: number;
    subtotal: number;
  }>;
  subtotal: number;
  discountTotal: number;
  couponCode?: string;
  shippingFee: number;
  taxTotal: number;
  grandTotal: number;
}

export class CheckoutService {
  /**
   * Authoritative server-side price, coupon, shipping, and tax calculation
   */
  public static async calculateTotals(
    items: CheckoutItemInput[],
    couponCode?: string,
    paymentMethod: PaymentMethod = PaymentMethod.RAZORPAY,
    userId?: mongoose.Types.ObjectId
  ): Promise<CheckoutCalculationResult> {
    if (!items || items.length === 0) {
      throw new BadRequestError('Cannot checkout an empty item list');
    }

    const settings = await getStoreSettings();

    // Verify payment method is enabled in store settings
    if (paymentMethod === PaymentMethod.COD && !settings.paymentMethods.cod.enabled) {
      throw new BadRequestError('Cash on Delivery (COD) is currently disabled.');
    }

    if (
      paymentMethod === PaymentMethod.RAZORPAY &&
      !settings.paymentMethods.online.enabled
    ) {
      throw new BadRequestError('Online payment is currently disabled.');
    }

    const calculatedItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product || !product.isPublished) {
        throw new BadRequestError(`Product '${item.productId}' is not available`);
      }

      let price = product.sellingPrice;
      let availableStock = product.totalStock;

      if (product.hasVariants && product.variants.length > 0) {
        const variant = product.variants.find((v) => v.sku === item.variantSku);
        if (!variant) {
          throw new BadRequestError(`Variant '${item.variantSku}' does not exist for ${product.name}`);
        }
        price = variant.price;
        availableStock = variant.stock - variant.reservedStock;
      }

      if (availableStock < item.quantity) {
        throw new BadRequestError(
          `Insufficient stock for '${product.name}' (${item.variantSku}). Available: ${availableStock}, Requested: ${item.quantity}`
        );
      }

      const itemSubtotal = price * item.quantity;
      subtotal += itemSubtotal;

      calculatedItems.push({
        productId: product._id,
        variantSku: item.variantSku,
        name: product.name,
        image: product.images[0]?.url || '',
        price,
        quantity: item.quantity,
        subtotal: itemSubtotal,
      });
    }

    // Coupon calculation
    let discountTotal = 0;
    let validatedCouponCode: string | undefined = undefined;

    if (couponCode && userId) {
      const coupon = await Coupon.findOne({
        code: couponCode.toUpperCase().trim(),
        isActive: true,
      });

      if (coupon) {
        const now = new Date();
        const isValidDate = now >= coupon.startDate && now <= coupon.endDate;
        const meetsMinOrder = subtotal >= coupon.minOrderAmount;
        const withinTotalLimit = !coupon.usageLimitTotal || coupon.timesUsed < coupon.usageLimitTotal;

        let userLimitOk = true;
        if (userId) {
          const userCount = await CouponRedemption.countDocuments({
            couponId: coupon._id,
            userId,
          });
          if (userCount >= coupon.usageLimitPerCustomer) {
            userLimitOk = false;
          }
        }

        if (isValidDate && meetsMinOrder && withinTotalLimit && userLimitOk) {
          if (coupon.discountType === DiscountType.PERCENTAGE) {
            discountTotal = Math.round((subtotal * coupon.discountValue) / 100);
            if (coupon.maxDiscountAmount && discountTotal > coupon.maxDiscountAmount) {
              discountTotal = coupon.maxDiscountAmount;
            }
          } else {
            discountTotal = Math.min(coupon.discountValue, subtotal);
          }
          validatedCouponCode = coupon.code;
        }
      }
    }

    const netTaxableAmount = Math.max(0, subtotal - discountTotal);

    // Shipping fee calculation
    let shippingFee = 0;
    if (netTaxableAmount < settings.shippingPolicy.freeShippingThreshold) {
      shippingFee = settings.shippingPolicy.flatRate;
    }

    // Tax calculation
    const taxTotal = Math.round((netTaxableAmount * settings.taxRatePercent) / 100);

    const grandTotal = Math.max(0, netTaxableAmount + shippingFee + taxTotal);

    return {
      items: calculatedItems,
      subtotal,
      discountTotal,
      couponCode: validatedCouponCode,
      shippingFee,
      taxTotal,
      grandTotal,
    };
  }

  /**
   * Atomically reserve inventory stock during checkout attempt
   */
  public static async reserveInventory(
    items: CheckoutItemInput[],
    referenceId: string,
    userId?: mongoose.Types.ObjectId
  ): Promise<void> {
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        await this.releaseInventory(items, referenceId, userId);
        throw new BadRequestError(`Product ${item.productId} not found`);
      }

      let result;
      if (product.hasVariants && item.variantSku) {
        result = await Product.updateOne(
          {
            _id: item.productId,
            'variants.sku': item.variantSku,
            'variants.stock': { $gte: item.quantity },
          },
          {
            $inc: {
              'variants.$.stock': -item.quantity,
              'variants.$.reservedStock': item.quantity,
            },
          }
        );
      } else {
        result = await Product.updateOne(
          {
            _id: item.productId,
            totalStock: { $gte: item.quantity },
          },
          {
            $inc: {
              totalStock: -item.quantity,
            },
          }
        );
      }

      if (result.modifiedCount === 0) {
        // Rollback previous reservations
        await this.releaseInventory(items, referenceId, userId);
        throw new BadRequestError(
          `Unable to reserve stock for item ${item.variantSku || item.productId}. It may have just sold out.`
        );
      }

      await InventoryTransaction.create({
        productId: item.productId,
        variantSku: item.variantSku || product.sku,
        type: InventoryTransactionType.RESERVATION,
        quantity: item.quantity,
        previousStock: 0,
        newStock: 0,
        referenceId,
        reason: `Checkout reservation for Order ${referenceId}`,
        performedBy: userId,
      });
    }
  }

  /**
   * Release reserved inventory back to available stock
   */
  public static async releaseInventory(
    items: CheckoutItemInput[],
    referenceId: string,
    userId?: mongoose.Types.ObjectId
  ): Promise<void> {
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (product?.hasVariants && item.variantSku) {
        await Product.updateOne(
          {
            _id: item.productId,
            'variants.sku': item.variantSku,
            'variants.reservedStock': { $gte: item.quantity },
          },
          {
            $inc: {
              'variants.$.stock': item.quantity,
              'variants.$.reservedStock': -item.quantity,
            },
          }
        );
      } else if (product) {
        await Product.updateOne(
          { _id: item.productId },
          { $inc: { totalStock: item.quantity } }
        );
      }

      await InventoryTransaction.create({
        productId: item.productId,
        variantSku: item.variantSku || product?.sku,
        type: InventoryTransactionType.RELEASE,
        quantity: -item.quantity,
        previousStock: 0,
        newStock: 0,
        referenceId,
        reason: `Released reservation for Order ${referenceId}`,
        performedBy: userId,
      });
    }
  }

  /**
   * Commit reserved inventory upon payment confirmation
   */
  public static async commitInventory(
    items: Array<{ productId: any; variantSku: string; quantity: number }>,
    referenceId: string,
    userId?: mongoose.Types.ObjectId
  ): Promise<void> {
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (product?.hasVariants && item.variantSku) {
        await Product.updateOne(
          {
            _id: item.productId,
            'variants.sku': item.variantSku,
            'variants.reservedStock': { $gte: item.quantity },
          },
          {
            $inc: {
              'variants.$.reservedStock': -item.quantity,
              totalStock: -item.quantity,
            },
          }
        );
      }

      await InventoryTransaction.create({
        productId: item.productId,
        variantSku: item.variantSku || product?.sku,
        type: InventoryTransactionType.COMMIT,
        quantity: item.quantity,
        previousStock: 0,
        newStock: 0,
        referenceId,
        reason: `Committed inventory for confirmed Order ${referenceId}`,
        performedBy: userId,
      });
    }
  }

  /**
   * Sweeps and automatically releases abandoned 10-minute checkout reservations (Amazon/Flipkart model)
   */
  public static async cleanupExpiredReservations(): Promise<number> {
    const expiredOrders = await Order.find({
      paymentStatus: PaymentStatus.PENDING,
      fulfillmentStatus: OrderFulfillmentStatus.PENDING_PAYMENT,
      reservationExpiresAt: { $lt: new Date() },
    });

    for (const order of expiredOrders) {
      order.fulfillmentStatus = OrderFulfillmentStatus.CANCELLED;
      order.cancellationReason = '10-minute payment reservation expired';
      await order.save();

      await this.releaseInventory(
        order.items.map((i) => ({
          productId: i.productId.toString(),
          variantSku: i.variantSku,
          quantity: i.quantity,
        })),
        order.orderNumber,
        order.user
      );
    }

    return expiredOrders.length;
  }
}
