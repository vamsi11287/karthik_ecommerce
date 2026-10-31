import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IProductVariant {
  sku: string;
  size?: string;
  color?: string;
  price: number;
  originalPrice?: number;
  stock: number;
  reservedStock: number;
  barcode?: string;
  image?: string;
}

export interface IProductImage {
  url: string;
  publicId?: string;
  alt?: string;
  isDefault?: boolean;
}

export interface IProduct extends Document {
  name: string;
  slug: string;
  sku: string;
  description: string;
  category: mongoose.Types.ObjectId;
  subcategory?: mongoose.Types.ObjectId;
  brand: string;
  images: IProductImage[];
  sellingPrice: number;
  originalPrice?: number;
  hasVariants: boolean;
  variants: IProductVariant[];
  totalStock: number;
  isPublished: boolean;
  isFeatured: boolean;
  isNewArrival: boolean;
  tags: string[];
  seoTitle?: string;
  seoDescription?: string;
  ratingsAverage: number;
  ratingsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProductVariantSchema = new Schema<IProductVariant>(
  {
    sku: { type: String, required: true, trim: true, uppercase: true },
    size: { type: String, trim: true },
    color: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    reservedStock: { type: Number, required: true, min: 0, default: 0 },
    barcode: { type: String, trim: true },
    image: { type: String },
  },
  { _id: true }
);

const ProductImageSchema = new Schema<IProductImage>(
  {
    url: { type: String, required: true },
    publicId: { type: String, trim: true },
    alt: { type: String, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false }
);

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    description: { type: String, required: true, trim: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    subcategory: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    brand: { type: String, default: 'LUXWEAR', trim: true, index: true },
    images: { type: [ProductImageSchema], default: [] },
    sellingPrice: { type: Number, required: true, min: 0, index: true },
    originalPrice: { type: Number, min: 0 },
    hasVariants: { type: Boolean, default: false },
    variants: { type: [ProductVariantSchema], default: [] },
    totalStock: { type: Number, default: 0, min: 0, index: true },
    isPublished: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    isNewArrival: { type: Boolean, default: true, index: true },
    tags: [{ type: String, trim: true }],
    seoTitle: { type: String, trim: true },
    seoDescription: { type: String, trim: true },
    ratingsAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingsCount: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
  }
);

// Full text search index
ProductSchema.index({
  name: 'text',
  description: 'text',
  brand: 'text',
  tags: 'text',
  sku: 'text',
});

// Calculate total stock automatically before saving
ProductSchema.pre('save', function (next) {
  if (this.hasVariants && this.variants.length > 0) {
    this.totalStock = this.variants.reduce((acc, curr) => acc + (curr.stock - curr.reservedStock), 0);
  }
  next();
});

export const Product: Model<IProduct> = mongoose.model<IProduct>('Product', ProductSchema);
