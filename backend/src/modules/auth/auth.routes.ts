import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import {
  addAddress,
  deleteAddress,
  forgotPassword,
  getMe,
  login,
  logout,
  register,
  resetPassword,
  updateProfile,
  verifyOtp,
} from './auth.controller';
import {
  addressSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
  verifyOtpSchema,
} from './auth.validation';

const router = Router();

router.post('/register', validateRequest(registerSchema), register);
router.post('/login', validateRequest(loginSchema), login);
router.post('/logout', logout);
router.post('/forgot-password', validateRequest(forgotPasswordSchema), forgotPassword);
router.post('/verify-otp', validateRequest(verifyOtpSchema), verifyOtp);
router.post('/reset-password', validateRequest(resetPasswordSchema), resetPassword);
router.get('/me', authenticate, getMe);
router.patch('/profile', authenticate, validateRequest(updateProfileSchema), updateProfile);
router.post('/addresses', authenticate, validateRequest(addressSchema), addAddress);
router.delete('/addresses/:addressId', authenticate, deleteAddress);

export default router;
