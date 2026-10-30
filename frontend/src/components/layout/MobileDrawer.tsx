import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/store';
import { setMobileMenuOpen } from '../../app/uiSlice';
import { themeColors } from '../../theme/theme';
import useAuth from '../../hooks/useAuth';
import useWishlist from '../../hooks/useWishlist';

export const MobileDrawer: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const mobileMenuOpen = useAppSelector((state) => state.ui.mobileMenuOpen);
  const { user, isAuthenticated, isAdmin, logout, openAuthModal } = useAuth();
  const { wishlistCount, openWishlist } = useWishlist();

  const handleClose = () => dispatch(setMobileMenuOpen(false));

  const handleNav = (path: string) => {
    handleClose();
    navigate(path);
  };

  return (
    <Drawer
      anchor="left"
      open={mobileMenuOpen}
      onClose={handleClose}
      slotProps={{
        paper: {
          sx: {
            width: { xs: '85%', sm: 360 },
            backgroundColor: themeColors.paperBase,
            p: 3,
          },
        },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography
          variant="h6"
          sx={{
            fontFamily: '"Syne", sans-serif',
            fontWeight: 800,
            letterSpacing: '0.12em',
          }}
        >
          XIV QR
        </Typography>
        <IconButton onClick={handleClose} size="small" sx={{ color: themeColors.black }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <List sx={{ pt: 0 }}>
        {[
          { label: 'Home', path: '/' },
          { label: 'Collections', path: '/catalog' },
          { label: 'New Arrivals', path: '/catalog?sort=newest' },
          { label: 'Men Essentials', path: '/catalog?category=men' },
          { label: 'Women Capsule', path: '/catalog?category=women' },
        ].map((item) => (
          <ListItem key={item.label} disablePadding>
            <ListItemButton
              onClick={() => handleNav(item.path)}
              sx={{
                py: 1.5,
                px: 0,
                borderBottom: `1px solid ${themeColors.border}`,
              }}
            >
              <Typography
                sx={{
                  fontFamily: '"Syne", sans-serif',
                  fontWeight: 700,
                  fontSize: '1.05rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: themeColors.textPrimary,
                }}
              >
                {item.label}
              </Typography>
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider sx={{ my: 3 }} />

      {/* Account shortcuts */}
      <Box sx={{ mt: 'auto' }}>
        {isAuthenticated ? (
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
              {user?.name}
            </Typography>
            <Typography variant="caption" sx={{ color: themeColors.textMuted, display: 'block', mb: 2 }}>
              {user?.email} ({user?.role})
            </Typography>

            {isAdmin && (
              <Box
                onClick={() => handleNav('/admin')}
                sx={{
                  backgroundColor: themeColors.black,
                  color: themeColors.white,
                  p: 1.5,
                  textAlign: 'center',
                  fontFamily: '"Syne", sans-serif',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  mb: 1.5,
                }}
              >
                Go to Admin Dashboard
              </Box>
            )}

            <Box
              onClick={() => {
                handleClose();
                openWishlist();
              }}
              sx={{
                border: `1px solid ${themeColors.border}`,
                backgroundColor: themeColors.paperSurface,
                p: 1.5,
                textAlign: 'center',
                fontFamily: '"Syne", sans-serif',
                fontWeight: 700,
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                cursor: 'pointer',
                mb: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
              }}
            >
              <FavoriteBorderOutlinedIcon sx={{ fontSize: '1rem', color: '#E11D48' }} />
              My Wishlist {wishlistCount > 0 ? `(${wishlistCount})` : ''}
            </Box>

            <Box
              onClick={() => handleNav('/orders')}
              sx={{
                border: `1px solid ${themeColors.black}`,
                p: 1.5,
                textAlign: 'center',
                fontFamily: '"Syne", sans-serif',
                fontWeight: 700,
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                cursor: 'pointer',
                mb: 1.5,
              }}
            >
              My Orders & Returns
            </Box>

            <Typography
              onClick={() => {
                handleClose();
                logout();
              }}
              sx={{
                color: '#DC2626',
                fontFamily: '"Inter", sans-serif',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                textAlign: 'center',
                mt: 1,
              }}
            >
              Sign Out
            </Typography>
          </Box>
        ) : (
          <Box
            onClick={() => {
              handleClose();
              openAuthModal();
            }}
            sx={{
              backgroundColor: themeColors.black,
              color: themeColors.white,
              p: 1.5,
              textAlign: 'center',
              fontFamily: '"Syne", sans-serif',
              fontWeight: 700,
              fontSize: '0.85rem',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Sign In / Register
          </Box>
        )}
      </Box>
    </Drawer>
  );
};

export default MobileDrawer;
