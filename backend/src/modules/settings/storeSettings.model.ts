import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IStoreSettings extends Document {
  storeName: string;
  storeEmail: string;
  storePhone?: string;
  currency: string;
  paymentMethods: {
    online: {
      enabled: boolean;
      isDefault: boolean;
      provider: string;
    };
    cod: {
      enabled: boolean;
    };
  };
  shippingPolicy: {
    freeShippingThreshold: number; // e.g. 999
    flatRate: number;              // e.g. 99
  };
  taxRatePercent: number;          // e.g. 18 for GST or 0 if tax included
  returnPolicy: {
    returnWindowDays: number;      // e.g. 7 days
    allowReturns: boolean;
  };
  updatedBy?: mongoose.Types.ObjectId;
  updatedAt: Date;
}

const StoreSettingsSchema = new Schema<IStoreSettings>(
  {
    storeName: { type: String, default: 'LUXWEAR XIV', trim: true },
    storeEmail: { type: String, default: 'support@luxwear.com', trim: true },
    storePhone: { type: String, default: '+919876543210' },
    currency: { type: String, default: 'INR' },
    paymentMethods: {
      online: {
        enabled: { type: Boolean, default: true },
        isDefault: { type: Boolean, default: true },
        provider: { type: String, default: 'razorpay' },
      },
      cod: {
        enabled: { type: Boolean, default: true },
      },
    },
    shippingPolicy: {
      freeShippingThreshold: { type: Number, default: 999 },
      flatRate: { type: Number, default: 99 },
    },
    taxRatePercent: { type: Number, default: 5 },
    returnPolicy: {
      returnWindowDays: { type: Number, default: 7 },
      allowReturns: { type: Boolean, default: true },
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
);

export const StoreSettings: Model<IStoreSettings> = mongoose.model<IStoreSettings>(
  'StoreSettings',
  StoreSettingsSchema
);

// Helper to get or create single settings document
export const getStoreSettings = async (): Promise<IStoreSettings> => {
  let settings = await StoreSettings.findOne();
  if (!settings) {
    settings = await StoreSettings.create({
      storeName: 'LUXWEAR XIV',
      storeEmail: 'support@luxwear.com',
      paymentMethods: {
        online: { enabled: true, isDefault: true, provider: 'razorpay' },
        cod: { enabled: false },
      },
      shippingPolicy: { freeShippingThreshold: 999, flatRate: 99 },
      taxRatePercent: 5,
      returnPolicy: { returnWindowDays: 7, allowReturns: true },
    });
  }
  return settings;
};
