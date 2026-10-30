import React from 'react';
import { Box, Container, Grid, Typography, InputBase, Button, Divider } from '@mui/material';
import { Link } from 'react-router-dom';
import { themeColors } from '../../theme/theme';

export const Footer: React.FC = () => {
  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: '#121212',
        color: '#FFFFFF',
        pt: { xs: 8, md: 12 },
        pb: 6,
        borderTop: `1px solid ${themeColors.borderDark}`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Container maxWidth="xl">
        <Grid container spacing={{ xs: 4, md: 6 }} sx={{ mb: { xs: 8, md: 10 } }}>
          {/* Column 1: Brand & Manifesto */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Box
                sx={{
                  width: 14,
                  height: 14,
                  backgroundColor: '#FFFFFF',
                  transform: 'rotate(45deg)',
                }}
              />
              <Typography
                variant="h6"
                sx={{
                  fontFamily: '"Syne", sans-serif',
                  fontWeight: 800,
                  letterSpacing: '0.15em',
                  color: '#FFFFFF',
                }}
              >
                XIV QR
              </Typography>
            </Box>
            <Typography
              variant="body2"
              sx={{
                color: '#9E9E98',
                maxWidth: 320,
                lineHeight: 1.7,
                fontSize: '0.85rem',
                mb: 3,
              }}
            >
              Single-vendor editorial luxury streetwear crafted with architectural silhouettes, premium heavyweight cottons, and authoritative digital fulfillment.
            </Typography>
            <Typography variant="caption" sx={{ color: '#71716E', display: 'block' }}>
              Razorpay Authorized Secured Checkout • SSL 256-bit Encryption
            </Typography>
          </Grid>

          {/* Column 2: Navigation Links */}
          <Grid size={{ xs: 6, sm: 3, md: 2 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontFamily: '"Syne", sans-serif',
                fontWeight: 700,
                color: '#FFFFFF',
                mb: 2.5,
                letterSpacing: '0.08em',
              }}
            >
              Collections
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
              {[
                { label: 'New Arrivals', path: '/catalog?sort=newest' },
                { label: 'Men Apparel', path: '/catalog?category=men' },
                { label: 'Women Capsule', path: '/catalog?category=women' },
                { label: 'Accessories', path: '/catalog?category=accessories' },
                { label: 'Lookbook 23-24', path: '/catalog' },
              ].map((link) => (
                <Typography
                  key={link.label}
                  component={Link}
                  to={link.path}
                  variant="body2"
                  sx={{
                    color: '#9E9E98',
                    fontSize: '0.84rem',
                    transition: 'color 0.2s',
                    '&:hover': { color: '#FFFFFF' },
                  }}
                >
                  {link.label}
                </Typography>
              ))}
            </Box>
          </Grid>

          {/* Column 3: Customer Care & Policies */}
          <Grid size={{ xs: 6, sm: 3, md: 2 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontFamily: '"Syne", sans-serif',
                fontWeight: 700,
                color: '#FFFFFF',
                mb: 2.5,
                letterSpacing: '0.08em',
              }}
            >
              Client Care
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
              {[
                { label: 'Track Order', path: '/orders' },
                { label: 'Shipping & Delivery', path: '/catalog' },
                { label: 'Returns & Refunds', path: '/orders' },
                { label: 'Size Guide', path: '/catalog' },
                { label: 'Contact Concierge', path: '/catalog' },
              ].map((link) => (
                <Typography
                  key={link.label}
                  component={Link}
                  to={link.path}
                  variant="body2"
                  sx={{
                    color: '#9E9E98',
                    fontSize: '0.84rem',
                    transition: 'color 0.2s',
                    '&:hover': { color: '#FFFFFF' },
                  }}
                >
                  {link.label}
                </Typography>
              ))}
            </Box>
          </Grid>

          {/* Column 4: Newsletter */}
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontFamily: '"Syne", sans-serif',
                fontWeight: 700,
                color: '#FFFFFF',
                mb: 1.5,
                letterSpacing: '0.08em',
              }}
            >
              Privé Drops & Access
            </Typography>
            <Typography variant="body2" sx={{ color: '#9E9E98', mb: 2, fontSize: '0.85rem' }}>
              Subscribe to unlock private capsule releases, secret promo codes, and seasonal runway editorial previews.
            </Typography>

            <Box
              component="form"
              onSubmit={(e) => e.preventDefault()}
              sx={{
                display: 'flex',
                border: '1px solid #333333',
                backgroundColor: '#1E1E1E',
              }}
            >
              <InputBase
                placeholder="Enter your email address"
                sx={{
                  px: 2,
                  py: 1,
                  color: '#FFFFFF',
                  fontFamily: '"Inter", sans-serif',
                  fontSize: '0.82rem',
                  flex: 1,
                }}
              />
              <Button
                type="submit"
                sx={{
                  backgroundColor: '#FFFFFF',
                  color: '#121212',
                  borderRadius: 0,
                  px: 2.5,
                  fontFamily: '"Syne", sans-serif',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  '&:hover': { backgroundColor: '#E0E0DC' },
                }}
              >
                Join
              </Button>
            </Box>
          </Grid>
        </Grid>

        {/* Centerpiece Large Brand Artwork matching Attachment 2 */}
        <Box
          sx={{
            textAlign: 'center',
            py: { xs: 4, md: 6 },
            borderTop: '1px solid #242424',
            borderBottom: '1px solid #242424',
            mb: 4,
          }}
        >
          <Box
            sx={{
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Box
              sx={{
                width: 28,
                height: 28,
                backgroundColor: '#FFFFFF',
                transform: 'rotate(45deg)',
                mb: 1.5,
              }}
            />
            <Typography
              variant="h1"
              sx={{
                fontFamily: '"Syne", sans-serif',
                fontWeight: 800,
                fontSize: { xs: '3.5rem', sm: '5.5rem', md: '7.5rem' },
                color: '#FFFFFF',
                letterSpacing: '0.12em',
                lineHeight: 0.9,
                userSelect: 'none',
              }}
            >
              XIV QR
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontFamily: '"Inter", sans-serif',
                letterSpacing: '0.25em',
                color: '#71716E',
                textTransform: 'uppercase',
                mt: 1.5,
                fontSize: '0.72rem',
              }}
            >
              HAUTE MONOCHROME STREETWEAR • EST. 2024
            </Typography>
          </Box>
        </Box>

        {/* Bottom bar */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Typography variant="caption" sx={{ color: '#71716E' }}>
            © {new Date().getFullYear()} XIV QR Inc. All rights reserved. Single-Vendor Production Storefront.
          </Typography>
          <Box sx={{ display: 'flex', gap: 3 }}>
            <Typography
              component={Link}
              to="/catalog"
              variant="caption"
              sx={{ color: '#71716E', '&:hover': { color: '#FFF' } }}
            >
              Privacy Policy
            </Typography>
            <Typography
              component={Link}
              to="/catalog"
              variant="caption"
              sx={{ color: '#71716E', '&:hover': { color: '#FFF' } }}
            >
              Terms of Service
            </Typography>
            <Typography
              component={Link}
              to="/catalog"
              variant="caption"
              sx={{ color: '#71716E', '&:hover': { color: '#FFF' } }}
            >
              Security Blueprint
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
