import { NextFunction, Request, Response } from 'express';
import { InventoryTransactionType } from '../../config/constants';
import { BadRequestError, NotFoundError } from '../../utils/errors';
import { sendResponse } from '../../utils/response';
import { Product } from '../products/product.model';
import { InventoryTransaction } from './inventoryTransaction.model';

export const listInventory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lowStockOnly = req.query.lowStock === 'true';
    const search = (req.query.search as string)?.trim();

    const query: any = { isPublished: true };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }

    if (lowStockOnly) {
      query.totalStock = { $lte: 5 };
    }

    const products = await Product.find(query)
      .select('name sku brand variants totalStock')
      .sort({ totalStock: 1 });

    const formatted = products.flatMap((p) => {
      if (p.hasVariants && p.variants.length > 0) {
        return p.variants.map((v) => ({
          productId: p._id,
          productName: p.name,
          sku: v.sku,
          size: v.size,
          color: v.color,
          price: v.price,
          stock: v.stock,
          reservedStock: v.reservedStock,
          availableStock: v.stock - v.reservedStock,
          isLowStock: v.stock - v.reservedStock <= 5,
        }));
      }
      return [
        {
          productId: p._id,
          productName: p.name,
          sku: p.sku,
          price: p.sellingPrice,
          stock: p.totalStock,
          reservedStock: 0,
          availableStock: p.totalStock,
          isLowStock: p.totalStock <= 5,
        },
      ];
    });

    return sendResponse({
      res,
      data: formatted,
    });
  } catch (error) {
    next(error);
  }
};

export const adjustStock = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, variantSku, quantityChange, newStock: rawNewStock, reason } = req.body;
    const user = req.user!;

    const product = await Product.findById(productId);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    let previousStock = 0;
    let newStock = 0;
    let actualChange = 0;

    // Check if batch variants were provided
    if (Array.isArray(req.body.variants) && req.body.variants.length > 0 && product.hasVariants) {
      for (const item of req.body.variants) {
        const v = product.variants.find((vObj) => vObj.sku === item.sku || vObj.size === item.size);
        if (v) {
          const oldStock = v.stock;
          const targetStock = Math.max(0, Number(item.stock));
          const diff = targetStock - oldStock;
          v.stock = targetStock;

          if (diff !== 0) {
            await InventoryTransaction.create({
              productId: product._id,
              variantSku: v.sku,
              type: InventoryTransactionType.ADJUSTMENT,
              quantity: diff,
              previousStock: oldStock,
              newStock: targetStock,
              reason: reason || 'Manual multi-variant stock adjustment',
              performedBy: user._id,
            });
          }
        }
      }

      product.totalStock = product.variants.reduce((acc, v) => acc + v.stock, 0);
      await product.save();

      return sendResponse({
        res,
        message: `Inventory updated successfully. Total stock: ${product.totalStock} units`,
        data: {
          productId: product._id,
          totalStock: product.totalStock,
          variants: product.variants,
        },
      });
    }

    if (product.hasVariants && product.variants.length > 0) {
      const variant = variantSku
        ? product.variants.find((v) => v.sku === variantSku)
        : product.variants[0];

      if (!variant) {
        throw new NotFoundError(`Variant '${variantSku}' not found on product`);
      }

      previousStock = variant.stock;

      if (rawNewStock !== undefined) {
        newStock = Math.max(0, Number(rawNewStock));
        actualChange = newStock - previousStock;
      } else if (quantityChange !== undefined) {
        actualChange = Number(quantityChange);
        newStock = Math.max(0, previousStock + actualChange);
      } else {
        throw new BadRequestError('Either newStock or quantityChange is required');
      }

      variant.stock = newStock;
      product.totalStock = product.variants.reduce((acc, v) => acc + v.stock, 0);
    } else {
      previousStock = product.totalStock;

      if (rawNewStock !== undefined) {
        newStock = Math.max(0, Number(rawNewStock));
        actualChange = newStock - previousStock;
      } else if (quantityChange !== undefined) {
        actualChange = Number(quantityChange);
        newStock = Math.max(0, previousStock + actualChange);
      } else {
        throw new BadRequestError('Either newStock or quantityChange is required');
      }

      product.totalStock = newStock;
    }

    await product.save();

    await InventoryTransaction.create({
      productId: product._id,
      variantSku: variantSku || product.variants?.[0]?.sku || product.sku,
      type: InventoryTransactionType.ADJUSTMENT,
      quantity: actualChange,
      previousStock,
      newStock,
      reason: reason || 'Manual stock adjustment by admin',
      performedBy: user._id,
    });

    return sendResponse({
      res,
      message: `Stock successfully updated to ${newStock} units`,
      data: {
        productId: product._id,
        variantSku,
        previousStock,
        newStock,
        totalStock: product.totalStock,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getInventoryTransactions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const limit = Math.min(100, parseInt(req.query.limit as string) || 30);
    const transactions = await InventoryTransaction.find()
      .populate('productId', 'name sku')
      .populate('performedBy', 'name email role')
      .sort({ createdAt: -1 })
      .limit(limit);

    return sendResponse({
      res,
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
};
