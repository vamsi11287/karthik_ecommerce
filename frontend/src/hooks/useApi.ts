import { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '../services/api';

export interface UseApiOptions<T> {
  immediate?: boolean;
  initialData?: T | null;
  onSuccess?: (data: T) => void;
  onError?: (err: Error) => void;
}

export interface UseApiResult<T, P extends any[] = any[]> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: (...args: P) => Promise<T | null>;
  refetch: () => Promise<T | null>;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

/**
 * Custom Unified Hook for API Integration
 * Handles asynchronous data lifecycle, loading states, error catches, and refetching.
 */
export function useApi<T, P extends any[] = any[]>(
  apiFn: (...args: P) => Promise<{ data?: any } | any>,
  options: UseApiOptions<T> = {}
): UseApiResult<T, P> {
  const { immediate = false, initialData = null, onSuccess, onError } = options;

  const [data, setData] = useState<T | null>(initialData);
  const [loading, setLoading] = useState<boolean>(immediate);
  const [error, setError] = useState<string | null>(null);

  const lastArgsRef = useRef<P>([] as unknown as P);

  const execute = useCallback(
    async (...args: P): Promise<T | null> => {
      lastArgsRef.current = args;
      setLoading(true);
      setError(null);

      try {
        const response = await apiFn(...args);
        // Extract nested payload from { success, data } convention if present
        const result: T =
          response?.data?.data !== undefined
            ? response.data.data
            : response?.data !== undefined
            ? response.data
            : response;

        setData(result);
        if (onSuccess) onSuccess(result);
        return result;
      } catch (err: any) {
        const errorMessage = err?.message || 'Failed to complete request';
        setError(errorMessage);
        if (onError) onError(err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [apiFn, onSuccess, onError]
  );

  const refetch = useCallback(async () => {
    return execute(...lastArgsRef.current);
  }, [execute]);

  useEffect(() => {
    if (immediate) {
      execute(...([] as unknown as P));
    }
  }, [immediate]);

  return { data, loading, error, execute, refetch, setData };
}

/**
 * Ready-to-use API endpoints map
 */
export const storeApi = {
  // Products & Categories
  getProducts: (params?: Record<string, any>) => apiClient.get('/products', { params }),
  getProductBySlug: (slug: string) => apiClient.get(`/products/${slug}`),
  getCategories: () => apiClient.get('/categories'),
  getActiveOffers: () => apiClient.get('/offers/active'),

  // Cart
  getCart: () => apiClient.get('/cart'),
  validateCart: (items: any[]) => apiClient.post('/cart/validate', { items }),
  addToCart: (productId: string, variantSku: string, quantity: number) =>
    apiClient.post('/cart/items', { productId, variantSku, quantity }),
  updateCartItem: (itemId: string, quantity: number) =>
    apiClient.patch(`/cart/items/${itemId}`, { quantity }),
  removeFromCart: (itemId: string) => apiClient.delete(`/cart/items/${itemId}`),
  clearCart: () => apiClient.delete('/cart'),

  // Coupons & Wishlist
  validateCoupon: (code: string, cartTotal: number) =>
    apiClient.post('/coupons/validate', { code, cartTotal }),
  getWishlist: () => apiClient.get('/wishlist'),
  toggleWishlist: (productId: string) => apiClient.post('/wishlist/toggle', { productId }),

  // Checkout & Payments
  calculateCheckout: (payload: { items: any[]; couponCode?: string; paymentMethod: string }) =>
    apiClient.post('/checkout/quote', payload),
  createCheckout: (payload: any) => apiClient.post('/checkout/initiate', payload),
  verifyPayment: (payload: {
    orderId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) => apiClient.post('/payments/razorpay/verify', payload),

  // Orders
  getMyOrders: () => apiClient.get('/orders/my'),
  getOrderById: (orderId: string) => apiClient.get(`/orders/${orderId}`),
  cancelOrder: (orderId: string, reason: string) =>
    apiClient.post(`/orders/${orderId}/cancel`, { reason }),

  // Reviews
  getProductReviews: (productId: string, params?: any) =>
    apiClient.get(`/reviews/products/${productId}`, { params }),
  createProductReview: (
    productId: string,
    payload: { rating: number; title?: string; comment: string; orderId?: string }
  ) => apiClient.post(`/reviews/products/${productId}`, payload),
  getMyReviews: () => apiClient.get('/reviews/my'),

  // Store Settings (Public)
  getPublicSettings: () => apiClient.get('/settings/public'),

  // Auth
  getCurrentUser: () => apiClient.get('/auth/me'),
  login: (credentials: { email: string; password: string }) =>
    apiClient.post('/auth/login', credentials),
  register: (userData: { name: string; email: string; password: string; phone?: string }) =>
    apiClient.post('/auth/register', userData),
  logout: () => apiClient.post('/auth/logout'),

  // Admin Operations
  getAdminProducts: (params?: any) => apiClient.get('/products/admin/all', { params: { ...params, limit: 50 } }),
  createProduct: (data: any) => apiClient.post('/products', data),
  updateProduct: (id: string, data: any) => apiClient.patch(`/products/${id}`, data),
  archiveProduct: (id: string) => apiClient.delete(`/products/${id}`),
  uploadProductImages: (files: FormData) =>
    apiClient.post('/upload/products', files, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteProductImage: (publicId: string) => apiClient.delete('/upload/image', { data: { publicId } }),

  getAdminOrders: (params?: any) => apiClient.get('/orders', { params }),
  updateOrderStatus: (id: string, fulfillmentStatus: string) =>
    apiClient.patch(`/orders/${id}/status`, { fulfillmentStatus }),

  getAdminSettings: () => apiClient.get('/settings/admin'),
  updatePaymentSettings: (paymentMethods: any) =>
    apiClient.patch('/settings/admin/payments', { paymentMethods }),

  getAdminCoupons: () => apiClient.get('/coupons'),
  createCoupon: (data: any) => apiClient.post('/coupons', data),

  getAdminInventory: () => apiClient.get('/inventory'),
  adjustInventory: (payload: any) => apiClient.post('/inventory/adjust', payload),

  getAdminAuditLogs: () => apiClient.get('/audit-logs'),
  getAdminReports: () => apiClient.get('/reports/dashboard'),
};

export default useApi;
