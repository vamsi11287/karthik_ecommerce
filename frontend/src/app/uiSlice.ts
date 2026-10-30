import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { StoreSettings } from '../types';

interface ToastState {
  open: boolean;
  message: string;
  severity: 'success' | 'info' | 'warning' | 'error';
}

interface UIState {
  toast: ToastState;
  mobileMenuOpen: boolean;
  searchQuery: string;
  settings: StoreSettings | null;
}

const initialState: UIState = {
  toast: {
    open: false,
    message: '',
    severity: 'info',
  },
  mobileMenuOpen: false,
  searchQuery: '',
  settings: null,
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    showToast: (
      state,
      action: PayloadAction<{ message: string; severity?: 'success' | 'info' | 'warning' | 'error' }>
    ) => {
      state.toast = {
        open: true,
        message: action.payload.message,
        severity: action.payload.severity || 'info',
      };
    },
    hideToast: (state) => {
      state.toast.open = false;
    },
    setMobileMenuOpen: (state, action: PayloadAction<boolean>) => {
      state.mobileMenuOpen = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setSettings: (state, action: PayloadAction<StoreSettings>) => {
      state.settings = action.payload;
    },
  },
});

export const { showToast, hideToast, setMobileMenuOpen, setSearchQuery, setSettings } = uiSlice.actions;

export default uiSlice.reducer;
