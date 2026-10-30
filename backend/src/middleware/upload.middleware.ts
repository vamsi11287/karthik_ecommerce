import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import cloudinary from '../config/cloudinary';

// ─── Cloudinary Storage for Products ────────────────────────────────────────
const productStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'ecommerce/products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'avif'],
    transformation: [{ width: 1000, height: 1000, crop: 'limit', quality: 'auto' }],
  } as any,
});

// ─── Cloudinary Storage for Categories ──────────────────────────────────────
const categoryStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'ecommerce/categories',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 600, height: 400, crop: 'fill', quality: 'auto' }],
  } as any,
});

// ─── Cloudinary Storage for User Avatars ────────────────────────────────────
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'ecommerce/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 300, height: 300, crop: 'fill', gravity: 'face', quality: 'auto' }],
  } as any,
});

// ─── File filter (images only) ───────────────────────────────────────────────
const imageFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (jpg, png, webp, avif) are allowed'));
  }
};

// ─── Multer instances ─────────────────────────────────────────────────────────
/** Upload up to 10 product images */
export const uploadProductImages = multer({
  storage: productStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per file
}).array('images', 10);

/** Upload a single category image */
export const uploadCategoryImage = multer({
  storage: categoryStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3 MB
}).single('image');

/** Upload a single user avatar */
export const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
}).single('avatar');
