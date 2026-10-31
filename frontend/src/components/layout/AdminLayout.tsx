import React, { useState } from 'react';
import {
  Box,
  Drawer,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Divider,
  Chip,
} from '@mui/material';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import CheckroomOutlinedIcon from '@mui/icons-material/CheckroomOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import PaymentOutlinedIcon from '@mui/icons-material/PaymentOutlined';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { themeColors } from '../../theme/theme';
import useAuth from '../../hooks/useAuth';

const SIDEBAR_WIDTH = 260;

export const AdminLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, isSuperAdmin, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // If not admin, block and redirect
  if (!isAdmin) {
    return (
      <Box sx={{ p: 8, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 800, mb: 2 }}>
          Unauthorized Administrative Access
        </Typography>
        <Typography variant="body2" sx={{ color: themeColors.textMuted, mb: 3 }}>
          This portal requires ADMIN or SUPER_ADMIN authorization privileges.
        </Typography>
        <Box
          onClick={() => navigate('/')}
          sx={{
            display: 'inline-block',
            backgroundColor: themeColors.black,
            color: themeColors.white,
            px: 3,
            py: 1.2,
            cursor: 'pointer',
            fontFamily: '"Syne", sans-serif',
            fontWeight: 700,
          }}
        >
          Return to Storefront
        </Box>
      </Box>
    );
  }

  const ALL_MENU_ITEMS = [
    { label: 'Overview',             path: '/admin',           icon: <DashboardOutlinedIcon />,          permission: null },
    { label: 'Products',             path: '/admin/products',  icon: <CheckroomOutlinedIcon />,          permission: 'products.read' },
    { label: 'Orders & Fulfillment', path: '/admin/orders',    icon: <LocalShippingOutlinedIcon />,      permission: 'orders.read_all' },
    { label: 'Payment & COD Settings', path: '/admin/settings', icon: <PaymentOutlinedIcon />,           permission: 'settings.payment_methods.manage' },
    { label: 'Coupons & Promos',     path: '/admin/coupons',   icon: <ConfirmationNumberOutlinedIcon />, permission: 'coupons.manage' },
    { label: 'Audit Trail',          path: '/admin/audit-logs', icon: <HistoryOutlinedIcon />,           permission: 'audit_logs.read' },
  ];

  // Super admins see everything; regular admins see only their permitted pages
  const menuItems = isSuperAdmin
    ? ALL_MENU_ITEMS
    : ALL_MENU_ITEMS.filter(
        (item) => item.permission === null || (user?.permissions ?? []).includes(item.permission)
      );

  const sidebarContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#121212', color: '#FFF' }}>
      {/* Brand Header */}
      <Box sx={{ p: 3, borderBottom: '1px solid #222222' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Box
            component="img"
            src="/logo.png"
            alt="SPUN"
            sx={{
              height: 28,
              filter: 'invert(1)',
              objectFit: 'contain',
            }}
          />
          <Typography
            variant="h6"
            sx={{
              fontFamily: '"Syne", sans-serif',
              fontWeight: 800,
              letterSpacing: '0.12em',
              color: '#FFF',
            }}
          >
            ADMIN
          </Typography>
        </Box>
        <Chip
          label={isSuperAdmin ? 'SUPER ADMIN (OWNER)' : 'STORE OPERATOR (ADMIN)'}
          size="small"
          sx={{
            backgroundColor: isSuperAdmin ? '#2563EB' : '#374151',
            color: '#FFF',
            fontFamily: '"Syne", sans-serif',
            fontWeight: 700,
            fontSize: '0.65rem',
            borderRadius: 0,
          }}
        />
      </Box>

      {/* Navigation Links */}
      <List sx={{ px: 1.5, py: 2, flex: 1 }}>
        {menuItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <ListItem key={item.label} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={Link}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                sx={{
                  borderRadius: 0,
                  py: 1.2,
                  px: 2,
                  backgroundColor: active ? '#222222' : 'transparent',
                  color: active ? '#FFFFFF' : '#9CA3AF',
                  borderLeft: active ? '3px solid #FFFFFF' : '3px solid transparent',
                  transition: 'background-color 0.15s ease, border-color 0.15s ease',
                  '&:hover': {
                    backgroundColor: '#1E1E1E',
                    color: '#FFFFFF',
                    '& .MuiTypography-root': {
                      color: '#FFFFFF',
                    },
                    '& .MuiListItemIcon-root': {
                      color: '#FFFFFF',
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: active ? '#FFFFFF' : '#9CA3AF',
                    minWidth: 36,
                    transition: 'color 0.15s ease',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <Typography
                  sx={{
                    fontFamily: '"Inter", sans-serif',
                    fontWeight: active ? 700 : 500,
                    fontSize: '0.85rem',
                    color: active ? '#FFFFFF' : '#9CA3AF',
                    letterSpacing: '0.01em',
                    transition: 'color 0.15s ease',
                  }}
                >
                  {item.label}
                </Typography>
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* Footer Profile & Exit to Storefront */}
      <Box sx={{ p: 2.5, borderTop: '1px solid #222222' }}>
        <Typography variant="body2" sx={{ fontWeight: 700, color: '#FFF' }}>
          {user?.name}
        </Typography>
        <Typography variant="caption" sx={{ color: '#888880', display: 'block', mb: 2 }}>
          {user?.email}
        </Typography>

        <Box
          component={Link}
          to="/"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            color: '#FFF',
            fontSize: '0.8rem',
            fontFamily: '"Inter", sans-serif',
            fontWeight: 600,
            textDecoration: 'none',
            mb: 1.5,
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          <StorefrontOutlinedIcon sx={{ fontSize: '1.1rem' }} />
          Exit to Storefront
        </Box>

        <Typography
          onClick={logout}
          sx={{
            color: '#DC2626',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: '"Inter", sans-serif',
          }}
        >
          Sign Out
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: themeColors.paperBase }}>
      {/* Mobile Top Header */}
      <Box
        sx={{
          display: { xs: 'flex', md: 'none' },
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1200,
          height: 56,
          backgroundColor: '#121212',
          color: '#FFF',
          alignItems: 'center',
          px: 2,
          justifyContent: 'space-between',
        }}
      >
        <IconButton onClick={() => setMobileOpen(true)} sx={{ color: '#FFF' }}>
          <MenuIcon />
        </IconButton>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            component="img"
            src="/logo.png"
            alt="SPUN"
            sx={{
              height: 22,
              filter: 'invert(1)',
              objectFit: 'contain',
            }}
          />
          <Typography variant="subtitle1" sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 800 }}>
            SPUN ADMIN
          </Typography>
        </Box>
        <Box
          component={Link}
          to="/"
          sx={{ color: '#FFF', fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none' }}
        >
          Store
        </Box>
      </Box>

      {/* Desktop Permanent Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: SIDEBAR_WIDTH,
            boxSizing: 'border-box',
            border: 'none',
            backgroundColor: '#121212',
            color: '#FFFFFF',
          },
        }}
      >
        {sidebarContent}
      </Drawer>

      {/* Mobile Temporary Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: SIDEBAR_WIDTH,
            boxSizing: 'border-box',
            border: 'none',
            backgroundColor: '#121212',
            color: '#FFFFFF',
          },
        }}
      >
        {sidebarContent}
      </Drawer>

      {/* Main Admin Content Container */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2.5, md: 5 },
          pt: { xs: 9, md: 5 },
          width: { md: `calc(100% - ${SIDEBAR_WIDTH}px)` },
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default AdminLayout;
