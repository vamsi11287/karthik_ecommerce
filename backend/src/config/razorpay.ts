import Razorpay from 'razorpay';
import { env } from './env';
import { logger } from './logger';

export const getRazorpayClient = () => {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET || env.RAZORPAY_KEY_SECRET,
  });
};

export const razorpayClient = getRazorpayClient();
