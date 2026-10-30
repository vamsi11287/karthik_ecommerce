import mongoose, { Document, Model, Schema } from 'mongoose';

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
}

export interface ICoupon extends Document {
  code: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount?: number;
  startDate: Date;
  endDate: Date;
  usageLimitTotal?: number;
  usageLimitPerCustomer: number;
  timesUsed: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CouponSchema = new Schema<ICoupon>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    description: { type: String, trim: true },
    discountType: {
      type: String,
      enum: Object.values(DiscountType),
      required: true,
    },
    discountValue: { type: Number, required: true, min: 0 },
    minOrderAmount: { type: Number, default: 0, min: 0 },
    maxDiscountAmount: { type: Number, min: 0 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    usageLimitTotal: { type: Number, min: 0 },
    usageLimitPerCustomer: { type: Number, default: 1, min: 1 },
    timesUsed: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
  }
);

export const Coupon: Model<ICoupon> = mongoose.model<ICoupon>('Coupon', CouponSchema);

// CouponRedemption tracks usage per user/order
export interface ICouponRedemption extends Document {
  couponId: mongoose.Types.ObjectId;
  couponCode: string;
  userId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  discountApplied: number;
  redeemedAt: Date;
}

const CouponRedemptionSchema = new Schema<ICouponRedemption>(
  {
    couponId: { type: Schema.Types.ObjectId, ref: 'Coupon', required: true, index: true },
    couponCode: { type: String, required: true, uppercase: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    discountApplied: { type: Number, required: true },
    redeemedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: { createdAt: 'redeemedAt', updatedAt: false },
  }
);

CouponRedemptionSchema.index({ couponId: 1, userId: 1 });

export const CouponRedemption: Model<ICouponRedemption> =
  mongoose.model<ICouponRedemption>('CouponRedemption', CouponRedemptionSchema);
