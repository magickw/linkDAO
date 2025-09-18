import React, { useState, useCallback, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/router';
import { useToast } from '@/context/ToastContext';
import { MarketplaceService, type MarketplaceListing } from '@/services/marketplaceService';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { Button } from '@/design-system/components/Button';
import Layout from '@/components/Layout';
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
  Shuffle
} from 'lucide-react';

// Enhanced form data structure
interface EnhancedFormData {
  // Basic Info
  title: string;
  description: string;
  category: string;
  tags: string[];
  
  // Item Details
  itemType: 'PHYSICAL' | 'DIGITAL' | 'NFT' | 'SERVICE';
  condition: string;
  
  // Pricing
  price: string;
  currency: 'USDC' | 'USDT' | 'ETH' | 'USD';
  listingType: 'FIXED_PRICE' | 'AUCTION';
  duration: number;
  royalty: number;
  
  // Quantity & Inventory
  quantity: number;
  unlimitedQuantity: boolean;
  
  // Security & Trust
  escrowEnabled: boolean;
  
  // Blockchain
  tokenAddress: string;
}

// Available categories
const CATEGORIES = [
  { value: 'art', label: '🎨 Art & Collectibles' },
  { value: 'music', label: '🎵 Music & Audio' },
  { value: 'gaming', label: '🎮 Gaming & Virtual Worlds' },
  { value: 'photography', label: '📸 Photography' },
  { value: 'domain', label: '🌐 Domain Names' },
  { value: 'utility', label: '⚡ Utility & Access' },
  { value: 'sports', label: '⚽ Sports & Recreation' },
  { value: 'memes', label: '😄 Memes & Fun' },
  { value: 'fashion', label: '👕 Fashion & Wearables' },
  { value: 'electronics', label: '📱 Electronics' },
  { value: 'books', label: '📚 Books & Media' },
  { value: 'services', label: '🛠️ Services' },
  { value: 'other', label: '📦 Other' }
];

// Popular tags
const POPULAR_TAGS = [
  'rare', 'limited-edition', 'handmade', 'vintage', 'premium', 
  'exclusive', 'collectible', 'digital-art', 'gaming', 'music',
  'photography', 'utility', 'access-token', 'membership'
];

// Step definitions
type FormStep = 'basic' | 'details' | 'pricing' | 'images' | 'review';

const STEP_TITLES = {
  basic: 'Basic Information',
  details: 'Item Details',
  pricing: 'Pricing & Terms', 
  images: 'Images & Media',
  review: 'Review & Publish'
};

const STEP_ORDER: FormStep[] = ['basic', 'details', 'pricing', 'images', 'review'];

const CreateListingPage: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { addToast } = useToast();
  const router = useRouter();
  
  // Enhanced form state
  const [currentStep, setCurrentStep] = useState<FormStep>('basic');
  const [formData, setFormData] = useState<EnhancedFormData>({
    title: '',
    description: '',
    category: '',
    tags: [],
    itemType: 'DIGITAL',
    condition: 'new',
    price: '',
    currency: 'USDC', // Default to USDC for stable pricing
    listingType: 'FIXED_PRICE',
    duration: 86400,
    royalty: 0,
    quantity: 1,
    unlimitedQuantity: false,
    escrowEnabled: true,
    tokenAddress: ''
  });
  
  // Image management
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [primaryImageIndex, setPrimaryImageIndex] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [ethPrice, setEthPrice] = useState<number>(2400); // Mock ETH price
  const [newTag, setNewTag] = useState('');
  
  const marketplaceService = new MarketplaceService();

  // Mock ETH price fetching (in real app, use CoinGecko API)
  useEffect(() => {
    const fetchEthPrice = async () => {
      try {
        // Mock API call - replace with real price API
        setEthPrice(2400 + Math.random() * 100);
      } catch (error) {
        console.error('Failed to fetch ETH price:', error);
      }
    };
    
    fetchEthPrice();
    const interval = setInterval(fetchEthPrice, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  // Form validation by step
  const validateStep = (step: FormStep): boolean => {
    switch (step) {
      case 'basic':
        return !!(formData.title && formData.description && formData.category);
      case 'details':
        return !!(formData.itemType && formData.condition);
      case 'pricing':
        return !!(formData.price && parseFloat(formData.price) > 0);
      case 'images':
        return images.length > 0;
      case 'review':
        return true;
      default:
        return false;
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

  // Form handlers
  const handleFormChange = (field: keyof EnhancedFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

  // Enhanced image handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    const remainingSlots = 10 - images.length;
    const filesToAdd = imageFiles.slice(0, remainingSlots);
    
    if (filesToAdd.length < imageFiles.length) {
      addToast(`Only ${remainingSlots} more images can be added (max 10 total)`, 'warning');
    }

    setImages(prev => [...prev, ...filesToAdd]);
    
    filesToAdd.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setImagePreviews(prev => [...prev, e.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    
    // Adjust primary image index if needed
    if (primaryImageIndex === index) {
      setPrimaryImageIndex(0);
    } else if (primaryImageIndex > index) {
      setPrimaryImageIndex(prev => prev - 1);
    }
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    const newImages = [...images];
    const newPreviews = [...imagePreviews];
    
    const [movedImage] = newImages.splice(fromIndex, 1);
    const [movedPreview] = newPreviews.splice(fromIndex, 1);
    
    newImages.splice(toIndex, 0, movedImage);
    newPreviews.splice(toIndex, 0, movedPreview);
    
    setImages(newImages);
    setImagePreviews(newPreviews);
    
    // Update primary image index
    if (primaryImageIndex === fromIndex) {
      setPrimaryImageIndex(toIndex);
    } else if (primaryImageIndex === toIndex) {
      setPrimaryImageIndex(fromIndex > toIndex ? primaryImageIndex + 1 : primaryImageIndex - 1);
    }
  };

  // Form submission
  const handleSubmit = async () => {
    if (!isConnected || !address) {
      addToast('Please connect your wallet first', 'error');
      return;
    }
    
    try {
      setLoading(true);
      
      // Validate required fields
      if (!formData.title) throw new Error('Title is required');
      if (!formData.description) throw new Error('Description is required');
      if (!formData.price || parseFloat(formData.price) <= 0) throw new Error('Valid price is required');
      if (images.length === 0) throw new Error('At least one image is required');
      
      const listingData = {
        sellerWalletAddress: address,
        tokenAddress: formData.tokenAddress || '0x0000000000000000000000000000000000000000',
        price: formData.price,
        quantity: formData.unlimitedQuantity ? 999999 : formData.quantity,
        itemType: formData.itemType,
        listingType: formData.listingType,
        duration: formData.listingType === 'AUCTION' ? formData.duration : undefined,
        metadataURI: JSON.stringify({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          tags: formData.tags,
          condition: formData.condition,
          images: imagePreviews,
          primaryImageIndex,
          escrowEnabled: formData.escrowEnabled,
          royalty: formData.royalty
        })
      };
      
      await marketplaceService.createListing(listingData);
      
      addToast('🎉 Listing created successfully!', 'success');
      router.push('/marketplace');
    } catch (error: any) {
      addToast(error.message || 'Failed to create listing', 'error');
      console.error('Error creating listing:', error);
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
              className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium cursor-pointer transition-all ${
                isActive
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
              <div className={`w-12 h-0.5 mx-2 ${
                isCompleted ? 'bg-green-500' : 'bg-white/20'
              }`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  const ETHPriceDisplay = ({ ethAmount }: { ethAmount: string }) => {
    const usdValue = parseFloat(ethAmount || '0') * ethPrice;
    return (
      <p className="text-sm text-green-400 mt-1">
        ≈ ${usdValue.toFixed(2)} USD
      </p>
    );
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
        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
          selected
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
      <Layout title="Create Listing - LinkDAO Marketplace">
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <GlassPanel variant="primary" className="text-center py-12">
              <Lock className="mx-auto h-12 w-12 text-white/60 mb-4" />
              <h2 className="text-2xl font-semibold text-white mb-4">Connect Your Wallet</h2>
              <p className="text-white/80">Please connect your wallet to create a listing.</p>
            </GlassPanel>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Create Listing - LinkDAO Marketplace">
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">
              Create New Listing
            </h1>
            <p className="text-white/80 text-lg">
              List your items securely on the decentralized marketplace
            </p>
            
            {/* Trust Indicators */}
            <div className="flex items-center justify-center gap-6 mt-6 text-sm text-white/70">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span>IPFS Storage</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                <span>Smart Contract Security</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                <span>Escrow Protection</span>
              </div>
            </div>
          </div>

          <GlassPanel variant="primary" className="mb-8">
            <div className="p-8">
              <StepIndicator />
              
              {/* Step Content */}
              {currentStep === 'basic' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-white mb-6">
                    {STEP_TITLES.basic}
                  </h2>
                  
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleFormChange('title', e.target.value)}
                      className="block w-full rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent px-3 py-2"
                      placeholder="Give your item a clear, descriptive title"
                      maxLength={80}
                    />
                    <div className="flex justify-between mt-1">
                      <p className="text-xs text-white/60">
                        Make it descriptive and searchable
                      </p>
                      <p className="text-xs text-white/60">
                        {formData.title.length}/80
                      </p>
                    </div>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Category *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => handleFormChange('category', e.target.value)}
                      className="block w-full rounded-lg bg-white/10 border border-white/20 text-white backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent px-3 py-2 [&>option]:bg-gray-800 [&>option]:text-white"
                    >
                      <option value="">Select a category</option>
                      {CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Description *
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleFormChange('description', e.target.value)}
                      rows={4}
                      className="block w-full rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent px-3 py-2"
                      placeholder="Describe your item in detail. Include key features, condition, and what makes it special..."
                      maxLength={2000}
                    />
                    <div className="flex justify-between mt-1">
                      <p className="text-xs text-white/60">
                        Be detailed - this helps buyers make informed decisions
                      </p>
                      <p className={`text-xs ${
                        formData.description.length < 100 ? 'text-orange-400' :
                        formData.description.length > 1800 ? 'text-red-400' :
                        'text-green-400'
                      }`}>
                        {formData.description.length}/2000
                      </p>
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Tags (Optional)
                    </label>
                    <div className="space-y-3">
                      {/* Add new tag */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddTag(newTag);
                            }
                          }}
                          className="flex-1 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent px-3 py-2"
                          placeholder="Add a tag and press Enter"
                          maxLength={20}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleAddTag(newTag)}
                          className="border-white/30 text-white/80 hover:bg-white/10"
                          disabled={!newTag || formData.tags.length >= 10}
                        >
                          Add
                        </Button>
                      </div>
                      
                      {/* Popular tags */}
                      <div>
                        <p className="text-xs text-white/60 mb-2">Popular tags:</p>
                        <div className="flex flex-wrap gap-2">
                          {POPULAR_TAGS.map(tag => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => handleAddTag(tag)}
                              className="px-2 py-1 text-xs rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all"
                              disabled={formData.tags.includes(tag) || formData.tags.length >= 10}
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {/* Current tags */}
                      {formData.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {formData.tags.map(tag => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 px-3 py-1 text-sm rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => handleRemoveTag(tag)}
                                className="hover:text-white"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 'details' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-white mb-6">
                    {STEP_TITLES.details}
                  </h2>
                  
                  {/* Item Type Selection */}
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-4">
                      Item Type *
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(['PHYSICAL', 'DIGITAL', 'NFT', 'SERVICE'] as const).map(type => (
                        <ItemTypeCard
                          key={type}
                          type={type}
                          selected={formData.itemType === type}
                          onClick={() => handleFormChange('itemType', type)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Condition */}
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Condition
                    </label>
                    <select
                      value={formData.condition}
                      onChange={(e) => handleFormChange('condition', e.target.value)}
                      className="block w-full rounded-lg bg-white/10 border border-white/20 text-white backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent px-3 py-2 [&>option]:bg-gray-800 [&>option]:text-white"
                    >
                      <option value="new">New</option>
                      <option value="like-new">Like New</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="used">Used</option>
                      <option value="vintage">Vintage</option>
                      <option value="refurbished">Refurbished</option>
                    </select>
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Quantity
                    </label>
                    <div className="space-y-3">
                      <div className="flex items-center gap-4">
                        <input
                          type="number"
                          value={formData.quantity}
                          onChange={(e) => handleFormChange('quantity', parseInt(e.target.value) || 1)}
                          min="1"
                          max={formData.unlimitedQuantity ? undefined : 999999}
                          disabled={formData.unlimitedQuantity}
                          className="block w-32 rounded-lg bg-white/10 border border-white/20 text-white backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent px-3 py-2 disabled:opacity-50"
                        />
                        
                        {formData.itemType === 'DIGITAL' && (
                          <label className="flex items-center gap-2 text-white/80">
                            <input
                              type="checkbox"
                              checked={formData.unlimitedQuantity}
                              onChange={(e) => handleFormChange('unlimitedQuantity', e.target.checked)}
                              className="rounded border-white/20 bg-white/10 text-indigo-500 focus:ring-indigo-400"
                            />
                            Unlimited quantity (digital license)
                          </label>
                        )}
                      </div>
                      
                      {formData.itemType === 'DIGITAL' && !formData.unlimitedQuantity && (
                        <p className="text-xs text-white/60">
                          For digital goods, consider if you're selling limited licenses or unlimited access
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 'pricing' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-white mb-6">
                    {STEP_TITLES.pricing}
                  </h2>
                  
                  {/* Listing Type */}
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-4">
                      Listing Type *
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          formData.listingType === 'FIXED_PRICE'
                            ? 'border-indigo-400 bg-indigo-500/20'
                            : 'border-white/20 bg-white/5 hover:border-white/40'
                        }`}
                        onClick={() => handleFormChange('listingType', 'FIXED_PRICE')}
                      >
                        <h3 className="font-medium text-white mb-1">Fixed Price</h3>
                        <p className="text-sm text-white/70">Set a fixed price for immediate purchase</p>
                      </div>
                      <div
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          formData.listingType === 'AUCTION'
                            ? 'border-indigo-400 bg-indigo-500/20'
                            : 'border-white/20 bg-white/5 hover:border-white/40'
                        }`}
                        onClick={() => handleFormChange('listingType', 'AUCTION')}
                      >
                        <h3 className="font-medium text-white mb-1">Auction</h3>
                        <p className="text-sm text-white/70">Let buyers bid for your item</p>
                      </div>
                    </div>
                  </div>

                  {/* Price */}
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Price * (ETH)
                    </label>
                    <div className="space-y-2">
                      <input
                        type="number"
                        step="0.001"
                        value={formData.price}
                        onChange={(e) => handleFormChange('price', e.target.value)}
                        className="block w-full rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent px-3 py-2"
                        placeholder="0.01"
                      />
                      {formData.price && <ETHPriceDisplay ethAmount={formData.price} />}
                    </div>
                  </div>

                  {/* Duration (for auctions) */}
                  {formData.listingType === 'AUCTION' && (
                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Auction Duration
                      </label>
                      <select
                        value={formData.duration}
                        onChange={(e) => handleFormChange('duration', parseInt(e.target.value))}
                        className="block w-full rounded-lg bg-white/10 border border-white/20 text-white backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent px-3 py-2 [&>option]:bg-gray-800 [&>option]:text-white"
                      >
                        <option value={86400}>1 Day</option>
                        <option value={259200}>3 Days</option>
                        <option value={604800}>7 Days</option>
                        <option value={1209600}>14 Days</option>
                        <option value={2419200}>30 Days</option>
                      </select>
                    </div>
                  )}

                  {/* Royalty (for NFTs) */}
                  {formData.itemType === 'NFT' && (
                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Creator Royalty (%) - Optional
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        step="0.1"
                        value={formData.royalty}
                        onChange={(e) => handleFormChange('royalty', parseFloat(e.target.value) || 0)}
                        className="block w-full rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent px-3 py-2"
                        placeholder="0"
                      />
                      <p className="text-xs text-white/60 mt-1">
                        Percentage you'll earn on future resales (0-20%)
                      </p>
                    </div>
                  )}

                  {/* Escrow Toggle */}
                  <div className="bg-white/5 rounded-lg p-4 border border-white/20">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={formData.escrowEnabled}
                        onChange={(e) => handleFormChange('escrowEnabled', e.target.checked)}
                        className="rounded border-white/20 bg-white/10 text-indigo-500 focus:ring-indigo-400 mt-1"
                      />
                      <div className="flex-1">
                        <label className="text-white font-medium">
                          Enable Escrow Protection (Recommended)
                        </label>
                        <p className="text-white/70 text-sm mt-1">
                          Funds are held securely until buyer confirms receipt. 
                          Provides protection for both buyer and seller.
                        </p>
                      </div>
                      <Shield className="h-5 w-5 text-green-400 mt-1" />
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 'images' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-white mb-6">
                    {STEP_TITLES.images}
                  </h2>
                  
                  {/* Image Upload Area */}
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                      dragActive
                        ? 'border-indigo-400 bg-indigo-500/10'
                        : 'border-white/30 bg-white/5 hover:border-white/50'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <ImageIcon className="mx-auto h-12 w-12 text-white/60 mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">
                      Upload Product Images
                    </h3>
                    <p className="text-white/70 mb-4">
                      Drag and drop images here, or click to browse
                    </p>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileInput}
                      className="hidden"
                      id="image-upload"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('image-upload')?.click()}
                      className="border-white/30 text-white/80 hover:bg-white/10"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Choose Files
                    </Button>
                    <p className="text-xs text-white/60 mt-2">
                      Maximum 10 images, up to 5MB each
                    </p>
                  </div>

                  {/* Image Previews */}
                  {images.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-white">
                        Images ({images.length}/10)
                      </h3>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {imagePreviews.map((preview, index) => (
                          <div
                            key={index}
                            className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
                              primaryImageIndex === index
                                ? 'border-indigo-400'
                                : 'border-white/20 hover:border-white/40'
                            }`}
                          >
                            <img
                              src={preview}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-32 object-cover"
                            />
                            
                            {/* Primary badge */}
                            {primaryImageIndex === index && (
                              <div className="absolute top-2 left-2 bg-indigo-500 text-white text-xs px-2 py-1 rounded">
                                Primary
                              </div>
                            )}
                            
                            {/* Action buttons */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => setPrimaryImageIndex(index)}
                                className="p-1 bg-white/20 rounded hover:bg-white/30"
                                title="Set as primary"
                              >
                                <Star className="h-4 w-4 text-white" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="p-1 bg-red-500/80 rounded hover:bg-red-500"
                                title="Remove image"
                              >
                                <X className="h-4 w-4 text-white" />
                              </button>
                            </div>
                            
                            {/* Reorder buttons */}
                            <div className="absolute bottom-2 right-2 flex gap-1">
                              {index > 0 && (
                                <button
                                  type="button"
                                  onClick={() => moveImage(index, index - 1)}
                                  className="p-1 bg-white/20 rounded hover:bg-white/30"
                                  title="Move left"
                                >
                                  <ChevronLeft className="h-3 w-3 text-white" />
                                </button>
                              )}
                              {index < images.length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => moveImage(index, index + 1)}
                                  className="p-1 bg-white/20 rounded hover:bg-white/30"
                                  title="Move right"
                                >
                                  <ChevronRight className="h-3 w-3 text-white" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-white/70">
                        <Info className="h-4 w-4" />
                        <span>Click star to set primary image. Use arrows to reorder.</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {currentStep === 'review' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-white mb-6">
                    {STEP_TITLES.review}
                  </h2>
                  
                  {/* Preview Toggle */}
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-medium text-white">Listing Preview</h3>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowPreview(!showPreview)}
                      className="border-white/30 text-white/80 hover:bg-white/10"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {showPreview ? 'Hide' : 'Show'} Preview
                    </Button>
                  </div>

                  {/* Listing Preview */}
                  {showPreview && (
                    <div className="bg-white/5 rounded-lg p-6 border border-white/20 mb-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Images */}
                        {imagePreviews.length > 0 && (
                          <div>
                            <img
                              src={imagePreviews[primaryImageIndex]}
                              alt={formData.title}
                              className="w-full h-64 object-cover rounded-lg"
                            />
                            {imagePreviews.length > 1 && (
                              <div className="flex gap-2 mt-2 overflow-x-auto">
                                {imagePreviews.map((preview, index) => (
                                  <img
                                    key={index}
                                    src={preview}
                                    alt={`Thumbnail ${index + 1}`}
                                    className={`w-16 h-16 object-cover rounded cursor-pointer border-2 ${
                                      index === primaryImageIndex ? 'border-indigo-400' : 'border-white/20'
                                    }`}
                                    onClick={() => setPrimaryImageIndex(index)}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Details */}
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-xl font-semibold text-white">{formData.title}</h4>
                            <p className="text-white/70">{CATEGORIES.find(c => c.value === formData.category)?.label}</p>
                          </div>
                          
                          <div className="text-2xl font-bold text-white">
                            {formData.price} ETH
                            <ETHPriceDisplay ethAmount={formData.price} />
                          </div>
                          
                          <p className="text-white/80">{formData.description}</p>
                          
                          {formData.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {formData.tags.map(tag => (
                                <span
                                  key={tag}
                                  className="px-2 py-1 text-xs rounded-full bg-white/10 text-white/70"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                          
                          <div className="space-y-2 text-sm text-white/70">
                            <div>Type: {formData.itemType}</div>
                            <div>Condition: {formData.condition}</div>
                            <div>Quantity: {formData.unlimitedQuantity ? 'Unlimited' : formData.quantity}</div>
                            {formData.escrowEnabled && (
                              <div className="flex items-center gap-2 text-green-400">
                                <Shield className="h-4 w-4" />
                                Escrow Protected
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold text-white">Listing Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-white/70">Title:</span>
                          <span className="text-white">{formData.title}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/70">Category:</span>
                          <span className="text-white">{CATEGORIES.find(c => c.value === formData.category)?.label}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/70">Type:</span>
                          <span className="text-white">{formData.itemType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/70">Condition:</span>
                          <span className="text-white">{formData.condition}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/70">Quantity:</span>
                          <span className="text-white">{formData.unlimitedQuantity ? 'Unlimited' : formData.quantity}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h4 className="font-semibold text-white">Pricing & Terms</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-white/70">Price:</span>
                          <span className="text-white">{formData.price} ETH</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/70">Listing Type:</span>
                          <span className="text-white">{formData.listingType === 'FIXED_PRICE' ? 'Fixed Price' : 'Auction'}</span>
                        </div>
                        {formData.listingType === 'AUCTION' && (
                          <div className="flex justify-between">
                            <span className="text-white/70">Duration:</span>
                            <span className="text-white">{formData.duration / 86400} days</span>
                          </div>
                        )}
                        {formData.itemType === 'NFT' && formData.royalty > 0 && (
                          <div className="flex justify-between">
                            <span className="text-white/70">Royalty:</span>
                            <span className="text-white">{formData.royalty}%</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-white/70">Escrow:</span>
                          <span className={formData.escrowEnabled ? 'text-green-400' : 'text-white'}>  
                            {formData.escrowEnabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Validation Warnings */}
                  <div className="space-y-2">
                    {!validateStep('basic') && (
                      <div className="flex items-center gap-2 p-3 bg-orange-500/20 border border-orange-400/30 rounded-lg">
                        <AlertCircle className="h-4 w-4 text-orange-400" />
                        <span className="text-orange-200 text-sm">Basic information is incomplete</span>
                      </div>
                    )}
                    {!validateStep('details') && (
                      <div className="flex items-center gap-2 p-3 bg-orange-500/20 border border-orange-400/30 rounded-lg">
                        <AlertCircle className="h-4 w-4 text-orange-400" />
                        <span className="text-orange-200 text-sm">Item details need attention</span>
                      </div>
                    )}
                    {!validateStep('pricing') && (
                      <div className="flex items-center gap-2 p-3 bg-orange-500/20 border border-orange-400/30 rounded-lg">
                        <AlertCircle className="h-4 w-4 text-orange-400" />
                        <span className="text-orange-200 text-sm">Pricing information is required</span>
                      </div>
                    )}
                    {!validateStep('images') && (
                      <div className="flex items-center gap-2 p-3 bg-orange-500/20 border border-orange-400/30 rounded-lg">
                        <AlertCircle className="h-4 w-4 text-orange-400" />
                        <span className="text-orange-200 text-sm">At least one image is required</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between pt-8 mt-8 border-t border-white/20">
                <Button
                  type="button"
                  variant="outline"
                  onClick={goPrev}
                  disabled={!canGoPrev}
                  className="border-white/30 text-white/80 hover:bg-white/10 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                
                <div className="text-center">
                  <p className="text-sm text-white/60">
                    Step {currentStepIndex + 1} of {STEP_ORDER.length}
                  </p>
                </div>
                
                {currentStep === 'review' ? (
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading || !validateStep('basic') || !validateStep('details') || !validateStep('pricing') || !validateStep('images')}
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Shuffle className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Publish Listing
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={goNext}
                    disabled={!canGoNext}
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          </GlassPanel>
        </div>
      </div>
    </Layout>
  );
};

export default CreateListingPage;