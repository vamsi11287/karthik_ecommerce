import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { BadRequestError, NotFoundError } from '../../utils/errors';
import { sendResponse } from '../../utils/response';
import { Product } from '../products/product.model';
import { Cart } from './cart.model';

// Helper to calculate server-revalidated cart details
export const formatAndRevalidateCart = async (cart: any) => {
  if (!cart || !cart.items || cart.items.length === 0) {
    return {
      id: cart?._id,
      items: [],
      subtotal: 0,
      itemCount: 0,
    };
  }

  const populatedItems: any[] = [];
  let subtotal = 0;
  let totalCount = 0;

  for (const item of cart.items) {
    const product = await Product.findById(item.productId);
    if (!product || !product.isPublished) {
      // Skip unpublished or deleted products
      continue;
    }

    let price = product.sellingPrice;
    let availableStock = product.totalStock;
    let variantDetails: any = null;

    if (product.hasVariants && product.variants.length > 0) {
      const variant = product.variants.find((v) => v.sku === item.variantSku);
      if (variant) {
        price = variant.price;
        availableStock = variant.stock - variant.reservedStock;
        variantDetails = {
          sku: variant.sku,
          size: variant.size,
          color: variant.color,
          stock: variant.stock,
          availableStock,
        };
      }
    }

    const itemSubtotal = price * item.quantity;
    subtotal += itemSubtotal;
    totalCount += item.quantity;

    populatedItems.push({
      _id: item._id,
      productId: product._id,
      name: product.name,
      slug: product.slug,
      brand: product.brand,
      image: product.images[0]?.url || '',
      variantSku: item.variantSku,
      variantDetails,
      price,
      originalPrice: product.originalPrice,
      quantity: item.quantity,
      subtotal: itemSubtotal,
      isAvailable: availableStock >= item.quantity,
      availableStock,
    });
  }

  return {
    id: cart._id,
    items: populatedItems,
    subtotal,
    itemCount: totalCount,
  };
};

export const getCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    const sessionId = (req.headers['x-session-id'] as string) || req.query.sessionId;

    let cart;
    if (userId) {
      cart = await Cart.findOne({ user: userId });
    } else if (sessionId) {
      cart = await Cart.findOne({ sessionId });
    }

    const formattedCart = await formatAndRevalidateCart(cart);

    return sendResponse({
      res,
      data: formattedCart,
    });
  } catch (error) {
    next(error);
  }
};

export const addToCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    const sessionId = (req.headers['x-session-id'] as string) || req.body.sessionId;
    const { productId, variantSku, quantity = 1 } = req.body;

    if (!userId && !sessionId) {
      throw new BadRequestError('Either an authenticated session or x-session-id header is required');
    }

    const product = await Product.findById(productId);
    if (!product || !product.isPublished) {
      throw new NotFoundError('Product not found or currently unavailable');
    }

    let availableStock = product.totalStock;
    if (product.hasVariants) {
      const variant = product.variants.find((v) => v.sku === variantSku);
      if (!variant) {
        throw new BadRequestError(`Invalid variant SKU '${variantSku}' selected`);
      }
      availableStock = variant.stock - variant.reservedStock;
    }

    if (availableStock < quantity) {
      throw new BadRequestError(`Only ${availableStock} units available in stock`);
    }

    // Find or create cart
    let cart = userId
      ? await Cart.findOne({ user: userId })
      : await Cart.findOne({ sessionId });

    if (!cart) {
      cart = new Cart({
        user: userId || null,
        sessionId: userId ? null : sessionId,
        items: [],
      });
    }

    // Check if item already exists in cart
    const existingIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId && item.variantSku === variantSku
    );

    if (existingIndex > -1) {
      const newQty = cart.items[existingIndex].quantity + quantity;
      if (newQty > availableStock) {
        throw new BadRequestError(`Cannot add more. Reached max available stock (${availableStock})`);
      }
      cart.items[existingIndex].quantity = newQty;
    } else {
      cart.items.push({
        productId: new mongoose.Types.ObjectId(productId),
        variantSku,
        quantity,
        addedAt: new Date(),
      });
    }

    await cart.save();
    const formattedCart = await formatAndRevalidateCart(cart);

    return sendResponse({
      res,
      message: 'Item added to cart',
      data: formattedCart,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCartItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    const sessionId = (req.headers['x-session-id'] as string) || req.body.sessionId;
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (quantity <= 0) {
      throw new BadRequestError('Quantity must be greater than zero');
    }

    const cart = userId
      ? await Cart.findOne({ user: userId })
      : await Cart.findOne({ sessionId });

    if (!cart) {
      throw new NotFoundError('Cart not found');
    }

    const item = cart.items.find(
      (i) => (i as any)._id.toString() === itemId || i.productId.toString() === itemId
    );
    if (!item) {
      throw new NotFoundError('Cart item not found');
    }

    // Verify stock
    const product = await Product.findById(item.productId);
    if (!product || !product.isPublished) {
      throw new BadRequestError('Product is no longer available');
    }

    let availableStock = product.totalStock;
    if (product.hasVariants) {
      const variant = product.variants.find((v) => v.sku === item.variantSku);
      if (variant) {
        availableStock = variant.stock - variant.reservedStock;
      }
    }

    if (quantity > availableStock) {
      throw new BadRequestError(`Requested quantity exceeds available stock (${availableStock})`);
    }

    item.quantity = quantity;
    await cart.save();

    const formattedCart = await formatAndRevalidateCart(cart);

    return sendResponse({
      res,
      message: 'Cart updated',
      data: formattedCart,
    });
  } catch (error) {
    next(error);
  }
};

export const removeCartItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    const sessionId = (req.headers['x-session-id'] as string) || req.query.sessionId;
    const { itemId } = req.params;

    const cart = userId
      ? await Cart.findOne({ user: userId })
      : await Cart.findOne({ sessionId });

    if (!cart) {
      throw new NotFoundError('Cart not found');
    }

    cart.items = cart.items.filter(
      (i) => (i as any)._id.toString() !== itemId && i.productId.toString() !== itemId
    ) as any;
    await cart.save();

    const formattedCart = await formatAndRevalidateCart(cart);

    return sendResponse({
      res,
      message: 'Item removed from cart',
      data: formattedCart,
    });
  } catch (error) {
    next(error);
  }
};

export const clearCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    const sessionId = (req.headers['x-session-id'] as string) || req.query.sessionId || req.body?.sessionId;

    const cart = userId
      ? await Cart.findOne({ user: userId })
      : await Cart.findOne({ sessionId });

    if (cart) {
      cart.items = [] as any;
      await cart.save();
    }

    return sendResponse({
      res,
      message: 'Cart cleared successfully',
      data: {
        items: [],
        itemCount: 0,
        subtotal: 0,
        total: 0,
        hasOutOfStockItems: false,
      },
    });
  } catch (error) {
    next(error);
  }
};


export const mergeGuestCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!._id;
    const { sessionId } = req.body;

    if (!sessionId) {
      return sendResponse({ res, message: 'No session cart to merge' });
    }

    const guestCart = await Cart.findOne({ sessionId });
    if (!guestCart || guestCart.items.length === 0) {
      return sendResponse({ res, message: 'Guest cart was empty' });
    }

    let userCart = await Cart.findOne({ user: userId });
    if (!userCart) {
      userCart = new Cart({ user: userId, items: [] });
    }

    // Merge items
    for (const gItem of guestCart.items) {
      const existing = userCart.items.find(
        (uItem) =>
          uItem.productId.toString() === gItem.productId.toString() &&
          uItem.variantSku === gItem.variantSku
      );

      if (existing) {
        existing.quantity += gItem.quantity;
      } else {
        userCart.items.push(gItem);
      }
    }

    await userCart.save();
    await Cart.findByIdAndDelete(guestCart._id);

    const formattedCart = await formatAndRevalidateCart(userCart);

    return sendResponse({
      res,
      message: 'Cart merged successfully',
      data: formattedCart,
    });
  } catch (error) {
    next(error);
  }
};

export const validateCartItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = req.body.items || [];
    const results = [];
    let hasUnavailable = false;

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product || !product.isPublished) {
        hasUnavailable = true;
        results.push({
          productId: item.productId,
          variantSku: item.variantSku,
          name: product?.name || item.name || 'Product',
          isAvailable: false,
          availableStock: 0,
          reason: !product ? 'Product no longer exists' : 'Product has been archived or unlisted',
        });
        continue;
      }

      let availableStock = product.totalStock;
      if (product.hasVariants && product.variants.length > 0) {
        const variant = product.variants.find((v) => v.sku === item.variantSku);
        if (!variant) {
          hasUnavailable = true;
          results.push({
            productId: item.productId,
            variantSku: item.variantSku,
            name: product.name,
            isAvailable: false,
            availableStock: 0,
            reason: `Size '${item.variantSku}' is no longer available`,
          });
          continue;
        }
        availableStock = variant.stock - variant.reservedStock;
      }

      const isAvailable = availableStock >= (item.quantity || 1);
      if (!isAvailable) {
        hasUnavailable = true;
      }

      results.push({
        productId: item.productId,
        variantSku: item.variantSku,
        name: product.name,
        isAvailable,
        availableStock: Math.max(0, availableStock),
        reason: isAvailable ? undefined : (availableStock <= 0 ? 'Out of stock' : `Only ${availableStock} left in stock`),
      });
    }

    return sendResponse({
      res,
      data: {
        hasUnavailable,
        items: results,
      },
    });
  } catch (error) {
    next(error);
  }
};
