import { NextFunction, Request, Response } from 'express';
import { PermissionKey, UserRole } from '../../config/constants';
import { BadRequestError, ForbiddenError } from '../../utils/errors';
import { sendResponse } from '../../utils/response';
import { logAuditEvent } from '../audit/audit.model';
import { getStoreSettings, StoreSettings } from './storeSettings.model';

export const getPublicSettings = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await getStoreSettings();

    return sendResponse({
      res,
      data: {
        storeName: settings.storeName,
        storeEmail: settings.storeEmail,
        storePhone: settings.storePhone,
        currency: settings.currency,
        paymentMethods: {
          online: {
            enabled: settings.paymentMethods.online.enabled,
            isDefault: settings.paymentMethods.online.isDefault,
            provider: settings.paymentMethods.online.provider,
          },
          cod: {
            enabled: settings.paymentMethods.cod.enabled,
          },
        },
        shippingPolicy: settings.shippingPolicy,
        taxRatePercent: settings.taxRatePercent,
        returnPolicy: settings.returnPolicy,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminSettings = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await getStoreSettings();
    return sendResponse({
      res,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePaymentSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const paymentMethodsData = req.body.paymentMethods || req.body || {};
    const online = paymentMethodsData.online;
    const cod = paymentMethodsData.cod;

    const codEnabled =
      cod?.enabled !== undefined
        ? Boolean(cod.enabled)
        : paymentMethodsData.codEnabled !== undefined
        ? Boolean(paymentMethodsData.codEnabled)
        : undefined;

    const onlineEnabled =
      online?.enabled !== undefined
        ? Boolean(online.enabled)
        : paymentMethodsData.onlineEnabled !== undefined
        ? Boolean(paymentMethodsData.onlineEnabled)
        : undefined;

    const settings = await getStoreSettings();
    const previousState = JSON.parse(JSON.stringify(settings.paymentMethods));

    // Admin can only change COD if explicitly granted permission
    if (user.role === UserRole.ADMIN) {
      if (
        onlineEnabled !== undefined &&
        onlineEnabled !== settings.paymentMethods.online.enabled
      ) {
        throw new ForbiddenError('Admin is not permitted to alter Online Payment settings');
      }
      if (!user.hasPermission(PermissionKey.SETTINGS_PAYMENT_METHODS_MANAGE)) {
        throw new ForbiddenError('You do not have permission to modify payment method settings');
      }
    }

    if (onlineEnabled !== undefined && (user.role === UserRole.SUPER_ADMIN || !user.role)) {
      settings.paymentMethods.online.enabled = onlineEnabled;
      if (online?.isDefault !== undefined) settings.paymentMethods.online.isDefault = Boolean(online.isDefault);
      if (online?.provider !== undefined) settings.paymentMethods.online.provider = String(online.provider);
    }

    if (codEnabled !== undefined) {
      settings.paymentMethods.cod.enabled = codEnabled;
    }

    // Integrity validations:
    // 1. At least one payment method must remain enabled
    if (!settings.paymentMethods.online.enabled && !settings.paymentMethods.cod.enabled) {
      throw new BadRequestError('Cannot disable all payment methods. At least one must be active.');
    }

    // 2. Default method must be an enabled method
    if (settings.paymentMethods.online.isDefault && !settings.paymentMethods.online.enabled) {
      settings.paymentMethods.online.isDefault = false;
    }

    settings.markModified('paymentMethods');
    settings.updatedBy = user._id;
    await settings.save();

    await logAuditEvent({
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      action: 'PAYMENT_SETTINGS_UPDATED',
      resource: 'StoreSettings',
      previousState,
      newState: settings.paymentMethods,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return sendResponse({
      res,
      message: 'Payment methods updated successfully',
      data: settings.paymentMethods,
    });
  } catch (error) {
    next(error);
  }
};

export const updateStorePolicies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const { storeName, storeEmail, storePhone, shippingPolicy, taxRatePercent, returnPolicy } =
      req.body;

    const settings = await getStoreSettings();

    if (storeName) settings.storeName = storeName;
    if (storeEmail) settings.storeEmail = storeEmail;
    if (storePhone) settings.storePhone = storePhone;
    if (shippingPolicy) settings.shippingPolicy = shippingPolicy;
    if (taxRatePercent !== undefined) settings.taxRatePercent = taxRatePercent;
    if (returnPolicy) settings.returnPolicy = returnPolicy;

    settings.updatedBy = user._id;
    await settings.save();

    await logAuditEvent({
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      action: 'STORE_POLICIES_UPDATED',
      resource: 'StoreSettings',
      newState: { shippingPolicy, taxRatePercent, returnPolicy },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return sendResponse({
      res,
      message: 'Store settings updated successfully',
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};
