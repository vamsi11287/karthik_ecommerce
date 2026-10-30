import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { DEFAULT_ADMIN_PERMISSIONS, PermissionKey, UserRole } from '../config/constants';
import { connectDatabase } from '../config/database';
import { logger } from '../config/logger';
import { Category } from '../modules/categories/category.model';
import { Coupon, DiscountType } from '../modules/coupons/coupon.model';
import { Offer } from '../modules/offers/offer.model';
import { Product } from '../modules/products/product.model';
import { getStoreSettings } from '../modules/settings/storeSettings.model';
import { User } from '../modules/users/user.model';

export const seedDatabase = async (): Promise<void> => {
  try {
    await connectDatabase();
    logger.info('Starting database seeding...');

    // 1. Ensure Store Settings
    const settings = await getStoreSettings();
    settings.paymentMethods.online.enabled = true;
    settings.paymentMethods.online.isDefault = true;
    settings.paymentMethods.cod.enabled = false;
    await settings.save();

    // 2. Clear old data except users (or upsert)
    await Category.deleteMany({});
    await Product.deleteMany({});
    await Offer.deleteMany({});
    await Coupon.deleteMany({});

    // 3. Create Categories
    const categoriesData = [
      {
        name: 'Men',
        slug: 'men',
        description: 'Modern luxury streetwear and tailored essentials for men.',
        displayOrder: 1,
      },
      {
        name: 'Women',
        slug: 'women',
        description: 'Contemporary oversized silhouettes and minimalist aesthetics.',
        displayOrder: 2,
      },
      {
        name: 'Collections',
        slug: 'collections',
        description: 'Seasonal drops, runway lookbook pieces, and exclusive capsule edits.',
        displayOrder: 3,
      },
      {
        name: 'Accessories',
        slug: 'accessories',
        description: 'Caps, bags, leather goods, and utilitarian jewelry.',
        displayOrder: 4,
      },
    ];

    const createdCategories = await Category.insertMany(categoriesData);
    const menCat = createdCategories.find((c) => c.slug === 'men')!;
    const collectionsCat = createdCategories.find((c) => c.slug === 'collections')!;

    // 4. Create Products matching the design style
    const productsData = [
      {
        name: 'Embroidery Oversized Shirt',
        slug: 'embroidery-oversized-shirt',
        sku: 'XIV-SHIRT-001',
        description:
          'High-density cotton poplin shirt featuring abstract botanical monochrome embroidery. Designed with a dropped shoulder, relaxed camp collar, and custom horn buttons.',
        category: menCat._id,
        brand: 'XIV COLLECTIONS',
        sellingPrice: 1999,
        originalPrice: 2499,
        hasVariants: true,
        variants: [
          { sku: 'XIV-SHIRT-001-S', size: 'S', color: 'Chalk White', price: 1999, originalPrice: 2499, stock: 25, reservedStock: 0 },
          { sku: 'XIV-SHIRT-001-M', size: 'M', color: 'Chalk White', price: 1999, originalPrice: 2499, stock: 35, reservedStock: 0 },
          { sku: 'XIV-SHIRT-001-L', size: 'L', color: 'Chalk White', price: 1999, originalPrice: 2499, stock: 20, reservedStock: 0 },
          { sku: 'XIV-SHIRT-001-XL', size: 'XL', color: 'Chalk White', price: 1999, originalPrice: 2499, stock: 15, reservedStock: 0 },
        ],
        images: [
          { url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&auto=format&fit=crop&q=80', isDefault: true, alt: 'Embroidery Oversized Shirt' },
          { url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&auto=format&fit=crop&q=80', isDefault: false, alt: 'Fabric Detail' },
        ],
        totalStock: 95,
        isPublished: true,
        isFeatured: true,
        isNewArrival: true,
        tags: ['shirt', 'oversized', 'embroidery', 'xiv', 'summer24'],
        ratingsAverage: 4.8,
        ratingsCount: 24,
      },
      {
        name: 'Basic Heavyweight T-Shirt',
        slug: 'basic-heavyweight-t-shirt',
        sku: 'XIV-TEE-002',
        description:
          'Crafted from 280 GSM premium organic combed cotton. Pre-shrunk with a structured boxy drape, tight ribbed collar, and minimal twin-needle stitching.',
        category: menCat._id,
        brand: 'XIV COLLECTIONS',
        sellingPrice: 999,
        originalPrice: 1499,
        hasVariants: true,
        variants: [
          { sku: 'XIV-TEE-002-S', size: 'S', color: 'Off White', price: 999, originalPrice: 1499, stock: 40, reservedStock: 0 },
          { sku: 'XIV-TEE-002-M', size: 'M', color: 'Off White', price: 999, originalPrice: 1499, stock: 50, reservedStock: 0 },
          { sku: 'XIV-TEE-002-L', size: 'L', color: 'Off White', price: 999, originalPrice: 1499, stock: 30, reservedStock: 0 },
        ],
        images: [
          { url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80', isDefault: true, alt: 'Basic Heavyweight T-Shirt' },
        ],
        totalStock: 120,
        isPublished: true,
        isFeatured: true,
        isNewArrival: true,
        tags: ['tshirt', 'basic', 'heavyweight', 'cotton'],
        ratingsAverage: 4.9,
        ratingsCount: 42,
      },
      {
        name: 'Stained Acid Print T-Shirt',
        slug: 'stained-acid-print-t-shirt',
        sku: 'XIV-TEE-003',
        description:
          'Hand-dyed mineral wash effect with subtle tonal brushstroke motifs across the front chest. Each garment bears a unique texture signature.',
        category: collectionsCat._id,
        brand: 'XIV COLLECTIONS',
        sellingPrice: 1499,
        originalPrice: 1899,
        hasVariants: true,
        variants: [
          { sku: 'XIV-TEE-003-M', size: 'M', color: 'Earth Clay', price: 1499, originalPrice: 1899, stock: 20, reservedStock: 0 },
          { sku: 'XIV-TEE-003-L', size: 'L', color: 'Earth Clay', price: 1499, originalPrice: 1899, stock: 15, reservedStock: 0 },
        ],
        images: [
          { url: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&auto=format&fit=crop&q=80', isDefault: true, alt: 'Stained Acid Print T-Shirt' },
        ],
        totalStock: 35,
        isPublished: true,
        isFeatured: true,
        isNewArrival: true,
        tags: ['tshirt', 'mineral-wash', 'print', 'acid-wash'],
        ratingsAverage: 4.6,
        ratingsCount: 18,
      },
      {
        name: 'Full Sleeve Boxy Zipper',
        slug: 'full-sleeve-boxy-zipper',
        sku: 'XIV-ZIP-004',
        description:
          'Double-ended matte metal zipper closure with a dropped shoulder silhouette and concealed seam side pockets. 420 GSM French terry fleece.',
        category: menCat._id,
        brand: 'XIV COLLECTIONS',
        sellingPrice: 2899,
        originalPrice: 3499,
        hasVariants: true,
        variants: [
          { sku: 'XIV-ZIP-004-M', size: 'M', color: 'Washed Ash', price: 2899, originalPrice: 3499, stock: 18, reservedStock: 0 },
          { sku: 'XIV-ZIP-004-L', size: 'L', color: 'Washed Ash', price: 2899, originalPrice: 3499, stock: 22, reservedStock: 0 },
        ],
        images: [
          { url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80', isDefault: true, alt: 'Full Sleeve Zipper' },
        ],
        totalStock: 40,
        isPublished: true,
        isFeatured: true,
        isNewArrival: false,
        tags: ['hoodie', 'zipper', 'jacket', 'outerwear'],
        ratingsAverage: 5.0,
        ratingsCount: 31,
      },
      {
        name: 'Technical Pleated Cargo Pants',
        slug: 'technical-pleated-cargo-pants',
        sku: 'XIV-PNT-005',
        description:
          'Engineered utilitarian trousers in water-resistant nylon ripstop. Features double front knife pleats, gusseted side cargo pockets, and adjustable hem drawcords.',
        category: menCat._id,
        brand: 'XIV COLLECTIONS',
        sellingPrice: 2499,
        originalPrice: 3199,
        hasVariants: true,
        variants: [
          { sku: 'XIV-PNT-005-30', size: '30', color: 'Khaki Stone', price: 2499, originalPrice: 3199, stock: 14, reservedStock: 0 },
          { sku: 'XIV-PNT-005-32', size: '32', color: 'Khaki Stone', price: 2499, originalPrice: 3199, stock: 20, reservedStock: 0 },
          { sku: 'XIV-PNT-005-34', size: '34', color: 'Khaki Stone', price: 2499, originalPrice: 3199, stock: 12, reservedStock: 0 },
        ],
        images: [
          { url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&auto=format&fit=crop&q=80', isDefault: true, alt: 'Technical Cargo Pants' },
        ],
        totalStock: 46,
        isPublished: true,
        isFeatured: false,
        isNewArrival: true,
        tags: ['cargo', 'pants', 'trousers', 'techwear'],
        ratingsAverage: 4.7,
        ratingsCount: 16,
      },
      {
        name: 'Raw Edge Structured Overshirt',
        slug: 'raw-edge-structured-overshirt',
        sku: 'XIV-OVR-006',
        description:
          'Heavyweight cotton-twill overshirt with deconstructed raw fray hem detail, dual chest utility flap pockets, and branded gunmetal snaps.',
        category: collectionsCat._id,
        brand: 'XIV COLLECTIONS',
        sellingPrice: 2299,
        originalPrice: 2799,
        hasVariants: true,
        variants: [
          { sku: 'XIV-OVR-006-S', size: 'S', color: 'Sand Dune', price: 2299, originalPrice: 2799, stock: 8, reservedStock: 0 },
          { sku: 'XIV-OVR-006-M', size: 'M', color: 'Sand Dune', price: 2299, originalPrice: 2799, stock: 14, reservedStock: 0 },
          { sku: 'XIV-OVR-006-L', size: 'L', color: 'Sand Dune', price: 2299, originalPrice: 2799, stock: 10, reservedStock: 0 },
        ],
        images: [
          { url: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=800&auto=format&fit=crop&q=80', isDefault: true, alt: 'Raw Edge Overshirt' },
        ],
        totalStock: 32,
        isPublished: true,
        isFeatured: true,
        isNewArrival: false,
        tags: ['overshirt', 'jacket', 'twill'],
        ratingsAverage: 4.9,
        ratingsCount: 11,
      },
    ];

    await Product.insertMany(productsData);

    // 5. Create Promotional Offers / Hero Banners
    await Offer.insertMany([
      {
        title: 'NEW COLLECTION',
        subtitle: 'SUMMER 2024 / EDITION 04',
        badge: 'NEW DROP',
        linkUrl: '/catalog?category=collections',
        imageUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1200&auto=format&fit=crop&q=80',
        placement: 'HERO_BANNER',
        priority: 10,
        isActive: true,
      },
      {
        title: 'XIV COLLECTIONS 23-24',
        subtitle: 'EXPLORE OUR SEASONAL RUNWAY ARCHIVES',
        badge: 'CURATED',
        linkUrl: '/catalog',
        imageUrl: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=1200&auto=format&fit=crop&q=80',
        placement: 'COLLECTION_FEATURE',
        priority: 5,
        isActive: true,
      },
      {
        title: 'NEW THIS WEEK (50)',
        subtitle: 'LIMITED RELEASES & FRESH CUTS',
        badge: 'WEEKLY EDIT',
        linkUrl: '/catalog?isNewArrival=true',
        placement: 'WEEKLY_DEAL',
        priority: 8,
        isActive: true,
      },
    ]);

    // 6. Create Coupons
    await Coupon.insertMany([
      {
        code: 'WELCOME10',
        description: '10% discount on orders above ₹1,000',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 10,
        minOrderAmount: 1000,
        maxDiscountAmount: 500,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2030-12-31'),
        usageLimitTotal: 10000,
        usageLimitPerCustomer: 1,
        isActive: true,
      },
      {
        code: 'LUXURY500',
        description: 'Flat ₹500 off on orders above ₹2,500',
        discountType: DiscountType.FIXED,
        discountValue: 500,
        minOrderAmount: 2500,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2030-12-31'),
        usageLimitTotal: 5000,
        usageLimitPerCustomer: 2,
        isActive: true,
      },
    ]);

    // 7. Seed standard test accounts (Super Admin, Admin & Customer)
    const salt = await bcrypt.genSalt(10);
    const superAdminPasswordHash = await bcrypt.hash('SuperAdmin@2026!', salt);
    const adminPasswordHash = await bcrypt.hash('Admin@2026!', salt);
    const customerPasswordHash = await bcrypt.hash('Customer@2026!', salt);

    // Super Admin
    await User.findOneAndUpdate(
      { email: 'superadmin@luxwear.com' },
      {
        name: 'Store Owner',
        email: 'superadmin@luxwear.com',
        phone: '+919876543210',
        passwordHash: superAdminPasswordHash,
        role: UserRole.SUPER_ADMIN,
        isActive: true,
        permissions: Object.values(PermissionKey),
      },
      { upsert: true, new: true }
    );

    // Customer
    await User.findOneAndUpdate(
      { email: 'customer@luxwear.com' },
      {
        name: 'Aarav Sharma',
        email: 'customer@luxwear.com',
        phone: '+919876543211',
        passwordHash: customerPasswordHash,
        role: UserRole.CUSTOMER,
        isActive: true,
        addresses: [
          {
            fullName: 'Aarav Sharma',
            phone: '+919876543211',
            street: '42, Boulevard Heights, Bandra West',
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

    // Admin
    await User.findOneAndUpdate(
      { email: 'admin@luxwear.com' },
      {
        name: 'Store Manager',
        email: 'admin@luxwear.com',
        phone: '+919876543212',
        passwordHash: adminPasswordHash,
        role: UserRole.ADMIN,
        isActive: true,
        permissions: DEFAULT_ADMIN_PERMISSIONS,
      },
      { upsert: true, new: true }
    );

    logger.info('====================================================');
    logger.info(' Database seeded successfully! ');
    logger.info(' Test Accounts:');
    logger.info(' 1. Super Admin: superadmin@luxwear.com / SuperAdmin@2026!');
    logger.info(' 2. Admin:       admin@luxwear.com / Admin@2026!');
    logger.info(' 3. Customer:    customer@luxwear.com / Customer@2026!');
    logger.info(' Active Coupons: WELCOME10, LUXURY500');
    logger.info(' Products:       6 luxury streetwear pieces with variants');
    logger.info('====================================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('Failed to seed database:', error);
    process.exit(1);
  }
};

seedDatabase();
