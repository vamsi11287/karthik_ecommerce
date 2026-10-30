import { NextFunction, Request, Response } from 'express';
import { BadRequestError, ConflictError, NotFoundError } from '../../utils/errors';
import { sendResponse } from '../../utils/response';
import { Coupon, CouponRedemption, DiscountType } from './coupon.model';

export const validateCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, cartAmount, cartTotal } = req.body;
    const amount = Number(cartAmount !== undefined ? cartAmount : cartTotal) || 0;
    const userId = req.user?._id;

    if (!code) {
      throw new BadRequestError('Coupon code is required');
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (!coupon) {
      throw new NotFoundError('Invalid coupon code');
    }

    if (!coupon.isActive) {
      throw new BadRequestError('This coupon is no longer active');
    }

    const now = new Date();
    if (now < coupon.startDate) {
      throw new BadRequestError('This coupon promotion has not started yet');
    }

    if (now > coupon.endDate) {
      throw new BadRequestError('This coupon has expired');
    }

    if (coupon.usageLimitTotal && coupon.timesUsed >= coupon.usageLimitTotal) {
      throw new BadRequestError('This coupon has reached its maximum usage limit');
    }

    if (amount < coupon.minOrderAmount) {
      throw new BadRequestError(
        `Minimum order amount of ₹${coupon.minOrderAmount} required for this coupon`
      );
    }

    // Check user-specific usage limit if logged in
    if (userId) {
      const userRedemptions = await CouponRedemption.countDocuments({
        couponId: coupon._id,
        userId,
      });

      if (userRedemptions >= coupon.usageLimitPerCustomer) {
        throw new BadRequestError('You have already redeemed this coupon the maximum allowed times');
      }
    }

    // Calculate discount amount
    let discount = 0;
    if (coupon.discountType === DiscountType.PERCENTAGE) {
      discount = Math.round((amount * coupon.discountValue) / 100);
      if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
        discount = coupon.maxDiscountAmount;
      }
    } else {
      discount = Math.min(coupon.discountValue, amount);
    }

    return sendResponse({
      res,
      message: 'Coupon applied successfully',
      data: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minOrderAmount: coupon.minOrderAmount || 0,
        maxDiscountAmount: coupon.maxDiscountAmount,
        discountAmount: discount,
        finalAmount: Math.max(0, amount - discount),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const listCoupons = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    return sendResponse({
      res,
      data: coupons,
    });
  } catch (error) {
    next(error);
  }
};

export const createCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscountAmount,
      startDate,
      endDate,
      usageLimitTotal,
      usageLimitPerCustomer,
      isActive,
    } = req.body;

    const normalizedCode = code.toUpperCase().trim();
    const existing = await Coupon.findOne({ code: normalizedCode });
    if (existing) {
      throw new ConflictError('A coupon with this code already exists');
    }

    const coupon = await Coupon.create({
      code: normalizedCode,
      description,
      discountType,
      discountValue,
      minOrderAmount: minOrderAmount || 0,
      maxDiscountAmount,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      usageLimitTotal,
      usageLimitPerCustomer: usageLimitPerCustomer || 1,
      isActive: isActive !== undefined ? isActive : true,
    });

    return sendResponse({
      res,
      statusCode: 201,
      message: 'Coupon created successfully',
      data: coupon,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findById(id);

    if (!coupon) {
      throw new NotFoundError('Coupon not found');
    }

    Object.assign(coupon, req.body);
    if (req.body.code) coupon.code = req.body.code.toUpperCase().trim();
    if (req.body.startDate) coupon.startDate = new Date(req.body.startDate);
    if (req.body.endDate) coupon.endDate = new Date(req.body.endDate);

    await coupon.save();

    return sendResponse({
      res,
      message: 'Coupon updated successfully',
      data: coupon,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findByIdAndDelete(id);

    if (!coupon) {
      throw new NotFoundError('Coupon not found');
    }

    return sendResponse({
      res,
      message: 'Coupon deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
