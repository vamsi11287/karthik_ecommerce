import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import {
  addAddress,
  deleteAddress,
  getMe,
  login,
  logout,
  register,
  updateProfile,
} from './auth.controller';
import {
  addressSchema,
  loginSchema,
  registerSchema,
  updateProfileSchema,
} from './auth.validation';

const router = Router();

router.post('/register', validateRequest(registerSchema), register);
router.post('/login', validateRequest(loginSchema), login);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);
router.patch('/profile', authenticate, validateRequest(updateProfileSchema), updateProfile);
router.post('/addresses', authenticate, validateRequest(addressSchema), addAddress);
router.delete('/addresses/:addressId', authenticate, deleteAddress);

export default router;
