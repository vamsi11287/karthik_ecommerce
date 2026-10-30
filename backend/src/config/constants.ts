export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  CUSTOMER = 'CUSTOMER',
}

export enum PermissionKey {
  // Products
  PRODUCTS_READ = 'products.read',
  PRODUCTS_CREATE = 'products.create',
  PRODUCTS_UPDATE = 'products.update',
  PRODUCTS_ARCHIVE = 'products.archive',

  // Categories
  CATEGORIES_MANAGE = 'categories.manage',

  // Inventory
  INVENTORY_READ = 'inventory.read',
  INVENTORY_ADJUST = 'inventory.adjust',

  // Orders
  ORDERS_READ_ALL = 'orders.read_all',
  ORDERS_UPDATE_STATUS = 'orders.update_status',

  // Customers
  CUSTOMERS_READ = 'customers.read',
  CUSTOMERS_MANAGE = 'customers.manage',

  // Offers & Coupons
  OFFERS_MANAGE = 'offers.manage',
  COUPONS_MANAGE = 'coupons.manage',

  // Settings
  SETTINGS_PAYMENT_METHODS_READ = 'settings.payment_methods.read',
  SETTINGS_PAYMENT_METHODS_MANAGE = 'settings.payment_methods.manage',
  SETTINGS_STORE_MANAGE = 'settings.store.manage',

  // Returns & Refunds
  REFUNDS_REVIEW = 'refunds.review',
  REFUNDS_EXECUTE = 'refunds.execute',

  // Reports
  REPORTS_READ = 'reports.read',
  REPORTS_FINANCIAL_READ = 'reports.financial.read',

  // User Management
  USERS_MANAGE = 'users.manage',
  ROLES_MANAGE = 'roles.manage',

  // Audit Logs
  AUDIT_LOGS_READ = 'audit_logs.read',
}

// Default permissions assigned to an Admin
export const DEFAULT_ADMIN_PERMISSIONS: PermissionKey[] = [
  PermissionKey.PRODUCTS_READ,
  PermissionKey.PRODUCTS_CREATE,
  PermissionKey.PRODUCTS_UPDATE,
  PermissionKey.PRODUCTS_ARCHIVE,
  PermissionKey.CATEGORIES_MANAGE,
  PermissionKey.INVENTORY_READ,
  PermissionKey.INVENTORY_ADJUST,
  PermissionKey.ORDERS_READ_ALL,
  PermissionKey.ORDERS_UPDATE_STATUS,
  PermissionKey.CUSTOMERS_READ,
  PermissionKey.OFFERS_MANAGE,
  PermissionKey.COUPONS_MANAGE,
  PermissionKey.REFUNDS_REVIEW,
  PermissionKey.REPORTS_READ,
  PermissionKey.SETTINGS_PAYMENT_METHODS_READ,
  PermissionKey.SETTINGS_PAYMENT_METHODS_MANAGE,
];

export enum OrderFulfillmentStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  CONFIRMED = 'CONFIRMED',
  PACKING = 'PACKING',
  SHIPPING = 'SHIPPING',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  AUTHORIZED = 'AUTHORIZED',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUND_PENDING = 'REFUND_PENDING',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentMethod {
  RAZORPAY = 'RAZORPAY',
  COD = 'COD',
}

export enum ReturnStatus {
  NOT_REQUESTED = 'NOT_REQUESTED',
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  RECEIVED = 'RECEIVED',
  COMPLETED = 'COMPLETED',
}

export enum InventoryTransactionType {
  RESERVATION = 'RESERVATION',
  COMMIT = 'COMMIT',
  RELEASE = 'RELEASE',
  RESTOCK = 'RESTOCK',
  ADJUSTMENT = 'ADJUSTMENT',
}
