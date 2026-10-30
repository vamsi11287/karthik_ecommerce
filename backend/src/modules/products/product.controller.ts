import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { ConflictError, NotFoundError } from '../../utils/errors';
import { sendResponse } from '../../utils/response';
import { deleteFromCloudinary } from '../../utils/cloudinary';
import { logAuditEvent } from '../audit/audit.model';
import { Category } from '../categories/category.model';
import { Product } from './product.model';

export const listProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 12));
    const search = (req.query.search as string)?.trim();
    const categorySlug = (req.query.category as string)?.trim();
    const brand = (req.query.brand as string)?.trim();
    const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined;
    const inStock = req.query.inStock === 'true';
    const isFeatured = req.query.isFeatured === 'true';
    const isNewArrival = req.query.isNewArrival === 'true';
    const sortBy = (req.query.sortBy as string) || 'newest';

    const query: any = { isPublished: true };

    // Search query
    if (search) {
      query.$text = { $search: search };
    }

    // Category filter by slug
    if (categorySlug && categorySlug !== 'all') {
      const category = await Category.findOne({ slug: categorySlug });
      if (category) {
        query.category = category._id;
      }
    }

    // Brand filter
    if (brand && brand !== 'all') {
      query.brand = { $regex: new RegExp(`^${brand}$`, 'i') };
    }

    // Price range filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      query.sellingPrice = {};
      if (minPrice !== undefined) query.sellingPrice.$gte = minPrice;
      if (maxPrice !== undefined) query.sellingPrice.$lte = maxPrice;
    }

    // Stock availability
    if (inStock) {
      query.totalStock = { $gt: 0 };
    }

    // Featured / New Arrivals
    if (isFeatured) query.isFeatured = true;
    if (isNewArrival) query.isNewArrival = true;

    // Sorting
    let sort: any = { createdAt: -1 };
    if (sortBy === 'price-low') {
      sort = { sellingPrice: 1 };
    } else if (sortBy === 'price-high') {
      sort = { sellingPrice: -1 };
    } else if (sortBy === 'rating') {
      sort = { ratingsAverage: -1, ratingsCount: -1 };
    } else if (sortBy === 'popular') {
      sort = { ratingsCount: -1 };
    } else if (search) {
      sort = { score: { $meta: 'textScore' } };
    }

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('category', 'name slug')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit);

    return sendResponse({
      res,
      data: products,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getProductBySlug = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;

    const product = await Product.findOne({ slug, isPublished: true }).populate(
      'category',
      'name slug'
    );

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    // Fetch related products in the same category
    const relatedProducts = await Product.find({
      category: product.category._id,
      _id: { $ne: product._id },
      isPublished: true,
    })
      .limit(4)
      .select('name slug sellingPrice originalPrice images brand ratingsAverage ratingsCount');

    return sendResponse({
      res,
      data: {
        product,
        relatedProducts,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const search = (req.query.search as string)?.trim();

    const query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('category', 'name slug')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return sendResponse({
      res,
      data: products,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      name,
      slug,
      sku,
      description,
      category,
      brand,
      images,
      sellingPrice,
      originalPrice,
      hasVariants,
      variants,
      totalStock,
      isPublished,
      isFeatured,
      isNewArrival,
      tags,
      seoTitle,
      seoDescription,
    } = req.body;

    const normalizedSlug = (slug || name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existingSlug = await Product.findOne({ slug: normalizedSlug });
    if (existingSlug) {
      throw new ConflictError('A product with this slug already exists');
    }

    const existingSku = await Product.findOne({ sku: sku.toUpperCase() });
    if (existingSku) {
      throw new ConflictError('A product with this SKU already exists');
    }

    // Resolve category (supports ObjectId, object with _id, slug string, or fallback)
    let categoryId = category;
    if (category && typeof category === 'object' && category._id) {
      categoryId = category._id;
    } else if (category && typeof category === 'string' && !mongoose.Types.ObjectId.isValid(category)) {
      const foundCat = await Category.findOne({
        $or: [
          { slug: category.toLowerCase().trim() },
          { name: new RegExp(`^${category.trim()}$`, 'i') },
        ],
      });
      if (foundCat) categoryId = foundCat._id;
    }
    if (!categoryId) {
      const defaultCat = (await Category.findOne({ slug: 'men' })) || (await Category.findOne());
      if (defaultCat) categoryId = defaultCat._id;
    }

    // Format & normalize variants
    const sanitizedVariants = Array.isArray(variants)
      ? variants.map((v: any, index: number) => ({
          sku: (v.sku || `${sku.toUpperCase()}-${v.size || index + 1}`).toUpperCase(),
          size: v.size ? String(v.size).trim() : undefined,
          color: v.color ? String(v.color).trim() : undefined,
          price: Number(v.price !== undefined ? v.price : sellingPrice) || 0,
          originalPrice:
            v.originalPrice !== undefined
              ? Number(v.originalPrice)
              : originalPrice
              ? Number(originalPrice)
              : undefined,
          stock: Math.max(0, Number(v.stock) || 0),
          reservedStock: 0,
        }))
      : [];

    const hasVar = Boolean(hasVariants || sanitizedVariants.length > 0);

    // Calculate authoritative total stock
    let calculatedStock = Number(totalStock) || 0;
    if (hasVar && sanitizedVariants.length > 0) {
      calculatedStock = sanitizedVariants.reduce(
        (sum: number, v: any) => sum + (v.stock || 0),
        0
      );
    }

    // Normalize images: string[] -> [{ url, isDefault }]
    const normalizedImages = Array.isArray(images)
      ? images.map((img: any, idx: number) =>
          typeof img === 'string' ? { url: img, isDefault: idx === 0 } : img
        )
      : [];

    const product = await Product.create({
      name,
      slug: normalizedSlug,
      sku: sku.toUpperCase(),
      description,
      category: categoryId,
      brand: brand || 'LUXWEAR',
      images: normalizedImages,
      sellingPrice: Number(sellingPrice),
      originalPrice: originalPrice ? Number(originalPrice) : undefined,
      hasVariants: hasVar,
      variants: sanitizedVariants,
      totalStock: calculatedStock,
      isPublished: isPublished !== undefined ? isPublished : true,
      isFeatured: !!isFeatured,
      isNewArrival: isNewArrival !== undefined ? isNewArrival : true,
      tags: tags || [],
      seoTitle,
      seoDescription,
    });

    await product.populate('category', 'name slug');

    await logAuditEvent({
      userId: req.user!._id,
      userEmail: req.user!.email,
      userRole: req.user!.role,
      action: 'PRODUCT_CREATED',
      resource: 'Product',
      resourceId: product._id.toString(),
      newState: { name: product.name, sku: product.sku, price: product.sellingPrice },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return sendResponse({
      res,
      statusCode: 201,
      message: 'Product created successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const previousState = {
      name: product.name,
      sellingPrice: product.sellingPrice,
      totalStock: product.totalStock,
      isPublished: product.isPublished,
    };

    const updates = req.body;
    if (Array.isArray(updates.images)) {
      updates.images = updates.images.map((image: any, index: number) => {
        const normalizedImage = typeof image === 'string' ? { url: image, isDefault: index === 0 } : image;
        if (
          !normalizedImage ||
          typeof normalizedImage !== 'object' ||
          typeof normalizedImage.url !== 'string' ||
          normalizedImage.publicId
        ) {
          return normalizedImage;
        }

        const existingImage = product.images.find((currentImage) => currentImage.url === normalizedImage.url);
        return existingImage?.publicId
          ? { ...normalizedImage, publicId: existingImage.publicId }
          : normalizedImage;
      });
    }

    const previousImagePublicIds = Array.isArray(updates.images)
      ? product.images.map((image) => image.publicId).filter((publicId): publicId is string => !!publicId)
      : [];
    if (updates.sku) updates.sku = updates.sku.toUpperCase();
    if (updates.slug) updates.slug = updates.slug.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    if (updates.hasVariants && updates.variants) {
      updates.totalStock = updates.variants.reduce(
        (sum: number, v: any) => sum + (v.stock || 0) - (v.reservedStock || 0),
        0
      );
    }

    if (Array.isArray(updates.images)) {
      const retainedPublicIds = new Set(
        updates.images
          .map((image: any) => (image && typeof image === 'object' ? image.publicId : undefined))
          .filter((publicId: unknown): publicId is string => typeof publicId === 'string')
      );
      for (const publicId of previousImagePublicIds) {
        if (!retainedPublicIds.has(publicId)) {
          await deleteFromCloudinary(publicId);
        }
      }
    }

    Object.assign(product, updates);
    await product.save();
    await product.populate('category', 'name slug');

    await logAuditEvent({
      userId: req.user!._id,
      userEmail: req.user!.email,
      userRole: req.user!.role,
      action: 'PRODUCT_UPDATED',
      resource: 'Product',
      resourceId: product._id.toString(),
      previousState,
      newState: { name: product.name, price: product.sellingPrice, stock: product.totalStock },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return sendResponse({
      res,
      message: 'Product updated successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const archiveProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    product.isPublished = false;
    await product.save();

    await logAuditEvent({
      userId: req.user!._id,
      userEmail: req.user!.email,
      userRole: req.user!.role,
      action: 'PRODUCT_ARCHIVED',
      resource: 'Product',
      resourceId: product._id.toString(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return sendResponse({
      res,
      message: 'Product archived successfully',
    });
  } catch (error) {
    next(error);
  }
};
