import { Router } from 'express';
import { authenticate, optionalAuthenticate } from '../../middleware/auth.middleware';
import { getCheckoutQuote, initiateCheckout } from './checkout.controller';

const router = Router();

// Quote can be fetched with or without logging in to display live price breakdown in cart
router.post('/quote', optionalAuthenticate, getCheckoutQuote);

// Initiating checkout requires authentication
router.post('/initiate', authenticate, initiateCheckout);

export default router;
