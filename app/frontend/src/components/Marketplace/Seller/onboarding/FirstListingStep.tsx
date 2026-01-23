import React, { useState, useCallback } from 'react';
import { Button } from '../../../../design-system';
import { ImageUploadResult } from '../../../../services/unifiedImageService';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
interface FirstListingStepProps {
  onComplete: (data: any) => void;
  data?: any;
}

type ListingType = 'physical' | 'service' | 'digital' | 'defi';

export function FirstListingStep({ onComplete, data }: FirstListingStepProps) {
  const [subStep, setSubStep] = useState(0); // 0: Type & Basics, 1: Pricing & Media, 2: Logistics
  const [listingType, setListingType] = useState<ListingType>(data?.listingType || 'physical');
  const [formData, setFormData] = useState({
    title: data?.title || '',
    description: data?.description || '',
    category: data?.category || '',
    price: data?.price || '',
    currency: data?.currency || 'USDC',
    inventory: data?.inventory || '1',
    condition: data?.condition || 'new',
    images: data?.images || [],
    tags: data?.tags || '',
    escrowEnabled: data?.escrowEnabled !== undefined ? data.escrowEnabled : true,
    shippingFree: data?.shippingFree !== undefined ? data.shippingFree : true,
    shippingCost: data?.shippingCost || '',
    estimatedDays: data?.estimatedDays || '3-5',
    // Enhanced shipping options
    shippingMethods: data?.shippingMethods || ['standard'],
    handlingTime: data?.handlingTime || '1-2',
    shipsFromCountry: data?.shipsFromCountry || 'US',
    shipsFromState: data?.shipsFromState || '',
    shipsFromCity: data?.shipsFromCity || '',
    packageWeight: data?.packageWeight || '',
    packageLength: data?.packageLength || '',
    packageWidth: data?.packageWidth || '',
    packageHeight: data?.packageHeight || '',
    internationalShipping: data?.internationalShipping || false,
    internationalShippingCost: data?.internationalShippingCost || '',
    localPickup: data?.localPickup || false,
    // Service-specific fields
    serviceDuration: data?.serviceDuration || '',
    serviceUnit: data?.serviceUnit || 'hours',
    deliveryMethod: data?.deliveryMethod || 'online',
    // NFT/Digital goods fields
    blockchain: data?.blockchain || 'ethereum',
    contractAddress: data?.contractAddress || '',
    tokenId: data?.tokenId || '',
    metadataUri: data?.metadataUri || '',
    // DeFi collectible fields
    defiProtocol: data?.defiProtocol || '',
    defiAssetType: data?.defiAssetType || '',
    currentApy: data?.currentApy || '',
    lockPeriod: data?.lockPeriod || '',
    riskLevel: data?.riskLevel || 'medium',
    // KYC Compliance fields
    legalBusinessName: data?.legalBusinessName || '',
    businessType: data?.businessType || 'individual',
    registeredAddress: data?.registeredAddress || '',
    registeredCity: data?.registeredCity || '',
    registeredState: data?.registeredState || '',
    registeredPostalCode: data?.registeredPostalCode || '',
    registeredCountry: data?.registeredCountry || '',
    taxId: data?.taxId || '',
    taxIdType: data?.taxIdType || 'ssn',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const validateSubStep = (step: number) => {
    const newErrors: Record<string, string> = {};

    if (step === 0) {
      if (!formData.title.trim()) newErrors.title = 'Title is required';
      if (!formData.category) newErrors.category = 'Please select a category';
      if (listingType === 'defi' && !formData.defiProtocol) newErrors.defiProtocol = 'Protocol is required';
    } else if (step === 1) {
      if (!formData.price || parseFloat(formData.price) <= 0) newErrors.price = 'Valid price is required';
      if (listingType === 'physical' && formData.images.length === 0) newErrors.images = 'At least one image is required';
    } else if (step === 2) {
      if (listingType === 'physical' && !formData.inventory) newErrors.inventory = 'Inventory is required';
      if (!formData.legalBusinessName.trim()) newErrors.legalBusinessName = 'Legal name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateSubStep(subStep)) {
      setSubStep(prev => prev + 1);
      window.scrollTo(0, 0);
    }
  };

  const handleBack = () => {
    setSubStep(prev => prev - 1);
    window.scrollTo(0, 0);
  };

  const listingTypes = [
    { value: 'physical', label: 'Physical Good', icon: '📦', description: 'Tangible items' },
    { value: 'service', label: 'Service', icon: '🛠️', description: 'Professional services' },
    { value: 'digital', label: 'Digital / NFT', icon: '🎨', description: 'NFTs & Collectibles' },
    { value: 'defi', label: 'DeFi Position', icon: '💰', description: 'LP tokens & Vaults' },
  ];

  const categoriesByType: Record<ListingType, string[]> = {
    physical: ['Electronics', 'Fashion', 'Home', 'Sports', 'Books', 'Art', 'Other'],
    service: ['Development', 'Audit', 'Design', 'Marketing', 'Consulting', 'Other'],
    digital: ['Avatar NFT', 'Generative', 'Music', 'Gaming', 'Domain', 'Other'],
    defi: ['LP Position', 'Yield Token', 'Vault Share', 'Other'],
  };

  const blockchains = [
    { value: 'ethereum', label: 'Ethereum' },
    { value: 'polygon', label: 'Polygon' },
    { value: 'base', label: 'Base' },
    { value: 'arbitrum', label: 'Arbitrum' },
  ];

  const defiProtocols = ['Uniswap', 'Aave', 'Compound', 'Curve', 'Lido', 'Other'];
  const currencies = [{ value: 'USDC', label: 'USDC' }, { value: 'ETH', label: 'ETH' }];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSubStep(subStep)) return;
    setIsSubmitting(true);

    try {
      const listingData = { ...formData, listingType, status: 'active' };
      await onComplete(listingData);
    } catch (error) {
      console.error('Failed to create listing:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleImageUpload = async (files: FileList | File[]) => {
    setUploadingImage(true);
    // Simulation of upload
    setTimeout(() => {
      const mockUrl = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=200&h=200";
      setFormData(prev => ({ ...prev, images: [...prev.images, mockUrl] }));
      setUploadingImage(false);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 2000);
    }, 1000);
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  const subStepTitles = ['Type & Basics', 'Pricing & Media', 'Logistics'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8 px-2">
        {subStepTitles.map((title, idx) => (
          <div key={idx} className="flex flex-col items-center flex-1 relative">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 ${
                subStep === idx ? 'bg-purple-600 text-white shadow-lg' : 
                subStep > idx ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-400'
            }`}>
                {subStep > idx ? '✓' : idx + 1}
            </div>
            <span className={`text-[10px] mt-2 font-medium uppercase ${subStep === idx ? 'text-purple-400' : 'text-gray-500'}`}>
                {title.split(' ')[0]}
            </span>
            {idx < subStepTitles.length - 1 && (
                <div className={`absolute top-4 left-[50%] w-full h-[2px] -z-0 ${subStep > idx ? 'bg-green-500' : 'bg-gray-700'}`} />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {subStep === 0 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-lg font-bold text-white mb-6">Step 1: Listing Basics</h3>
            
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-300 mb-4 text-center">Select Listing Type</label>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {listingTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => {
                      setListingType(type.value as ListingType);
                      handleInputChange('category', '');
                    }}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${listingType === type.value
                      ? 'border-purple-500 bg-purple-900/20 shadow-md'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                      }`}
                  >
                    <span className="text-2xl mb-1 block">{type.icon}</span>
                    <span className="text-white font-semibold text-xs block">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className={`w-full px-4 py-3 bg-gray-800/50 border rounded-xl text-white focus:ring-2 focus:ring-purple-500 ${errors.title ? 'border-red-500' : 'border-gray-700'}`}
                  placeholder="What are you selling?"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select...</option>
                    {categoriesByType[listingType].map(cat => (
                      <option key={cat} value={cat.toLowerCase()}>{cat}</option>
                    ))}
                  </select>
                </div>
                {(listingType === 'digital' || listingType === 'defi') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Blockchain</label>
                    <select
                      value={formData.blockchain}
                      onChange={(e) => handleInputChange('blockchain', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white"
                    >
                      {blockchains.map(chain => <option key={chain.value} value={chain.value}>{chain.label}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white resize-none"
                  placeholder="Describe your item or service..."
                />
              </div>
            </div>
          </div>
        )}

        {subStep === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-lg font-bold text-white mb-6">Step 2: Pricing & Media</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Price *</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Currency</label>
                <select
                  value={formData.currency}
                  onChange={(e) => handleInputChange('currency', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white"
                >
                  {currencies.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-300">Media & Images</label>
              <div 
                className="border-2 border-dashed border-gray-700 rounded-2xl p-8 text-center hover:border-purple-500 transition-colors cursor-pointer bg-gray-800/30"
                onClick={() => document.getElementById('listing-file-input')?.click()}
              >
                <input 
                  id="listing-file-input"
                  type="file" 
                  multiple 
                  className="hidden" 
                  onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                />
                <div className="text-3xl mb-2">📸</div>
                <p className="text-gray-300 font-medium">Click or drag images here</p>
                <p className="text-gray-500 text-xs mt-1">PNG, JPG up to 10MB</p>
              </div>

              {formData.images.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {formData.images.map((img, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-gray-700">
                      <img src={img} className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px]"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {subStep === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-lg font-bold text-white mb-6">Step 3: Logistics & Compliance</h3>
            
            <div className="space-y-6">
              {listingType === 'physical' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Inventory Count</label>
                    <input
                      type="number"
                      value={formData.inventory}
                      onChange={(e) => handleInputChange('inventory', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Est. Delivery (Days)</label>
                    <select
                      value={formData.estimatedDays}
                      onChange={(e) => handleInputChange('estimatedDays', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white"
                    >
                      <option value="1-2">1-2 business days</option>
                      <option value="3-5">3-5 business days</option>
                      <option value="7-14">7-14 business days</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700 space-y-4">
                <h4 className="text-white font-semibold text-sm flex items-center">
                  <span className="mr-2">⚖️</span> Compliance Verification
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Legal Business Name *</label>
                    <input
                      type="text"
                      value={formData.legalBusinessName}
                      onChange={(e) => handleInputChange('legalBusinessName', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Tax ID / SSN *</label>
                    <input
                      type="password"
                      value={formData.taxId}
                      onChange={(e) => handleInputChange('taxId', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-blue-900/20 rounded-xl p-4 border border-blue-500/20">
                <p className="text-blue-300 text-xs leading-relaxed">
                  Your compliance information is encrypted end-to-end and only used for marketplace trust verification and required regulatory reporting.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center pt-8 mt-8 border-t border-gray-800">
          <div>
            {subStep > 0 && (
              <Button type="button" onClick={handleBack} variant="outline">
                Back
              </Button>
            )}
          </div>
          <div className="flex space-x-3">
            {subStep < 2 ? (
              <Button type="button" onClick={handleNext} variant="primary" className="min-w-[120px]">
                Continue
              </Button>
            ) : (
              <Button type="submit" variant="primary" loading={isSubmitting} className="min-w-[120px]">
                Create Listing
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}