import { Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { IUser } from '../modules/users/user.model';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export const signToken = (user: IUser): string => {
  const payload: TokenPayload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as any,
  });
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
};

export const sendTokenCookie = (res: Response, token: string): void => {
  const isProduction = env.NODE_ENV === 'production';
  
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
};

export const clearTokenCookie = (res: Response): void => {
  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });
};
