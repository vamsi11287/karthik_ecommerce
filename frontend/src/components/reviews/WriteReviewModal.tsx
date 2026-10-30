import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  IconButton,
  Rating,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import StarIcon from '@mui/icons-material/Star';
import VerifiedIcon from '@mui/icons-material/Verified';
import { themeColors } from '../../theme/theme';
import { AppButton } from '../common/AppButton';
import { storeApi } from '../../hooks/useApi';
import { useAppDispatch } from '../../app/store';
import { showToast } from '../../app/uiSlice';
import { Review } from '../../types';

interface WriteReviewModalProps {
  open: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  productImage?: string;
  orderId?: string;
  initialReview?: Review | null;
  onSuccess?: (review: Review) => void;
}

const ratingLabels: Record<number, string> = {
  1: 'Poor — Unsatisfied with quality or fit',
  2: 'Fair — Below expectations',
  3: 'Average — Met basic expectations',
  4: 'Good — High quality & great fit',
  5: 'Excellent — Absolute luxury & perfection',
};

export const WriteReviewModal: React.FC<WriteReviewModalProps> = ({
  open,
  onClose,
  productId,
  productName,
  productImage,
  orderId,
  initialReview,
  onSuccess,
}) => {
  const dispatch = useAppDispatch();
  const [rating, setRating] = useState<number | null>(5);
  const [hoverRating, setHoverRating] = useState<number>(-1);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialReview) {
      setRating(initialReview.rating);
      setTitle(initialReview.title || '');
      setComment(initialReview.comment || '');
    } else {
      setRating(5);
      setTitle('');
      setComment('');
    }
    setHoverRating(-1);
  }, [initialReview, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating || rating < 1) {
      dispatch(showToast({ message: 'Please select a star rating (1 to 5)', severity: 'warning' }));
      return;
    }

    if (!comment.trim()) {
      dispatch(showToast({ message: 'Please write a brief comment describing your experience', severity: 'warning' }));
      return;
    }

    setSubmitting(true);
    try {
      const res = await storeApi.createProductReview(productId, {
        rating,
        title: title.trim(),
        comment: comment.trim(),
        orderId,
      });

      const savedReview = res.data?.data || res.data;
      dispatch(
        showToast({
          message: initialReview ? 'Review updated successfully' : 'Thank you! Your review has been submitted.',
          severity: 'success',
        })
      );

      if (onSuccess) {
        onSuccess(savedReview);
      }
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to submit review';
      dispatch(showToast({ message: msg, severity: 'error' }));
    } finally {
      setSubmitting(false);
    }
  };

  const currentDisplayRating = hoverRating !== -1 ? hoverRating : rating || 0;

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 0,
            p: { xs: 2, sm: 3 },
            border: `1px solid ${themeColors.border}`,
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          p: 0,
          pb: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: `1px solid ${themeColors.border}`,
        }}
      >
        <Box>
          <Typography
            variant="h6"
            sx={{
              fontFamily: '"Syne", sans-serif',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              fontSize: '1.1rem',
            }}
          >
            {initialReview ? 'Edit Your Review' : 'Rate & Review Piece'}
          </Typography>
          <Typography variant="caption" sx={{ color: themeColors.textMuted }}>
            Delivered Order Verified Purchase
          </Typography>
        </Box>
        <IconButton onClick={onClose} disabled={submitting} size="small" sx={{ color: themeColors.black }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, py: 3 }}>
        {/* Product preview */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            p: 2,
            backgroundColor: themeColors.paperSurface,
            border: `1px solid ${themeColors.border}`,
            mb: 3,
          }}
        >
          {productImage && (
            <Box
              component="img"
              src={productImage}
              alt={productName}
              sx={{
                width: 54,
                height: 64,
                objectFit: 'cover',
                border: `1px solid ${themeColors.border}`,
              }}
            />
          )}
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
              {productName}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
              <VerifiedIcon sx={{ fontSize: '0.9rem', color: '#059669' }} />
              <Typography variant="caption" sx={{ color: '#059669', fontWeight: 600 }}>
                Verified Delivered Purchase
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Rating Star Selection */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontFamily: '"Syne", sans-serif',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontSize: '0.82rem',
              mb: 1,
            }}
          >
            Your Overall Rating
          </Typography>
          <Rating
            name="product-rating"
            value={rating}
            precision={1}
            size="large"
            onChange={(_, val) => setRating(val)}
            onChangeActive={(_, hover) => setHoverRating(hover)}
            emptyIcon={<StarIcon style={{ opacity: 0.3 }} fontSize="inherit" />}
            sx={{
              fontSize: '2.4rem',
              color: '#F59E0B',
              '& .MuiRating-iconFilled': {
                color: '#F59E0B',
              },
            }}
          />
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mt: 1,
              fontWeight: 600,
              color: themeColors.textPrimary,
              minHeight: 20,
            }}
          >
            {ratingLabels[currentDisplayRating] || 'Select stars from 1 to 5'}
          </Typography>
        </Box>

        {/* Form Inputs */}
        <Box component="form" id="review-form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <TextField
            label="Review Headline / Title (Optional)"
            placeholder="e.g. Exceptional tailoring and luxurious fabric"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 0,
              },
            }}
          />

          <TextField
            label="Your Review *"
            placeholder="Tell us what you liked about this piece, how the size and fit felt, and how the material holds up..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required
            multiline
            rows={4}
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 0,
              },
            }}
          />
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          p: 0,
          pt: 2.5,
          borderTop: `1px solid ${themeColors.border}`,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 1.5,
        }}
      >
        <AppButton inverted disabled={submitting} onClick={onClose} sx={{ px: 3 }}>
          Cancel
        </AppButton>
        <AppButton
          type="submit"
          form="review-form"
          disabled={submitting || !comment.trim()}
          sx={{ px: 4, minWidth: 140 }}
        >
          {submitting ? <CircularProgress size={20} color="inherit" /> : initialReview ? 'Update Review' : 'Submit Review'}
        </AppButton>
      </DialogActions>
    </Dialog>
  );
};

export default WriteReviewModal;
