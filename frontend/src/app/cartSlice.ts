import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CartItem } from '../types';

export interface AppliedCoupon {
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount?: number;
}

interface CartState {
  items: CartItem[];
  subtotal: number;
  discountTotal: number;
  couponCode?: string;
  appliedCoupon?: AppliedCoupon;
  shippingFee: number;
  taxTotal: number;
  grandTotal: number;
  isDrawerOpen: boolean;
  isCheckingOut: boolean;
  pendingCheckoutAfterAuth: boolean;
}

const loadSavedCartItems = (): CartItem[] => {
  try {
    const saved = localStorage.getItem('xiv_cart_items');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const persistCartItems = (items: CartItem[]) => {
  try {
    localStorage.setItem('xiv_cart_items', JSON.stringify(items));
  } catch {
    // Ignore storage quota errors
  }
};

const initialItems = loadSavedCartItems();
const initialSubtotal = initialItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

const initialState: CartState = {
  items: initialItems,
  subtotal: initialSubtotal,
  discountTotal: 0,
  couponCode: undefined,
  appliedCoupon: undefined,
  shippingFee: initialSubtotal > 200 || initialSubtotal === 0 ? 0 : 15,
  taxTotal: 0,
  grandTotal: initialSubtotal > 200 || initialSubtotal === 0 ? initialSubtotal : initialSubtotal + 15,
  isDrawerOpen: false,
  isCheckingOut: false,
  pendingCheckoutAfterAuth: false,
};

const recalculateTotals = (state: CartState) => {
  state.subtotal = state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // If cart is completely emptied, immediately wipe out any active coupon
  if (state.items.length === 0) {
    state.couponCode = undefined;
    state.appliedCoupon = undefined;
    state.discountTotal = 0;
  } else if (state.appliedCoupon) {
    // Check if subtotal still meets minimum order threshold
    if (state.subtotal < state.appliedCoupon.minOrderAmount) {
      // Automatically invalidate coupon because subtotal is insufficient
      state.couponCode = undefined;
      state.appliedCoupon = undefined;
      state.discountTotal = 0;
    } else {
      // Subtotal qualifies: dynamically recompute discount based on updated subtotal
      if (state.appliedCoupon.discountType === 'PERCENTAGE') {
        let disc = Math.round((state.subtotal * state.appliedCoupon.discountValue) / 100);
        if (state.appliedCoupon.maxDiscountAmount && disc > state.appliedCoupon.maxDiscountAmount) {
          disc = state.appliedCoupon.maxDiscountAmount;
        }
        state.discountTotal = disc;
      } else {
        state.discountTotal = Math.min(state.appliedCoupon.discountValue, state.subtotal);
      }
    }
  } else {
    state.discountTotal = 0;
  }

  state.shippingFee = state.subtotal > 200 || state.subtotal === 0 ? 0 : 15;
  state.grandTotal = Math.max(0, state.subtotal - state.discountTotal + state.shippingFee);
  persistCartItems(state.items);
};

export const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    setCartData: (
      state,
      action: PayloadAction<{
        items: CartItem[];
        couponCode?: string;
        appliedCoupon?: AppliedCoupon;
        discountTotal?: number;
      }>
    ) => {
      state.items = action.payload.items;
      state.couponCode = action.payload.couponCode;
      state.appliedCoupon = action.payload.appliedCoupon;
      state.discountTotal = action.payload.discountTotal || 0;
      recalculateTotals(state);
    },
    addItem: (state, action: PayloadAction<CartItem>) => {
      const existing = state.items.find(
        (i) => i.productId === action.payload.productId && i.variantSku === action.payload.variantSku
      );
      if (existing) {
        existing.quantity += action.payload.quantity;
        existing.subtotal = existing.quantity * existing.price;
      } else {
        state.items.push(action.payload);
      }
      recalculateTotals(state);
    },
    updateItemQuantity: (state, action: PayloadAction<{ variantSku: string; quantity: number }>) => {
      const existing = state.items.find((i) => i.variantSku === action.payload.variantSku);
      if (existing) {
        if (action.payload.quantity <= 0) {
          state.items = state.items.filter((i) => i.variantSku !== action.payload.variantSku);
        } else {
          existing.quantity = action.payload.quantity;
          existing.subtotal = existing.quantity * existing.price;
        }
      }
      recalculateTotals(state);
    },
    removeItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((i) => i.variantSku !== action.payload);
      recalculateTotals(state);
    },
    clearCart: (state) => {
      state.items = [];
      state.subtotal = 0;
      state.discountTotal = 0;
      state.couponCode = undefined;
      state.appliedCoupon = undefined;
      state.shippingFee = 0;
      state.grandTotal = 0;
      state.pendingCheckoutAfterAuth = false;
      try {
        localStorage.removeItem('xiv_cart_items');
      } catch {
        // Ignore
      }
    },
    setCoupon: (
      state,
      action: PayloadAction<{
        code: string;
        discount: number;
        discountType?: 'PERCENTAGE' | 'FIXED';
        discountValue?: number;
        minOrderAmount?: number;
        maxDiscountAmount?: number;
      }>
    ) => {
      state.couponCode = action.payload.code;
      state.appliedCoupon = {
        code: action.payload.code,
        discountType: action.payload.discountType || 'FIXED',
        discountValue: action.payload.discountValue || action.payload.discount,
        minOrderAmount: action.payload.minOrderAmount || 0,
        maxDiscountAmount: action.payload.maxDiscountAmount,
      };
      state.discountTotal = action.payload.discount;
      recalculateTotals(state);
    },
    removeCoupon: (state) => {
      state.couponCode = undefined;
      state.appliedCoupon = undefined;
      state.discountTotal = 0;
      recalculateTotals(state);
    },
    toggleCartDrawer: (state, action: PayloadAction<boolean | undefined>) => {
      state.isDrawerOpen = action.payload !== undefined ? action.payload : !state.isDrawerOpen;
    },
    setCheckingOut: (state, action: PayloadAction<boolean>) => {
      state.isCheckingOut = action.payload;
    },
    setPendingCheckoutAfterAuth: (state, action: PayloadAction<boolean>) => {
      state.pendingCheckoutAfterAuth = action.payload;
    },
  },
});

export const {
  setCartData,
  addItem,
  updateItemQuantity,
  removeItem,
  clearCart,
  setCoupon,
  removeCoupon,
  toggleCartDrawer,
  setCheckingOut,
  setPendingCheckoutAfterAuth,
} = cartSlice.actions;

export default cartSlice.reducer;
