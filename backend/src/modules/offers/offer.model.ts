import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IOffer extends Document {
  title: string;
  subtitle?: string;
  badge?: string;
  linkUrl?: string;
  imageUrl?: string;
  discountPercentage?: number;
  placement: 'HERO_BANNER' | 'WEEKLY_DEAL' | 'COLLECTION_FEATURE' | 'POPUP';
  isActive: boolean;
  priority: number;
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OfferSchema = new Schema<IOffer>(
  {
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, trim: true },
    badge: { type: String, trim: true },
    linkUrl: { type: String, default: '/catalog' },
    imageUrl: { type: String },
    discountPercentage: { type: Number, min: 0, max: 100 },
    placement: {
      type: String,
      enum: ['HERO_BANNER', 'WEEKLY_DEAL', 'COLLECTION_FEATURE', 'POPUP'],
      default: 'HERO_BANNER',
      index: true,
    },
    isActive: { type: Boolean, default: true, index: true },
    priority: { type: Number, default: 0 },
    startDate: { type: Date },
    endDate: { type: Date },
  },
  {
    timestamps: true,
  }
);

export const Offer: Model<IOffer> = mongoose.model<IOffer>('Offer', OfferSchema);
