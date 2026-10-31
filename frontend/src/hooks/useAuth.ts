import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../app/store';
import { setUser, logoutUser, setAuthLoading, setAuthModalOpen } from '../app/authSlice';
import { setCheckingOut, setPendingCheckoutAfterAuth, clearCart as clearCartAction } from '../app/cartSlice';
import { clearWishlist } from '../app/wishlistSlice';
import { resetWishlistFetchStatus } from './useWishlist';
import { showToast } from '../app/uiSlice';
import { storeApi } from './useApi';

// Singleton in-flight session check promise to ensure exactly one /me call
let checkSessionPromise: Promise<any> | null = null;
let hasCheckedInitialSession = false;

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, isLoading, authModalOpen, isInitialized } = useAppSelector(
    (state) => state.auth
  );
  const { pendingCheckoutAfterAuth } = useAppSelector((state) => state.cart);

  // Validate session on demand (e.g., initial app load)
  const checkSession = useCallback(
    async (force = false) => {
      if (!force && (hasCheckedInitialSession || checkSessionPromise)) {
        return checkSessionPromise;
      }

      checkSessionPromise = (async () => {
        try {
          dispatch(setAuthLoading(true));
          const res = await storeApi.getCurrentUser();
          const rawData = res.data?.data || res.data;
          const userData = rawData?.user || rawData;

          if (userData && (userData.id || userData._id)) {
            const normalized = {
              ...userData,
              _id: userData._id || userData.id,
            };
            dispatch(setUser(normalized));
            return normalized;
          } else {
            dispatch(setUser(null));
            return null;
          }
        } catch {
          // If token expired or guest, clear user state
          dispatch(setUser(null));
          return null;
        } finally {
          hasCheckedInitialSession = true;
          checkSessionPromise = null;
          dispatch(setAuthLoading(false));
        }
      })();

      return checkSessionPromise;
    },
    [dispatch]
  );

  const login = async (credentials: { email: string; password: string }) => {
    dispatch(setAuthLoading(true));
    try {
      const cleanEmail = credentials.email.trim().toLowerCase();
      const res = await storeApi.login({ email: cleanEmail, password: credentials.password });

      const token = res.data?.data?.token || res.data?.token;
      if (token) {
        localStorage.setItem('ecommerce_auth_token', token);
      }

      const rawUser = res.data?.data?.user || res.data?.data || res.data?.user;
      const userData = {
        ...rawUser,
        _id: rawUser._id || rawUser.id,
      };

      dispatch(setUser(userData));
      resetWishlistFetchStatus();

      // Merge guest cart after login
      const sessionId = localStorage.getItem('xiv_session_id') || localStorage.getItem('sessionId');
      if (sessionId) {
        try {
          await storeApi.mergeCart(sessionId);
          localStorage.removeItem('xiv_session_id');
          localStorage.removeItem('sessionId');
        } catch {
          // Non-critical — user cart still works
        }
      }

      dispatch(showToast({ message: `Welcome back, ${userData.name}!`, severity: 'success' }));
      dispatch(setAuthModalOpen(false));

      // If customer clicked checkout or buy now before logging in, resume checkout seamlessly
      if (pendingCheckoutAfterAuth) {
        dispatch(setPendingCheckoutAfterAuth(false));
        dispatch(setCheckingOut(true));
      }

      return userData;
    } catch (err: any) {
      dispatch(showToast({ message: err.message || 'Login failed', severity: 'error' }));
      throw err;
    } finally {
      dispatch(setAuthLoading(false));
    }
  };

  const register = async (data: { name: string; email: string; password: string; phone?: string }) => {
    dispatch(setAuthLoading(true));
    try {
      const cleanData = { ...data, email: data.email.trim().toLowerCase() };
      const res = await storeApi.register(cleanData);

      const token = res.data?.data?.token || res.data?.token;
      if (token) {
        localStorage.setItem('ecommerce_auth_token', token);
      }

      const rawUser = res.data?.data?.user || res.data?.data || res.data?.user;
      const userData = {
        ...rawUser,
        _id: rawUser._id || rawUser.id,
      };

      dispatch(setUser(userData));

      // Merge guest cart after registration
      const sessionId = localStorage.getItem('xiv_session_id') || localStorage.getItem('sessionId');
      if (sessionId) {
        try {
          await storeApi.mergeCart(sessionId);
          localStorage.removeItem('xiv_session_id');
          localStorage.removeItem('sessionId');
        } catch {
          // Non-critical — user cart still works
        }
      }

      dispatch(showToast({ message: 'Account created successfully!', severity: 'success' }));
      dispatch(setAuthModalOpen(false));

      // Resume pending checkout if user was checking out
      if (pendingCheckoutAfterAuth) {
        dispatch(setPendingCheckoutAfterAuth(false));
        dispatch(setCheckingOut(true));
      }

      return userData;
    } catch (err: any) {
      dispatch(showToast({ message: err.message || 'Registration failed', severity: 'error' }));
      throw err;
    } finally {
      dispatch(setAuthLoading(false));
    }
  };

  const logout = async () => {
    try {
      await storeApi.logout();
    } catch {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('ecommerce_auth_token');
      localStorage.removeItem('ecommerce_user');
      localStorage.removeItem('token');
      localStorage.removeItem('xiv_cart_items');
      hasCheckedInitialSession = true;
      resetWishlistFetchStatus();
      dispatch(clearCartAction());
      dispatch(clearWishlist());
      dispatch(logoutUser());
      dispatch(showToast({ message: 'Logged out successfully', severity: 'info' }));
    }
  };

  const openAuthModal = () => dispatch(setAuthModalOpen(true));
  const closeAuthModal = () => {
    dispatch(setAuthModalOpen(false));
    dispatch(setPendingCheckoutAfterAuth(false));
  };

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isAdmin = user?.role === 'ADMIN' || isSuperAdmin;
  const isCustomer = user?.role === 'CUSTOMER';

  return {
    user,
    isAuthenticated,
    isLoading,
    isInitialized,
    authModalOpen,
    isSuperAdmin,
    isAdmin,
    isCustomer,
    pendingCheckoutAfterAuth,
    login,
    register,
    logout,
    openAuthModal,
    closeAuthModal,
    checkSession,
  };
};

export default useAuth;
