import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { DEFAULT_ADMIN_PERMISSIONS, PermissionKey, UserRole } from '../config/constants';
import { connectDatabase } from '../config/database';
import { logger } from '../config/logger';
import { getStoreSettings } from '../modules/settings/storeSettings.model';
import { User } from '../modules/users/user.model';

export const seedTestUsers = async (): Promise<void> => {
  try {
    await connectDatabase();
    logger.info('Creating 3 Flow Test Credentials...');

    // Ensure default store settings exist
    const settings = await getStoreSettings();
    settings.paymentMethods.online.enabled = true;
    settings.paymentMethods.online.isDefault = true;
    settings.paymentMethods.cod.enabled = true;
    await settings.save();

    const salt = await bcrypt.genSalt(10);
    const superAdminPasswordHash = await bcrypt.hash('SuperAdmin@2026!', salt);
    const adminPasswordHash = await bcrypt.hash('Admin@2026!', salt);
    const customerPasswordHash = await bcrypt.hash('Customer@2026!', salt);

    // 1. Super Admin Account: vamsikommanapalli51@gmail.com
    await User.findOneAndUpdate(
      { email: 'vamsikommanapalli51@gmail.com' },
      {
        name: 'Vamsi SuperAdmin',
        email: 'vamsikommanapalli51@gmail.com',
        phone: '+919876543210',
        passwordHash: superAdminPasswordHash,
        role: UserRole.SUPER_ADMIN,
        isActive: true,
        permissions: Object.values(PermissionKey),
      },
      { upsert: true, new: true }
    );

    // 2. Admin Account: vamsikommanapalli5@gmail.com
    await User.findOneAndUpdate(
      { email: 'vamsikommanapalli5@gmail.com' },
      {
        name: 'Vamsi Admin',
        email: 'vamsikommanapalli5@gmail.com',
        phone: '+919876543212',
        passwordHash: adminPasswordHash,
        role: UserRole.ADMIN,
        isActive: true,
        permissions: DEFAULT_ADMIN_PERMISSIONS,
      },
      { upsert: true, new: true }
    );

    // 3. Customer Account: vamsi11287@gmail.com
    await User.findOneAndUpdate(
      { email: 'vamsi11287@gmail.com' },
      {
        name: 'Vamsi Customer',
        email: 'vamsi11287@gmail.com',
        phone: '+919876543211',
        passwordHash: customerPasswordHash,
        role: UserRole.CUSTOMER,
        isActive: true,
        addresses: [
          {
            fullName: 'Vamsi Customer',
            phone: '+919876543211',
            street: '42, Boulevard Heights, Bandra West',
            addressLine1: '42, Boulevard Heights',
            addressLine2: 'Bandra West',
            city: 'Mumbai',
            state: 'Maharashtra',
            postalCode: '400050',
            country: 'India',
            isDefault: true,
          },
        ],
      },
      { upsert: true, new: true }
    );

    console.log('\n============================================================');
    console.log(' ✨ 3 FLOW TEST ACCOUNTS SEEDED IN DATABASE');
    console.log('============================================================');
    console.log(' 1. SUPER ADMIN (Full Owner: settings, refunds, audits, all access)');
    console.log('    Email:    vamsikommanapalli51@gmail.com');
    console.log('    Password: SuperAdmin@2026!');
    console.log('------------------------------------------------------------');
    console.log(' 2. ADMIN (Store Operator: products, orders, coupons, tracking)');
    console.log('    Email:    vamsikommanapalli5@gmail.com');
    console.log('    Password: Admin@2026!');
    console.log('------------------------------------------------------------');
    console.log(' 3. CUSTOMER (Shopper: browse, cart, checkout, saved address, orders)');
    console.log('    Email:    vamsi11287@gmail.com');
    console.log('    Password: Customer@2026!');
    console.log('============================================================\n');

    await mongoose.disconnect();
    logger.info('Database disconnected cleanly.');
  } catch (error) {
    logger.error('Failed to seed test users:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  seedTestUsers();
}
