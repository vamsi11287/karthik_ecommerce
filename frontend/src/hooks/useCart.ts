import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../app/store';
import {
  addItem,
  updateItemQuantity,
  removeItem,
  clearCart as clearCartAction,
  setCoupon,
  removeCoupon,
  toggleCartDrawer,
  setCheckingOut,
} from '../app/cartSlice';
import { setAuthModalOpen } from '../app/authSlice';
import { showToast } from '../app/uiSlice';
import type { CartItem, Product, ProductVariant } from '../types';
import { storeApi } from './useApi';
import { getFirstProductImage } from '../utils/imageUtils';

export const useCart = () => {
  const dispatch = useAppDispatch();
  const cart = useAppSelector((state) => state.cart);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  const addProductToCart = useCallback(
    async (product: Product, variant?: ProductVariant, quantity: number = 1) => {
      const selectedVariant = variant || (product.variants && product.variants[0]);
      const variantSku = selectedVariant?.sku || product.sku;
      const price = selectedVariant?.price ?? product.sellingPrice;
      const image = getFirstProductImage(product.images);

      const cartItem: CartItem = {
        productId: product._id,
        variantSku,
        name: product.name,
        image,
        price,
        quantity,
        size: selectedVariant?.size,
        color: selectedVariant?.color,
        subtotal: price * quantity,
        availableStock: selectedVariant ? selectedVariant.stock - selectedVariant.reservedStock : product.totalStock,
      };

      // Optimistically update client state
      dispatch(addItem(cartItem));
      dispatch(showToast({ message: `Added "${product.name}" to cart`, severity: 'success' }));

      // Synchronize with backend API
      try {
        await storeApi.addToCart(product._id, variantSku, quantity);
      } catch {
        // Kept in local state even if backend is temporarily starting up
      }
    },
    [dispatch]
  );

  const updateQuantity = useCallback(
    async (variantSku: string, quantity: number) => {
      const activeCoupon = cart.appliedCoupon;
      const targetItem = cart.items.find((i) => i.variantSku === variantSku);
      if (!targetItem) return;

      const deltaQuantity = quantity - targetItem.quantity;
      const estimatedSubtotal = cart.subtotal + deltaQuantity * targetItem.price;

      if (activeCoupon && estimatedSubtotal < activeCoupon.minOrderAmount && quantity > 0) {
        dispatch(
          showToast({
            message: `Coupon "${activeCoupon.code}" removed: Minimum order of ₹${activeCoupon.minOrderAmount} required`,
            severity: 'info',
          })
        );
      }

      dispatch(updateItemQuantity({ variantSku, quantity }));
      try {
        await storeApi.updateCartItem(targetItem.productId, quantity);
      } catch {
        // Fallback local
      }
    },
    [dispatch, cart.items, cart.subtotal, cart.appliedCoupon]
  );

  const removeCartItem = useCallback(
    async (variantSku: string) => {
      const activeCoupon = cart.appliedCoupon;
      const targetItem = cart.items.find((i) => i.variantSku === variantSku);
      if (!targetItem) return;

      const remainingItemsCount = cart.items.length - 1;
      const estimatedSubtotal = cart.subtotal - targetItem.subtotal;

      if (remainingItemsCount === 0 && activeCoupon) {
        dispatch(showToast({ message: 'Cart emptied. Active coupon removed.', severity: 'info' }));
      } else if (activeCoupon && estimatedSubtotal < activeCoupon.minOrderAmount) {
        dispatch(
          showToast({
            message: `Coupon "${activeCoupon.code}" removed: Minimum order of ₹${activeCoupon.minOrderAmount} required`,
            severity: 'info',
          })
        );
      }

      dispatch(removeItem(variantSku));
      dispatch(showToast({ message: 'Item removed from bag', severity: 'info' }));
      try {
        await storeApi.removeFromCart(targetItem.productId);
      } catch {
        // Fallback
      }
    },
    [dispatch, cart.items, cart.subtotal, cart.appliedCoupon]
  );

  const applyCouponCode = useCallback(
    async (code: string) => {
      if (!code.trim()) return;

      // 1. Enforce authentication requirement
      if (!isAuthenticated) {
        dispatch(
          showToast({
            message: 'Please sign in to apply discount coupons',
            severity: 'warning',
          })
        );
        dispatch(setAuthModalOpen(true));
        return;
      }

      // 2. Enforce non-empty cart
      if (cart.items.length === 0 || cart.subtotal === 0) {
        dispatch(showToast({ message: 'Your cart is empty', severity: 'warning' }));
        return;
      }

      // 3. Server-side validation with full metadata
      try {
        const res = await storeApi.validateCoupon(code.toUpperCase().trim(), cart.subtotal);
        const data = res.data?.data || res.data;

        if (data.discountAmount > 0) {
          dispatch(
            setCoupon({
              code: data.code,
              discount: data.discountAmount,
              discountType: data.discountType,
              discountValue: data.discountValue,
              minOrderAmount: data.minOrderAmount || 0,
              maxDiscountAmount: data.maxDiscountAmount,
            })
          );
          dispatch(
            showToast({
              message: `Coupon "${data.code}" applied! Saved ₹${data.discountAmount}`,
              severity: 'success',
            })
          );
        } else {
          dispatch(showToast({ message: 'Coupon applied but no discount qualified', severity: 'warning' }));
        }
      } catch (err: any) {
        const message =
          err.response?.data?.message || err.message || 'Invalid or expired coupon code';
        dispatch(showToast({ message, severity: 'error' }));
      }
    },
    [dispatch, cart.items, cart.subtotal, isAuthenticated]
  );

  const clearCoupon = useCallback(() => {
    dispatch(removeCoupon());
    dispatch(showToast({ message: 'Coupon removed', severity: 'info' }));
  }, [dispatch]);

  const openDrawer = useCallback(() => dispatch(toggleCartDrawer(true)), [dispatch]);
  const closeDrawer = useCallback(() => dispatch(toggleCartDrawer(false)), [dispatch]);
  const toggleDrawer = useCallback(() => dispatch(toggleCartDrawer()), [dispatch]);

  const startCheckout = useCallback(() => {
    dispatch(toggleCartDrawer(false));
    dispatch(setCheckingOut(true));
  }, [dispatch]);

  const endCheckout = useCallback(() => {
    dispatch(setCheckingOut(false));
  }, [dispatch]);

  const totalItemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    ...cart,
    totalItemCount,
    addProductToCart,
    updateQuantity,
    removeCartItem,
    applyCouponCode,
    clearCoupon,
    openDrawer,
    closeDrawer,
    toggleDrawer,
    startCheckout,
    endCheckout,
    clearCart: () => dispatch(clearCartAction()),
  };
};

export default useCart;
