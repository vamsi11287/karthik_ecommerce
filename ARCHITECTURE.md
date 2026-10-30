# E-Commerce Architecture & System Blueprint

## 1. Architecture Overview

This platform is a production-grade, single-vendor e-commerce application modeled after the shopping, checkout, fulfillment, and promotional architectures of Amazon and Flipkart, with an editorial high-fashion / modern streetwear aesthetic (styled after the user's reference designs).

### Architectural Characteristics
- **Pattern**: Modular Monolith. Highly cohesive, loosely coupled feature modules (Auth, Products, Cart, Checkout, Payments, Orders, Inventory, Coupons, Reviews, Settings, Audit).
- **Backend Stack**: Node.js v20+, Express.js, TypeScript (strict mode), MongoDB v5.0+ with Mongoose ODM, Zod schema validation, Argon2/Bcrypt password hashing, JWT with HttpOnly cookies, Razorpay SDK, Winston/Morgan structured logging.
- **Frontend Stack**: React 18+, Vite, TypeScript, Material-UI (MUI v5/v6) with custom theme token system (`theme/` directory with centralized colors, typography, spacing, and noise grain overlay), Redux Toolkit (RTK) for shared client UI state (cart drawer, user session), RTK Query / custom React hooks for server-state caching and synchronization, React Hook Form with Zod validation.
- **Single-Vendor Model**: Only 3 application roles exist:
  - `SUPER_ADMIN`: The business owner with full authority over store configuration, Admin user creation & permission assignment, payment gateway toggles, COD settings, financial reporting, and audit logs.
  - `ADMIN`: Operational store manager handling product listings, inventory adjustments, order fulfillment status progression, coupon management, and return request reviews.
  - `CUSTOMER`: The shopper who browses products, manages wishlist & cart, places orders, completes Razorpay online payments, tracks shipments, and requests returns/cancellations.
- **Security & Integrity**:
  - Payment and critical state transitions are backend-driven. Client never dictates prices, totals, or stock.
  - Razorpay order creation, signature verification, and raw-body webhook signature verification are strictly validated.
  - Double-spending and overselling prevention via atomic MongoDB conditional updates (`$inc` with `$gte` stock guard) and stock reservation timeouts.
  - Idempotent webhook and transaction handling.

---

## 2. Folder Structure

### Backend (`/backend`)
```
backend/
├── src/
│   ├── config/
│   │   ├── env.ts                 # Zod-validated environment variables
│   │   ├── database.ts            # Mongoose connection & index initialization
│   │   ├── razorpay.ts            # Razorpay client instance
│   │   ├── logger.ts              # Structured Winston logger
│   │   └── constants.ts           # Global roles, permissions, error codes
│   ├── middleware/
│   │   ├── auth.middleware.ts     # JWT verification & session validation
│   │   ├── rbac.middleware.ts     # Role & granular permission enforcement
│   │   ├── validate.middleware.ts # Zod request body/query/params validation
│   │   ├── error.middleware.ts    # Centralized exception handler
│   │   ├── audit.middleware.ts    # Admin activity logger
│   │   └── rateLimit.middleware.ts# Brute force & DDoS protection
│   ├── modules/
│   │   ├── auth/                  # Registration, login, logout, refresh, reset
│   │   ├── users/                 # Admin user provisioning & permission assignment
│   │   ├── products/              # Products, variants, search, slug, categories
│   │   ├── categories/            # Tree hierarchy, active flags
│   │   ├── cart/                  # Persistent cart, server-side price revalidation
│   │   ├── wishlist/              # Wishlist management
│   │   ├── inventory/             # Stock levels, movements, reservations, locks
│   │   ├── checkout/              # Authoritative checkout orchestrator
│   │   ├── payments/              # Razorpay orders, verification, webhooks, refunds
│   │   ├── orders/                # Lifecycle, state machine, fulfillment, returns
│   │   ├── offers/                # Storewide & category promotions
│   │   ├── coupons/               # Coupon codes, usage limits, atomic redemption
│   │   ├── returns/               # Cancellation & return request management
│   │   ├── shipping/              # Pincode check, flat/tiered rates, tracking
│   │   ├── reviews/               # Verified purchase reviews & rating aggregates
│   │   ├── settings/              # Store configuration (Payment methods, COD toggle)
│   │   ├── reports/               # Sales, revenue, inventory health, returns
│   │   └── audit/                 # Immutable audit logs
│   ├── jobs/                      # Stock reservation expiration, reconciliation
│   ├── utils/                     # Token signing, currency rounding, crypto
│   ├── app.ts                     # Express app configuration & middleware pipeline
│   └── server.ts                  # Server bootstrap & graceful shutdown
├── tests/
├── tsconfig.json
├── package.json
└── .env.example
```

### Frontend (`/frontend`)
```
frontend/
├── public/
│   └── textures/                  # Noise grain background texture
├── src/
│   ├── app/
│   │   ├── store.ts               # Redux store configuration
│   │   ├── rootReducer.ts
│   │   └── routes.tsx             # Route definitions with RBAC Guards
│   ├── theme/
│   │   ├── colors.ts              # Monochromatic, editorial paper & luxury tones
│   │   ├── typography.ts          # Brutalist & clean modern fonts (Syne/Inter)
│   │   ├── components.ts          # Custom MUI component overrides
│   │   └── index.ts               # Master theme export (easy single-file customization)
│   ├── components/
│   │   ├── common/                # AppButton, AppInput, AppBadge, Modal, Skeletons
│   │   ├── layout/                # StoreHeader, StoreFooter, AdminSidebar, AdminHeader
│   │   └── feedback/              # Toast, ConfirmationDialog, EmptyState
│   ├── hooks/
│   │   ├── useApi.ts              # Custom unified API hook with loading/error states
│   │   ├── useAuth.ts             # Auth status & permissions helper
│   │   ├── useCart.ts             # Cart operations & totals
│   │   └── useDebounce.ts         # Search debounce
│   ├── features/
│   │   ├── auth/                  # Login, Register, Forgot Password
│   │   ├── home/                  # Hero banner, New Arrivals, Lookbook collections
│   │   ├── catalog/               # Product grid, dynamic filters, sorting, search
│   │   ├── productDetail/         # Gallery, variant selector, stock display, reviews
│   │   ├── cart/                  # Cart drawer & full view, coupon application
│   │   ├── checkout/              # Address selection, Razorpay modal, confirmation
│   │   ├── orders/                # Customer order history, timeline, returns
│   │   └── admin/                 # Dashboard, products, orders, settings, users, audit
│   ├── services/
│   │   ├── api.ts                 # Axios / Fetch client with interceptors
│   │   └── endpoints/             # Modular API contracts
│   ├── types/                     # Shared TypeScript interfaces
│   ├── App.tsx
│   └── main.tsx
├── tsconfig.json
├── vite.config.ts
└── package.json
```

---

## 3. Database Schema and Relationships

All collections are created in MongoDB using Mongoose with strict schema validation, unique indexes, and referential integrity guards.

### Key Models & Collections:
1. **`users`**: `_id`, `name`, `email` (unique), `phone`, `passwordHash`, `role` (`SUPER_ADMIN` | `ADMIN` | `CUSTOMER`), `isActive`, `permissions`, `createdAt`, `updatedAt`.
2. **`products`**: `name`, `slug` (unique), `sku` (unique), `description`, `category` (ObjectId ref), `brand`, `images`, `sellingPrice`, `originalPrice`, `hasVariants`, `variants` ([{ sku, size, color, price, stock, reservedStock }]), `totalStock`, `isPublished`, `isFeatured`, `seoTitle`, `seoDescription`, `ratingsAverage`, `ratingsCount`.
3. **`categories`**: `name`, `slug` (unique), `description`, `image`, `parentCategory`, `isActive`.
4. **`carts`**: `user`, `sessionId`, `items` ([{ product, variantSku, quantity, priceSnapshot }]), `updatedAt`.
5. **`orders`**: `orderNumber` (unique), `user`, `items`, `shippingAddress`, `pricing` (`subtotal`, `discountTotal`, `couponCode`, `shippingFee`, `taxTotal`, `grandTotal`), `paymentMethod` (`RAZORPAY` | `COD`), `paymentStatus`, `fulfillmentStatus`, `shippingDetails`, `notes`.
6. **`payments`**: `orderId`, `paymentAttemptId`, `provider` (`RAZORPAY`), `providerOrderId`, `providerPaymentId`, `providerSignature`, `amount`, `currency`, `status`, `refunds`, `webhookEvents`.
7. **`inventoryTransactions`**: `productId`, `variantSku`, `type` (`RESERVATION`, `COMMIT`, `RELEASE`, `RESTOCK`, `ADJUSTMENT`), `quantity`, `referenceId`, `reason`, `performedBy`.
8. **`coupons` & `couponRedemptions`**: `code` (unique), `discountType`, `discountValue`, `minOrderAmount`, `maxDiscountAmount`, `startDate`, `endDate`, `usageLimitTotal`, `usageLimitPerCustomer`, `timesUsed`, `isActive`.
9. **`storeSettings`**: Single document holding store details, `paymentMethods` (online enabled/default, COD disabled by default), `shippingPolicy`, `returnPolicy`.
10. **`auditLogs`**: `userId`, `userEmail`, `action`, `resource`, `resourceId`, `previousState`, `newState`, `ipAddress`, `userAgent`, `timestamp`.

---

## 4. Three-Role Permission Matrix

| Permission Key | Description | SUPER_ADMIN | ADMIN (Default) | CUSTOMER |
| :--- | :--- | :---: | :---: | :---: |
| `products.read` | View catalog and details | ✅ | ✅ | ✅ |
| `products.create` | Create new products/variants | ✅ | ✅ | ❌ |
| `products.update` | Edit product details & prices | ✅ | ✅ | ❌ |
| `products.archive` | Archive/unpublish products | ✅ | ✅ | ❌ |
| `categories.manage`| Create/update categories | ✅ | ✅ | ❌ |
| `inventory.read` | View stock & low stock alerts | ✅ | ✅ | ❌ |
| `inventory.adjust` | Manually adjust stock levels | ✅ | ✅ | ❌ |
| `orders.read_own` | View own customer orders | ✅ | ✅ | ✅ |
| `orders.read_all` | View all customer orders | ✅ | ✅ | ❌ |
| `orders.update_status`| Update fulfillment statuses | ✅ | ✅ | ❌ |
| `customers.read` | View customer profile summaries | ✅ | ✅ (Operational) | ❌ |
| `offers.manage` | Create/edit promotional offers | ✅ | ✅ | ❌ |
| `coupons.manage` | Create/edit coupon codes | ✅ | ✅ | ❌ |
| `returns.review` | Review cancellation & returns | ✅ | ✅ | ❌ |
| `refunds.execute` | Execute Razorpay refund API | ✅ | ❌ *(Can be granted)* | ❌ |
| `settings.payment_methods.manage` | Toggle Online / COD payment | ✅ | ❌ *(Restricted)* | ❌ |
| `settings.store.manage` | Store policies & configurations | ✅ | ❌ | ❌ |
| `reports.read` | Operational inventory & orders | ✅ | ✅ | ❌ |
| `reports.financial.read`| Sales, margins, revenue | ✅ | ❌ | ❌ |
| `users.manage` | Create Admins & assign permissions | ✅ | ❌ | ❌ |
| `audit_logs.read` | Inspect administrative audit trail | ✅ | ❌ | ❌ |

---

## 5. Payment and Order State Machines

- **Fulfillment**: `PENDING_PAYMENT` -> `CONFIRMED` -> `PROCESSING` -> `PACKED` -> `SHIPPED` -> `OUT_FOR_DELIVERY` -> `DELIVERED` (or `CANCELLED`).
- **Payment**: `PENDING` -> `PAID` (or `FAILED`) -> `REFUND_PENDING` -> `REFUNDED` / `PARTIALLY_REFUNDED`.
- **Return**: `NOT_REQUESTED` -> `REQUESTED` -> `APPROVED` (or `REJECTED`) -> `RECEIVED` -> `COMPLETED`.

---

## 6. Implementation Roadmap

- **Phase 1**: Architecture, Core Foundation & Bootstrap (Node/Express/TS, DB, Logger, Error Handling, Config, Models)
- **Phase 2**: Authentication, Authorization & RBAC (Argon2/Bcrypt, JWT HttpOnly, Session, Ownership checks, Super Admin bootstrap)
- **Phase 3**: Product Catalog & Administration (Products, Variants, Categories, Search, Filters)
- **Phase 4**: Inventory, Cart & Wishlist (Atomic reservations, TTL cleanup, Server revalidation)
- **Phase 5**: Checkout Orchestrator & Razorpay Payments (Signature verification, raw-body webhooks, COD enforcement)
- **Phase 6**: Orders, Fulfillment & Returns (State machines, tracking, refunds)
- **Phase 7**: Offers & Coupons (Atomic discount engine)
- **Phase 8**: Store Settings, Audit Logs & Reporting
- **Phase 9**: Frontend Design System & Storefront (Editorial aesthetic, theme file, common components, lookbook, custom API hook)
- **Phase 10**: Admin Dashboard, Integration Tests & Delivery
