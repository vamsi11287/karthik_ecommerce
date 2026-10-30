import bcrypt from 'bcryptjs';
import { NextFunction, Request, Response } from 'express';
import { DEFAULT_ADMIN_PERMISSIONS, PermissionKey, UserRole } from '../../config/constants';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../utils/errors';
import { sendResponse } from '../../utils/response';
import { logAuditEvent } from '../audit/audit.model';
import { User } from './user.model';

export const listAdminUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const admins = await User.find({
      role: { $in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] },
    }).select('-passwordHash');

    return sendResponse({
      res,
      data: admins,
    });
  } catch (error) {
    next(error);
  }
};

export const createAdminUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, phone, permissions } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ConflictError('A user with this email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const admin = await User.create({
      name,
      email: email.toLowerCase(),
      phone,
      passwordHash,
      role: UserRole.ADMIN,
      isActive: true,
      permissions: permissions && permissions.length > 0 ? permissions : DEFAULT_ADMIN_PERMISSIONS,
    });

    await logAuditEvent({
      userId: req.user!._id,
      userEmail: req.user!.email,
      userRole: req.user!.role,
      action: 'ADMIN_CREATED',
      resource: 'User',
      resourceId: admin._id.toString(),
      newState: { email: admin.email, role: admin.role, permissions: admin.permissions },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return sendResponse({
      res,
      statusCode: 201,
      message: 'Admin account created successfully',
      data: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions,
        isActive: admin.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateAdminPermissions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { permissions, isActive } = req.body;

    const targetUser = await User.findById(id);
    if (!targetUser) {
      throw new NotFoundError('Target admin user not found');
    }

    if (targetUser.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Super Admin permissions cannot be modified through this endpoint');
    }

    const previousState = {
      permissions: targetUser.permissions,
      isActive: targetUser.isActive,
    };

    if (permissions !== undefined) {
      targetUser.permissions = permissions;
    }

    if (isActive !== undefined) {
      targetUser.isActive = isActive;
    }

    await targetUser.save();

    await logAuditEvent({
      userId: req.user!._id,
      userEmail: req.user!.email,
      userRole: req.user!.role,
      action: 'ADMIN_PERMISSIONS_UPDATED',
      resource: 'User',
      resourceId: targetUser._id.toString(),
      previousState,
      newState: { permissions: targetUser.permissions, isActive: targetUser.isActive },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return sendResponse({
      res,
      message: 'Admin permissions updated successfully',
      data: {
        id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        permissions: targetUser.permissions,
        isActive: targetUser.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const listCustomers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string) || '';

    const query: any = { role: UserRole.CUSTOMER };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await User.countDocuments(query);
    const customers = await User.find(query)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return sendResponse({
      res,
      data: customers,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};
