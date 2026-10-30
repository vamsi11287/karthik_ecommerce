import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Product } from '../types';

interface WishlistState {
  items: Product[];
  itemIds: string[];
  isDrawerOpen: boolean;
  isLoading: boolean;
}

const initialState: WishlistState = {
  items: [],
  itemIds: [],
  isDrawerOpen: false,
  isLoading: false,
};

export const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    setWishlist: (state, action: PayloadAction<Product[]>) => {
      state.items = action.payload || [];
      state.itemIds = (action.payload || []).map((p) => p._id);
      state.isLoading = false;
    },
    setWishlistLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    addWishlistOptimistic: (state, action: PayloadAction<Product>) => {
      if (!state.itemIds.includes(action.payload._id)) {
        state.items.push(action.payload);
        state.itemIds.push(action.payload._id);
      }
    },
    removeWishlistOptimistic: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((p) => p._id !== action.payload);
      state.itemIds = state.itemIds.filter((id) => id !== action.payload);
    },
    toggleWishlistDrawer: (state, action: PayloadAction<boolean | undefined>) => {
      state.isDrawerOpen = action.payload !== undefined ? action.payload : !state.isDrawerOpen;
    },
    clearWishlist: (state) => {
      state.items = [];
      state.itemIds = [];
      state.isDrawerOpen = false;
      state.isLoading = false;
    },
  },
});

export const {
  setWishlist,
  setWishlistLoading,
  addWishlistOptimistic,
  removeWishlistOptimistic,
  toggleWishlistDrawer,
  clearWishlist,
} = wishlistSlice.actions;

export default wishlistSlice.reducer;
