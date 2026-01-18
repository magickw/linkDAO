// Marketplace Specification Framework Configuration

export type FieldType = 'text' | 'number' | 'dropdown' | 'multiselect' | 'boolean' | 'date';
export type SizeSystemType = 'apparel_standard' | 'simple_variants' | 'matrix' | 'dimensions' | 'technical' | 'range_based' | 'volume_capacity' | 'none';

export interface ValidationRule {
  min?: number;
  max?: number;
  pattern?: string;
  required?: boolean;
}

export interface SpecField {
  key: string;
  label: string;
  type: FieldType;
  options?: string[]; // for dropdown/multiselect
  unit?: string;
  validation?: ValidationRule;
  tooltip?: string;
  placeholder?: string;
  conditional?: {
    field: string;
    value: any;
  };
}

export interface CategoryTemplate {
  id: string;
  name: string;
  parent?: string;
  sizeSystem: SizeSystemType;
  specs: SpecField[];
}

// Industry-Specific Templates with Multi-level Hierarchy
export const CATEGORY_TEMPLATES: Record<string, CategoryTemplate> = {
  // Electronics (Level 1)
  'electronics': {
    id: 'electronics',
    name: 'Electronics',
    sizeSystem: 'technical',
    specs: [
      { key: 'brand', label: 'Brand', type: 'text', validation: { required: true } },
      { key: 'model', label: 'Model', type: 'text', validation: { required: true } },
      { key: 'warranty', label: 'Warranty', type: 'text', placeholder: 'e.g. 1 Year Manufacturer' },
      { key: 'power_source', label: 'Power Source', type: 'dropdown', options: ['Battery', 'AC', 'Solar', 'USB'] }
    ]
  },
  // Electronics - Computers (Level 2)
  'electronics-computers': {
    id: 'electronics-computers',
    name: 'Computers',
    parent: 'electronics',
    sizeSystem: 'technical',
    specs: [
      { key: 'processor', label: 'Processor', type: 'text', validation: { required: true } },
      { key: 'ram', label: 'RAM', type: 'number', unit: 'GB', validation: { required: true } },
      { key: 'storage', label: 'Storage', type: 'text', placeholder: 'e.g. 512GB SSD' },
      { key: 'operating_system', label: 'Operating System', type: 'dropdown', options: ['Windows', 'macOS', 'Linux', 'Chrome OS', 'Other'] }
    ]
  },
  // Electronics - Laptops (Level 3)
  'electronics-computers-laptops': {
    id: 'electronics-computers-laptops',
    name: 'Laptops',
    parent: 'electronics-computers',
    sizeSystem: 'technical',
    specs: [
      { key: 'screen_size', label: 'Screen Size', type: 'number', unit: 'inches' },
      { key: 'graphics_card', label: 'Graphics Card', type: 'text' },
      { key: 'battery_life', label: 'Battery Life', type: 'text', placeholder: 'e.g. 8 hours' },
      { key: 'weight', label: 'Weight', type: 'number', unit: 'lbs' }
    ]
  },
  // Electronics - Smartphones (Level 3)
  'electronics-smartphones': {
    id: 'electronics-smartphones',
    name: 'Smartphones',
    parent: 'electronics',
    sizeSystem: 'technical',
    specs: [
      { key: 'screen_size', label: 'Screen Size', type: 'number', unit: 'inches' },
      { key: 'storage', label: 'Storage', type: 'text', placeholder: 'e.g. 128GB, 256GB' },
      { key: 'ram', label: 'RAM', type: 'number', unit: 'GB' },
      { key: 'camera_resolution', label: 'Camera', type: 'text', placeholder: 'e.g. 12MP' },
      { key: 'battery_capacity', label: 'Battery', type: 'text', placeholder: 'e.g. 4000mAh' }
    ]
  },
  // Electronics - Audio (Level 2)
  'electronics-audio': {
    id: 'electronics-audio',
    name: 'Audio Equipment',
    parent: 'electronics',
    sizeSystem: 'technical',
    specs: [
      { key: 'type', label: 'Type', type: 'dropdown', options: ['Headphones', 'Earbuds', 'Speakers', 'Soundbar'] },
      { key: 'connectivity', label: 'Connectivity', type: 'multiselect', options: ['Bluetooth', 'Wired', 'WiFi', 'USB'] },
      { key: 'battery_life', label: 'Battery Life', type: 'text', placeholder: 'e.g. 20 hours' }
    ]
  },

  // Fashion & Apparel (Level 1)
  'fashion': {
    id: 'fashion',
    name: 'Fashion',
    sizeSystem: 'apparel_standard',
    specs: [
      { key: 'material', label: 'Material', type: 'text', validation: { required: true } },
      { key: 'color', label: 'Color', type: 'text', validation: { required: true } },
      { key: 'gender', label: 'Gender', type: 'dropdown', options: ['Men', 'Women', 'Unisex', 'Kids'] },
      { key: 'care_instructions', label: 'Care Instructions', type: 'text', placeholder: 'e.g. Machine wash cold' }
    ]
  },
  // Fashion - Clothing (Level 2)
  'fashion-clothing': {
    id: 'fashion-clothing',
    name: 'Clothing',
    parent: 'fashion',
    sizeSystem: 'apparel_standard',
    specs: [
      { key: 'style', label: 'Style', type: 'text', placeholder: 'e.g. Casual, Formal' },
      { key: 'fit', label: 'Fit', type: 'dropdown', options: ['Slim', 'Regular', 'Relaxed', 'Oversized'] },
      { key: 'pattern', label: 'Pattern', type: 'text', placeholder: 'e.g. Solid, Striped' }
    ]
  },
  // Fashion - Tops (Level 3)
  'fashion-clothing-tops': {
    id: 'fashion-clothing-tops',
    name: 'Tops & Shirts',
    parent: 'fashion-clothing',
    sizeSystem: 'apparel_standard',
    specs: [
      { key: 'sleeve_length', label: 'Sleeve Length', type: 'dropdown', options: ['Short', 'Long', 'Sleeveless', '3/4'] },
      { key: 'neckline', label: 'Neckline', type: 'dropdown', options: ['Round', 'V-neck', 'Crew', 'Collared'] }
    ]
  },
  // Fashion - Jeans (Level 3)
  'fashion-clothing-jeans': {
    id: 'fashion-clothing-jeans',
    name: 'Jeans',
    parent: 'fashion-clothing',
    sizeSystem: 'matrix', // Waist x Inseam matrix
    specs: [
      { key: 'fit', label: 'Fit', type: 'dropdown', options: ['Skinny', 'Slim', 'Regular', 'Relaxed', 'Loose', 'Bootcut'] },
      { key: 'rise', label: 'Rise', type: 'dropdown', options: ['Low', 'Mid', 'High'] },
      { key: 'wash', label: 'Wash', type: 'text', placeholder: 'e.g. Dark, Light, Distressed' }
    ]
  },
  // Fashion - Shoes (Level 2)
  'fashion-shoes': {
    id: 'fashion-shoes',
    name: 'Shoes',
    parent: 'fashion',
    sizeSystem: 'apparel_standard',
    specs: [
      { key: 'upper_material', label: 'Upper Material', type: 'text' },
      { key: 'sole_material', label: 'Sole Material', type: 'text' },
      { key: 'closure_type', label: 'Closure', type: 'dropdown', options: ['Lace-up', 'Slip-on', 'Velcro', 'Zipper', 'Buckle'] },
      { key: 'waterproof', label: 'Waterproof', type: 'boolean' }
    ]
  },
  // Fashion - Activewear (Level 2)
  'fashion-activewear': {
    id: 'fashion-activewear',
    name: 'Activewear',
    parent: 'fashion',
    sizeSystem: 'apparel_standard',
    specs: [
      { key: 'activity', label: 'Activity', type: 'dropdown', options: ['Running', 'Yoga', 'Training', 'Swimming', 'Cycling'] },
      { key: 'moisture_wicking', label: 'Moisture Wicking', type: 'boolean' },
      { key: 'compression', label: 'Compression', type: 'boolean' },
      { key: 'upf_rating', label: 'UPF Rating', type: 'text', placeholder: 'e.g. UPF 50+' }
    ]
  },

  // Home & Garden (Level 1)
  'home': {
    id: 'home',
    name: 'Home & Garden',
    sizeSystem: 'dimensions',
    specs: [
      { key: 'material', label: 'Material', type: 'text' },
      { key: 'color', label: 'Color', type: 'text' },
      { key: 'style', label: 'Style', type: 'text', placeholder: 'e.g. Modern, Rustic' },
      { key: 'assembly_required', label: 'Assembly Required', type: 'boolean' }
    ]
  },
  // Home - Furniture (Level 2)
  'home-furniture': {
    id: 'home-furniture',
    name: 'Furniture',
    parent: 'home',
    sizeSystem: 'dimensions',
    specs: [
      { key: 'room', label: 'Room', type: 'dropdown', options: ['Living Room', 'Bedroom', 'Dining Room', 'Office', 'Outdoor'] },
      { key: 'capacity', label: 'Capacity', type: 'text', placeholder: 'e.g. Seats 4 people' },
      { key: 'weight_capacity', label: 'Weight Capacity', type: 'number', unit: 'lbs' }
    ]
  },
  // Home - Kitchen (Level 2)
  'home-kitchen': {
    id: 'home-kitchen',
    name: 'Kitchen',
    parent: 'home',
    sizeSystem: 'dimensions',
    specs: [
      { key: 'material', label: 'Material', type: 'text' },
      { key: 'dishwasher_safe', label: 'Dishwasher Safe', type: 'boolean' },
      { key: 'microwave_safe', label: 'Microwave Safe', type: 'boolean' }
    ]
  },

  // Jewelry (Level 1)
  'jewelry': {
    id: 'jewelry',
    name: 'Jewelry',
    sizeSystem: 'simple_variants',
    specs: [
      { key: 'metal', label: 'Metal', type: 'dropdown', options: ['Gold', 'Silver', 'Platinum', 'Titanium', 'Stainless Steel', 'Other'] },
      { key: 'purity', label: 'Metal Purity', type: 'text', placeholder: 'e.g. 18k, 925' },
      { key: 'gemstone', label: 'Main Stone', type: 'text' }
    ]
  },
  // Jewelry - Rings (Level 2)
  'jewelry-rings': {
    id: 'jewelry-rings',
    name: 'Rings',
    parent: 'jewelry',
    sizeSystem: 'simple_variants',
    specs: [
      { key: 'ring_size', label: 'Ring Size', type: 'text', placeholder: 'e.g. US 7, EU 54' },
      { key: 'setting_type', label: 'Setting Type', type: 'dropdown', options: ['Solitaire', 'Halo', 'Pave', 'Bezel'] },
      { key: 'stone_shape', label: 'Stone Shape', type: 'dropdown', options: ['Round', 'Princess', 'Oval', 'Emerald', 'Pear', 'Marquise'] }
    ]
  },
  // Jewelry - Necklaces (Level 2)
  'jewelry-necklaces': {
    id: 'jewelry-necklaces',
    name: 'Necklaces',
    parent: 'jewelry',
    sizeSystem: 'simple_variants',
    specs: [
      { key: 'chain_length', label: 'Chain Length', type: 'text', placeholder: 'e.g. 18 inches, 45cm' },
      { key: 'chain_type', label: 'Chain Type', type: 'dropdown', options: ['Cable', 'Box', 'Snake', 'Rolo', 'Figaro'] },
      { key: 'clasp_type', label: 'Clasp Type', type: 'dropdown', options: ['Lobster', 'Spring Ring', 'Toggle', 'Magnetic'] }
    ]
  },

  // Sports & Outdoors (Level 1)
  'sports': {
    id: 'sports',
    name: 'Sports & Outdoors',
    sizeSystem: 'simple_variants',
    specs: [
      { key: 'sport', label: 'Sport', type: 'text' },
      { key: 'skill_level', label: 'Skill Level', type: 'dropdown', options: ['Beginner', 'Intermediate', 'Advanced', 'Professional'] },
      { key: 'age_range', label: 'Age Range', type: 'text' }
    ]
  },
  // Sports - Fitness (Level 2)
  'sports-fitness': {
    id: 'sports-fitness',
    name: 'Fitness Equipment',
    parent: 'sports',
    sizeSystem: 'dimensions',
    specs: [
      { key: 'resistance_levels', label: 'Resistance Levels', type: 'number', placeholder: 'e.g. 20' },
      { key: 'weight_capacity', label: 'Weight Capacity', type: 'number', unit: 'lbs' },
      { key: 'foldable', label: 'Foldable', type: 'boolean' }
    ]
  },

  // Pet Supplies (Level 1)
  'pets': {
    id: 'pets',
    name: 'Pet Supplies',
    sizeSystem: 'range_based',
    specs: [
      { key: 'pet_type', label: 'Pet Type', type: 'dropdown', options: ['Dog', 'Cat', 'Bird', 'Small Animal', 'Reptile', 'Fish'] },
      { key: 'breed', label: 'Breed', type: 'text' },
      { key: 'age_appropriate', label: 'Age', type: 'dropdown', options: ['Puppy/Kitten', 'Adult', 'Senior'] }
    ]
  },
  // Pets - Dogs (Level 2)
  'pets-dogs': {
    id: 'pets-dogs',
    name: 'Dog Supplies',
    parent: 'pets',
    sizeSystem: 'range_based',
    specs: [
      { key: 'dog_size', label: 'Dog Size', type: 'dropdown', options: ['Toy', 'Small', 'Medium', 'Large', 'Giant'] },
      { key: 'weight_range', label: 'Weight Range', type: 'text', placeholder: 'e.g. 20-50 lbs' }
    ]
  },

  // Books & Media (Level 1)
  'books': {
    id: 'books',
    name: 'Books & Media',
    sizeSystem: 'simple_variants',
    specs: [
      { key: 'format', label: 'Format', type: 'dropdown', options: ['Hardcover', 'Paperback', 'E-book', 'Audiobook'] },
      { key: 'language', label: 'Language', type: 'text' },
      { key: 'pages', label: 'Pages', type: 'number', placeholder: 'For print books' }
    ]
  },

  // Default Fallback
  'default': {
    id: 'default',
    name: 'General',
    sizeSystem: 'simple_variants',
    specs: [
      { key: 'brand', label: 'Brand/Manufacturer', type: 'text' },
      { key: 'color', label: 'Color', type: 'text' },
      { key: 'material', label: 'Material', type: 'text' }
    ]
  }
};

/**
 * Helper to get the full merged template for a category path with multi-level inheritance
 * e.g. "electronics-computers-laptops" inherits from "electronics-computers" which inherits from "electronics"
 */
export const getCategoryTemplate = (categoryId: string): CategoryTemplate => {
  // Try direct match first
  let template = CATEGORY_TEMPLATES[categoryId];
  
  // If not found, try to find by prefix (e.g. 'fashion-tshirts' -> 'fashion')
  if (!template) {
    const parentKey = Object.keys(CATEGORY_TEMPLATES).find(k => categoryId.startsWith(k));
    template = parentKey ? CATEGORY_TEMPLATES[parentKey] : CATEGORY_TEMPLATES['default'];
  }

  // Handle multi-level inheritance by traversing the entire parent chain
  const allSpecs = [...template.specs];
  let currentTemplate = template;
  const visitedParents = new Set<string>();

  while (currentTemplate.parent && !visitedParents.has(currentTemplate.parent)) {
    visitedParents.add(currentTemplate.parent);
    const parent = CATEGORY_TEMPLATES[currentTemplate.parent];
    
    if (parent) {
      // Add parent specs at the beginning (more general specs first)
      allSpecs.unshift(...parent.specs);
      currentTemplate = parent;
    } else {
      break;
    }
  }

  // Remove duplicate specs (keep the first occurrence, which is from the most specific level)
  const uniqueSpecs = allSpecs.filter((spec, index, self) =>
    index === self.findIndex(s => s.key === spec.key)
  );

  return {
    ...template,
    specs: uniqueSpecs
  };
};
