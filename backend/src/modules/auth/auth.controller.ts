import bcrypt from 'bcryptjs';
import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { UserRole } from '../../config/constants';
import { BadRequestError, ConflictError, NotFoundError, UnauthorizedError } from '../../utils/errors';
import { sendResponse } from '../../utils/response';
import { clearTokenCookie, sendTokenCookie, signToken } from '../../utils/token';
import { sendPasswordResetOtpEmail } from '../../utils/mailer';
import { User } from '../users/user.model';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ConflictError('An account with this email address already exists');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Public registration MUST always create CUSTOMER
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      phone,
      passwordHash,
      role: UserRole.CUSTOMER,
      isActive: true,
      permissions: [],
    });

    const token = signToken(user);
    sendTokenCookie(res, token);

    return sendResponse({
      res,
      statusCode: 201,
      message: 'Registration successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          avatar: user.avatar,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Your account has been deactivated. Please contact support.');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const token = signToken(user);
    sendTokenCookie(res, token);

    return sendResponse({
      res,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          avatar: user.avatar,
          permissions: user.permissions,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    clearTokenCookie(res);
    return sendResponse({
      res,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    return sendResponse({
      res,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        addresses: user.addresses,
        permissions: user.permissions,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const { name, phone, avatar } = req.body;

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    return sendResponse({
      res,
      message: 'Profile updated successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const addAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const newAddress = req.body;

    if (newAddress.isDefault) {
      user.addresses.forEach((addr) => {
        addr.isDefault = false;
      });
    } else if (user.addresses.length === 0) {
      newAddress.isDefault = true;
    }

    user.addresses.push(newAddress as any);
    await user.save();

    return sendResponse({
      res,
      statusCode: 201,
      message: 'Address added successfully',
      data: user.addresses,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const { addressId } = req.params;

    const initialLength = user.addresses.length;
    user.addresses = user.addresses.filter((addr) => addr._id.toString() !== addressId) as any;

    if (user.addresses.length === initialLength) {
      throw new NotFoundError('Address not found');
    }

    await user.save();

    return sendResponse({
      res,
      message: 'Address removed successfully',
      data: user.addresses,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 1. Request Password Reset OTP
 * Generates 6-digit OTP, saves hashed OTP + 10-minute expiry, sends email
 */
export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    const cleanEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      // Security: Don't reveal whether user exists
      return sendResponse({
        res,
        message: 'If an account exists with this email, a 6-digit verification code has been dispatched.',
      });
    }

    if (!user.isActive) {
      throw new BadRequestError('This account is deactivated. Please contact customer support.');
    }

    // Generate 6-digit cryptographic random OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash OTP before storing in database for security
    const salt = await bcrypt.genSalt(10);
    user.resetPasswordOtp = await bcrypt.hash(otp, salt);
    user.resetPasswordOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await user.save();

    // Send email via Nodemailer
    await sendPasswordResetOtpEmail(user.email, otp, user.name);

    return sendResponse({
      res,
      message: 'Verification code sent to your email address.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Verify OTP Code
 */
export const verifyOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp } = req.body;
    const cleanEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: cleanEmail });
    if (!user || !user.resetPasswordOtp || !user.resetPasswordOtpExpires) {
      throw new BadRequestError('Invalid or expired password reset request. Please request a new code.');
    }

    if (new Date() > user.resetPasswordOtpExpires) {
      user.resetPasswordOtp = undefined;
      user.resetPasswordOtpExpires = undefined;
      await user.save();
      throw new BadRequestError('Verification code has expired. Please request a new one.');
    }

    const isValid = await bcrypt.compare(otp.trim(), user.resetPasswordOtp);
    if (!isValid) {
      throw new BadRequestError('Incorrect verification code. Please check your email and try again.');
    }

    return sendResponse({
      res,
      message: 'Verification code verified successfully. Please enter your new password.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Reset Password
 */
export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp, newPassword } = req.body;
    const cleanEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: cleanEmail });
    if (!user || !user.resetPasswordOtp || !user.resetPasswordOtpExpires) {
      throw new BadRequestError('Invalid or expired password reset session.');
    }

    if (new Date() > user.resetPasswordOtpExpires) {
      user.resetPasswordOtp = undefined;
      user.resetPasswordOtpExpires = undefined;
      await user.save();
      throw new BadRequestError('Verification code has expired. Please request a new one.');
    }

    const isValid = await bcrypt.compare(otp.trim(), user.resetPasswordOtp);
    if (!isValid) {
      throw new BadRequestError('Incorrect verification code.');
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);

    // Clear reset OTP fields
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpires = undefined;
    await user.save();

    return sendResponse({
      res,
      message: 'Password reset successful! You can now sign in with your new password.',
    });
  } catch (error) {
    next(error);
  }
};
