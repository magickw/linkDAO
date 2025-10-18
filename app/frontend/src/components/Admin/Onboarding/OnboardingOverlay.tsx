import React, { useEffect, useState, useRef } from 'react';
import { useOnboarding } from './OnboardingProvider';

interface Position {
  top: number;
  left: number;
  width: number;
  height: number;
}

export const OnboardingOverlay: React.FC = () => {
  const {
    currentStep,
    currentTour,
    isActive,
    nextStep,
    previousStep,
    skipStep,
    exitTour
  } = useOnboarding();

  const [targetPosition, setTargetPosition] = useState<Position | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !currentStep) {
      setTargetPosition(null);
      setTooltipPosition(null);
      return;
    }

    const updatePosition = () => {
      const targetElement = document.querySelector(currentStep.target);
      if (!targetElement) {
        console.warn(`Onboarding target not found: ${currentStep.target}`);
        return;
      }

      const rect = targetElement.getBoundingClientRect();
      const position: Position = {
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height
      };

      setTargetPosition(position);

      // Calculate tooltip position
      const tooltipElement = tooltipRef.current;
      if (tooltipElement) {
        const tooltipRect = tooltipElement.getBoundingClientRect();
        let tooltipTop = position.top;
        let tooltipLeft = position.left;

        switch (currentStep.position) {
          case 'top':
            tooltipTop = position.top - tooltipRect.height - 20;
            tooltipLeft = position.left + (position.width - tooltipRect.width) / 2;
            break;
          case 'bottom':
            tooltipTop = position.top + position.height + 20;
            tooltipLeft = position.left + (position.width - tooltipRect.width) / 2;
            break;
          case 'left':
            tooltipTop = position.top + (position.height - tooltipRect.height) / 2;
            tooltipLeft = position.left - tooltipRect.width - 20;
            break;
          case 'right':
            tooltipTop = position.top + (position.height - tooltipRect.height) / 2;
            tooltipLeft = position.left + position.width + 20;
            break;
        }

        // Ensure tooltip stays within viewport
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        if (tooltipLeft < 10) tooltipLeft = 10;
        if (tooltipLeft + tooltipRect.width > viewportWidth - 10) {
          tooltipLeft = viewportWidth - tooltipRect.width - 10;
        }
        if (tooltipTop < 10) tooltipTop = 10;
        if (tooltipTop + tooltipRect.height > viewportHeight - 10) {
          tooltipTop = viewportHeight - tooltipRect.height - 10;
        }

        setTooltipPosition({ top: tooltipTop, left: tooltipLeft });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isActive, currentStep]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          exitTour();
          break;
        case 'ArrowRight':
        case 'Enter':
          event.preventDefault();
          nextStep();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          previousStep();
          break;
        case 's':
        case 'S':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            skipStep();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, nextStep, previousStep, skipStep, exitTour]);

  if (!isActive || !currentStep || !currentTour || !targetPosition) {
    return null;
  }

  const currentStepIndex = currentTour.steps.findIndex(step => step.id === currentStep.id);
  const totalSteps = currentTour.steps.length;
  const progress = ((currentStepIndex + 1) / totalSteps) * 100;

  return (
    <>
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        style={{ pointerEvents: 'none' }}
      >
        {/* Highlight cutout */}
        <div
          className="absolute border-4 border-blue-500 rounded-lg shadow-lg"
          style={{
            top: targetPosition.top - 4,
            left: targetPosition.left - 4,
            width: targetPosition.width + 8,
            height: targetPosition.height + 8,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
            pointerEvents: 'none'
          }}
        />
      </div>

      {/* Tooltip */}
      {tooltipPosition && (
        <div
          ref={tooltipRef}
          className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 max-w-sm"
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            pointerEvents: 'auto'
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">
                {currentStep.title}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Step {currentStepIndex + 1} of {totalSteps}
              </p>
            </div>
            <button
              onClick={exitTour}
              className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Exit tour"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress bar */}
          <div className="px-4 pt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            <p className="text-gray-700 mb-3">{currentStep.description}</p>
            <div className="text-sm text-gray-600">
              {currentStep.content}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            <div className="flex items-center space-x-2">
              {currentStepIndex > 0 && (
                <button
                  onClick={previousStep}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  ← Previous
                </button>
              )}
              {currentStep.skippable !== false && (
                <button
                  onClick={skipStep}
                  className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Skip
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {currentStep.action && (
                <button
                  onClick={() => {
                    currentStep.action?.();
                    nextStep();
                  }}
                  className="px-4 py-2 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition-colors"
                >
                  Try it
                </button>
              )}
              <button
                onClick={nextStep}
                className="px-4 py-2 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition-colors"
              >
                {currentStepIndex === totalSteps - 1 ? 'Finish' : 'Next →'}
              </button>
            </div>
          </div>

          {/* Keyboard shortcuts hint */}
          <div className="px-4 pb-2">
            <p className="text-xs text-gray-500">
              Use ← → arrow keys to navigate, Esc to exit, Ctrl+S to skip
            </p>
          </div>
        </div>
      )}
    </>
  );
};