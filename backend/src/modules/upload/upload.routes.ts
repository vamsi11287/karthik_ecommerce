import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { uploadProductImages, uploadCategoryImage, uploadAvatar } from '../../middleware/upload.middleware';
import { deleteImage } from '../../utils/cloudinary';
import { sendResponse } from '../../utils/response';
import { requirePermission } from '../../middleware/rbac.middleware';
import { PermissionKey, UserRole } from '../../config/constants';
import { NextFunction, Request, Response } from 'express';
import { ForbiddenError, UnauthorizedError } from '../../utils/errors';

const router = Router();

const requireProductImagePermission = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new UnauthorizedError());
  }

  if (
    req.user.role === UserRole.SUPER_ADMIN ||
    req.user.hasPermission(PermissionKey.PRODUCTS_CREATE) ||
    req.user.hasPermission(PermissionKey.PRODUCTS_UPDATE)
  ) {
    return next();
  }

  return next(new ForbiddenError('Product create or update permission is required.'));
};

// ─── Helper: wrap multer middleware into a promise ────────────────────────────
const runMiddleware = (
  req: Request,
  res: Response,
  fn: (req: Request, res: Response, cb: (err: any) => void) => void
): Promise<void> =>
  new Promise((resolve, reject) => {
    fn(req, res, (err: any) => (err ? reject(err) : resolve()));
  });

// ─── POST /api/upload/products ────────────────────────────────────────────────
// Upload up to 10 product images. Returns array of { url, public_id }
router.post(
  '/products',
  authenticate,
  requireProductImagePermission,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await runMiddleware(req, res, uploadProductImages as any);

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return sendResponse({ res, statusCode: 400, message: 'No images uploaded' });
      }

      const uploaded = files.map((file: any) => ({
        url: file.path,          // Cloudinary secure URL
        public_id: file.filename, // Cloudinary public_id
        publicId: file.filename,
      }));

      return sendResponse({
        res,
        statusCode: 201,
        message: `${uploaded.length} image(s) uploaded successfully`,
        data: uploaded,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── POST /api/upload/category ────────────────────────────────────────────────
// Upload a single category image
router.post(
  '/category',
  authenticate,
  requirePermission(PermissionKey.CATEGORIES_MANAGE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await runMiddleware(req, res, uploadCategoryImage as any);

      const file = req.file as any;
      if (!file) {
        return sendResponse({ res, statusCode: 400, message: 'No image uploaded' });
      }

      return sendResponse({
        res,
        statusCode: 201,
        message: 'Category image uploaded successfully',
        data: {
          url: file.path,
          public_id: file.filename,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── POST /api/upload/avatar ──────────────────────────────────────────────────
// Upload user profile avatar (authenticated users only)
router.post(
  '/avatar',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await runMiddleware(req, res, uploadAvatar as any);

      const file = req.file as any;
      if (!file) {
        return sendResponse({ res, statusCode: 400, message: 'No image uploaded' });
      }

      return sendResponse({
        res,
        statusCode: 201,
        message: 'Avatar uploaded successfully',
        data: {
          url: file.path,
          public_id: file.filename,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── DELETE /api/upload/image ─────────────────────────────────────────────────
// Delete an image from Cloudinary. Body: { publicId }
router.delete(
  '/image',
  authenticate,
  requireProductImagePermission,
  deleteImage
);

export default router;
