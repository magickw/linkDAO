export interface StandardizedProductMetadata {
  title: string;
  description: string;
  category: string;
  tags: string[];
  images: string[];
  attributes: Record<string, any>;
  condition: 'new' | 'used' | 'refurbished';
  brand: string;
  sku: string;
  specifications: Record<string, string>;
}

export const parseProductMetadata = (rawMetadata: any, fallbackTitle?: string): StandardizedProductMetadata => {
  let data: any = {};
  
  if (typeof rawMetadata === 'string') {
    try {
      data = JSON.parse(rawMetadata);
    } catch (e) {
      data = { description: rawMetadata };
    }
  } else if (typeof rawMetadata === 'object' && rawMetadata !== null) {
    data = rawMetadata;
  }

  return {
    title: data.title || data.name || fallbackTitle || 'Untitled Product',
    description: data.description || data.content || '',
    category: data.category || 'general',
    tags: Array.isArray(data.tags) ? data.tags : [],
    images: Array.isArray(data.images) ? data.images : (data.image ? [data.image] : []),
    attributes: data.attributes || {},
    condition: data.condition || 'new',
    brand: data.brand || 'Generic',
    sku: data.sku || '',
    specifications: data.specifications || {}
  };
};
