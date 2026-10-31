import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { logger } from '../config/logger';
import { Category } from '../modules/categories/category.model';
import { Product } from '../modules/products/product.model';

export const seedCategoriesAndSubcategories = async (): Promise<void> => {
  try {
    await connectDatabase();
    logger.info('Seeding 3 Main Categories (Men, Women, Others) and Subcategories...');

    // 1. Parent Categories Definition
    const mainCategories = [
      {
        name: 'Men',
        slug: 'men',
        description: 'Modern luxury streetwear, shirts, pants, kurtas, and tailored essentials for men.',
        displayOrder: 1,
        isActive: true,
        parentCategory: null,
      },
      {
        name: 'Women',
        slug: 'women',
        description: 'Contemporary dresses, tops, pants, ethnic wear, and luxury fashion for women.',
        displayOrder: 2,
        isActive: true,
        parentCategory: null,
      },
      {
        name: 'Others',
        slug: 'others',
        description: 'Premium curated electronics, accessories, footwear, and lifestyle goods.',
        displayOrder: 3,
        isActive: true,
        parentCategory: null,
      },
    ];

    // Upsert Main Categories
    const savedParents: Record<string, any> = {};
    for (const cat of mainCategories) {
      const saved = await Category.findOneAndUpdate(
        { slug: cat.slug },
        { ...cat, parentCategory: null },
        { upsert: true, new: true }
      );
      savedParents[cat.slug] = saved;
    }

    // 2. Subcategories Definition
    const subcategoriesMap: Record<string, Array<{ name: string; slug: string; description?: string }>> = {
      men: [
        { name: 'Shirt', slug: 'men-shirt', description: 'Formal, casual, and tailored shirts for men' },
        { name: 'Pant', slug: 'men-pant', description: 'Trousers, chinos, denim, and utilitarian cargo pants' },
        { name: 'Kurta', slug: 'men-kurta', description: 'Traditional, festive, and modern ethnic kurtas for men' },
        { name: 'T-Shirt', slug: 'men-tshirt', description: 'Oversized boxy drop-shoulder t-shirts & tees' },
        { name: 'Jackets & Overshirts', slug: 'men-jackets', description: 'Bombers, twill overshirts, and utility jackets' },
      ],
      women: [
        { name: 'Dress', slug: 'women-dress', description: 'Evening gowns, slip dresses, and casual silhouettes' },
        { name: 'Tops & Tees', slug: 'women-tops', description: 'Minimalist tops, blouses, and cropped tees' },
        { name: 'Pants & Trousers', slug: 'women-pants', description: 'Wide-leg trousers, cargo pants, and tailored bottoms' },
        { name: 'Kurti & Ethnic', slug: 'women-kurti', description: 'Handcrafted kurtis, anarkalis, and ethnic sets' },
        { name: 'Co-ord Sets', slug: 'women-coords', description: 'Monochrome and matching 2-piece lounge & resort sets' },
      ],
      others: [
        { name: 'Electronics', slug: 'others-electronics', description: 'Smart audio, luxury accessories, and tech essentials' },
        { name: 'Accessories', slug: 'others-accessories', description: 'Caps, beanies, leather belts, and jewelry' },
        { name: 'Footwear', slug: 'others-footwear', description: 'Sneakers, mules, and formal footwear' },
        { name: 'Lifestyle', slug: 'others-lifestyle', description: 'Fragrances, candles, and living essentials' },
      ],
    };

    const savedSubcategories: Record<string, any> = {};
    for (const [parentSlug, subs] of Object.entries(subcategoriesMap)) {
      const parent = savedParents[parentSlug];
      let order = 1;
      for (const sub of subs) {
        const savedSub = await Category.findOneAndUpdate(
          { slug: sub.slug },
          {
            name: sub.name,
            slug: sub.slug,
            description: sub.description,
            parentCategory: parent._id,
            isActive: true,
            displayOrder: order++,
          },
          { upsert: true, new: true }
        );
        savedSubcategories[sub.slug] = savedSub;
      }
    }

    // 3. Update any existing products to link cleanly to categories & subcategories
    const allProducts = await Product.find({});
    for (const prod of allProducts) {
      const lowerName = (prod.name + ' ' + prod.description).toLowerCase();
      let parentCat = savedParents['men'];
      let subCat = savedSubcategories['men-tshirt'];

      if (lowerName.includes('pant') || lowerName.includes('trouser')) {
        parentCat = savedParents['men'];
        subCat = savedSubcategories['men-pant'];
      } else if (lowerName.includes('shirt') && !lowerName.includes('t-shirt') && !lowerName.includes('overshirt')) {
        parentCat = savedParents['men'];
        subCat = savedSubcategories['men-shirt'];
      } else if (lowerName.includes('kurta') || lowerName.includes('kurti')) {
        parentCat = savedParents['men'];
        subCat = savedSubcategories['men-kurta'];
      } else if (lowerName.includes('overshirt') || lowerName.includes('jacket') || lowerName.includes('hoodie')) {
        parentCat = savedParents['men'];
        subCat = savedSubcategories['men-jackets'];
      }

      prod.category = parentCat._id;
      prod.subcategory = subCat._id;
      await prod.save();
    }

    console.log('\n============================================================');
    console.log(' ✨ CATEGORIES & SUBCATEGORIES POPULATED IN DATABASE');
    console.log('============================================================');
    console.log(' 1. MEN:');
    console.log('    - Shirt (men-shirt)');
    console.log('    - Pant (men-pant)');
    console.log('    - Kurta (men-kurta)');
    console.log('    - T-Shirt (men-tshirt)');
    console.log('    - Jackets & Overshirts (men-jackets)');
    console.log('------------------------------------------------------------');
    console.log(' 2. WOMEN:');
    console.log('    - Dress (women-dress)');
    console.log('    - Tops & Tees (women-tops)');
    console.log('    - Pants & Trousers (women-pants)');
    console.log('    - Kurti & Ethnic (women-kurti)');
    console.log('    - Co-ord Sets (women-coords)');
    console.log('------------------------------------------------------------');
    console.log(' 3. OTHERS:');
    console.log('    - Electronics (others-electronics)');
    console.log('    - Accessories (others-accessories)');
    console.log('    - Footwear (others-footwear)');
    console.log('    - Lifestyle (others-lifestyle)');
    console.log('============================================================\n');

    await mongoose.disconnect();
    logger.info('Database disconnected cleanly.');
  } catch (error) {
    logger.error('Failed to seed categories:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  seedCategoriesAndSubcategories();
}

