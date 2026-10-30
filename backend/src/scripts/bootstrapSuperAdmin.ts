import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { PermissionKey, UserRole } from '../config/constants';
import { connectDatabase } from '../config/database';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { User } from '../modules/users/user.model';

export const bootstrapSuperAdmin = async (): Promise<void> => {
  try {
    await connectDatabase();

    const existingSuperAdmin = await User.findOne({ role: UserRole.SUPER_ADMIN });
    if (existingSuperAdmin) {
      logger.info(`Super Admin already exists with email: ${existingSuperAdmin.email}`);
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(env.SUPER_ADMIN_PASSWORD, salt);

    const superAdmin = await User.create({
      name: env.SUPER_ADMIN_NAME,
      email: env.SUPER_ADMIN_EMAIL.toLowerCase(),
      phone: env.SUPER_ADMIN_PHONE,
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
      permissions: Object.values(PermissionKey),
    });

    logger.info('====================================================');
    logger.info(' Super Admin account successfully bootstrapped! ');
    logger.info(` Name:     ${superAdmin.name}`);
    logger.info(` Email:    ${superAdmin.email}`);
    logger.info(` Role:     ${superAdmin.role}`);
    logger.info(' Password: (configured in .env SUPER_ADMIN_PASSWORD)');
    logger.info('====================================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('Failed to bootstrap Super Admin:', error);
    process.exit(1);
  }
};

bootstrapSuperAdmin();
