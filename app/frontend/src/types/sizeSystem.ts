// Comprehensive Size System for Clothing, Footwear, and General Products

export interface SizeDefinition {
  id: string;
  name: string;
  category: 'clothing' | 'footwear' | 'general' | 'custom';
  type: 'numeric' | 'alphabetic' | 'standard';
  value: string;
  sortOrder: number;
  measurements?: {
    chest?: number; // cm
    waist?: number; // cm
    hips?: number; // cm
    length?: number; // cm
    inseam?: number; // cm
    footLength?: number; // cm
    footWidth?: number; // cm
  };
  equivalent?: {
    US?: string;
    UK?: string;
    EU?: string;
    JP?: string;
  };
}

export interface SizeCategory {
  id: string;
  name: string;
  description: string;
  sizes: SizeDefinition[];
}

// Predefined size categories
export const SIZE_CATEGORIES: SizeCategory[] = [
  // Clothing Sizes
  {
    id: 'clothing-tops',
    name: 'Tops (T-shirts, Shirts, Blouses)',
    description: 'Standard sizing for upper body clothing',
    sizes: [
      { id: 'xs', name: 'XS', category: 'clothing', type: 'alphabetic', value: 'XS', sortOrder: 1 },
      { id: 's', name: 'S', category: 'clothing', type: 'alphabetic', value: 'S', sortOrder: 2 },
      { id: 'm', name: 'M', category: 'clothing', type: 'alphabetic', value: 'M', sortOrder: 3 },
      { id: 'l', name: 'L', category: 'clothing', type: 'alphabetic', value: 'L', sortOrder: 4 },
      { id: 'xl', name: 'XL', category: 'clothing', type: 'alphabetic', value: 'XL', sortOrder: 5 },
      { id: 'xxl', name: 'XXL', category: 'clothing', type: 'alphabetic', value: 'XXL', sortOrder: 6 },
      { id: '3xl', name: '3XL', category: 'clothing', type: 'alphabetic', value: '3XL', sortOrder: 7 },
      { id: '4xl', name: '4XL', category: 'clothing', type: 'alphabetic', value: '4XL', sortOrder: 8 },
      { id: '5xl', name: '5XL', category: 'clothing', type: 'alphabetic', value: '5XL', sortOrder: 9 },
    ]
  },
  {
    id: 'clothing-bottoms',
    name: 'Bottoms (Pants, Jeans, Skirts)',
    description: 'Waist-based sizing for lower body clothing',
    sizes: [
      { id: '24w', name: '24', category: 'clothing', type: 'numeric', value: '24', sortOrder: 1 },
      { id: '25w', name: '25', category: 'clothing', type: 'numeric', value: '25', sortOrder: 2 },
      { id: '26w', name: '26', category: 'clothing', type: 'numeric', value: '26', sortOrder: 3 },
      { id: '27w', name: '27', category: 'clothing', type: 'numeric', value: '27', sortOrder: 4 },
      { id: '28w', name: '28', category: 'clothing', type: 'numeric', value: '28', sortOrder: 5 },
      { id: '29w', name: '29', category: 'clothing', type: 'numeric', value: '29', sortOrder: 6 },
      { id: '30w', name: '30', category: 'clothing', type: 'numeric', value: '30', sortOrder: 7 },
      { id: '31w', name: '31', category: 'clothing', type: 'numeric', value: '31', sortOrder: 8 },
      { id: '32w', name: '32', category: 'clothing', type: 'numeric', value: '32', sortOrder: 9 },
      { id: '33w', name: '33', category: 'clothing', type: 'numeric', value: '33', sortOrder: 10 },
      { id: '34w', name: '34', category: 'clothing', type: 'numeric', value: '34', sortOrder: 11 },
      { id: '36w', name: '36', category: 'clothing', type: 'numeric', value: '36', sortOrder: 12 },
      { id: '38w', name: '38', category: 'clothing', type: 'numeric', value: '38', sortOrder: 13 },
      { id: '40w', name: '40', category: 'clothing', type: 'numeric', value: '40', sortOrder: 14 },
      { id: '42w', name: '42', category: 'clothing', type: 'numeric', value: '42', sortOrder: 15 },
    ]
  },
  {
    id: 'clothing-dresses',
    name: 'Dresses',
    description: 'Standard dress sizing',
    sizes: [
      { id: '0', name: '0 (XS)', category: 'clothing', type: 'numeric', value: '0', sortOrder: 1 },
      { id: '2', name: '2 (XS)', category: 'clothing', type: 'numeric', value: '2', sortOrder: 2 },
      { id: '4', name: '4 (S)', category: 'clothing', type: 'numeric', value: '4', sortOrder: 3 },
      { id: '6', name: '6 (S)', category: 'clothing', type: 'numeric', value: '6', sortOrder: 4 },
      { id: '8', name: '8 (M)', category: 'clothing', type: 'numeric', value: '8', sortOrder: 5 },
      { id: '10', name: '10 (M)', category: 'clothing', type: 'numeric', value: '10', sortOrder: 6 },
      { id: '12', name: '12 (L)', category: 'clothing', type: 'numeric', value: '12', sortOrder: 7 },
      { id: '14', name: '14 (L)', category: 'clothing', type: 'numeric', value: '14', sortOrder: 8 },
      { id: '16', name: '16 (XL)', category: 'clothing', type: 'numeric', value: '16', sortOrder: 9 },
      { id: '18', name: '18 (XL)', category: 'clothing', type: 'numeric', value: '18', sortOrder: 10 },
      { id: '20', name: '20 (XXL)', category: 'clothing', type: 'numeric', value: '20', sortOrder: 11 },
      { id: '22', name: '22 (XXL)', category: 'clothing', type: 'numeric', value: '22', sortOrder: 12 },
    ]
  },

  // Footwear Sizes
  {
    id: 'footwear-mens',
    name: "Men's Footwear",
    description: 'International shoe sizing for men',
    sizes: [
      { 
        id: 'm6', 
        name: '6', 
        category: 'footwear', 
        type: 'numeric', 
        value: '6', 
        sortOrder: 1,
        equivalent: { US: '6', UK: '5.5', EU: '38.5', JP: '24.5' }
      },
      { 
        id: 'm6.5', 
        name: '6.5', 
        category: 'footwear', 
        type: 'numeric', 
        value: '6.5', 
        sortOrder: 2,
        equivalent: { US: '6.5', UK: '6', EU: '39', JP: '25' }
      },
      { 
        id: 'm7', 
        name: '7', 
        category: 'footwear', 
        type: 'numeric', 
        value: '7', 
        sortOrder: 3,
        equivalent: { US: '7', UK: '6.5', EU: '40', JP: '25.5' }
      },
      { 
        id: 'm7.5', 
        name: '7.5', 
        category: 'footwear', 
        type: 'numeric', 
        value: '7.5', 
        sortOrder: 4,
        equivalent: { US: '7.5', UK: '7', EU: '40.5', JP: '26' }
      },
      { 
        id: 'm8', 
        name: '8', 
        category: 'footwear', 
        type: 'numeric', 
        value: '8', 
        sortOrder: 5,
        equivalent: { US: '8', UK: '7.5', EU: '41', JP: '26.5' }
      },
      { 
        id: 'm8.5', 
        name: '8.5', 
        category: 'footwear', 
        type: 'numeric', 
        value: '8.5', 
        sortOrder: 6,
        equivalent: { US: '8.5', UK: '8', EU: '42', JP: '27' }
      },
      { 
        id: 'm9', 
        name: '9', 
        category: 'footwear', 
        type: 'numeric', 
        value: '9', 
        sortOrder: 7,
        equivalent: { US: '9', UK: '8.5', EU: '42.5', JP: '27.5' }
      },
      { 
        id: 'm9.5', 
        name: '9.5', 
        category: 'footwear', 
        type: 'numeric', 
        value: '9.5', 
        sortOrder: 8,
        equivalent: { US: '9.5', UK: '9', EU: '43', JP: '28' }
      },
      { 
        id: 'm10', 
        name: '10', 
        category: 'footwear', 
        type: 'numeric', 
        value: '10', 
        sortOrder: 9,
        equivalent: { US: '10', UK: '9.5', EU: '44', JP: '28.5' }
      },
      { 
        id: 'm10.5', 
        name: '10.5', 
        category: 'footwear', 
        type: 'numeric', 
        value: '10.5', 
        sortOrder: 10,
        equivalent: { US: '10.5', UK: '10', EU: '44.5', JP: '29' }
      },
      { 
        id: 'm11', 
        name: '11', 
        category: 'footwear', 
        type: 'numeric', 
        value: '11', 
        sortOrder: 11,
        equivalent: { US: '11', UK: '10.5', EU: '45', JP: '29.5' }
      },
      { 
        id: 'm11.5', 
        name: '11.5', 
        category: 'footwear', 
        type: 'numeric', 
        value: '11.5', 
        sortOrder: 12,
        equivalent: { US: '11.5', UK: '11', EU: '45.5', JP: '30' }
      },
      { 
        id: 'm12', 
        name: '12', 
        category: 'footwear', 
        type: 'numeric', 
        value: '12', 
        sortOrder: 13,
        equivalent: { US: '12', UK: '11.5', EU: '46', JP: '30.5' }
      },
      { 
        id: 'm13', 
        name: '13', 
        category: 'footwear', 
        type: 'numeric', 
        value: '13', 
        sortOrder: 14,
        equivalent: { US: '13', UK: '12.5', EU: '47.5', JP: '31.5' }
      },
      { 
        id: 'm14', 
        name: '14', 
        category: 'footwear', 
        type: 'numeric', 
        value: '14', 
        sortOrder: 15,
        equivalent: { US: '14', UK: '13.5', EU: '49', JP: '32.5' }
      },
    ]
  },
  {
    id: 'footwear-womens',
    name: "Women's Footwear",
    description: 'International shoe sizing for women',
    sizes: [
      { 
        id: 'w4', 
        name: '4', 
        category: 'footwear', 
        type: 'numeric', 
        value: '4', 
        sortOrder: 1,
        equivalent: { US: '4', UK: '2.5', EU: '35', JP: '22' }
      },
      { 
        id: 'w4.5', 
        name: '4.5', 
        category: 'footwear', 
        type: 'numeric', 
        value: '4.5', 
        sortOrder: 2,
        equivalent: { US: '4.5', UK: '3', EU: '35.5', JP: '22.5' }
      },
      { 
        id: 'w5', 
        name: '5', 
        category: 'footwear', 
        type: 'numeric', 
        value: '5', 
        sortOrder: 3,
        equivalent: { US: '5', UK: '3.5', EU: '36', JP: '23' }
      },
      { 
        id: 'w5.5', 
        name: '5.5', 
        category: 'footwear', 
        type: 'numeric', 
        value: '5.5', 
        sortOrder: 4,
        equivalent: { US: '5.5', UK: '4', EU: '36.5', JP: '23.5' }
      },
      { 
        id: 'w6', 
        name: '6', 
        category: 'footwear', 
        type: 'numeric', 
        value: '6', 
        sortOrder: 5,
        equivalent: { US: '6', UK: '4.5', EU: '37', JP: '24' }
      },
      { 
        id: 'w6.5', 
        name: '6.5', 
        category: 'footwear', 
        type: 'numeric', 
        value: '6.5', 
        sortOrder: 6,
        equivalent: { US: '6.5', UK: '5', EU: '37.5', JP: '24.5' }
      },
      { 
        id: 'w7', 
        name: '7', 
        category: 'footwear', 
        type: 'numeric', 
        value: '7', 
        sortOrder: 7,
        equivalent: { US: '7', UK: '5.5', EU: '38', JP: '25' }
      },
      { 
        id: 'w7.5', 
        name: '7.5', 
        category: 'footwear', 
        type: 'numeric', 
        value: '7.5', 
        sortOrder: 8,
        equivalent: { US: '7.5', UK: '6', EU: '38.5', JP: '25.5' }
      },
      { 
        id: 'w8', 
        name: '8', 
        category: 'footwear', 
        type: 'numeric', 
        value: '8', 
        sortOrder: 9,
        equivalent: { US: '8', UK: '6.5', EU: '39', JP: '26' }
      },
      { 
        id: 'w8.5', 
        name: '8.5', 
        category: 'footwear', 
        type: 'numeric', 
        value: '8.5', 
        sortOrder: 10,
        equivalent: { US: '8.5', UK: '7', EU: '39.5', JP: '26.5' }
      },
      { 
        id: 'w9', 
        name: '9', 
        category: 'footwear', 
        type: 'numeric', 
        value: '9', 
        sortOrder: 11,
        equivalent: { US: '9', UK: '7.5', EU: '40', JP: '27' }
      },
      { 
        id: 'w9.5', 
        name: '9.5', 
        category: 'footwear', 
        type: 'numeric', 
        value: '9.5', 
        sortOrder: 12,
        equivalent: { US: '9.5', UK: '8', EU: '40.5', JP: '27.5' }
      },
      { 
        id: 'w10', 
        name: '10', 
        category: 'footwear', 
        type: 'numeric', 
        value: '10', 
        sortOrder: 13,
        equivalent: { US: '10', UK: '8.5', EU: '41', JP: '28' }
      },
      { 
        id: 'w10.5', 
        name: '10.5', 
        category: 'footwear', 
        type: 'numeric', 
        value: '10.5', 
        sortOrder: 14,
        equivalent: { US: '10.5', UK: '9', EU: '41.5', JP: '28.5' }
      },
      { 
        id: 'w11', 
        name: '11', 
        category: 'footwear', 
        type: 'numeric', 
        value: '11', 
        sortOrder: 15,
        equivalent: { US: '11', UK: '9.5', EU: '42', JP: '29' }
      },
      { 
        id: 'w12', 
        name: '12', 
        category: 'footwear', 
        type: 'numeric', 
        value: '12', 
        sortOrder: 16,
        equivalent: { US: '12', UK: '10.5', EU: '43', JP: '30' }
      },
    ]
  },

  // General/Universal Sizes
  {
    id: 'general-universal',
    name: 'Universal/One Size',
    description: 'For items that fit all sizes',
    sizes: [
      { id: 'one-size', name: 'One Size', category: 'general', type: 'standard', value: 'One Size', sortOrder: 1 },
      { id: 'osfa', name: 'OSFA (One Size Fits All)', category: 'general', type: 'standard', value: 'OSFA', sortOrder: 2 },
      { id: 'plus-size', name: 'Plus Size', category: 'general', type: 'standard', value: 'Plus Size', sortOrder: 3 },
    ]
  },
  {
    id: 'general-numeric',
    name: 'Numeric (Custom)',
    description: 'Custom numeric sizing',
    sizes: [
      { id: 'custom-1', name: 'Custom 1', category: 'custom', type: 'numeric', value: 'Custom 1', sortOrder: 1 },
      { id: 'custom-2', name: 'Custom 2', category: 'custom', type: 'numeric', value: 'Custom 2', sortOrder: 2 },
      { id: 'custom-3', name: 'Custom 3', category: 'custom', type: 'numeric', value: 'Custom 3', sortOrder: 3 },
    ]
  },
];

// Helper functions
export const getSizeCategory = (categoryId: string): SizeCategory | undefined => {
  return SIZE_CATEGORIES.find(cat => cat.id === categoryId);
};

export const getAllSizesForCategory = (categoryId: string): SizeDefinition[] => {
  const category = getSizeCategory(categoryId);
  return category ? category.sizes : [];
};

export const getSizeById = (sizeId: string): SizeDefinition | undefined => {
  for (const category of SIZE_CATEGORIES) {
    const size = category.sizes.find(s => s.id === sizeId);
    if (size) return size;
  }
  return undefined;
};

export const searchSizes = (query: string): SizeDefinition[] => {
  const results: SizeDefinition[] = [];
  const lowerQuery = query.toLowerCase();
  
  for (const category of SIZE_CATEGORIES) {
    for (const size of category.sizes) {
      if (size.name.toLowerCase().includes(lowerQuery) || 
          size.value.toLowerCase().includes(lowerQuery)) {
        results.push(size);
      }
    }
  }
  
  return results;
};