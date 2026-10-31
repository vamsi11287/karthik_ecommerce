import { NextFunction, Request, Response } from 'express';
import {
  OrderFulfillmentStatus,
  PermissionKey,
  ReturnStatus,
  UserRole,
} from '../../config/constants';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../utils/errors';
import { sendResponse } from '../../utils/response';
import { logAuditEvent } from '../audit/audit.model';
import { CheckoutService } from '../checkout/checkout.service';
import { getStoreSettings } from '../settings/storeSettings.model';
import { Order } from './order.model';
import { User } from '../users/user.model';
import { sendOrderDeliveredEmail, sendOrderReturnStatusEmail } from '../../utils/mailer';

export const getMyOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));

    const total = await Order.countDocuments({ user: req.user!._id });
    const orders = await Order.find({ user: req.user!._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return sendResponse({
      res,
      data: orders,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const order = await Order.findById(id).populate('user', 'name email phone');
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Ownership check: Customer can only view their own order
    if (
      user.role === UserRole.CUSTOMER &&
      order.user._id.toString() !== user._id.toString()
    ) {
      throw new ForbiddenError('You are not authorized to view this order');
    }

    return sendResponse({
      res,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const user = req.user!;

    const order = await Order.findById(id);
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (
      user.role === UserRole.CUSTOMER &&
      order.user.toString() !== user._id.toString()
    ) {
      throw new ForbiddenError('You cannot cancel this order');
    }

    // Only orders in PENDING_PAYMENT or CONFIRMED can be cancelled directly by customer
    const cancellableStatuses = [
      OrderFulfillmentStatus.PENDING_PAYMENT,
      OrderFulfillmentStatus.CONFIRMED,
    ];

    if (!cancellableStatuses.includes(order.fulfillmentStatus)) {
      throw new BadRequestError(
        `Order cannot be cancelled as it is already '${order.fulfillmentStatus}'`
      );
    }

    order.fulfillmentStatus = OrderFulfillmentStatus.CANCELLED;
    order.cancellationReason = reason || 'Customer requested cancellation';
    await order.save();

    // Release stock
    await CheckoutService.releaseInventory(
      order.items.map((i) => ({
        productId: i.productId.toString(),
        variantSku: i.variantSku,
        quantity: i.quantity,
      })),
      order.orderNumber,
      user._id
    );

    return sendResponse({
      res,
      message: 'Order cancelled successfully. Stock released.',
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

export const requestReturn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason, items } = req.body;
    const user = req.user!;

    const order = await Order.findById(id);
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (order.user.toString() !== user._id.toString()) {
      throw new ForbiddenError('You cannot request a return for this order');
    }

    if (order.fulfillmentStatus !== OrderFulfillmentStatus.DELIVERED) {
      throw new BadRequestError('Only delivered orders are eligible for return');
    }

    const settings = await getStoreSettings();
    if (!settings.returnPolicy.allowReturns) {
      throw new BadRequestError('Returns are currently disabled by store policy');
    }

    // Check return window
    const deliveredAt = order.shippingDetails?.deliveredAt || order.updatedAt;
    const daysSinceDelivery = Math.floor(
      (Date.now() - new Date(deliveredAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceDelivery > settings.returnPolicy.returnWindowDays) {
      throw new BadRequestError(
        `The ${settings.returnPolicy.returnWindowDays}-day return window for this order has expired`
      );
    }

    let returnItemsList: any[] = [];
    if (Array.isArray(items) && items.length > 0) {
      items.forEach((itemToReturn: any) => {
        const skuToMatch = typeof itemToReturn === 'string' ? itemToReturn : (itemToReturn.variantSku || itemToReturn.sku);
        const matched = order.items.find(
          (oi) => oi.variantSku === skuToMatch || (itemToReturn.productId && oi.productId?.toString() === itemToReturn.productId)
        );
        if (matched) {
          returnItemsList.push({
            productId: matched.productId,
            variantSku: matched.variantSku,
            name: matched.name,
            image: matched.image,
            price: matched.price,
            quantity:
              typeof itemToReturn === 'object' && itemToReturn.quantity
                ? Math.min(itemToReturn.quantity, matched.quantity)
                : matched.quantity,
          });
        }
      });
    }

    // Fallback: If no items specified, take all items from the order
    if (returnItemsList.length === 0) {
      returnItemsList = order.items.map((oi) => ({
        productId: oi.productId,
        variantSku: oi.variantSku,
        name: oi.name,
        image: oi.image,
        price: oi.price,
        quantity: oi.quantity,
      }));
    }

    order.returnStatus = ReturnStatus.REQUESTED;
    order.returnReason = reason || 'Item return requested by customer';
    order.returnedItems = returnItemsList;
    await order.save();

    return sendResponse({
      res,
      message: 'Return request submitted successfully. Awaiting admin review.',
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

export const listAdminOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 15));
    const status = req.query.status as string;
    const search = (req.query.search as string)?.trim();

    const query: any = {};
    if (status && status !== 'all') {
      query.fulfillmentStatus = status;
    }

    if (search) {
      query.orderNumber = { $regex: search, $options: 'i' };
    }

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return sendResponse({
      res,
      data: orders,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateFulfillmentStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { trackingNumber, courierName, trackingUrl } = req.body;
    const status = req.body.status || req.body.fulfillmentStatus;

    if (!status) {
      throw new BadRequestError('Fulfillment status is required');
    }

    const order = await Order.findById(id);
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    const previousStatus = order.fulfillmentStatus;
    order.fulfillmentStatus = status;

    if (trackingNumber) order.shippingDetails.trackingNumber = trackingNumber;
    if (courierName) order.shippingDetails.courierName = courierName;
    if (trackingUrl) order.shippingDetails.trackingUrl = trackingUrl;

    if (status === OrderFulfillmentStatus.SHIPPING && !order.shippingDetails.shippedAt) {
      order.shippingDetails.shippedAt = new Date();
    } else if (status === OrderFulfillmentStatus.DELIVERED && !order.shippingDetails.deliveredAt) {
      order.shippingDetails.deliveredAt = new Date();
    }

    await order.save();

    // Trigger Order Delivered Email if marked DELIVERED
    if (status === OrderFulfillmentStatus.DELIVERED) {
      User.findById(order.user)
        .then((customerUser) => {
          if (customerUser) {
            sendOrderDeliveredEmail(customerUser.email, customerUser.name, order).catch(() => {});
          }
        })
        .catch(() => {});
    }

    await logAuditEvent({
      userId: req.user!._id,
      userEmail: req.user!.email,
      userRole: req.user!.role,
      action: 'ORDER_FULFILLMENT_UPDATED',
      resource: 'Order',
      resourceId: order._id.toString(),
      previousState: { fulfillmentStatus: previousStatus },
      newState: { fulfillmentStatus: status, shippingDetails: order.shippingDetails },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return sendResponse({
      res,
      message: `Order status updated to '${status}'`,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

export const reviewReturnRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { decision } = req.body; // 'APPROVE' | 'REJECT' | 'COMPLETE'

    const order = await Order.findById(id);
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (decision === 'APPROVE') {
      order.returnStatus = ReturnStatus.APPROVED;
    } else if (decision === 'REJECT') {
      order.returnStatus = ReturnStatus.REJECTED;
    } else if (decision === 'COMPLETE') {
      order.returnStatus = ReturnStatus.COMPLETED;
      if (!order.returnRestocked) {
        const itemsToRestock = (order.returnedItems && order.returnedItems.length > 0
          ? order.returnedItems
          : order.items
        ).map((i: any) => ({
          productId: i.productId.toString(),
          variantSku: i.variantSku,
          quantity: i.quantity,
        }));

        await CheckoutService.releaseInventory(
          itemsToRestock,
          `RET-${order.orderNumber}`,
          req.user!._id
        );
        order.returnRestocked = true;
      }
    } else {
      throw new BadRequestError("Invalid decision. Must be 'APPROVE', 'REJECT', or 'COMPLETE'");
    }

    await order.save();

    // Trigger Return Status Email
    User.findById(order.user)
      .then((customerUser) => {
        if (customerUser) {
          sendOrderReturnStatusEmail(customerUser.email, customerUser.name, order, decision as any).catch(() => {});
        }
      })
      .catch(() => {});

    await logAuditEvent({
      userId: req.user!._id,
      userEmail: req.user!.email,
      userRole: req.user!.role,
      action: 'RETURN_REQUEST_REVIEWED',
      resource: 'Order',
      resourceId: order._id.toString(),
      newState: { returnStatus: order.returnStatus, decision },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return sendResponse({
      res,
      message: `Return request marked as '${order.returnStatus}'`,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};
