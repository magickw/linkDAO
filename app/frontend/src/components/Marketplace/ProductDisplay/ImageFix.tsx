/**
 * Image Fix Utilities for Product Cards
 * Ensures images display correctly with proper fallbacks
 */

export const getProductImage = (product: any) => {
  // Handle various image data structures
  let images: string[] = [];
  
  if (product.images) {
    if (Array.isArray(product.images)) {
      images = product.images;
    } else if (typeof product.images === 'string') {
      try {
        images = JSON.parse(product.images);
      } catch {
        images = [];
      }
    }
  }
  
  // Filter out invalid images
  const validImages = images.filter((img: string) => {
    if (!img || typeof img !== 'string') return false;
    // Check for valid URL patterns
    return img.startsWith('data:') ||
           img.startsWith('blob:') ||
           img.startsWith('http://') ||
           img.startsWith('https://') ||
           img.startsWith('/') ||
           img.startsWith('Qm') ||
           img.startsWith('baf');
  });
  
  // Return first valid image or empty string
  return validImages.length > 0 ? validImages[0] : '';
};

export const hasValidImages = (product: any): boolean => {
  const firstImage = getProductImage(product);
  return firstImage !== '';
};

export const getImageDimensions = (containerHeight: number) => {
  // Calculate appropriate image dimensions based on container
  return {
    width: 400,
    height: containerHeight
  };
};