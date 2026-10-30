import { NextFunction, Request, Response } from 'express';
import cloudinary from '../config/cloudinary';
import { sendResponse } from '../utils/response';

/**
 * Delete a single image from Cloudinary by its public_id.
 * The public_id is the path portion of the URL without the extension,
 * e.g. "ecommerce/products/abc123"
 */
export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  await cloudinary.uploader.destroy(publicId);
};

/**
 * Extract the public_id from a full Cloudinary URL.
 * Works for both versioned and non-versioned URLs.
 *
 * Example URL:
 * https://res.cloudinary.com/<cloud>/image/upload/v1234567890/ecommerce/products/abc123.webp
 * → "ecommerce/products/abc123"
 */
export const extractPublicId = (url: string): string | null => {
  try {
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z]+$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};

// ─── Controller: DELETE /api/upload/image ────────────────────────────────────
/**
 * Body: { publicId: string }
 * Deletes an image from Cloudinary. Typically called by admin when
 * removing a product/category image via the dashboard.
 */
export const deleteImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { publicId } = req.body as { publicId?: string };

    if (typeof publicId !== 'string' || !publicId.startsWith('ecommerce/products/')) {
      return sendResponse({
        res,
        statusCode: 400,
        message: 'A valid product image publicId is required',
      });
    }

    await cloudinary.uploader.destroy(publicId);

    return sendResponse({ res, message: 'Image deleted successfully' });
  } catch (error) {
    next(error);
  }
};
