import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { getWishlist, toggleWishlistItem } from './wishlist.controller';

const router = Router();

router.use(authenticate);

router.get('/', getWishlist);
router.post('/toggle', toggleWishlistItem);

export default router;
