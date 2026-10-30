export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'CUSTOMER';

export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  permissions?: string[];
  createdAt?: string;
}

export interface ProductVariant {
  sku: string;
  size?: string;
  color?: string;
  price: number;
  stock: number;
  reservedStock: number;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  displayOrder?: number;
  isActive: boolean;
}

export interface Product {
  _id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  category: Category | string;
  brand?: string;
  images: Array<string | { url: string; publicId?: string; alt?: string; isDefault?: boolean }>;
  sellingPrice: number;
  originalPrice?: number;
  hasVariants: boolean;
  variants: ProductVariant[];
  totalStock: number;
  isPublished: boolean;
  isFeatured: boolean;
  seoTitle?: string;
  seoDescription?: string;
  ratingsAverage: number;
  ratingsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  productId: string;
  variantSku: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  size?: string;
  color?: string;
  subtotal: number;
  availableStock?: number;
}

export interface CartCalculation {
  items: CartItem[];
  subtotal: number;
  discountTotal: number;
  couponCode?: string;
  shippingFee: number;
  taxTotal: number;
  grandTotal: number;
}

export interface StoreSettings {
  _id?: string;
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
  shipping: {
    flatRate: number;
    freeShippingThreshold: number;
  };
  returns: {
    windowDays: number;
    allowReturns: boolean;
  };
}

export type OrderFulfillmentStatus =
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'PACKED'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentStatus =
  | 'PENDING'
  | 'AUTHORIZED'
  | 'PAID'
  | 'FAILED'
  | 'REFUND_PENDING'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED';

export type PaymentMethod = 'RAZORPAY' | 'COD';

export interface OrderAddress {
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  user: User | string;
  items: Array<{
    productId: string;
    variantSku: string;
    name: string;
    image: string;
    price: number;
    quantity: number;
    subtotal: number;
  }>;
  shippingAddress: OrderAddress;
  pricing: {
    subtotal: number;
    discountTotal: number;
    couponCode?: string;
    shippingFee: number;
    taxTotal: number;
    grandTotal: number;
  };
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: OrderFulfillmentStatus;
  shippingDetails?: {
    carrier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    estimatedDelivery?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Coupon {
  _id: string;
  code: string;
  description?: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount?: number;
  startDate: string;
  endDate: string;
  usageLimitTotal?: number;
  usageLimitPerCustomer?: number;
  timesUsed: number;
  isActive: boolean;
}

export interface Review {
  _id: string;
  product?: string;
  productId?: string;
  user?: string;
  userId?: string;
  order?: string;
  userName: string;
  rating: number;
  title?: string;
  comment: string;
  isVerifiedPurchase: boolean;
  createdAt: string;
}

export interface AuditLog {
  _id: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  previousState?: any;
  newState?: any;
  ipAddress?: string;
  timestamp: string;
}
