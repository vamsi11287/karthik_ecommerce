import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../app/store';
import {
  setWishlist,
  setWishlistLoading,
  addWishlistOptimistic,
  removeWishlistOptimistic,
  toggleWishlistDrawer,
} from '../app/wishlistSlice';
import { setAuthModalOpen } from '../app/authSlice';
import { showToast } from '../app/uiSlice';
import { storeApi } from './useApi';
import { Product } from '../types';

// Singleton in-flight request tracker to prevent redundant concurrent fetches across cards
let wishlistFetchPromise: Promise<any> | null = null;
let hasLoadedWishlist = false;

export const resetWishlistFetchStatus = () => {
  hasLoadedWishlist = false;
  wishlistFetchPromise = null;
};

export const useWishlist = () => {
  const dispatch = useAppDispatch();
  const { items, itemIds, isDrawerOpen, isLoading } = useAppSelector((state) => state.wishlist);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  // Sync wishlist from backend whenever user is authenticated (deduplicated)
  const fetchWishlist = useCallback(
    async (force = false) => {
      if (!isAuthenticated) return;
      if (!force && (hasLoadedWishlist || wishlistFetchPromise)) {
        return wishlistFetchPromise;
      }

      wishlistFetchPromise = (async () => {
        try {
          dispatch(setWishlistLoading(true));
          const res = await storeApi.getWishlist();
          const products = res.data?.data || res.data || [];
          dispatch(setWishlist(products));
          hasLoadedWishlist = true;
          return products;
        } catch {
          dispatch(setWishlistLoading(false));
        } finally {
          wishlistFetchPromise = null;
        }
      })();

      return wishlistFetchPromise;
    },
    [dispatch, isAuthenticated]
  );

  useEffect(() => {
    if (isAuthenticated && !hasLoadedWishlist) {
      fetchWishlist();
    }
  }, [isAuthenticated, fetchWishlist]);

  const isInWishlist = useCallback(
    (productId: string) => {
      return itemIds.includes(productId);
    },
    [itemIds]
  );

  const toggleProductWishlist = useCallback(
    async (product: Product) => {
      if (!isAuthenticated) {
        dispatch(
          showToast({
            message: 'Please sign in to add items to your wishlist',
            severity: 'warning',
          })
        );
        dispatch(setAuthModalOpen(true));
        return;
      }

      const alreadyIn = itemIds.includes(product._id);

      // Optimistic UI update
      if (alreadyIn) {
        dispatch(removeWishlistOptimistic(product._id));
        dispatch(showToast({ message: `Removed "${product.name}" from wishlist`, severity: 'info' }));
      } else {
        dispatch(addWishlistOptimistic(product));
        dispatch(showToast({ message: `Added "${product.name}" to wishlist`, severity: 'success' }));
      }

      // Synchronize with backend
      try {
        await storeApi.toggleWishlist(product._id);
      } catch (err: any) {
        // Rollback on failure
        if (alreadyIn) {
          dispatch(addWishlistOptimistic(product));
        } else {
          dispatch(removeWishlistOptimistic(product._id));
        }
        dispatch(showToast({ message: 'Failed to update wishlist', severity: 'error' }));
      }
    },
    [dispatch, isAuthenticated, itemIds]
  );

  const removeFromWishlist = useCallback(
    async (productId: string, productName?: string) => {
      if (!isAuthenticated) return;

      dispatch(removeWishlistOptimistic(productId));
      if (productName) {
        dispatch(showToast({ message: `Removed "${productName}" from wishlist`, severity: 'info' }));
      }

      try {
        await storeApi.toggleWishlist(productId);
      } catch {
        // Silent catch
      }
    },
    [dispatch, isAuthenticated]
  );

  const openWishlist = useCallback(() => {
    if (!isAuthenticated) {
      dispatch(
        showToast({
          message: 'Please sign in to view your wishlist',
          severity: 'warning',
        })
      );
      dispatch(setAuthModalOpen(true));
      return;
    }
    dispatch(toggleWishlistDrawer(true));
  }, [dispatch, isAuthenticated]);

  const closeWishlist = useCallback(() => {
    dispatch(toggleWishlistDrawer(false));
  }, [dispatch]);

  return {
    wishlistItems: items,
    wishlistCount: items.length,
    isWishlistDrawerOpen: isDrawerOpen,
    isLoading,
    isInWishlist,
    toggleWishlist: toggleProductWishlist,
    removeFromWishlist,
    openWishlist,
    closeWishlist,
    refetchWishlist: fetchWishlist,
  };
};

export default useWishlist;
