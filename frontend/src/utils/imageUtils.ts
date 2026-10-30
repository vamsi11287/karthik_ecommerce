/**
 * Robust image URL extractor for products
 * Handles both string URLs and MongoDB object schemas: { url: string, alt?: string, isDefault?: boolean }
 */
export const DEFAULT_PRODUCT_FALLBACK = '';

export const getImageUrl = (image: any, fallback = DEFAULT_PRODUCT_FALLBACK): string => {
  if (!image) return fallback;
  if (typeof image === 'string' && image.trim().length > 0) return image.trim();
  if (typeof image === 'object') {
    if (typeof image.url === 'string' && image.url.trim().length > 0) {
      return image.url.trim();
    }
  }
  return fallback;
};

export const getFirstProductImage = (images?: any[], fallback = DEFAULT_PRODUCT_FALLBACK): string => {
  if (!Array.isArray(images) || images.length === 0) return fallback;
  return getImageUrl(images[0], fallback);
};

export const getAllProductImages = (images?: any[], fallback = DEFAULT_PRODUCT_FALLBACK): string[] => {
  if (!Array.isArray(images) || images.length === 0) return [fallback];
  const list = images.map((img) => getImageUrl(img, fallback)).filter(Boolean);
  return list.length > 0 ? list : [fallback];
};
