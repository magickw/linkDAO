import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/router';
import { useToast } from '@/context/ToastContext';
import { marketplaceService, type MarketplaceListing, type CategoryInfo } from '@/services/marketplaceService';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { Button } from '@/design-system/components/Button';
import Layout from '@/components/Layout';
import { ipfsUploadService } from '@/services/ipfsUploadService';
import ShippingConfigurationForm, { type ShippingConfiguration } from '@/components/Marketplace/Seller/ShippingConfigurationForm';
import SizeSelector from '@/components/Marketplace/SizeSelector';
import {
  Upload,
  X,
  Image as ImageIcon,
  Info,
  Eye,
  Shield,
  ChevronLeft,
  ChevronRight,
  Star,
  Check,
  AlertCircle,
  Lock,
  Shuffle,
  Save
} from 'lucide-react';

// Enhanced form data structure
interface EnhancedFormData {
  // Basic Info
  title: string;
  description: string;
  category: string;
  tags: string[];

  // SEO Metadata
  seoTitle: string;
  seoDescription: string;

  // Item Details
  itemType: 'PHYSICAL' | 'DIGITAL' | 'NFT' | 'SERVICE';
  condition: string;

  // Pricing
  price: string;
  currency: 'USDC' | 'USDT' | 'ETH' | 'USD';
  listingType: 'FIXED_PRICE' | 'AUCTION';
  duration: number;
  royalty: number;

  // inventory & Inventory
  inventory: number;
  unlimitedQuantity: boolean;

  // Security & Trust
  escrowEnabled: boolean;

  // Shipping
  shipping?: ShippingConfiguration;

  // Product Specifications
  specifications?: {
    weight?: {
      value: number;
      unit: 'g' | 'kg' | 'oz' | 'lbs';
    };
    dimensions?: {
      length: number;
      width: number;
      height: number;
      unit: 'mm' | 'cm' | 'm' | 'in' | 'ft';
    };
    [key: string]: any;
  };

  // Product Variants (sizes, colors, etc.)
  variants?: Array<{
    size?: string;
    sku?: string;
    price?: number;
    inventory?: number;
    images?: string[];
  }>;

  // Blockchain
  tokenAddress: string;
}

// Available categories - to be fetched from API
const DEFAULT_CATEGORIES = [
  // Digital & NFT Categories
  { value: 'art', label: '🎨 Art & Collectibles' },
  { value: 'music', label: '🎵 Music & Audio' },
  { value: 'gaming', label: '🎮 Gaming & Virtual Worlds' },
  { value: 'photography', label: '📸 Photography' },
  { value: 'domain', label: '🌐 Domain Names' },
  { value: 'utility', label: '⚡ Utility & Access' },
  { value: 'memes', label: '😄 Memes & Fun' },
  { value: 'nft', label: '🖼️ NFTs & Digital Art' },
  { value: 'metaverse', label: '🌍 Metaverse Assets' },
  { value: 'virtual-land', label: '🏞️ Virtual Land' },
  { value: 'digital-fashion', label: '👗 Digital Fashion' },
  { value: 'trading-cards', label: '🃏 Trading Cards' },
  { value: 'tickets', label: '🎫 Tickets & Events' },

  // Physical Products
  { value: 'electronics', label: '📱 Electronics' },
  { value: 'fashion', label: '👕 Fashion & Wearables' },
  { value: 'home', label: '🏠 Home & Garden' },
  { value: 'books', label: '📚 Books & Media' },
  { value: 'sports', label: '⚽ Sports & Recreation' },
  { value: 'toys', label: '🧸 Toys & Games' },
  { value: 'automotive', label: '🚗 Automotive' },
  { value: 'health', label: '💊 Health & Beauty' },
  { value: 'jewelry', label: '💍 Jewelry & Accessories' },
  { value: 'collectibles', label: '🏆 Collectibles' },
  { value: 'vintage', label: '🕰️ Vintage & Antiques' },
  { value: 'crafts', label: '🎨 Handmade Crafts' },
  { value: 'pet-supplies', label: '🐾 Pet Supplies' },
  { value: 'food', label: '🍔 Food & Beverages' },
  { value: 'office', label: '📎 Office Supplies' },
  { value: 'tools', label: '🔧 Tools & Hardware' },
  { value: 'baby', label: '👶 Baby Products' },
  { value: 'outdoor', label: '🏕️ Outdoor & Camping' },
  { value: 'fitness', label: '💪 Fitness & Exercise' },

  // Services & Experiences
  { value: 'services', label: '🛠️ Services' },
  { value: 'education', label: '🎓 Education & Courses' },
  { value: 'consulting', label: '💼 Consulting' },
  { value: 'software', label: '💻 Software & Apps' },
  { value: 'design', label: '🎨 Design Services' },
  { value: 'writing', label: '✍️ Writing & Content' },
  { value: 'marketing', label: '📢 Marketing & Promotion' },
  { value: 'legal', label: '⚖️ Legal Services' },
  { value: 'wellness', label: '🧘 Wellness & Health' },
  { value: 'travel', label: '✈️ Travel & Experiences' },
  { value: 'subscription', label: '🔄 Subscriptions' },

  // Real Estate & Property
  { value: 'real-estate', label: '🏡 Real Estate' },
  { value: 'rental', label: '🔑 Rentals' },
  { value: 'timeshare', label: '📅 Timeshares' },

  // Business & Industrial
  { value: 'business', label: '🏢 Business & Industrial' },
  { value: 'equipment', label: '🏭 Equipment & Machinery' },
  { value: 'wholesale', label: '📦 Wholesale & Bulk' },
  { value: 'manufacturing', label: '🏭 Manufacturing' },

  // Other
  { value: 'other', label: '📦 Other' }
];

// Popular tags
const POPULAR_TAGS = [
  // General tags
  'rare', 'limited-edition', 'handmade', 'vintage', 'premium',
  'exclusive', 'collectible', 'new', 'trending', 'popular',

  // Digital & NFT tags
  'digital-art', 'nft', 'gaming', 'music', 'photography', 'utility',
  'access-token', 'membership', 'metaverse', 'virtual-land', 'domain',
  'trading-cards', 'tickets', 'digital-fashion', 'memes',

  // Physical product tags
  'electronics', 'fashion', 'home', 'books', 'sports', 'toys',
  'automotive', 'health', 'beauty', 'jewelry', 'collectibles', 'crafts',
  'pet-supplies', 'food', 'organic', 'eco-friendly', 'sustainable',

  // Service tags
  'services', 'education', 'consulting', 'software', 'design',
  'writing', 'marketing', 'legal', 'wellness', 'travel', 'online',
  'professional', 'expert', 'certified',

  // Business tags
  'business', 'wholesale', 'bulk', 'manufacturing', 'equipment',
  'real-estate', 'rental', 'investment', 'commercial',

  // Other tags
  'free-shipping', 'fast-delivery', 'local', 'international',
  'customizable', 'personalized', 'gift', 'sale', 'discount'
];

// Step definitions
type FormStep = 'basic' | 'details' | 'pricing' | 'shipping' | 'images' | 'review';

const STEP_TITLES = {
  basic: 'Basic Information',
  details: 'Item Details',
  pricing: 'Pricing & Terms',
  shipping: 'Shipping Configuration',
  images: 'Images & Media',
  review: 'Review & Publish'
};

const STEP_ORDER: FormStep[] = ['basic', 'details', 'pricing', 'shipping', 'images', 'review'];

const resolveImageUrl = (url: string) => {
  if (!url) return '/images/placeholders/product-placeholder.svg';

  // Handle IPFS protocol URLs
  if (url.startsWith('ipfs://')) {
    const hash = url.replace('ipfs://', '');
    // Use Pinata gateway as primary, with fallback to ipfs.io
    return `https://gateway.pinata.cloud/ipfs/${hash}`;
  }

  // Handle raw IPFS hashes
  if (url.startsWith('Qm') || url.startsWith('bafy')) {
    return `https://gateway.pinata.cloud/ipfs/${url}`;
  }

  // Handle gateway.pinata.cloud URLs that might be broken
  if (url.includes('gateway.pinata.cloud/ipfs/')) {
    // Extract the hash and try with a different gateway if needed
    const match = url.match(/\/ipfs\/(.+)$/);
    if (match && match[1]) {
      // Keep the original URL but we'll handle errors in the img onError
      return url;
    }
  }

  // Return URL as-is for other cases (http/https URLs)
  return url;
};

const EditListingPage: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { addToast } = useToast();
  const router = useRouter();
  const { id } = router.query;

  // Enhanced form state
  const [currentStep, setCurrentStep] = useState<FormStep>('basic');
  const [formData, setFormData] = useState<EnhancedFormData>({
    title: '',
    description: '',
    category: '',
    tags: [],
    seoTitle: '',
    seoDescription: '',
    itemType: 'DIGITAL',
    condition: 'new',
    price: '',
    currency: 'USD', // Default to USD for stable pricing
    listingType: 'FIXED_PRICE',
    duration: 86400,
    royalty: 0,
    inventory: 1,
    unlimitedQuantity: false,
    escrowEnabled: true,
    specifications: {
      weight: {
        value: 0,
        unit: 'g'
      },
      dimensions: {
        length: 0,
        width: 0,
        height: 0,
        unit: 'cm'
      }
    },
    tokenAddress: '',
    shipping: undefined
  });

  // Image management
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [primaryImageIndex, setPrimaryImageIndex] = useState(-1);
  const [dragActive, setDragActive] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [ethPrice, setEthPrice] = useState<number>(2400); // Mock ETH price
  const [newTag, setNewTag] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);

  // State for field-specific errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<CategoryInfo[]>([]);

  // Load existing listing data and categories
  useEffect(() => {
    const loadInitialData = async () => {
      if (!id || typeof id !== 'string') return;

      try {
        setInitialLoading(true);

        // Load categories from API - declare in outer scope so it's available for category resolution
        let categoriesData: CategoryInfo[] = [];
        try {
          categoriesData = await marketplaceService.getCategories();
          setCategories(categoriesData);
        } catch (error) {
          console.error('Error loading categories:', error);
          // Fallback to default categories
          categoriesData = DEFAULT_CATEGORIES.map(cat => ({
            id: cat.value,
            name: cat.label,
            slug: cat.value
          }));
          setCategories(categoriesData);
        }

        // Fetch the listing data from the API
        console.log('Loading listing data for ID:', id);

        // Import seller service dynamically to avoid circular dependencies
        const { sellerService } = await import('@/services/sellerService');
        const listing = await sellerService.getListingById(id);

        if (!listing) {
          throw new Error('Listing not found');
        }

        // Resolve category: The transform may return a UUID, we need to find the matching slug
        let resolvedCategory = listing.category || '';
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        // If the category is a UUID, look it up in the categories list
        if (uuidRegex.test(resolvedCategory) && categoriesData.length > 0) {
          const matchedCategory = categoriesData.find((cat: CategoryInfo) => cat.id === resolvedCategory);
          if (matchedCategory) {
            resolvedCategory = matchedCategory.slug || matchedCategory.id;
          }
        }
        // Also check if we need to match by categoryId
        if ((listing as any).categoryId && uuidRegex.test((listing as any).categoryId) && categoriesData.length > 0) {
          const matchedCategory = categoriesData.find((cat: CategoryInfo) => cat.id === (listing as any).categoryId);
          if (matchedCategory) {
            resolvedCategory = matchedCategory.slug || matchedCategory.id;
          }
        }

        console.log('Resolved category:', resolvedCategory, 'from listing.category:', listing.category, 'categoryId:', (listing as any).categoryId);

        // Transform listing data to form data
        // Note: We now use the transformed data from SellerService which extracts data from metadata
        const transformedData: EnhancedFormData = {
          title: listing.title,
          description: listing.description,
          category: resolvedCategory,
          tags: listing.tags || [],
          seoTitle: (listing as any).seoTitle || '',
          seoDescription: (listing as any).seoDescription || '',
          // Use itemType from transformed data (extracted from metadata)
          itemType: ((listing as any).itemType as 'PHYSICAL' | 'DIGITAL' | 'NFT' | 'SERVICE') ||
                    ((listing as any).shipping ? 'PHYSICAL' : 'DIGITAL'),
          // Use condition from transformed data (extracted from metadata)
          condition: listing.condition || 'new',
          price: listing.price.toString(),
          currency: (listing.currency as 'USDC' | 'USDT' | 'ETH' | 'USD') || 'USD',
          listingType: ((listing as any).listingType as 'FIXED_PRICE' | 'AUCTION') ||
                       ((listing as any).saleType === 'auction' ? 'AUCTION' : 'FIXED_PRICE'),
          duration: 86400,
          royalty: (listing as any).royalty || 0,
          inventory: (listing as any).inventory || listing.inventory || 1,
          unlimitedQuantity: ((listing as any).inventory || listing.inventory || 1) >= 999999,
          escrowEnabled: listing.escrowEnabled ?? true,
          // Use specifications from transformed data (extracted from metadata)
          specifications: listing.specifications || {
            weight: { value: 0, unit: 'g' },
            dimensions: { length: 0, width: 0, height: 0, unit: 'cm' }
          },
          tokenAddress: (listing as any).tokenAddress || '',
          shipping: (listing as any).shipping || (listing.shippingOptions ? {
            methods: {
              standard: {
                enabled: !listing.shippingOptions.free,
                cost: listing.shippingOptions.cost || 0,
                estimatedDays: listing.shippingOptions.estimatedDays || '3-5 business days'
              },
              express: {
                enabled: false,
                cost: 0,
                estimatedDays: '1-2 business days'
              },
              international: {
                enabled: listing.shippingOptions.international || false,
                cost: listing.shippingOptions.cost ? listing.shippingOptions.cost * 2 : 0,
                estimatedDays: '10-15 business days',
                regions: []
              }
            },
            processingTime: 1,
            freeShippingThreshold: listing.shippingOptions.free ? 0 : undefined,
            returnsAccepted: false,
            returnWindow: 30,
            packageDetails: {
              weight: 0,
              weightUnit: 'kg',
              dimensions: {
                length: 0,
                width: 0,
                height: 0
              },
              dimensionUnit: 'cm'
            }
          } : undefined),
          variants: (listing as any).variants || []
        };

        console.log('Transformed form data:', {
          category: transformedData.category,
          condition: transformedData.condition,
          itemType: transformedData.itemType,
          specifications: transformedData.specifications,
          inventory: transformedData.inventory
        });

        setFormData(transformedData);
        setExistingImages(listing.images || []);
        // Set primary image index to 0 by default (first image)
        // In a future enhancement, we could store which image is primary in the backend
        setPrimaryImageIndex(0);
      } catch (error) {
        console.error('Error loading listing data:', error);
        addToast('Failed to load listing data: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
      } finally {
        setInitialLoading(false);
      }
    };

    loadInitialData();
  }, [id, addToast]);
  // Real-time validation
  const validateField = (field: keyof EnhancedFormData, value: any) => {
    let error = '';

    switch (field) {
      case 'title':
        if (!value.trim()) {
          error = 'Product title is required';
        } else if (value.length < 5) {
          error = 'Title must be at least 5 characters';
        } else if (value.length > 100) {
          error = 'Title must be less than 100 characters';
        }
        break;

      case 'description':
        if (!value.trim()) {
          error = 'Product description is required';
        } else if (value.length < 20) {
          error = 'Description must be at least 20 characters';
        } else if (value.length > 2000) {
          error = 'Description must be less than 2000 characters';
        }
        break;

      case 'category':
        if (!value) {
          error = 'Please select a category';
        }
        break;

      case 'price':
        if (!value) {
          error = 'Price is required';
        } else {
          const price = parseFloat(value);
          if (isNaN(price) || price <= 0) {
            error = 'Please enter a valid price';
          }
        }
        break;

      case 'inventory':
        if (!formData.unlimitedQuantity && (value < 1)) {
          error = 'Inventory must be at least 1';
        }
        break;
    }

    setFieldErrors(prev => ({
      ...prev,
      [field]: error
    }));
  };

  // Enhanced form validation
  const validateForm = (): { isValid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};

    // Basic info validation
    if (!formData.title.trim()) {
      errors.title = 'Product title is required';
    } else if (formData.title.length < 5) {
      errors.title = 'Title must be at least 5 characters';
    } else if (formData.title.length > 100) {
      errors.title = 'Title must be less than 100 characters';
    }

    if (!formData.description.trim()) {
      errors.description = 'Product description is required';
    } else if (formData.description.length < 20) {
      errors.description = 'Description must be at least 20 characters';
    } else if (formData.description.length > 2000) {
      errors.description = 'Description must be less than 2000 characters';
    }

    if (!formData.category) {
      errors.category = 'Please select a category';
    }

    // Item details validation
    if (!formData.condition) {
      errors.condition = 'Please select a condition';
    }

    // Pricing validation
    if (!formData.price) {
      errors.price = 'Price is required';
    } else {
      const price = parseFloat(formData.price);
      if (isNaN(price) || price <= 0) {
        errors.price = 'Please enter a valid price';
      }
    }

    // Quantity validation
    if (!formData.unlimitedQuantity && formData.inventory < 1) {
      errors.inventory = 'inventory must be at least 1';
    }

    // Images validation
    const totalImages = existingImages.length + images.length;
    if (totalImages === 0) {
      errors.images = 'At least one image is required';
    } else if (totalImages > 10) {
      errors.images = 'Maximum 10 images allowed';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  };

  // Shipping validation
  const validateShipping = (): { isValid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};

    // Skip validation for non-physical items
    if (formData.itemType !== 'PHYSICAL') {
      return { isValid: true, errors: {} };
    }

    if (!formData.shipping) {
      errors.shipping = 'Shipping configuration is required for physical items';
      return { isValid: false, errors };
    }

    // Validate shipping methods
    const enabledMethods = Object.entries(formData.shipping.methods)
      .filter(([_, method]) => method?.enabled);

    if (enabledMethods.length === 0) {
      errors.shipping = 'At least one shipping method must be enabled';
    }

    // Validate each enabled method
    enabledMethods.forEach(([methodType, method]) => {
      if (!method?.cost || method.cost < 0) {
        errors[`${methodType}Cost`] = 'Shipping cost must be a valid positive number';
      }
      if (!method?.estimatedDays) {
        errors[`${methodType}Days`] = 'Estimated delivery time is required';
      }
    });

    // Validate international shipping regions
    if (formData.shipping.methods.international?.enabled) {
      if (!formData.shipping.methods.international.regions || formData.shipping.methods.international.regions.length === 0) {
        errors.internationalRegions = 'At least one shipping region must be selected for international shipping';
      }
    }

    // Validate processing time
    if (formData.shipping.processingTime < 0 || formData.shipping.processingTime > 30) {
      errors.processingTime = 'Processing time must be between 0 and 30 days';
    }

    // Validate package details
    if (!formData.shipping.packageDetails) {
      errors.packageDetails = 'Package details are required';
    } else {
      // Validate weight based on unit
      const weight = formData.shipping.packageDetails.weight;
      if (weight <= 0) {
        errors.weight = 'Package weight must be greater than 0';
      } else if (formData.shipping.packageDetails.weightUnit === 'kg' && weight > 100) {
        errors.weight = 'Package weight must be less than 100 kg';
      } else if (formData.shipping.packageDetails.weightUnit === 'lbs' && weight > 220) {
        errors.weight = 'Package weight must be less than 220 lbs';
      }

      // Validate dimensions based on unit
      const { length, width, height } = formData.shipping.packageDetails.dimensions;
      const unit = formData.shipping.packageDetails.dimensionUnit;

      if (length <= 0 || width <= 0 || height <= 0) {
        errors.dimensions = 'All dimensions must be greater than 0';
      } else if (unit === 'cm') {
        if (length > 150 || width > 150 || height > 150) {
          errors.dimensions = 'Package dimensions must be less than 150 cm';
        }
      } else if (unit === 'in') {
        if (length > 60 || width > 60 || height > 60) {
          errors.dimensions = 'Package dimensions must be less than 60 inches';
        }
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  };

  // Form validation by step
  const validateStep = (step: FormStep): boolean => {
    const { isValid, errors } = validateForm();
    const { isValid: shippingValid, errors: shippingErrors } = validateShipping();

    switch (step) {
      case 'basic':
        return !errors.title && !errors.description && !errors.category;
      case 'details':
        return !errors.condition && !errors.inventory;
      case 'pricing':
        return !errors.price;
      case 'shipping':
        return shippingValid;
      case 'images':
        return !errors.images;
      case 'review':
        return isValid && shippingValid;
      default:
        return false;
    }
  };

  // Enhanced form handlers with real-time validation
  const handleFormChange = (field: keyof EnhancedFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    validateField(field, value);
  };

  const handleAddTag = (tag: string) => {
    if (tag && !formData.tags.includes(tag) && formData.tags.length < 10) {
      handleFormChange('tags', [...formData.tags, tag]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    handleFormChange('tags', formData.tags.filter(tag => tag !== tagToRemove));
  };

  // Handle drag and drop events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (files: File[]) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      addToast('Please select valid image files', 'error');
      return;
    }

    const remainingSlots = 10 - (existingImages.length + images.length);
    const filesToAdd = imageFiles.slice(0, remainingSlots);

    if (filesToAdd.length < imageFiles.length) {
      addToast(`Only ${remainingSlots} more images can be added (max 10 total)`, 'warning');
    }

    setImages(prev => [...prev, ...filesToAdd]);

    // Set primary image index to first new image if none is set and there are no existing images
    if (primaryImageIndex === -1 && existingImages.length === 0 && filesToAdd.length > 0) {
      setPrimaryImageIndex(existingImages.length + imagePreviews.length);
    }

    filesToAdd.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setImagePreviews(prev => [...prev, e.target!.result as string]);
        }
      };
      reader.onerror = () => {
        addToast(`Failed to load image preview: ${file.name}`, 'error');
      };
      reader.onabort = () => {
        addToast(`Image preview loading aborted: ${file.name}`, 'error');
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    // Check if it's an existing image or a newly uploaded one
    if (index < existingImages.length) {
      // Removing existing image
      const newExistingImages = [...existingImages];
      newExistingImages.splice(index, 1);
      setExistingImages(newExistingImages);

      // Adjust primary image index if needed
      if (primaryImageIndex > index) {
        setPrimaryImageIndex(primaryImageIndex - 1);
      } else if (primaryImageIndex === index) {
        // If we're removing the primary image, set the first image as primary (if any exist)
        setPrimaryImageIndex(existingImages.length > 1 || imagePreviews.length > 0 ? 0 : -1);
      }
    } else {
      // Removing newly uploaded image
      const adjustedIndex = index - existingImages.length;
      const newImages = [...images];
      const newPreviews = [...imagePreviews];

      newImages.splice(adjustedIndex, 1);
      newPreviews.splice(adjustedIndex, 1);

      setImages(newImages);
      setImagePreviews(newPreviews);

      // Adjust primary image index if needed
      if (primaryImageIndex > index) {
        setPrimaryImageIndex(primaryImageIndex - 1);
      } else if (primaryImageIndex === index) {
        // If we're removing the primary image, set the first image as primary (if any exist)
        setPrimaryImageIndex(existingImages.length > 0 || newPreviews.length > 0 ? 0 : -1);
      }
    }
  };

  const setAsPrimary = (index: number) => {
    setPrimaryImageIndex(index);
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    // Combine existing and new images for manipulation
    const allImages = [...existingImages, ...imagePreviews];
    const allImageFiles = [...Array(existingImages.length).fill(null), ...images];

    // Remove the moved item and insert it at the new position
    const [movedImage] = allImages.splice(fromIndex, 1);
    allImages.splice(toIndex, 0, movedImage);

    const [movedImageFile] = allImageFiles.splice(fromIndex, 1);
    allImageFiles.splice(toIndex, 0, movedImageFile);

    // Split back into existing images and new image previews/files
    const newExistingImages = allImages.slice(0, existingImages.length);
    const newImagePreviews = allImages.slice(existingImages.length);
    const newImages = allImageFiles.slice(existingImages.length).filter(file => file !== null) as File[];

    // Update state
    setExistingImages(newExistingImages);
    setImagePreviews(newImagePreviews);
    setImages(newImages);

    // Update primary image index
    if (primaryImageIndex === fromIndex) {
      setPrimaryImageIndex(toIndex);
    } else if (primaryImageIndex === toIndex) {
      setPrimaryImageIndex(fromIndex > toIndex ? primaryImageIndex + 1 : primaryImageIndex - 1);
    } else if (fromIndex < primaryImageIndex && toIndex >= primaryImageIndex) {
      setPrimaryImageIndex(primaryImageIndex - 1);
    } else if (fromIndex > primaryImageIndex && toIndex <= primaryImageIndex) {
      setPrimaryImageIndex(primaryImageIndex + 1);
    }
  };


  // Step navigation
  const currentStepIndex = STEP_ORDER.indexOf(currentStep);
  const canGoNext = validateStep(currentStep);
  const canGoPrev = currentStepIndex > 0;

  const goToStep = (step: FormStep) => {
    setCurrentStep(step);
  };

  const goNext = () => {
    if (canGoNext && currentStepIndex < STEP_ORDER.length - 1) {
      setCurrentStep(STEP_ORDER[currentStepIndex + 1]);
    }
  };

  const goPrev = () => {
    if (canGoPrev) {
      setCurrentStep(STEP_ORDER[currentStepIndex - 1]);
    }
  };



  // Form submission
  const handleSubmit = async () => {
    if (!isConnected || !address) {
      addToast('Please connect your wallet first', 'error');
      return;
    }

    if (!id || typeof id !== 'string') {
      addToast('Invalid listing ID', 'error');
      return;
    }

    try {
      setLoading(true);

      // Validate required fields
      if (!formData.title) throw new Error('Title is required');
      if (!formData.description) throw new Error('Description is required');
      if (!formData.price || parseFloat(formData.price) <= 0) throw new Error('Valid price is required');

      // Validate shipping for physical items
      if (formData.itemType === 'PHYSICAL') {
        const { isValid: shippingValid, errors: shippingErrors } = validateShipping();
        if (!shippingValid) {
          const firstError = Object.values(shippingErrors)[0];
          throw new Error(firstError || 'Shipping configuration is required for physical items');
        }
      }

      // Upload new images to IPFS first
      const uploadedImageUrls: string[] = [...existingImages];

      for (let i = 0; i < images.length; i++) {
        try {
          const result = await ipfsUploadService.uploadFile(images[i]);
          uploadedImageUrls.push(result.url);
          console.log(`[EDIT] Uploaded image ${i + 1}/${images.length}:`, result.url);
        } catch (uploadError) {
          console.error(`[EDIT] Failed to upload image ${i + 1}:`, uploadError);
          throw new Error(`Failed to upload image ${i + 1}. Please try again.`);
        }
      }

      // Reorder images so primary image is first
      // The primaryImageIndex refers to the position in the combined array of existing + new images
      // We need to make sure we're working with the correct index in the uploadedImageUrls array
      // Only reorder if there are images and the primary index is valid
      if (uploadedImageUrls.length > 0 && primaryImageIndex >= 0 && primaryImageIndex < uploadedImageUrls.length) {
        // Get the primary image
        const primaryImage = uploadedImageUrls[primaryImageIndex];
        // Remove it from its current position
        uploadedImageUrls.splice(primaryImageIndex, 1);
        // Add it to the beginning
        uploadedImageUrls.unshift(primaryImage);
      }
      console.log('[EDIT] All images processed:', uploadedImageUrls);

      // Prepare data in the format expected by the backend
      const listingData = {
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        category: formData.category,
        currency: formData.currency,
        inventory: formData.unlimitedQuantity ? 999999 : (formData.inventory || 1),
        tags: formData.tags,
        images: uploadedImageUrls, // Include all image URLs
        condition: formData.condition as 'new' | 'used' | 'refurbished',
        escrowEnabled: formData.escrowEnabled,
        shipping: formData.itemType === 'PHYSICAL' ? formData.shipping : undefined,
        specifications: formData.specifications,
        variants: formData.variants, // Include size variants
        // Note: Some fields are not part of the SellerListing interface but may be used by the backend
      };

      console.log('[EDIT] Calling sellerService.updateListing with:', { id, listingData });

      // Import seller service dynamically to avoid circular dependencies
      const { sellerService } = await import('@/services/sellerService');

      try {
        // Call the real update listing API
        const result = await sellerService.updateListing(id, listingData as any);
        console.log('[EDIT] Update successful:', result);
        addToast('🎉 Listing updated successfully!', 'success');

        // Navigation timeout to ensure toast is visible
        setTimeout(() => {
          router.push('/marketplace/seller/dashboard');
        }, 1500);
      } catch (apiError: any) {
        console.error('[EDIT] API call failed:', apiError);
        console.error('[EDIT] API error details:', {
          status: apiError.status,
          type: apiError.type,
          details: apiError.details
        });
        throw apiError; // Re-throw to be caught by the outer catch block
      }
    } catch (error: any) {
      console.error('[EDIT] Error caught in handleSubmit:', error);
      const errorMessage = error.details?.error || error.message || 'Failed to update listing';
      addToast(errorMessage, 'error');
      console.error('Error updating listing:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper components
  const StepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {STEP_ORDER.map((step, index) => {
        const isActive = step === currentStep;
        const isCompleted = STEP_ORDER.indexOf(currentStep) > index;
        const isAccessible = index <= STEP_ORDER.indexOf(currentStep);

        return (
          <React.Fragment key={step}>
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium cursor-pointer transition-all ${isActive
                ? 'bg-indigo-500 text-white'
                : isCompleted
                  ? 'bg-green-500 text-white'
                  : isAccessible
                    ? 'bg-white/20 text-white hover:bg-white/30'
                    : 'bg-white/10 text-white/50 cursor-not-allowed'
                }`}
              onClick={() => isAccessible && goToStep(step)}
            >
              {isCompleted ? <Check size={16} /> : index + 1}
            </div>
            {index < STEP_ORDER.length - 1 && (
              <div className={`w-12 h-0.5 mx-2 ${isCompleted ? 'bg-green-500' : 'bg-white/20'
                }`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  const PriceDisplay = ({ amount, currency }: { amount: string; currency: string }) => {
    // Only show conversion for ETH currency
    if (currency === 'ETH' && amount) {
      const usdValue = parseFloat(amount || '0') * ethPrice;
      return (
        <p className="text-sm text-green-400 mt-1">
          ≈ ${usdValue.toFixed(2)} USD
        </p>
      );
    }

    // For USD or other currencies, don't show conversion
    return null;
  };

  const ItemTypeCard = ({ type, selected, onClick, disabled }: {
    type: 'PHYSICAL' | 'DIGITAL' | 'NFT' | 'SERVICE';
    selected: boolean;
    onClick: () => void;
    disabled?: boolean;
  }) => {
    const typeInfo = {
      PHYSICAL: { icon: '📦', label: 'Physical Goods', desc: 'Tangible items that require shipping' },
      DIGITAL: { icon: '💻', label: 'Digital Goods', desc: 'Downloadable files, software, ebooks' },
      NFT: { icon: '🎨', label: 'NFT', desc: 'Non-fungible tokens, digital collectibles' },
      SERVICE: { icon: '🛠️', label: 'Service', desc: 'Consultation, development, design work' }
    };

    const info = typeInfo[type];

    return (
      <div
        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selected
          ? 'border-indigo-400 bg-indigo-500/20'
          : 'border-white/20 bg-white/5 hover:border-white/40'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={!disabled ? onClick : undefined}
      >
        <div className="text-2xl mb-2">{info.icon}</div>
        <h3 className="font-medium text-white mb-1">{info.label}</h3>
        <p className="text-sm text-white/70">{info.desc}</p>
      </div>
    );
  };

  if (!isConnected) {
    return (
      <Layout title="Edit Listing - LinkDAO Marketplace" fullWidth={true}>
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <GlassPanel variant="primary" className="text-center py-12">
              <Lock className="mx-auto h-12 w-12 text-white/60 mb-4" />
              <h2 className="text-2xl font-semibold text-white mb-4">Connect Your Wallet</h2>
              <p className="text-white/80">Please connect your wallet to edit a listing.</p>
            </GlassPanel>
          </div>
        </div>
      </Layout>
    );
  }

  if (initialLoading) {
    return (
      <Layout title="Edit Listing - LinkDAO Marketplace" fullWidth={true}>
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <GlassPanel variant="primary" className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <h2 className="text-2xl font-semibold text-white mb-4">Loading Listing Data</h2>
              <p className="text-white/80">Please wait while we load your listing information...</p>
            </GlassPanel>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Edit Listing - LinkDAO Marketplace" fullWidth={true}>
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="flex items-center text-white/80 hover:text-white mb-4 transition-colors"
            >
              <ChevronLeft className="mr-2" size={20} />
              Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold text-white">Edit Product Listing</h1>
            <p className="text-white/70 mt-2">Update your product details, pricing, and media</p>
          </div>

          {/* Progress indicator */}
          <GlassPanel className="mb-8">
            <StepIndicator />

            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-white">
                {STEP_TITLES[currentStep]}
              </h2>
            </div>
          </GlassPanel>

          {/* Form content */}
          <GlassPanel className="mb-8" allowOverflow>
            {/* Basic Information Step */}
            {currentStep === 'basic' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Product Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleFormChange('title', e.target.value)}
                    className={`w-full px-4 py-3 bg-white/10 border ${fieldErrors.title ? 'border-red-500' : 'border-white/20'
                      } rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                    placeholder="Enter a descriptive title for your product"
                  />
                  {fieldErrors.title && (
                    <p className="mt-1 text-sm text-red-400">{fieldErrors.title}</p>
                  )}
                  <p className="mt-1 text-xs text-white/60">
                    Create a clear, descriptive title that includes relevant keywords
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleFormChange('description', e.target.value)}
                    rows={6}
                    className={`w-full px-4 py-3 bg-white/10 border ${fieldErrors.description ? 'border-red-500' : 'border-white/20'
                      } rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                    placeholder="Describe your product in detail..."
                  />
                  {fieldErrors.description && (
                    <p className="mt-1 text-sm text-red-400">{fieldErrors.description}</p>
                  )}
                  <div className="flex justify-between mt-1">
                    <p className="text-xs text-white/60">
                      Include key features, specifications, and benefits
                    </p>
                    <p className="text-xs text-white/60">
                      {formData.description.length}/2000
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleFormChange('category', e.target.value)}
                    className={`w-full px-4 py-3 bg-white/10 border ${fieldErrors.category ? 'border-red-500' : 'border-white/20'
                      } rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                  >
                    <option value="">Select a category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.slug} className="bg-gray-800">
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.category && (
                    <p className="mt-1 text-sm text-red-400">{fieldErrors.category}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {formData.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-indigo-500/20 text-indigo-300"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-2 text-indigo-400 hover:text-white"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag(newTag.trim()))}
                      className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-l-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Add a tag and press Enter"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddTag(newTag.trim())}
                      className="px-4 bg-indigo-600 text-white rounded-r-lg hover:bg-indigo-700 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {POPULAR_TAGS.filter(tag => !formData.tags.includes(tag)).slice(0, 5).map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          if (!formData.tags.includes(tag)) {
                            handleFormChange('tags', [...formData.tags, tag]);
                          }
                        }}
                        className="text-xs px-2 py-1 bg-white/10 text-white/70 rounded hover:bg-white/20 transition-colors"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Item Details Step */}
            {currentStep === 'details' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-white mb-4">
                    Item Type
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(['PHYSICAL', 'DIGITAL', 'NFT', 'SERVICE'] as const).map((type) => (
                      <ItemTypeCard
                        key={type}
                        type={type}
                        selected={formData.itemType === type}
                        onClick={() => handleFormChange('itemType', type)}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Condition
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'new', label: 'New' },
                      { value: 'like-new', label: 'Like New' },
                      { value: 'good', label: 'Good' },
                      { value: 'fair', label: 'Fair' },
                      { value: 'poor', label: 'Poor' },
                      { value: 'used', label: 'Used' }
                    ].map((condition) => (
                      <button
                        key={condition.value}
                        type="button"
                        className={`py-3 px-4 rounded-lg border transition-all ${formData.condition === condition.value
                          ? 'border-indigo-400 bg-indigo-500/20 text-white'
                          : 'border-white/20 bg-white/5 text-white hover:border-white/40'
                          }`}
                        onClick={() => handleFormChange('condition', condition.value)}
                      >
                        {condition.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    SEO Title
                  </label>
                  <input
                    type="text"
                    value={formData.seoTitle}
                    onChange={(e) => handleFormChange('seoTitle', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="SEO title for search engines (optional)"
                    maxLength={60}
                  />
                  <div className="flex justify-between mt-1">
                    <p className="text-xs text-white/60">
                      Optimize for search engines (60 character limit)
                    </p>
                    <p className="text-xs text-white/60">
                      {formData.seoTitle.length}/60
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    SEO Description
                  </label>
                  <textarea
                    value={formData.seoDescription}
                    onChange={(e) => handleFormChange('seoDescription', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="SEO description for search engines (optional)"
                    maxLength={160}
                  />
                  <div className="flex justify-between mt-1">
                    <p className="text-xs text-white/60">
                      Brief description for search results (160 character limit)
                    </p>
                    <p className="text-xs text-white/60">
                      {formData.seoDescription.length}/160
                    </p>
                  </div>
                </div>

                {/* Specifications */}
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Specifications (Optional)
                  </label>

                  {/* Weight Input */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm text-white/70 mb-1">Weight</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.specifications?.weight?.value || 0}
                          onChange={(e) => handleFormChange('specifications', {
                            ...formData.specifications,
                            weight: {
                              value: parseFloat(e.target.value) || 0,
                              unit: formData.specifications?.weight?.unit || 'g'
                            }
                          })}
                          className="flex-1 min-w-0 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          placeholder="0.00"
                        />
                        <select
                          value={formData.specifications?.weight?.unit || 'g'}
                          onChange={(e) => handleFormChange('specifications', {
                            ...formData.specifications,
                            weight: {
                              value: formData.specifications?.weight?.value || 0,
                              unit: e.target.value as 'g' | 'kg' | 'oz' | 'lbs'
                            }
                          })}
                          className="w-20 px-2 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        >
                          <option value="g">g</option>
                          <option value="kg">kg</option>
                          <option value="oz">oz</option>
                          <option value="lbs">lbs</option>
                        </select>
                      </div>
                    </div>

                    {/* Dimension Inputs */}
                    <div>
                      <label className="block text-sm text-white/70 mb-1">Dimensions</label>
                      <div className="flex flex-wrap gap-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.specifications?.dimensions?.length || 0}
                          onChange={(e) => handleFormChange('specifications', {
                            ...formData.specifications,
                            dimensions: {
                              ...formData.specifications?.dimensions,
                              length: parseFloat(e.target.value) || 0
                            }
                          })}
                          className="flex-1 min-w-0 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          placeholder="L"
                        />
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.specifications?.dimensions?.width || 0}
                          onChange={(e) => handleFormChange('specifications', {
                            ...formData.specifications,
                            dimensions: {
                              ...formData.specifications?.dimensions,
                              width: parseFloat(e.target.value) || 0
                            }
                          })}
                          className="flex-1 min-w-0 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          placeholder="W"
                        />
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.specifications?.dimensions?.height || 0}
                          onChange={(e) => handleFormChange('specifications', {
                            ...formData.specifications,
                            dimensions: {
                              ...formData.specifications?.dimensions,
                              height: parseFloat(e.target.value) || 0
                            }
                          })}
                          className="flex-1 min-w-0 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          placeholder="H"
                        />
                        <select
                          value={formData.specifications?.dimensions?.unit || 'cm'}
                          onChange={(e) => handleFormChange('specifications', {
                            ...formData.specifications,
                            dimensions: {
                              ...formData.specifications?.dimensions,
                              unit: e.target.value as 'mm' | 'cm' | 'm' | 'in' | 'ft'
                            }
                          })}
                          className="w-20 px-2 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        >
                          <option value="mm">mm</option>
                          <option value="cm">cm</option>
                          <option value="m">m</option>
                          <option value="in">in</option>
                          <option value="ft">ft</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Additional Specifications Textarea */}
                  <textarea
                    rows={4}
                    placeholder="Brand: AudioTech Pro\nModel: AT-WH1000XM5\nBattery Life: 30 hours\nMaterial: Plastic"
                    className="block w-full rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent px-3 py-2"
                    value={(() => {
                      // Convert specifications object to textarea format
                      const specs = formData.specifications || {};
                      const lines = [];

                      // Add other specifications (excluding weight and dimensions which have their own inputs)
                      Object.entries(specs).forEach(([key, value]) => {
                        if (key !== 'weight' && key !== 'dimensions' && value !== undefined) {
                          lines.push(`${key}: ${value}`);
                        }
                      });

                      return lines.join('\n');
                    })()}
                    onChange={(e) => {
                      // Parse textarea content and merge with existing weight/dimensions
                      const lines = e.target.value.split('\n').filter(line => line.trim() !== '');
                      const newSpecs: any = {
                        weight: formData.specifications?.weight,
                        dimensions: formData.specifications?.dimensions
                      };

                      lines.forEach(line => {
                        const [key, ...valueParts] = line.split(':');
                        if (key && valueParts.length > 0) {
                          newSpecs[key.trim()] = valueParts.join(':').trim();
                        }
                      });

                      handleFormChange('specifications', newSpecs);
                    }}
                  />
                </div>

                {/* Size Options */}
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Size Options
                  </label>
                  <SizeSelector
                    selectedSizes={formData.variants?.map(v => v.size || '').filter(Boolean) || []}
                    onSizesChange={(sizes) => {
                      // Update variants with selected sizes
                      const currentVariants = formData.variants || [];
                      const newVariants = sizes.map((size, index) => {
                        const existingVariant = currentVariants.find(v => v.size === size);
                        return existingVariant || {
                          size,
                          sku: `EDIT-${size}`,
                          price: parseFloat(formData.price) || 0,
                          inventory: formData.inventory || 0,
                          images: []
                        };
                      });
                      handleFormChange('variants', newVariants);
                    }}
                    className="text-white"
                  />
                  <p className="mt-2 text-xs text-white/60">
                    Add size variations for your product (e.g., clothing sizes, shoe sizes)
                  </p>
                </div>
              </div>
            )}

            {/* Pricing Step */}
            {currentStep === 'pricing' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Price *
                  </label>
                  <div className="relative">
                    <select
                      value={formData.currency}
                      onChange={(e) => handleFormChange('currency', e.target.value as any)}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-20 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="USD" className="bg-gray-800">USD</option>
                      <option value="USDC" className="bg-gray-800">USDC</option>
                      <option value="USDT" className="bg-gray-800">USDT</option>
                      <option value="ETH" className="bg-gray-800">ETH</option>
                    </select>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => handleFormChange('price', e.target.value)}
                      step="0.01"
                      min="0"
                      className={`w-full pl-16 pr-4 py-3 bg-white/10 border ${fieldErrors.price ? 'border-red-500' : 'border-white/20'
                        } rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                      placeholder="0.00"
                    />
                  </div>
                  {fieldErrors.price && (
                    <p className="mt-1 text-sm text-red-400">{fieldErrors.price}</p>
                  )}
                  <PriceDisplay amount={formData.price} currency={formData.currency} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Inventory *
                  </label>
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <input
                        type="number"
                        value={formData.unlimitedQuantity ? '' : formData.inventory}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          handleFormChange('inventory', value);
                        }}
                        min="1"
                        disabled={formData.unlimitedQuantity}
                        className={`w-full px-4 py-3 bg-white/10 border ${fieldErrors.inventory ? 'border-red-500' : 'border-white/20'
                          } rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${formData.unlimitedQuantity ? 'opacity-50' : ''
                          }`}
                        placeholder="Enter inventory"
                      />
                      {fieldErrors.inventory && (
                        <p className="mt-1 text-sm text-red-400">{fieldErrors.inventory}</p>
                      )}
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="unlimited"
                        checked={formData.unlimitedQuantity}
                        onChange={(e) => handleFormChange('unlimitedQuantity', e.target.checked)}
                        className="h-5 w-5 text-indigo-600 rounded focus:ring-indigo-500"
                      />
                      <label htmlFor="unlimited" className="ml-2 text-white">
                        Unlimited
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Listing Type
                    </label>
                    <div className="space-y-3">
                      <button
                        type="button"
                        className={`w-full py-3 px-4 rounded-lg border transition-all ${formData.listingType === 'FIXED_PRICE'
                          ? 'border-indigo-400 bg-indigo-500/20 text-white'
                          : 'border-white/20 bg-white/5 text-white hover:border-white/40'
                          }`}
                        onClick={() => handleFormChange('listingType', 'FIXED_PRICE')}
                      >
                        Fixed Price
                      </button>
                      <button
                        type="button"
                        className={`w-full py-3 px-4 rounded-lg border transition-all ${formData.listingType === 'AUCTION'
                          ? 'border-indigo-400 bg-indigo-500/20 text-white'
                          : 'border-white/20 bg-white/5 text-white hover:border-white/40'
                          }`}
                        onClick={() => handleFormChange('listingType', 'AUCTION')}
                      >
                        Auction
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Royalty (%)
                    </label>
                    <input
                      type="number"
                      value={formData.royalty}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
                        handleFormChange('royalty', Math.min(Math.max(value, 0), 100));
                      }}
                      min="0"
                      max="100"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="0"
                    />
                    <p className="mt-1 text-xs text-white/60">
                      Percentage for secondary sales (0-100%)
                    </p>
                  </div>
                </div>

                {formData.listingType === 'AUCTION' && (
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Auction Duration
                    </label>
                    <select
                      value={formData.duration}
                      onChange={(e) => handleFormChange('duration', parseInt(e.target.value))}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value={3600} className="bg-gray-800">1 Hour</option>
                      <option value={21600} className="bg-gray-800">6 Hours</option>
                      <option value={86400} className="bg-gray-800">1 Day</option>
                      <option value={172800} className="bg-gray-800">2 Days</option>
                      <option value={604800} className="bg-gray-800">1 Week</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.escrowEnabled}
                      onChange={(e) => handleFormChange('escrowEnabled', e.target.checked)}
                      className="h-5 w-5 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-white flex items-center">
                      Enable Escrow Protection
                      <Shield className="ml-2 text-green-400" size={16} />
                    </span>
                  </label>
                  <p className="mt-1 text-xs text-white/60 ml-7">
                    Protect both buyer and seller with our escrow service
                  </p>
                </div>
              </div>
            )}

            {/* Shipping Step */}
            {currentStep === 'shipping' && (
              <div className="space-y-6">
                <ShippingConfigurationForm
                  value={formData.shipping}
                  onChange={(shipping) => handleFormChange('shipping', shipping)}
                  itemType={formData.itemType}
                  errors={fieldErrors}
                />
              </div>
            )}

            {/* Images Step */}
            {currentStep === 'images' && (
              <div className="space-y-6">
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-white/20 hover:border-white/40'
                    }`}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                >
                  <Upload className="mx-auto h-12 w-12 text-white/60 mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">
                    Drag and drop images here
                  </h3>
                  <p className="text-white/60 mb-4">
                    or click to browse files
                  </p>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg cursor-pointer hover:bg-indigo-700 transition-colors"
                  >
                    <ImageIcon className="mr-2" size={16} />
                    Select Images
                  </label>
                  <p className="mt-2 text-xs text-white/60">
                    PNG, JPG, GIF up to 10MB each
                  </p>
                </div>

                {(existingImages.length > 0 || imagePreviews.length > 0) && (
                  <div>
                    <h3 className="text-lg font-medium text-white mb-4">Uploaded Images</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">

                      {/* Existing images */}
                      {existingImages.map((preview, index) => (
                        <div
                          key={`existing-${index}`}
                          className={`relative group rounded-lg overflow-hidden border-2 ${primaryImageIndex === index
                            ? 'border-indigo-500 ring-2 ring-indigo-500/50'
                            : 'border-white/20'
                            }`}
                        >
                          <img
                            src={resolveImageUrl(preview)}
                            alt={`Product ${index + 1}`}
                            className="w-full h-32 object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              const currentSrc = target.src;

                              // Try fallback to ipfs.io gateway if using Pinata
                              if (currentSrc.includes('gateway.pinata.cloud')) {
                                const match = currentSrc.match(/\/ipfs\/(.+)$/);
                                if (match && match[1] && !target.dataset.fallbackAttempted) {
                                  target.dataset.fallbackAttempted = 'true';
                                  target.src = `https://ipfs.io/ipfs/${match[1]}`;
                                  return;
                                }
                              }

                              // Final fallback to placeholder
                              if (!target.dataset.placeholderSet) {
                                target.dataset.placeholderSet = 'true';
                                target.src = '/images/placeholders/product-placeholder.svg';
                              }
                            }}
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="flex space-x-2">
                              <button
                                type="button"
                                onClick={() => setAsPrimary(index)}
                                className="p-1 bg-white/20 rounded hover:bg-white/30 text-white"
                                title="Set as primary image"
                              >
                                <Star size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="p-1 bg-red-500/80 rounded hover:bg-red-500 text-white"
                                title="Remove image"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                          {primaryImageIndex === index && (
                            <div className="absolute top-2 left-2 bg-indigo-500 text-white text-xs px-2 py-1 rounded">
                              Primary
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Newly uploaded images */}
                      {imagePreviews.map((preview, index) => {
                        const adjustedIndex = index + existingImages.length;
                        return (
                          <div
                            key={`new-${index}`}
                            className={`relative group rounded-lg overflow-hidden border-2 ${primaryImageIndex === adjustedIndex
                              ? 'border-indigo-500 ring-2 ring-indigo-500/50'
                              : 'border-white/20'
                              }`}
                          >
                            <img
                              src={preview}
                              alt={`New product ${index + 1}`}
                              className="w-full h-32 object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/images/placeholders/product-placeholder.svg';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <div className="flex space-x-2">
                                <button
                                  type="button"
                                  onClick={() => setAsPrimary(adjustedIndex)}
                                  className="p-1 bg-white/20 rounded hover:bg-white/30 text-white"
                                  title="Set as primary image"
                                >
                                  <Star size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeImage(adjustedIndex)}
                                  className="p-1 bg-red-500/80 rounded hover:bg-red-500 text-white"
                                  title="Remove image"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            </div>
                            {primaryImageIndex === adjustedIndex && (
                              <div className="absolute top-2 left-2 bg-indigo-500 text-white text-xs px-2 py-1 rounded">
                                Primary
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-start">
                    <Info className="text-blue-400 mt-0.5 mr-3 flex-shrink-0" size={16} />
                    <div>
                      <h4 className="text-blue-300 font-medium">Image Guidelines</h4>
                      <ul className="mt-1 text-sm text-blue-200/80 list-disc pl-5 space-y-1">
                        <li>Use high-quality images (minimum 800x600 pixels)</li>
                        <li>Show your product from multiple angles</li>
                        <li>Ensure good lighting and focus</li>
                        <li>The first image will be used as the primary display image</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Review Step */}
            {currentStep === 'review' && (
              <div className="space-y-6">
                <div className="bg-white/5 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-white mb-4">Product Preview</h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1">
                      {/* Display primary image */}
                      {existingImages.length > 0 || imagePreviews.length > 0 ? (
                        <img
                          src={
                            resolveImageUrl(primaryImageIndex < existingImages.length
                              ? existingImages[primaryImageIndex]
                              : imagePreviews[primaryImageIndex - existingImages.length])
                          }
                          alt={formData.title || 'Product Image'}
                          className="w-full h-48 object-cover rounded-lg"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/images/placeholders/product-placeholder.svg';
                          }}
                        />
                      ) : (
                        <div className="bg-gray-200 border-2 border-dashed rounded-xl w-full h-48 flex items-center justify-center">
                          <span className="text-gray-500">No image</span>
                        </div>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <h2 className="text-xl font-bold text-white">{formData.title || 'Product Title'}</h2>

                      <div className="flex items-center mt-2">
                        <div className="flex text-yellow-400">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={16} fill="currentColor" />
                          ))}
                        </div>
                        <span className="ml-2 text-sm text-white/70">(0 reviews)</span>
                      </div>

                      <div className="mt-4">
                        <span className="text-2xl font-bold text-white">
                          {formData.currency} {formData.price || '0.00'}
                        </span>
                      </div>

                      <p className="mt-4 text-white/80 line-clamp-3">
                        {formData.description || 'Product description will appear here...'}
                      </p>

                      <div className="mt-6 flex flex-wrap gap-2">
                        {formData.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-sm"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-white mb-4">Listing Details</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-white/70">Category</h4>
                      <p className="text-white">
                        {categories.find(c => c.slug === formData.category)?.name || 'Not specified'}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-white/70">Condition</h4>
                      <p className="text-white capitalize">{formData.condition || 'Not specified'}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-white/70">Item Type</h4>
                      <p className="text-white">{formData.itemType || 'Not specified'}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-white/70">Inventory</h4>
                      <p className="text-white">
                        {formData.unlimitedQuantity ? 'Unlimited' : formData.inventory}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-white/70">Escrow Protection</h4>
                      <p className="text-white">
                        {formData.escrowEnabled ? 'Enabled' : 'Disabled'}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-white/70">Royalty</h4>
                      <p className="text-white">{formData.royalty}%</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center p-4 bg-yellow-900/30 border border-yellow-500/30 rounded-lg">
                  <AlertCircle className="text-yellow-400 mr-3 flex-shrink-0" size={20} />
                  <p className="text-yellow-200 text-sm">
                    By clicking "Save Changes", you confirm that all information is accurate and you agree to our
                    seller terms and conditions.
                  </p>
                </div>
              </div>
            )}
          </GlassPanel>

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <Button
              variant="secondary"
              onClick={goPrev}
              disabled={!canGoPrev}
              className="flex items-center"
            >
              <ChevronLeft className="mr-2" size={16} />
              Previous
            </Button>

            {currentStep === 'review' ? (
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center bg-green-600 hover:bg-green-700"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2" size={16} />
                    Save Changes
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={goNext}
                disabled={!canGoNext}
                className="flex items-center"
              >
                Next
                <ChevronRight className="ml-2" size={16} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default EditListingPage;