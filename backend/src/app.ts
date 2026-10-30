import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Application, NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler } from './middleware/error.middleware';
import { NotFoundError } from './utils/errors';

// Route imports
import auditRoutes from './modules/audit/audit.routes';
import authRoutes from './modules/auth/auth.routes';
import cartRoutes from './modules/cart/cart.routes';
import categoryRoutes from './modules/categories/category.routes';
import checkoutRoutes from './modules/checkout/checkout.routes';
import couponRoutes from './modules/coupons/coupon.routes';
import inventoryRoutes from './modules/inventory/inventory.routes';
import offerRoutes from './modules/offers/offer.routes';
import orderRoutes from './modules/orders/order.routes';
import paymentRoutes from './modules/payments/payment.routes';
import productRoutes from './modules/products/product.routes';
import reportRoutes from './modules/reports/reports.routes';
import reviewRoutes from './modules/reviews/review.routes';
import settingsRoutes from './modules/settings/settings.routes';
import userRoutes from './modules/users/user.routes';
import wishlistRoutes from './modules/wishlist/wishlist.routes';
import uploadRoutes from './modules/upload/upload.routes';

export const createApp = (): Application => {
  const app = express();

  // 1. Security Headers
  app.use(helmet());

  // 2. CORS configuration
  app.use(
    cors({
      origin: [env.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id', 'x-razorpay-signature'],
    })
  );

  // 3. Raw Body Capture for Webhook Signature Verification + JSON Parsing
  app.use(
    express.json({
      verify: (req: any, _res: any, buf: Buffer) => {
        req.rawBody = buf.toString();
      },
    })
  );
  app.use(express.urlencoded({ extended: true }));

  // 4. Cookie Parser
  app.use(cookieParser(env.COOKIE_SECRET));

  // 5. Request Logging
  if (env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // 6. Global Rate Limiter
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000,
    message: { success: false, message: 'Too many requests from this IP, please try again later.' },
  });
  app.use(globalLimiter);

  // 7. Health Check
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // 8. API v1 Mounts
  const apiV1 = express.Router();
  apiV1.use('/auth', authRoutes);
  apiV1.use('/users', userRoutes);
  apiV1.use('/categories', categoryRoutes);
  apiV1.use('/products', productRoutes);
  apiV1.use('/cart', cartRoutes);
  apiV1.use('/wishlist', wishlistRoutes);
  apiV1.use('/coupons', couponRoutes);
  apiV1.use('/checkout', checkoutRoutes);
  apiV1.use('/payments', paymentRoutes);
  apiV1.use('/orders', orderRoutes);
  apiV1.use('/inventory', inventoryRoutes);
  apiV1.use('/offers', offerRoutes);
  apiV1.use('/reviews', reviewRoutes);
  apiV1.use('/settings', settingsRoutes);
  apiV1.use('/reports', reportRoutes);
  apiV1.use('/audit-logs', auditRoutes);
  apiV1.use('/upload', uploadRoutes);

  // Helper endpoints for storefront navigation
  apiV1.get('/brands', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { Product } = await import('./modules/products/product.model');
      const { sendResponse } = await import('./utils/response');
      const brands = await Product.distinct('brand', { isPublished: true });
      return sendResponse({ res, data: brands.filter(Boolean) });
    } catch (err) {
      next(err);
    }
  });

  apiV1.get('/collections', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { Category } = await import('./modules/categories/category.model');
      const { sendResponse } = await import('./utils/response');
      const collections = await Category.find({ isActive: true }).lean();
      return sendResponse({ res, data: collections });
    } catch (err) {
      next(err);
    }
  });

  app.use('/api/v1', apiV1);

  // 9. 404 Route Handler
  app.use((req: Request, _res: Response) => {
    throw new NotFoundError(`Endpoint not found: [${req.method}] ${req.originalUrl}`);
  });

  // 10. Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
};
