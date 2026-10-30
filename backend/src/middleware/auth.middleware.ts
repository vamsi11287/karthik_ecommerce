import { NextFunction, Request, Response } from 'express';
import { IUser, User } from '../modules/users/user.model';
import { UnauthorizedError } from '../utils/errors';
import { verifyToken } from '../utils/token';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    // 1. Check HttpOnly cookie
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    // 2. Check Authorization Bearer header
    else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new UnauthorizedError('Authentication required. Please log in.');
    }

    // Verify token
    const decoded = verifyToken(token);

    // Fetch user from database
    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new UnauthorizedError('User account not found. Please log in again.');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Your account has been deactivated. Please contact support.');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

// Optional authentication for guest carts or public endpoints with customized views
export const optionalAuthenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = verifyToken(token);
        const user = await User.findById(decoded.userId);
        if (user && user.isActive) {
          req.user = user;
        }
      } catch {
        // Silently ignore invalid token for optional auth
      }
    }
    next();
  } catch (error) {
    next(error);
  }
};
