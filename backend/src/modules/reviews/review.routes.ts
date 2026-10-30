import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import {
  createReview,
  deleteReview,
  getMyReviews,
  getProductReviews,
} from './review.controller';

const router = Router();

// Customer personal reviews
router.get('/my', authenticate, getMyReviews);

// Public reviews
router.get('/products/:productId', getProductReviews);

// Customer review actions
router.post('/products/:productId', authenticate, createReview);
router.delete('/:id', authenticate, deleteReview);

export default router;
