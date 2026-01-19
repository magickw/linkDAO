import React from 'react';
import { Package, Ruler, Weight, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import { SpecificationData } from './SpecificationEditor';
import { SizeConfig } from './SizeConfigurationSystem';
import { getDimensionsDualDisplay, getWeightDualDisplay, formatWeight, formatLength } from './unitConverter';
import { calculateShippingEstimate } from './specificationValidator';

interface SpecificationPreviewProps {
  specs: SpecificationData;
  sizeConfig: SizeConfig;
  category: string;
  productName?: string;
}

export const SpecificationPreview: React.FC<SpecificationPreviewProps> = ({
  specs,
  sizeConfig,
  category,
  productName = 'Product'
}) => {
  const shippingEstimate = calculateShippingEstimate(specs);

  return (
    <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-white/10">
        <div className="p-2 bg-indigo-600/20 rounded-lg">
          <Package className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Product Specifications</h3>
          <p className="text-sm text-white/60">{productName}</p>
        </div>
      </div>

      {/* Weight & Dimensions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Weight */}
        {specs.weight && specs.weight.value !== undefined && specs.weight.unit && (
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <Weight className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-medium text-white/90">Weight</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/50">Metric</span>
                <span className="text-sm text-white font-medium">
                  {formatWeight(getWeightDualDisplay(specs.weight.value, specs.weight.unit).metric.value, 'kg')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/50">Imperial</span>
                <span className="text-sm text-white font-medium">
                  {formatWeight(getWeightDualDisplay(specs.weight.value, specs.weight.unit).imperial.value, 'lbs')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Dimensions */}
        {specs.dimensions &&
         specs.dimensions.length !== undefined &&
         specs.dimensions.width !== undefined &&
         specs.dimensions.height !== undefined &&
         specs.dimensions.unit && (
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <Ruler className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-medium text-white/90">Dimensions</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/50">Metric (L×W×H)</span>
                <span className="text-sm text-white font-medium">
                  {getDimensionsDualDisplay(
                    specs.dimensions.length,
                    specs.dimensions.width,
                    specs.dimensions.height,
                    specs.dimensions.unit
                  ).metric}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/50">Imperial (L×W×H)</span>
                <span className="text-sm text-white font-medium">
                  {getDimensionsDualDisplay(
                    specs.dimensions.length,
                    specs.dimensions.width,
                    specs.dimensions.height,
                    specs.dimensions.unit
                  ).imperial}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Size Information */}
      {sizeConfig.system !== 'none' && sizeConfig.system !== 'dimensions' && (
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-medium text-white/90">Available Sizes</span>
          </div>
          
          {sizeConfig.system === 'apparel_standard' && sizeConfig.selectedSizes && (
            <div className="flex flex-wrap gap-2">
              {sizeConfig.selectedSizes.map(size => (
                <span key={size} className="px-3 py-1 bg-white/10 rounded-full text-sm text-white">
                  {size}
                </span>
              ))}
            </div>
          )}

          {sizeConfig.system === 'matrix' && sizeConfig.matrix && (
            <div className="space-y-2">
              <p className="text-xs text-white/60">Available size combinations:</p>
              <div className="flex flex-wrap gap-2">
                {sizeConfig.matrix.selected.map(combo => (
                  <span key={combo} className="px-3 py-1 bg-white/10 rounded-full text-sm text-white">
                    {combo.replace('x', ' × ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {sizeConfig.system === 'simple_variants' && sizeConfig.customVariants && (
            <div className="flex flex-wrap gap-2">
              {sizeConfig.customVariants.map(variant => (
                <span key={variant} className="px-3 py-1 bg-white/10 rounded-full text-sm text-white">
                  {variant}
                </span>
              ))}
            </div>
          )}

          {/* Size Chart Preview */}
          {sizeConfig.chart && sizeConfig.chart.rows && sizeConfig.chart.rows.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-xs text-white/60 mb-2">Size Chart ({sizeConfig.chart.unit})</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      {sizeConfig.chart.columns.map((col, idx) => (
                        <th key={idx} className="px-3 py-2 text-left text-xs text-white/60 uppercase">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sizeConfig.chart.rows.map((row, idx) => (
                      <tr key={idx} className="border-b border-white/5 last:border-0">
                        {sizeConfig.chart.columns.map((col, cIdx) => (
                          <td key={cIdx} className="px-3 py-2 text-white">
                            {row[col]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Product Attributes */}
      {specs.attributes && specs.attributes.length > 0 && (
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-medium text-white/90">Product Details</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {specs.attributes
              .filter(attr => attr.key && attr.value)
              .map((attr, idx) => (
                <div key={idx} className="flex justify-between items-start">
                  <span className="text-sm text-white/60">{attr.key}</span>
                  <span className="text-sm text-white font-medium text-right">{attr.value}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Shipping Estimate */}
      {shippingEstimate && (
        <div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 rounded-lg p-4 border border-indigo-500/30">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-medium text-white/90">Estimated Shipping</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-2xl font-bold text-white">
                ${shippingEstimate.min.toFixed(2)} - ${shippingEstimate.max.toFixed(2)}
              </span>
              <span className="text-xs text-white/60 ml-2">({shippingEstimate.method})</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-white/60">
              <CheckCircle className="w-3 h-3 text-green-400" />
              <span>Calculated from weight & dimensions</span>
            </div>
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-white/70">
          <p className="font-medium text-white/90 mb-1">Buyer Information</p>
          <p>These specifications help buyers make informed decisions. Accurate measurements reduce returns and improve customer satisfaction.</p>
        </div>
      </div>
    </div>
  );
};

export default SpecificationPreview;