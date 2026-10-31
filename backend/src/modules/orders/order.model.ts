import mongoose, { Document, Model, Schema } from 'mongoose';
import {
  OrderFulfillmentStatus,
  PaymentMethod,
  PaymentStatus,
  ReturnStatus,
} from '../../config/constants';

export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  variantSku: string;
  name: string;
  image?: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface IOrderAddress {
  fullName: string;
  phone: string;
  street?: string;
  addressLine1?: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface IOrderPricing {
  subtotal: number;
  discountTotal: number;
  couponCode?: string;
  shippingFee: number;
  taxTotal: number;
  grandTotal: number;
}

export interface IShippingDetails {
  courierName?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDelivery?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
}

export interface IReturnedItem {
  productId: mongoose.Types.ObjectId;
  variantSku: string;
  name: string;
  image?: string;
  price: number;
  quantity: number;
}

export interface IOrder extends Document {
  orderNumber: string;
  user: mongoose.Types.ObjectId;
  items: IOrderItem[];
  shippingAddress: IOrderAddress;
  billingAddress?: IOrderAddress;
  pricing: IOrderPricing;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: OrderFulfillmentStatus;
  shippingDetails: IShippingDetails;
  returnStatus: ReturnStatus;
  reservationExpiresAt?: Date;
  cancellationReason?: string;
  returnReason?: string;
  returnedItems?: IReturnedItem[];
  returnRestocked?: boolean;
  internalNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantSku: { type: String, required: true, uppercase: true },
    name: { type: String, required: true },
    image: { type: String },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const OrderAddressSchema = new Schema<IOrderAddress>(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    street: { type: String, default: '' },
    addressLine1: { type: String, default: '' },
    addressLine2: { type: String, default: '' },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, default: 'India' },
  },
  { _id: false }
);

const OrderPricingSchema = new Schema<IOrderPricing>(
  {
    subtotal: { type: Number, required: true, min: 0 },
    discountTotal: { type: Number, default: 0, min: 0 },
    couponCode: { type: String, uppercase: true },
    shippingFee: { type: Number, default: 0, min: 0 },
    taxTotal: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const ShippingDetailsSchema = new Schema<IShippingDetails>(
  {
    courierName: { type: String },
    trackingNumber: { type: String },
    trackingUrl: { type: String },
    estimatedDelivery: { type: Date },
    shippedAt: { type: Date },
    deliveredAt: { type: Date },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: { type: [OrderItemSchema], required: true },
    shippingAddress: { type: OrderAddressSchema, required: true },
    billingAddress: { type: OrderAddressSchema },
    pricing: { type: OrderPricingSchema, required: true },
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
      default: PaymentMethod.RAZORPAY,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
      index: true,
    },
    fulfillmentStatus: {
      type: String,
      enum: Object.values(OrderFulfillmentStatus),
      default: OrderFulfillmentStatus.PENDING_PAYMENT,
      index: true,
    },
    shippingDetails: { type: ShippingDetailsSchema, default: {} },
    returnStatus: {
      type: String,
      enum: Object.values(ReturnStatus),
      default: ReturnStatus.NOT_REQUESTED,
      index: true,
    },
    reservationExpiresAt: { type: Date, index: true },
    cancellationReason: { type: String },
    returnReason: { type: String },
    returnedItems: [
      {
        productId: { type: Schema.Types.ObjectId, ref: 'Product' },
        variantSku: { type: String },
        name: { type: String },
        image: { type: String },
        price: { type: Number },
        quantity: { type: Number },
      },
    ],
    returnRestocked: { type: Boolean, default: false },
    internalNotes: { type: String },
  },
  {
    timestamps: true,
  }
);

export const Order: Model<IOrder> = mongoose.model<IOrder>('Order', OrderSchema);
