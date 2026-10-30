import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { OrderFulfillmentStatus, UserRole } from '../../config/constants';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../utils/errors';
import { sendResponse } from '../../utils/response';
import { Order } from '../orders/order.model';
import { Product } from '../products/product.model';
import { Review } from './review.model';

const recalculateProductRating = async (productId: mongoose.Types.ObjectId) => {
  const stats = await Review.aggregate([
    { $match: { product: productId, isApproved: true } },
    {
      $group: {
        _id: '$product',
        avgRating: { $avg: '$rating' },
        numReviews: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      ratingsAverage: Math.round(stats[0].avgRating * 10) / 10,
      ratingsCount: stats[0].numReviews,
    });
  } else {
    await Product.findByIdAndUpdate(productId, {
      ratingsAverage: 0,
      ratingsCount: 0,
    });
  }
};

export const getProductReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));

    const total = await Review.countDocuments({ product: productId, isApproved: true });
    const reviews = await Review.find({ product: productId, isApproved: true })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Rating star distribution
    const distributionRaw = await Review.aggregate([
      { $match: { product: new mongoose.Types.ObjectId(productId), isApproved: true } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
    ]);

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    distributionRaw.forEach((d) => {
      if (d._id >= 1 && d._id <= 5) {
        distribution[d._id] = d.count;
      }
    });

    return sendResponse({
      res,
      data: {
        reviews,
        distribution,
        total,
      },
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

export const getMyReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!._id;
    const reviews = await Review.find({ user: userId }).lean();
    return sendResponse({
      res,
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
};

export const createReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const { productId } = req.params;
    const { rating, title, comment, orderId } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      throw new BadRequestError('Rating must be an integer between 1 and 5');
    }

    if (!comment || comment.trim().length === 0) {
      throw new BadRequestError('Review comment cannot be empty');
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    // Verify user has purchased this product and order was DELIVERED
    const query: any = {
      user: user._id,
      'items.productId': product._id,
      fulfillmentStatus: OrderFulfillmentStatus.DELIVERED,
    };
    if (orderId) {
      query._id = orderId;
    }

    const verifiedOrder = await Order.findOne(query);
    if (!verifiedOrder) {
      throw new BadRequestError(
        'You can only review products from orders that have been successfully delivered to you.'
      );
    }

    // Check if user already reviewed this product
    let review = await Review.findOne({ product: product._id, user: user._id });

    if (review) {
      review.rating = rating;
      review.title = title || '';
      review.comment = comment;
      review.order = verifiedOrder._id as any;
      review.isVerifiedPurchase = true;
      await review.save();
    } else {
      review = await Review.create({
        product: product._id,
        user: user._id,
        order: verifiedOrder._id,
        userName: user.name,
        rating,
        title: title || '',
        comment,
        isVerifiedPurchase: true,
        isApproved: true,
      });
    }

    await recalculateProductRating(product._id);

    return sendResponse({
      res,
      statusCode: 201,
      message: 'Review submitted successfully',
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const review = await Review.findById(id);
    if (!review) {
      throw new NotFoundError('Review not found');
    }

    // Customer can only delete their own review; Admin can delete any
    if (
      user.role === UserRole.CUSTOMER &&
      review.user.toString() !== user._id.toString()
    ) {
      throw new ForbiddenError('You can only delete your own review');
    }

    const productId = review.product;
    await Review.findByIdAndDelete(id);

    await recalculateProductRating(productId);

    return sendResponse({
      res,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
