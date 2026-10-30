import React from 'react';
import { Box, Typography, Button, IconButton } from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { Link } from 'react-router-dom';
import { themeColors } from '../../theme/theme';

interface SectionHeaderProps {
  title: string;
  badgeCount?: number | string;
  subtitle?: string;
  actionText?: string;
  actionLink?: string;
  onPrev?: () => void;
  onNext?: () => void;
  centered?: boolean;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  badgeCount,
  subtitle,
  actionText,
  actionLink,
  onPrev,
  onNext,
  centered = false,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: centered ? 'column' : 'row' },
        justifyContent: centered ? 'center' : 'space-between',
        alignItems: centered ? 'center' : { xs: 'flex-start', sm: 'flex-end' },
        mb: { xs: 3, md: 4 },
        gap: 1.5,
        textAlign: centered ? 'center' : 'left',
      }}
    >
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: centered ? 'center' : 'flex-start' }}>
          <Typography
            variant="h3"
            sx={{
              fontFamily: '"Syne", sans-serif',
              fontWeight: 800,
              fontSize: { xs: '1.5rem', sm: '2rem', md: '2.4rem' },
              color: themeColors.textPrimary,
              lineHeight: 1,
            }}
          >
            {title}
          </Typography>

          {badgeCount !== undefined && (
            <Typography
              component="span"
              sx={{
                fontFamily: '"Syne", sans-serif',
                fontWeight: 700,
                color: themeColors.accentBlue,
                fontSize: { xs: '1.2rem', sm: '1.6rem' },
              }}
            >
              ({badgeCount})
            </Typography>
          )}
        </Box>

        {subtitle && (
          <Typography
            variant="body2"
            sx={{
              mt: 1,
              color: themeColors.textSecondary,
              maxWidth: centered ? 680 : 540,
              fontSize: { xs: '0.85rem', sm: '0.95rem' },
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>

      {/* Optional action link or carousel arrows */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {actionText && actionLink && (
          <Button
            component={Link}
            to={actionLink}
            variant="text"
            sx={{
              color: themeColors.textPrimary,
              fontFamily: '"Inter", sans-serif',
              fontWeight: 600,
              fontSize: '0.8rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              p: 0,
              minWidth: 0,
              '&:hover': {
                backgroundColor: 'transparent',
                textDecoration: 'underline',
              },
            }}
          >
            {actionText}
          </Button>
        )}

        {(onPrev || onNext) && (
          <Box sx={{ display: 'flex', gap: 0.8 }}>
            <IconButton
              size="small"
              onClick={onPrev}
              sx={{
                borderRadius: 0,
                border: `1px solid ${themeColors.border}`,
                width: 32,
                height: 32,
                backgroundColor: themeColors.white,
                '&:hover': { backgroundColor: themeColors.black, color: themeColors.white },
              }}
            >
              <ArrowBackIosNewIcon sx={{ fontSize: '0.75rem' }} />
            </IconButton>
            <IconButton
              size="small"
              onClick={onNext}
              sx={{
                borderRadius: 0,
                border: `1px solid ${themeColors.border}`,
                width: 32,
                height: 32,
                backgroundColor: themeColors.white,
                '&:hover': { backgroundColor: themeColors.black, color: themeColors.white },
              }}
            >
              <ArrowForwardIosIcon sx={{ fontSize: '0.75rem' }} />
            </IconButton>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default SectionHeader;
