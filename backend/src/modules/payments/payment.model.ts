import mongoose, { Document, Model, Schema } from 'mongoose';
import { PaymentStatus } from '../../config/constants';

export interface IPaymentRefund {
  providerRefundId: string;
  amount: number;
  status: string;
  reason?: string;
  createdAt: Date;
}

export interface IPayment extends Document {
  orderId: mongoose.Types.ObjectId;
  paymentAttemptId: string;
  provider: string;
  providerOrderId?: string;
  providerPaymentId?: string;
  providerSignature?: string;
  amount: number; // In paise (e.g. ₹999 = 99900)
  currency: string;
  status: PaymentStatus;
  refunds: IPaymentRefund[];
  webhookEvents: string[]; // Idempotency check for event IDs
  createdAt: Date;
  updatedAt: Date;
}

const PaymentRefundSchema = new Schema<IPaymentRefund>(
  {
    providerRefundId: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, default: 'processed' },
    reason: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const PaymentSchema = new Schema<IPayment>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    paymentAttemptId: { type: String, required: true, unique: true, index: true },
    provider: { type: String, default: 'RAZORPAY' },
    providerOrderId: { type: String, index: true },
    providerPaymentId: { type: String, index: true },
    providerSignature: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
      index: true,
    },
    refunds: { type: [PaymentRefundSchema], default: [] },
    webhookEvents: { type: [String], default: [] },
  },
  {
    timestamps: true,
  }
);

export const Payment: Model<IPayment> = mongoose.model<IPayment>('Payment', PaymentSchema);
