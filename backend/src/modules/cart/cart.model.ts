import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ICartItem {
  _id?: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  variantSku: string;
  quantity: number;
  addedAt: Date;
}

export interface ICart extends Document {
  user?: mongoose.Types.ObjectId;
  sessionId?: string;
  items: ICartItem[];
  couponCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CartItemSchema = new Schema<ICartItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantSku: { type: String, required: true, uppercase: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const CartSchema = new Schema<ICart>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    sessionId: { type: String, index: true },
    items: { type: [CartItemSchema], default: [] },
    couponCode: { type: String, uppercase: true, trim: true },
  },
  {
    timestamps: true,
  }
);

export const Cart: Model<ICart> = mongoose.model<ICart>('Cart', CartSchema);
