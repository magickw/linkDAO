import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Check, Package, Ruler, Tag, Eye, AlertCircle } from 'lucide-react';
import { Button } from '@/design-system/components/Button';
import { SpecificationData } from './SpecificationEditor';
import { SizeConfig } from './SizeConfigurationSystem';
import SpecificationEditor from './SpecificationEditor';
import { SizeConfigurationSystem } from './SizeConfigurationSystem';
import { SpecificationPreview } from './SpecificationPreview';
import { validateSpecifications, ValidationError } from './specificationValidator';

type Step = 'basics' | 'dimensions' | 'sizing' | 'attributes' | 'review';

interface SteppedSpecificationFlowProps {
  category: string;
  initialSpecs?: SpecificationData;
  initialSizeConfig?: SizeConfig;
  onComplete: (specs: SpecificationData, sizeConfig: SizeConfig) => void;
  productName?: string;
}

export const SteppedSpecificationFlow: React.FC<SteppedSpecificationFlowProps> = ({
  category,
  initialSpecs,
  initialSizeConfig,
  onComplete,
  productName = 'Product'
}) => {
  const [currentStep, setCurrentStep] = useState<Step>('basics');
  const [specs, setSpecs] = useState<SpecificationData>(
    initialSpecs || { weight: undefined, dimensions: undefined, attributes: [] }
  );
  const [sizeConfig, setSizeConfig] = useState<SizeConfig>(
    initialSizeConfig || { system: 'none', selectedSizes: [] }
  );
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<ValidationError[]>([]);

  const steps: { id: Step; label: string; icon: React.ElementType }[] = [
    { id: 'basics', label: 'Basics', icon: Package },
    { id: 'dimensions', label: 'Dimensions', icon: Ruler },
    { id: 'sizing', label: 'Sizing', icon: Tag },
    { id: 'attributes', label: 'Attributes', icon: Package },
    { id: 'review', label: 'Review', icon: Eye }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  const handleNext = () => {
    if (currentStep === 'basics' && (!specs.weight || !specs.weight.value)) {
      alert('Please enter the product weight before proceeding.');
      return;
    }

    if (currentStep === 'dimensions' && (!specs.dimensions || !specs.dimensions.length)) {
      alert('Please enter the product dimensions before proceeding.');
      return;
    }

    if (currentStep === 'review') {
      // Final validation
      const validation = validateSpecifications(specs, sizeConfig, category);
      if (!validation.isValid) {
        setValidationErrors(validation.errors);
        setValidationWarnings(validation.warnings);
        alert('Please fix all validation errors before completing.');
        return;
      }
      onComplete(specs, sizeConfig);
      return;
    }

    const nextStepIndex = currentStepIndex + 1;
    if (nextStepIndex < steps.length) {
      setCurrentStep(steps[nextStepIndex].id);
    }
  };

  const handleBack = () => {
    const prevStepIndex = currentStepIndex - 1;
    if (prevStepIndex >= 0) {
      setCurrentStep(steps[prevStepIndex].id);
    }
  };

  const handleStepClick = (stepId: Step) => {
    // Allow navigation to previous steps only
    const stepIndex = steps.findIndex(s => s.id === stepId);
    if (stepIndex < currentStepIndex) {
      setCurrentStep(stepId);
    }
  };

  const validateCurrentStep = () => {
    const validation = validateSpecifications(specs, sizeConfig, category);
    setValidationErrors(validation.errors);
    setValidationWarnings(validation.warnings);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'basics':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Basic Information</h3>
              <p className="text-sm text-white/60">Enter the essential weight and shipping information for your product.</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <SpecificationEditor
                value={specs}
                onChange={setSpecs}
                category={category}
              />
            </div>
          </div>
        );

      case 'dimensions':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Product Dimensions</h3>
              <p className="text-sm text-white/60">Accurate dimensions help buyers understand the product size and calculate shipping costs.</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <SpecificationEditor
                value={specs}
                onChange={setSpecs}
                category={category}
              />
            </div>
          </div>
        );

      case 'sizing':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Size Configuration</h3>
              <p className="text-sm text-white/60">Configure the size options available for your product, including size charts if applicable.</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <SizeConfigurationSystem
                system={sizeConfig.system}
                value={sizeConfig}
                onChange={setSizeConfig}
                category={category}
              />
            </div>
          </div>
        );

      case 'attributes':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Product Attributes</h3>
              <p className="text-sm text-white/60">Add detailed product attributes like material, color, and other specifications.</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <SpecificationEditor
                value={specs}
                onChange={setSpecs}
                category={category}
              />
            </div>
          </div>
        );

      case 'review':
        validateCurrentStep();
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Review & Complete</h3>
              <p className="text-sm text-white/60">Review your specifications before publishing. This is how buyers will see your product.</p>
            </div>

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-red-400 mb-2">Please fix these errors:</h4>
                    <ul className="space-y-1">
                      {validationErrors.map((error, idx) => (
                        <li key={idx} className="text-xs text-red-300">
                          • {error.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Validation Warnings */}
            {validationWarnings.length > 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-400 mb-2">Warnings (can be ignored):</h4>
                    <ul className="space-y-1">
                      {validationWarnings.map((warning, idx) => (
                        <li key={idx} className="text-xs text-yellow-300">
                          • {warning.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Preview */}
            <SpecificationPreview
              specs={specs}
              sizeConfig={sizeConfig}
              category={category}
              productName={productName}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const isClickable = index < currentStepIndex;

            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={() => isClickable && handleStepClick(step.id)}
                    disabled={!isClickable}
                    className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${
                      isCompleted
                        ? 'bg-green-600 text-white'
                        : isCurrent
                        ? 'bg-indigo-600 text-white ring-4 ring-indigo-600/20'
                        : 'bg-white/10 text-white/40'
                    } ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                  >
                    {isCompleted ? <Check size={20} /> : <StepIcon size={20} />}
                  </button>
                  <span className={`text-xs font-medium ${
                    isCurrent ? 'text-white' : isCompleted ? 'text-green-400' : 'text-white/40'
                  }`}>
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${
                    index < currentStepIndex ? 'bg-green-600' : 'bg-white/10'
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {renderStep()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={currentStepIndex === 0}
          className="border-white/20 text-white/80"
        >
          <ChevronLeft size={16} className="mr-2" />
          Back
        </Button>

        <div className="flex items-center gap-2 text-sm text-white/60">
          <span>Step {currentStepIndex + 1} of {steps.length}</span>
        </div>

        <Button
          type="button"
          variant="primary"
          onClick={handleNext}
        >
          {currentStep === 'review' ? 'Complete' : 'Next'}
          {currentStep !== 'review' && <ChevronRight size={16} className="ml-2" />}
        </Button>
      </div>
    </div>
  );
};

export default SteppedSpecificationFlow;