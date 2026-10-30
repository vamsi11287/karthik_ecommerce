import { NextFunction, Request, Response } from 'express';
import {
  OrderFulfillmentStatus,
  PaymentStatus,
  ReturnStatus,
  UserRole,
} from '../../config/constants';
import { sendResponse } from '../../utils/response';
import { Order } from '../orders/order.model';
import { Product } from '../products/product.model';
import { User } from '../users/user.model';

export const getDashboardMetrics = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Orders today
    const ordersTodayCount = await Order.countDocuments({
      createdAt: { $gte: startOfToday },
    });

    // Orders awaiting fulfillment
    const pendingFulfillmentCount = await Order.countDocuments({
      fulfillmentStatus: {
        $in: [
          OrderFulfillmentStatus.CONFIRMED,
          OrderFulfillmentStatus.PACKING,
          OrderFulfillmentStatus.SHIPPING,
        ],
      },
    });

    // Delivered orders
    const deliveredCount = await Order.countDocuments({
      fulfillmentStatus: OrderFulfillmentStatus.DELIVERED,
    });

    // Pending returns
    const pendingReturnsCount = await Order.countDocuments({
      returnStatus: ReturnStatus.REQUESTED,
    });

    // Total active customers
    const totalCustomersCount = await User.countDocuments({
      role: UserRole.CUSTOMER,
      isActive: true,
    });

    // Low stock items (< 5)
    const lowStockCount = await Product.countDocuments({
      isPublished: true,
      totalStock: { $lte: 5 },
    });

    // Financial totals (Captured / Paid orders)
    const financialStats = await Order.aggregate([
      { $match: { paymentStatus: { $in: [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED] } } },
      {
        $group: {
          _id: null,
          grossSales: { $sum: '$pricing.grandTotal' },
          discounts: { $sum: '$pricing.discountTotal' },
          orderCount: { $sum: 1 },
        },
      },
    ]);

    const grossSales = financialStats[0]?.grossSales || 0;
    const totalDiscounts = financialStats[0]?.discounts || 0;

    // Refunds total
    const refundStats = await Order.aggregate([
      { $match: { paymentStatus: { $in: [PaymentStatus.REFUNDED, PaymentStatus.PARTIALLY_REFUNDED] } } },
      {
        $group: {
          _id: null,
          totalRefunds: { $sum: '$pricing.grandTotal' },
        },
      },
    ]);

    const totalRefunds = refundStats[0]?.totalRefunds || 0;
    const netSales = Math.max(0, grossSales - totalRefunds);

    // Recent orders
    const recentOrders = await Order.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(6);

    // Top selling products
    const topProducts = await Order.aggregate([
      { $match: { paymentStatus: PaymentStatus.PAID } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          name: { $first: '$items.name' },
          image: { $first: '$items.image' },
          totalUnitsSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' },
        },
      },
      { $sort: { totalUnitsSold: -1 } },
      { $limit: 5 },
    ]);

    return sendResponse({
      res,
      data: {
        metrics: {
          ordersToday: ordersTodayCount,
          pendingFulfillment: pendingFulfillmentCount,
          deliveredOrders: deliveredCount,
          pendingReturns: pendingReturnsCount,
          totalCustomers: totalCustomersCount,
          lowStockCount,
          grossSales,
          totalDiscounts,
          totalRefunds,
          netSales,
        },
        topProducts,
        recentOrders,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getSalesReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const salesTimeline = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          paymentStatus: { $in: [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED] },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          revenue: { $sum: '$pricing.grandTotal' },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return sendResponse({
      res,
      data: salesTimeline,
    });
  } catch (error) {
    next(error);
  }
};
