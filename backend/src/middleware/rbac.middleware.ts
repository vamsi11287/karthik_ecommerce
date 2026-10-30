import { NextFunction, Request, Response } from 'express';
import { PermissionKey, UserRole } from '../config/constants';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Access forbidden. Role '${req.user.role}' is not authorized for this resource.`
        )
      );
    }

    next();
  };
};

export const requirePermission = (permission: PermissionKey) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    // Super Admin has all permissions
    if (req.user.role === UserRole.SUPER_ADMIN) {
      return next();
    }

    // Customer never has administrative permissions
    if (req.user.role === UserRole.CUSTOMER) {
      return next(new ForbiddenError('Access forbidden. Customers cannot access admin resources.'));
    }

    // Check Admin permissions
    if (req.user.hasPermission(permission)) {
      return next();
    }

    return next(
      new ForbiddenError(
        `Access forbidden. You do not have the required permission: '${permission}'.`
      )
    );
  };
};

export const requireOwnershipOrAdmin = (
  getResourceOwnerId: (req: Request) => string | undefined,
  adminPermission?: PermissionKey
) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    // Super Admin always allowed
    if (req.user.role === UserRole.SUPER_ADMIN) {
      return next();
    }

    // Admin allowed if they have the necessary permission
    if (
      req.user.role === UserRole.ADMIN &&
      (!adminPermission || req.user.hasPermission(adminPermission))
    ) {
      return next();
    }

    // Customer must be the owner of the resource
    const ownerId = getResourceOwnerId(req);
    if (ownerId && req.user._id.toString() === ownerId.toString()) {
      return next();
    }

    return next(new ForbiddenError('Access denied. You do not own this resource.'));
  };
};
