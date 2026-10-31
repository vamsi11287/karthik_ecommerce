import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  IconButton,
  Badge,
  InputBase,
  Menu,
  MenuItem,
  Divider,
  Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { themeColors } from '../../theme/theme';
import useAuth from '../../hooks/useAuth';
import useCart from '../../hooks/useCart';
import useWishlist from '../../hooks/useWishlist';
import { storeApi } from '../../hooks/useApi';
import { useAppDispatch } from '../../app/store';
import { setMobileMenuOpen } from '../../app/uiSlice';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, isAdmin, logout, openAuthModal } = useAuth();
  const { totalItemCount, openDrawer } = useCart();
  const { wishlistCount, openWishlist } = useWishlist();

  const [searchVal, setSearchVal] = useState('');
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [navCategories, setNavCategories] = useState<Array<{ label: string; path: string }>>([]);

  useEffect(() => {
    storeApi
      .getCategories()
      .then((res) => {
        const list = res.data?.data || res.data || [];
        if (Array.isArray(list)) {
          const parents = list.filter((c: any) => !c.parentCategory);
          setNavCategories(
            parents.map((c: any) => ({
              label: c.name,
              path: `/catalog?category=${encodeURIComponent(c.slug || c.name.toLowerCase())}`,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) {
      navigate(`/catalog?search=${encodeURIComponent(searchVal.trim())}`);
    }
  };

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Collections', path: '/catalog' },
    ...(navCategories.length > 0
      ? navCategories
      : [
          { label: 'Men', path: '/catalog?category=men' },
          { label: 'Women', path: '/catalog?category=women' },
          { label: 'Others', path: '/catalog?category=others' },
        ]),
  ];

  return (
    <Box
      component="header"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 1100,
        backgroundColor: 'rgba(236, 236, 232, 0.95)',
        backdropFilter: 'blur(8px)',
        borderBottom: `1px solid ${themeColors.border}`,
        transition: 'all 0.2s ease',
      }}
    >
      <Container maxWidth="xl">
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: { xs: 64, md: 74 },
            gap: 2,
          }}
        >
          {/* Left: Mobile hamburger & Desktop Navigation Links */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flex: 1 }}>
            <IconButton
              edge="start"
              onClick={() => dispatch(setMobileMenuOpen(true))}
              sx={{ display: { xs: 'flex', md: 'none' }, color: themeColors.black }}
            >
              <MenuIcon />
            </IconButton>

            {/* Desktop Nav Items */}
            <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 2.5 }}>
              {navLinks.map((link) => {
                const active = location.pathname + location.search === link.path;
                return (
                  <Typography
                    key={link.label}
                    component={Link}
                    to={link.path}
                    sx={{
                      fontFamily: '"Inter", sans-serif',
                      fontWeight: active ? 700 : 500,
                      fontSize: '0.84rem',
                      letterSpacing: '0.04em',
                      color: active ? themeColors.black : themeColors.textSecondary,
                      textTransform: 'uppercase',
                      transition: 'color 0.2s',
                      position: 'relative',
                      '&:hover': { color: themeColors.black },
                      ...(active && {
                        '&::after': {
                          content: '""',
                          position: 'absolute',
                          bottom: -4,
                          left: 0,
                          width: '100%',
                          height: '2px',
                          backgroundColor: themeColors.black,
                        },
                      }),
                    }}
                  >
                    {link.label}
                  </Typography>
                );
              })}
            </Box>

            {/* Search Box */}
            <Box
              component="form"
              onSubmit={handleSearchSubmit}
              sx={{
                display: { xs: 'none', lg: 'flex' },
                alignItems: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.85)',
                border: `1px solid ${themeColors.border}`,
                px: 1.5,
                py: 0.5,
                width: 220,
                transition: 'width 0.3s ease, border-color 0.2s ease',
                '&:focus-within': {
                  width: 280,
                  borderColor: themeColors.black,
                  backgroundColor: '#FFFFFF',
                },
              }}
            >
              <SearchIcon sx={{ color: themeColors.textMuted, fontSize: '1.1rem', mr: 1 }} />
              <InputBase
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                placeholder="Search catalog..."
                sx={{
                  fontFamily: '"Inter", sans-serif',
                  fontSize: '0.82rem',
                  color: themeColors.textPrimary,
                  width: '100%',
                }}
              />
            </Box>
          </Box>

          {/* Center: Brand Logo */}
          <Box
            component={Link}
            to="/"
            sx={{
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
              mx: 'auto',
            }}
          >
            <Box
              component="img"
              src="/logo.png"
              alt="SPUN"
              sx={{
                height: { xs: 30, sm: 36, md: 42 },
                objectFit: 'contain',
                display: 'block',
                transition: 'opacity 0.2s ease',
                '&:hover': { opacity: 0.8 },
              }}
            />
          </Box>

          {/* Right: Actions (Admin badge, Wishlist, Cart, Account) */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: { xs: 1, sm: 1.5 },
              flex: 1,
            }}
          >
            {/* Admin Portal Shortcut for Admins / Super Admin */}
            {isAdmin && (
              <Box
                component={Link}
                to="/admin"
                sx={{
                  display: { xs: 'none', sm: 'flex' },
                  alignItems: 'center',
                  gap: 0.8,
                  backgroundColor: themeColors.black,
                  color: themeColors.white,
                  px: 1.6,
                  py: 0.6,
                  fontSize: '0.75rem',
                  fontFamily: '"Syne", sans-serif',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  '&:hover': {
                    backgroundColor: '#333333',
                  },
                }}
              >
                <DashboardOutlinedIcon sx={{ fontSize: '0.95rem' }} />
                Admin
              </Box>
            )}

            {/* Wishlist Button with Badge */}
            <Tooltip title="View Wishlist">
              <IconButton
                onClick={openWishlist}
                sx={{ color: themeColors.black }}
                size="small"
              >
                <Badge
                  badgeContent={wishlistCount}
                  sx={{
                    '& .MuiBadge-badge': {
                      backgroundColor: '#E11D48',
                      color: themeColors.white,
                      fontFamily: '"Syne", sans-serif',
                      fontWeight: 700,
                      fontSize: '0.65rem',
                      minWidth: 18,
                      height: 18,
                    },
                  }}
                >
                  <FavoriteBorderOutlinedIcon sx={{ fontSize: '1.25rem' }} />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* Shopping Bag Button with Badge */}
            <IconButton
              onClick={openDrawer}
              sx={{ color: themeColors.black }}
              size="small"
            >
              <Badge
                badgeContent={totalItemCount}
                sx={{
                  '& .MuiBadge-badge': {
                    backgroundColor: themeColors.black,
                    color: themeColors.white,
                    fontFamily: '"Syne", sans-serif',
                    fontWeight: 700,
                    fontSize: '0.65rem',
                    minWidth: 18,
                    height: 18,
                  },
                }}
              >
                <ShoppingBagOutlinedIcon sx={{ fontSize: '1.25rem' }} />
              </Badge>
            </IconButton>

            {/* User Account Menu */}
            <IconButton
              onClick={(e) => {
                if (isAuthenticated) {
                  setUserMenuAnchor(e.currentTarget);
                } else {
                  openAuthModal();
                }
              }}
              sx={{ color: themeColors.black }}
              size="small"
            >
              <PersonOutlineOutlinedIcon sx={{ fontSize: '1.35rem' }} />
            </IconButton>

            {/* User Dropdown Menu */}
            <Menu
              anchorEl={userMenuAnchor}
              open={Boolean(userMenuAnchor)}
              onClose={() => setUserMenuAnchor(null)}
              slotProps={{
                paper: {
                  sx: {
                    borderRadius: 0,
                    border: `1px solid ${themeColors.border}`,
                    mt: 1.5,
                    minWidth: 200,
                    boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
                    backgroundColor: '#FFFFFF',
                  },
                },
              }}
            >
              <Box sx={{ px: 2, py: 1.2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: themeColors.textPrimary }}>
                  {user?.name || 'Customer'}
                </Typography>
                <Typography variant="caption" sx={{ color: themeColors.textMuted }}>
                  {user?.email}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    mt: 0.4,
                    color: themeColors.accentBlue,
                    fontWeight: 700,
                    fontSize: '0.68rem',
                  }}
                >
                  ROLE: {user?.role}
                </Typography>
              </Box>

              <Divider />

              {isAdmin && (
                <MenuItem
                  onClick={() => {
                    setUserMenuAnchor(null);
                    navigate('/admin');
                  }}
                  sx={{ fontFamily: '"Inter", sans-serif', fontSize: '0.85rem' }}
                >
                  <DashboardOutlinedIcon sx={{ fontSize: '1rem', mr: 1 }} />
                  Admin Dashboard
                </MenuItem>
              )}

              <MenuItem
                onClick={() => {
                  setUserMenuAnchor(null);
                  navigate('/orders');
                }}
                sx={{ fontFamily: '"Inter", sans-serif', fontSize: '0.85rem' }}
              >
                My Orders & Returns
              </MenuItem>

              <MenuItem
                onClick={() => {
                  setUserMenuAnchor(null);
                  logout();
                }}
                sx={{ fontFamily: '"Inter", sans-serif', fontSize: '0.85rem', color: '#DC2626' }}
              >
                <LogoutOutlinedIcon sx={{ fontSize: '1rem', mr: 1 }} />
                Log Out
              </MenuItem>
            </Menu>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Navbar;
