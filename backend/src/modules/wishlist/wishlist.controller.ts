import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { NotFoundError } from '../../utils/errors';
import { sendResponse } from '../../utils/response';
import { Product } from '../products/product.model';
import { Wishlist } from './wishlist.model';

export const getWishlist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!._id;

    let wishlist = await Wishlist.findOne({ user: userId }).populate({
      path: 'products',
      match: { isPublished: true },
      select: 'name slug sellingPrice originalPrice images brand totalStock ratingsAverage ratingsCount variants hasVariants sku',
    });

    if (!wishlist) {
      wishlist = await Wishlist.create({ user: userId, products: [] });
    }

    return sendResponse({
      res,
      data: wishlist.products,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleWishlistItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!._id;
    const { productId } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    let wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
      wishlist = new Wishlist({ user: userId, products: [] });
    }

    const index = wishlist.products.findIndex((p) => p.toString() === productId);
    let isAdded = false;

    if (index > -1) {
      wishlist.products.splice(index, 1);
      isAdded = false;
    } else {
      wishlist.products.push(new mongoose.Types.ObjectId(productId));
      isAdded = true;
    }

    await wishlist.save();

    return sendResponse({
      res,
      message: isAdded ? 'Added to wishlist' : 'Removed from wishlist',
      data: { isAdded, count: wishlist.products.length },
    });
  } catch (error) {
    next(error);
  }
};
