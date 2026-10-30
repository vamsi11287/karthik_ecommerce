import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authModalOpen: boolean;
  isInitialized: boolean;
}

const getStoredUser = (): User | null => {
  try {
    const raw = localStorage.getItem('ecommerce_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const hasToken = (): boolean => {
  try {
    return !!(localStorage.getItem('ecommerce_auth_token') || localStorage.getItem('token'));
  } catch {
    return false;
  }
};

const initialUser = getStoredUser();

const initialState: AuthState = {
  user: initialUser,
  isAuthenticated: !!initialUser && hasToken(),
  isLoading: false,
  authModalOpen: false,
  isInitialized: true,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      state.isLoading = false;
      state.isInitialized = true;
      if (action.payload) {
        localStorage.setItem('ecommerce_user', JSON.stringify(action.payload));
      } else {
        localStorage.removeItem('ecommerce_user');
        localStorage.removeItem('ecommerce_auth_token');
        localStorage.removeItem('token');
      }
    },
    logoutUser: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.isInitialized = true;
      localStorage.removeItem('ecommerce_user');
      localStorage.removeItem('ecommerce_auth_token');
      localStorage.removeItem('token');
    },
    setAuthLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setAuthModalOpen: (state, action: PayloadAction<boolean>) => {
      state.authModalOpen = action.payload;
    },
    setInitialized: (state, action: PayloadAction<boolean>) => {
      state.isInitialized = action.payload;
    },
  },
});

export const { setUser, logoutUser, setAuthLoading, setAuthModalOpen, setInitialized } = authSlice.actions;

export default authSlice.reducer;
