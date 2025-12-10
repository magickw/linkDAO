import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  Package, 
  Clock, 
  Globe, 
  DollarSign, 
  RotateCcw,
  Info,
  ChevronDown,
  ChevronUp,
  Calculator,
  MapPin
} from 'lucide-react';

// Shipping configuration interface
export interface ShippingConfiguration {
  methods: {
    standard?: {
      enabled: boolean;
      cost: number;
      estimatedDays: string;
    };
    express?: {
      enabled: boolean;
      cost: number;
      estimatedDays: string;
    };
    international?: {
      enabled: boolean;
      cost: number;
      estimatedDays: string;
      regions: string[];
    };
  };
  processingTime: number;
  freeShippingThreshold?: number;
  returnsAccepted: boolean;
  returnWindow?: number;
  packageDetails: {
    weight: number;
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
  };
}

// International shipping regions
const INTERNATIONAL_REGIONS = [
  { code: 'NA', name: 'North America', countries: ['USA', 'CAN', 'MEX'] },
  { code: 'EU', name: 'Europe', countries: ['GBR', 'DEU', 'FRA', 'ITA', 'ESP', 'NLD'] },
  { code: 'AS', name: 'Asia', countries: ['JPN', 'CHN', 'KOR', 'SGP', 'HKG'] },
  { code: 'OC', name: 'Oceania', countries: ['AUS', 'NZL'] },
  { code: 'SA', name: 'South America', countries: ['BRA', 'ARG', 'CHL'] },
];

interface ShippingConfigurationFormProps {
  value?: ShippingConfiguration;
  onChange: (config: ShippingConfiguration) => void;
  itemType: 'PHYSICAL' | 'DIGITAL' | 'NFT' | 'SERVICE';
  errors?: Record<string, string>;
}

const ShippingConfigurationForm: React.FC<ShippingConfigurationFormProps> = ({
  value,
  onChange,
  itemType,
  errors = {}
}) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    methods: true,
    policies: true,
    package: true,
    returns: false
  });

  // Default configuration
  const defaultConfig: ShippingConfiguration = {
    methods: {
      standard: {
        enabled: itemType === 'PHYSICAL',
        cost: 9.99,
        estimatedDays: '5-7 business days'
      },
      express: {
        enabled: false,
        cost: 19.99,
        estimatedDays: '2-3 business days'
      },
      international: {
        enabled: false,
        cost: 39.99,
        estimatedDays: '10-15 business days',
        regions: []
      }
    },
    processingTime: itemType === 'PHYSICAL' ? 3 : 1,
    returnsAccepted: itemType === 'PHYSICAL',
    returnWindow: 30,
    packageDetails: {
      weight: 1,
      dimensions: {
        length: 10,
        width: 8,
        height: 4
      }
    }
  };

  const config = value || defaultConfig;

  // Update configuration
  const updateConfig = (updates: Partial<ShippingConfiguration>) => {
    const newConfig = { ...config, ...updates };
    onChange(newConfig);
  };

  // Update shipping method
  const updateShippingMethod = (method: keyof ShippingConfiguration['methods'], updates: any) => {
    const newMethods = {
      ...config.methods,
      [method]: {
        ...config.methods[method],
        ...updates
      }
    };
    updateConfig({ methods: newMethods });
  };

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Toggle international region
  const toggleInternationalRegion = (regionCode: string) => {
    const currentRegions = config.methods.international?.regions || [];
    const newRegions = currentRegions.includes(regionCode)
      ? currentRegions.filter(r => r !== regionCode)
      : [...currentRegions, regionCode];
    
    updateShippingMethod('international', { regions: newRegions });
  };

  // Calculate total package dimensions (girth + length)
  const calculateTotalDimensions = () => {
    const { length, width, height } = config.packageDetails.dimensions;
    return length + (2 * (width + height));
  };

  // Non-physical items don't need shipping
  if (itemType !== 'PHYSICAL') {
    return (
      <div className="bg-white/5 rounded-lg p-6 border border-white/20">
        <div className="flex items-center gap-3 mb-4">
          <Package className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-medium text-white">Shipping Configuration</h3>
        </div>
        
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 mt-0.5" />
            <div>
              <p className="text-white font-medium mb-1">No Shipping Required</p>
              <p className="text-white/70 text-sm">
                {itemType === 'DIGITAL' && 'Digital items will be delivered electronically after purchase.'}
                {itemType === 'NFT' && 'NFTs will be transferred directly to the buyer\'s wallet.'}
                {itemType === 'SERVICE' && 'Service details will be coordinated with the buyer after purchase.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Truck className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-medium text-white">Shipping Configuration</h3>
        <span className="text-red-400">*</span>
      </div>

      {/* Shipping Methods */}
      <div className="bg-white/5 rounded-lg border border-white/20">
        <button
          onClick={() => toggleSection('methods')}
          className="w-full px-6 py-4 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <Truck className="w-5 h-5 text-blue-400" />
            <h4 className="text-white font-medium">Shipping Methods</h4>
          </div>
          {expandedSections.methods ? <ChevronUp className="w-5 h-5 text-white/60" /> : <ChevronDown className="w-5 h-5 text-white/60" />}
        </button>

        {expandedSections.methods && (
          <div className="px-6 pb-6 space-y-4">
            {/* Standard Shipping */}
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={config.methods.standard?.enabled || false}
                    onChange={(e) => updateShippingMethod('standard', { enabled: e.target.checked })}
                    className="w-4 h-4 rounded border-white/20 bg-white/10 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                  />
                  <label className="text-white font-medium">Standard Shipping</label>
                </div>
                <span className="text-white/60 text-sm">Most popular</span>
              </div>

              {config.methods.standard?.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-white/70 mb-1">Cost (USD)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={config.methods.standard.cost}
                        onChange={(e) => updateShippingMethod('standard', { cost: parseFloat(e.target.value) || 0 })}
                        className={`w-full pl-10 pr-3 py-2 bg-white/10 border ${errors.standardCost ? 'border-red-500' : 'border-white/20'} rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        placeholder="9.99"
                      />
                    </div>
                    {errors.standardCost && <p className="text-red-400 text-xs mt-1">{errors.standardCost}</p>}
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-1">Estimated Delivery</label>
                    <input
                      type="text"
                      value={config.methods.standard.estimatedDays}
                      onChange={(e) => updateShippingMethod('standard', { estimatedDays: e.target.value })}
                      className={`w-full px-3 py-2 bg-white/10 border ${errors.standardDays ? 'border-red-500' : 'border-white/20'} rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      placeholder="5-7 business days"
                    />
                    {errors.standardDays && <p className="text-red-400 text-xs mt-1">{errors.standardDays}</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Express Shipping */}
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={config.methods.express?.enabled || false}
                    onChange={(e) => updateShippingMethod('express', { enabled: e.target.checked })}
                    className="w-4 h-4 rounded border-white/20 bg-white/10 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                  />
                  <label className="text-white font-medium">Express Shipping</label>
                </div>
                <span className="text-white/60 text-sm">Faster delivery</span>
              </div>

              {config.methods.express?.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-white/70 mb-1">Cost (USD)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={config.methods.express.cost}
                        onChange={(e) => updateShippingMethod('express', { cost: parseFloat(e.target.value) || 0 })}
                        className={`w-full pl-10 pr-3 py-2 bg-white/10 border ${errors.expressCost ? 'border-red-500' : 'border-white/20'} rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        placeholder="19.99"
                      />
                    </div>
                    {errors.expressCost && <p className="text-red-400 text-xs mt-1">{errors.expressCost}</p>}
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-1">Estimated Delivery</label>
                    <input
                      type="text"
                      value={config.methods.express.estimatedDays}
                      onChange={(e) => updateShippingMethod('express', { estimatedDays: e.target.value })}
                      className={`w-full px-3 py-2 bg-white/10 border ${errors.expressDays ? 'border-red-500' : 'border-white/20'} rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      placeholder="2-3 business days"
                    />
                    {errors.expressDays && <p className="text-red-400 text-xs mt-1">{errors.expressDays}</p>}
                  </div>
                </div>
              )}
            </div>

            {/* International Shipping */}
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={config.methods.international?.enabled || false}
                    onChange={(e) => updateShippingMethod('international', { enabled: e.target.checked })}
                    className="w-4 h-4 rounded border-white/20 bg-white/10 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                  />
                  <label className="text-white font-medium">International Shipping</label>
                </div>
                <Globe className="w-4 h-4 text-white/60" />
              </div>

              {config.methods.international?.enabled && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-white/70 mb-1">Cost (USD)</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={config.methods.international.cost}
                          onChange={(e) => updateShippingMethod('international', { cost: parseFloat(e.target.value) || 0 })}
                          className={`w-full pl-10 pr-3 py-2 bg-white/10 border ${errors.internationalCost ? 'border-red-500' : 'border-white/20'} rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                          placeholder="39.99"
                        />
                      </div>
                      {errors.internationalCost && <p className="text-red-400 text-xs mt-1">{errors.internationalCost}</p>}
                    </div>
                    <div>
                      <label className="block text-sm text-white/70 mb-1">Estimated Delivery</label>
                      <input
                        type="text"
                        value={config.methods.international.estimatedDays}
                        onChange={(e) => updateShippingMethod('international', { estimatedDays: e.target.value })}
                        className={`w-full px-3 py-2 bg-white/10 border ${errors.internationalDays ? 'border-red-500' : 'border-white/20'} rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        placeholder="10-15 business days"
                      />
                      {errors.internationalDays && <p className="text-red-400 text-xs mt-1">{errors.internationalDays}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-white/70 mb-2">Shipping Regions</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {INTERNATIONAL_REGIONS.map(region => (
                        <label
                          key={region.code}
                          className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                            config.methods.international.regions.includes(region.code)
                              ? 'bg-blue-500/20 border-blue-500 text-white'
                              : 'bg-white/5 border-white/20 text-white/60 hover:bg-white/10'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={config.methods.international.regions.includes(region.code)}
                            onChange={() => toggleInternationalRegion(region.code)}
                            className="sr-only"
                          />
                          <MapPin className="w-3 h-3" />
                          <span className="text-sm">{region.name}</span>
                        </label>
                      ))}
                    </div>
                    {errors.internationalRegions && <p className="text-red-400 text-xs mt-1">{errors.internationalRegions}</p>}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Shipping Policies */}
      <div className="bg-white/5 rounded-lg border border-white/20">
        <button
          onClick={() => toggleSection('policies')}
          className="w-full px-6 py-4 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-400" />
            <h4 className="text-white font-medium">Shipping Policies</h4>
          </div>
          {expandedSections.policies ? <ChevronUp className="w-5 h-5 text-white/60" /> : <ChevronDown className="w-5 h-5 text-white/60" />}
        </button>

        {expandedSections.policies && (
          <div className="px-6 pb-6 space-y-4">
            <div>
              <label className="block text-sm text-white/70 mb-1">Processing Time (days)</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={config.processingTime}
                  onChange={(e) => updateConfig({ processingTime: parseInt(e.target.value) })}
                  className="flex-1"
                />
                <span className="text-white font-medium w-12 text-center">{config.processingTime}</span>
              </div>
              <p className="text-xs text-white/50 mt-1">Time needed to prepare the item for shipping</p>
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-1">Free Shipping Threshold (optional)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={config.freeShippingThreshold || ''}
                  onChange={(e) => updateConfig({ 
                    freeShippingThreshold: e.target.value ? parseFloat(e.target.value) : undefined 
                  })}
                  className="w-full pl-10 pr-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="50.00"
                />
              </div>
              <p className="text-xs text-white/50 mt-1">Order value for free shipping (leave empty for no free shipping)</p>
            </div>
          </div>
        )}
      </div>

      {/* Package Details */}
      <div className="bg-white/5 rounded-lg border border-white/20">
        <button
          onClick={() => toggleSection('package')}
          className="w-full px-6 py-4 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-blue-400" />
            <h4 className="text-white font-medium">Package Details</h4>
          </div>
          {expandedSections.package ? <ChevronUp className="w-5 h-5 text-white/60" /> : <ChevronDown className="w-5 h-5 text-white/60" />}
        </button>

        {expandedSections.package && (
          <div className="px-6 pb-6 space-y-4">
            <div>
              <label className="block text-sm text-white/70 mb-1">Weight (lbs)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="150"
                value={config.packageDetails.weight}
                onChange={(e) => updateConfig({
                  packageDetails: {
                    ...config.packageDetails,
                    weight: parseFloat(e.target.value) || 1
                  }
                })}
                className={`w-full px-3 py-2 bg-white/10 border ${errors.weight ? 'border-red-500' : 'border-white/20'} rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="1.0"
              />
              {errors.weight && <p className="text-red-400 text-xs mt-1">{errors.weight}</p>}
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">Dimensions (inches)</label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-white/50 mb-1">Length</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="108"
                    value={config.packageDetails.dimensions.length}
                    onChange={(e) => updateConfig({
                      packageDetails: {
                        ...config.packageDetails,
                        dimensions: {
                          ...config.packageDetails.dimensions,
                          length: parseFloat(e.target.value) || 1
                        }
                      }
                    })}
                    className={`w-full px-3 py-2 bg-white/10 border ${errors.length ? 'border-red-500' : 'border-white/20'} rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="10"
                  />
                  {errors.length && <p className="text-red-400 text-xs mt-1">{errors.length}</p>}
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">Width</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="108"
                    value={config.packageDetails.dimensions.width}
                    onChange={(e) => updateConfig({
                      packageDetails: {
                        ...config.packageDetails,
                        dimensions: {
                          ...config.packageDetails.dimensions,
                          width: parseFloat(e.target.value) || 1
                        }
                      }
                    })}
                    className={`w-full px-3 py-2 bg-white/10 border ${errors.width ? 'border-red-500' : 'border-white/20'} rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="8"
                  />
                  {errors.width && <p className="text-red-400 text-xs mt-1">{errors.width}</p>}
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">Height</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="108"
                    value={config.packageDetails.dimensions.height}
                    onChange={(e) => updateConfig({
                      packageDetails: {
                        ...config.packageDetails,
                        dimensions: {
                          ...config.packageDetails.dimensions,
                          height: parseFloat(e.target.value) || 1
                        }
                      }
                    })}
                    className={`w-full px-3 py-2 bg-white/10 border ${errors.height ? 'border-red-500' : 'border-white/20'} rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="4"
                  />
                  {errors.height && <p className="text-red-400 text-xs mt-1">{errors.height}</p>}
                </div>
              </div>
              <div className="mt-3 p-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <Calculator className="w-4 h-4" />
                  <span>Total dimensions (length + girth): {calculateTotalDimensions().toFixed(1)} inches</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Return Policy */}
      <div className="bg-white/5 rounded-lg border border-white/20">
        <button
          onClick={() => toggleSection('returns')}
          className="w-full px-6 py-4 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <RotateCcw className="w-5 h-5 text-blue-400" />
            <h4 className="text-white font-medium">Return Policy</h4>
          </div>
          {expandedSections.returns ? <ChevronUp className="w-5 h-5 text-white/60" /> : <ChevronDown className="w-5 h-5 text-white/60" />}
        </button>

        {expandedSections.returns && (
          <div className="px-6 pb-6 space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={config.returnsAccepted}
                onChange={(e) => updateConfig({ returnsAccepted: e.target.checked })}
                className="w-4 h-4 rounded border-white/20 bg-white/10 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
              />
              <label className="text-white font-medium">Returns Accepted</label>
            </div>

            {config.returnsAccepted && (
              <div>
                <label className="block text-sm text-white/70 mb-1">Return Window (days)</label>
                <select
                  value={config.returnWindow || 30}
                  onChange={(e) => updateConfig({ returnWindow: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                  <option value={90}>90 days</option>
                </select>
                <p className="text-xs text-white/50 mt-1">Buyer has this many days to request a return</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShippingConfigurationForm;