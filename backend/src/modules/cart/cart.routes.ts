import { Router } from 'express';
import { optionalAuthenticate, authenticate } from '../../middleware/auth.middleware';
import {
  addToCart,
  clearCart,
  getCart,
  mergeGuestCart,
  removeCartItem,
  updateCartItem,
  validateCartItems,
} from './cart.controller';

const router = Router();

router.get('/', optionalAuthenticate, getCart);
router.delete('/', optionalAuthenticate, clearCart);
router.post('/items', optionalAuthenticate, addToCart);
router.post('/validate', optionalAuthenticate, validateCartItems);
router.patch('/items/:itemId', optionalAuthenticate, updateCartItem);
router.delete('/items/:itemId', optionalAuthenticate, removeCartItem);
router.post('/merge', authenticate, mergeGuestCart);

export default router;
