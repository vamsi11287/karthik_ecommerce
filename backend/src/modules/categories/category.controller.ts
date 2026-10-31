import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { BadRequestError, ConflictError, NotFoundError } from '../../utils/errors';
import { sendResponse } from '../../utils/response';
import { Category } from './category.model';

export const listCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const includeInactive = req.query.includeInactive === 'true' && req.user;
    const filter = includeInactive ? {} : { isActive: true };

    const categories = await Category.find(filter)
      .populate('parentCategory', 'name slug')
      .sort({ displayOrder: 1, name: 1 });

    return sendResponse({
      res,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

export const getCategoryTree = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ displayOrder: 1, name: 1 })
      .lean();

    const categoryMap = new Map();
    categories.forEach((cat) => {
      categoryMap.set(cat._id.toString(), { ...cat, children: [] });
    });

    const tree: any[] = [];
    categories.forEach((cat) => {
      if (cat.parentCategory && categoryMap.has(cat.parentCategory.toString())) {
        categoryMap.get(cat.parentCategory.toString()).children.push(categoryMap.get(cat._id.toString()));
      } else {
        tree.push(categoryMap.get(cat._id.toString()));
      }
    });

    return sendResponse({
      res,
      data: tree,
    });
  } catch (error) {
    next(error);
  }
};

export const getCategoryBySlug = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;
    const category = await Category.findOne({ slug });

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    return sendResponse({
      res,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, slug, description, image, parentCategory, displayOrder, isActive } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new BadRequestError('Category name is required');
    }

    let normalizedSlug = (slug || name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    if (!normalizedSlug) {
      normalizedSlug = `category-${Date.now().toString(36)}`;
    }

    const existing = await Category.findOne({ slug: normalizedSlug });
    if (existing) {
      const parentMatch =
        (!existing.parentCategory && !parentCategory) ||
        (existing.parentCategory &&
          parentCategory &&
          existing.parentCategory.toString() === parentCategory.toString());

      if (parentMatch) {
        return sendResponse({
          res,
          statusCode: 200,
          message: 'Category already exists',
          data: existing,
        });
      }
      normalizedSlug = `${normalizedSlug}-${Date.now().toString(36).slice(-4)}`;
    }

    const resolvedParent =
      parentCategory && mongoose.Types.ObjectId.isValid(parentCategory)
        ? new mongoose.Types.ObjectId(parentCategory)
        : null;

    const category = await Category.create({
      name: name.trim(),
      slug: normalizedSlug,
      description: description?.trim(),
      image,
      parentCategory: resolvedParent,
      displayOrder: displayOrder || 0,
      isActive: isActive !== undefined ? isActive : true,
    });

    return sendResponse({
      res,
      statusCode: 201,
      message: 'Category created successfully',
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, slug, description, image, parentCategory, displayOrder, isActive } = req.body;

    const category = await Category.findById(id);
    if (!category) {
      throw new NotFoundError('Category not found');
    }

    if (name) category.name = name.trim();
    if (slug) category.slug = slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (description !== undefined) category.description = description;
    if (image !== undefined) category.image = image;
    if (parentCategory !== undefined) {
      category.parentCategory =
        parentCategory && mongoose.Types.ObjectId.isValid(parentCategory)
          ? new mongoose.Types.ObjectId(parentCategory)
          : null;
    }
    if (displayOrder !== undefined) category.displayOrder = displayOrder;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();

    return sendResponse({
      res,
      message: 'Category updated successfully',
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);
    if (!category) {
      throw new NotFoundError('Category not found');
    }

    // Also delete any subcategories attached to this parent category
    await Category.deleteMany({ parentCategory: id });
    await Category.findByIdAndDelete(id);

    return sendResponse({
      res,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
