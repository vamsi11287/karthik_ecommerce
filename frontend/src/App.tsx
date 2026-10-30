import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import useAuth from './hooks/useAuth';

// Storefront components
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import CartDrawer from './components/layout/CartDrawer';
import WishlistDrawer from './components/layout/WishlistDrawer';
import MobileDrawer from './components/layout/MobileDrawer';
import CheckoutModal from './components/checkout/CheckoutModal';
import Toast from './components/common/Toast';
import AuthModal from './features/storefront/AuthModal';

// Storefront pages
import HomePage from './features/storefront/HomePage';
import CatalogPage from './features/storefront/CatalogPage';
import ProductDetailPage from './features/storefront/ProductDetailPage';
import OrdersPage from './features/storefront/OrdersPage';

// Admin layout & pages
import AdminLayout from './components/layout/AdminLayout';
import AdminDashboard from './features/admin/AdminDashboard';
import AdminProducts from './features/admin/AdminProducts';
import AdminOrders from './features/admin/AdminOrders';
import AdminSettings from './features/admin/AdminSettings';
import AdminCoupons from './features/admin/AdminCoupons';
import AdminInventory from './features/admin/AdminInventory';
import AdminAuditLogs from './features/admin/AdminAuditLogs';

export const App: React.FC = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const { checkSession } = useAuth();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Customer Header only rendered for non-admin views */}
      {!isAdminRoute && <Navbar />}

      {/* Main Content Area */}
      <Box sx={{ flex: 1 }}>
        <Routes>
          {/* Customer Storefront Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/products/:slug" element={<ProductDetailPage />} />
          <Route path="/orders" element={<OrdersPage />} />

          {/* Admin Protected Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="coupons" element={<AdminCoupons />} />
            <Route path="inventory" element={<AdminInventory />} />
            <Route path="audit-logs" element={<AdminAuditLogs />} />
          </Route>

          {/* Catch-all fallback redirecting to Home */}
          <Route path="*" element={<HomePage />} />
        </Routes>
      </Box>

      {/* Customer Footer only rendered for non-admin views */}
      {!isAdminRoute && <Footer />}

      {/* Shared Modals and Drawers */}
      <CartDrawer />
      <WishlistDrawer />
      <MobileDrawer />
      <CheckoutModal />
      <AuthModal />
      <Toast />
    </Box>
  );
};

export default App;
