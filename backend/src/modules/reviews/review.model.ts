import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IReview extends Document {
  product: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  order?: mongoose.Types.ObjectId;
  userName: string;
  rating: number; // 1 to 5
  title?: string;
  comment: string;
  isVerifiedPurchase: boolean;
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    order: { type: Schema.Types.ObjectId, ref: 'Order', index: true },
    userName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, trim: true },
    comment: { type: String, required: true, trim: true },
    isVerifiedPurchase: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
  }
);

// One review per user per product
ReviewSchema.index({ product: 1, user: 1 }, { unique: true });

export const Review: Model<IReview> = mongoose.model<IReview>('Review', ReviewSchema);
