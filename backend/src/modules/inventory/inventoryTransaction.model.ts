import mongoose, { Document, Model, Schema } from 'mongoose';
import { InventoryTransactionType } from '../../config/constants';

export interface IInventoryTransaction extends Document {
  productId: mongoose.Types.ObjectId;
  variantSku: string;
  type: InventoryTransactionType;
  quantity: number; // Positive for additions/reservations, negative for release/decrement
  previousStock: number;
  newStock: number;
  referenceId?: string;
  reason: string;
  performedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const InventoryTransactionSchema = new Schema<IInventoryTransaction>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    variantSku: { type: String, required: true, uppercase: true, index: true },
    type: { type: String, enum: Object.values(InventoryTransactionType), required: true, index: true },
    quantity: { type: Number, required: true },
    previousStock: { type: Number, required: true },
    newStock: { type: Number, required: true },
    referenceId: { type: String, index: true },
    reason: { type: String, required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const InventoryTransaction: Model<IInventoryTransaction> =
  mongoose.model<IInventoryTransaction>('InventoryTransaction', InventoryTransactionSchema);
