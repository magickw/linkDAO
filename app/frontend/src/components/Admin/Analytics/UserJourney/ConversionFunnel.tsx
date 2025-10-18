import React, { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface FunnelStep {
  stepName: string;
  stepOrder: number;
  users: number;
  conversionRate: number;
  dropoffRate: number;
  averageTimeToNext: number;
}

interface ConversionFunnelData {
  funnelName: string;
  steps: FunnelStep[];
  overallConversionRate: number;
  totalEntries: number;
  totalConversions: number;
}

interface ConversionFunnelProps {
  data: ConversionFunnelData;
  className?: string;
  onStepClick?: (step: FunnelStep) => void;
}

export const ConversionFunnel: React.FC<ConversionFunnelProps> = ({
  data,
  className = '',
  onStepClick
}) => {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  const toggleStepExpansion = (stepOrder: number) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepOrder)) {
      newExpanded.delete(stepOrder);
    } else {
      newExpanded.add(stepOrder);
    }
    setExpandedSteps(newExpanded);
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  const getStepWidth = (users: number): number => {
    const maxUsers = Math.max(...data.steps.map(s => s.users));
    return Math.max(20, (users / maxUsers) * 100);
  };

  const getDropoffColor = (dropoffRate: number): string => {
    if (dropoffRate > 50) return 'bg-red-500';
    if (dropoffRate > 30) return 'bg-orange-500';
    if (dropoffRate > 15) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getConversionColor = (conversionRate: number): string => {
    if (conversionRate > 80) return 'text-green-600';
    if (conversionRate > 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {data.funnelName}
        </h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-blue-600 font-medium">Total Entries</div>
            <div className="text-2xl font-bold text-blue-900">
              {data.totalEntries.toLocaleString()}
            </div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-green-600 font-medium">Total Conversions</div>
            <div className="text-2xl font-bold text-green-900">
              {data.totalConversions.toLocaleString()}
            </div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg">
            <div className="text-purple-600 font-medium">Overall Conversion Rate</div>
            <div className="text-2xl font-bold text-purple-900">
              {data.overallConversionRate.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Funnel Steps */}
      <div className="space-y-4">
        {data.steps.map((step, index) => {
          const isExpanded = expandedSteps.has(step.stepOrder);
          const stepWidth = getStepWidth(step.users);
          const isLastStep = index === data.steps.length - 1;

          return (
            <div key={step.stepOrder} className="relative">
              {/* Main Step */}
              <div
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  toggleStepExpansion(step.stepOrder);
                  if (onStepClick) onStepClick(step);
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">
                        {step.stepOrder}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{step.stepName}</h4>
                      <p className="text-sm text-gray-500">
                        {step.users.toLocaleString()} users
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className={`text-lg font-semibold ${getConversionColor(step.conversionRate)}`}>
                        {step.conversionRate.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500">conversion</div>
                    </div>
                    
                    {!isLastStep && (
                      <div className="text-right">
                        <div className="text-lg font-semibold text-red-600">
                          {step.dropoffRate.toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-500">drop-off</div>
                      </div>
                    )}
                    
                    {isExpanded ? (
                      <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Visual Funnel Bar */}
                <div className="relative">
                  <div className="w-full bg-gray-200 rounded-full h-8 mb-2">
                    <div
                      className="bg-blue-500 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium transition-all duration-300"
                      style={{ width: `${stepWidth}%` }}
                    >
                      {step.users.toLocaleString()}
                    </div>
                  </div>
                  
                  {/* Drop-off indicator */}
                  {!isLastStep && step.dropoffRate > 0 && (
                    <div className="flex items-center justify-end mt-1">
                      <div className={`w-2 h-2 rounded-full ${getDropoffColor(step.dropoffRate)} mr-2`}></div>
                      <span className="text-xs text-gray-600">
                        {((step.users * step.dropoffRate) / 100).toFixed(0)} users dropped off
                      </span>
                    </div>
                  )}
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500 mb-1">Users at Step</div>
                        <div className="font-semibold text-gray-900">
                          {step.users.toLocaleString()}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-gray-500 mb-1">Conversion Rate</div>
                        <div className={`font-semibold ${getConversionColor(step.conversionRate)}`}>
                          {step.conversionRate.toFixed(1)}%
                        </div>
                      </div>
                      
                      {!isLastStep && (
                        <>
                          <div>
                            <div className="text-gray-500 mb-1">Drop-off Rate</div>
                            <div className="font-semibold text-red-600">
                              {step.dropoffRate.toFixed(1)}%
                            </div>
                          </div>
                          
                          <div>
                            <div className="text-gray-500 mb-1">Avg. Time to Next</div>
                            <div className="font-semibold text-gray-900">
                              {formatTime(step.averageTimeToNext)}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    
                    {/* Improvement Suggestions */}
                    {step.dropoffRate > 20 && (
                      <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
                        <div className="text-sm font-medium text-yellow-800 mb-1">
                          Optimization Opportunity
                        </div>
                        <div className="text-sm text-yellow-700">
                          High drop-off rate detected. Consider reviewing user experience, 
                          page load times, or form complexity at this step.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Arrow to next step */}
              {!isLastStep && (
                <div className="flex justify-center my-2">
                  <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-gray-400"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Funnel Summary</h4>
          <div className="text-sm text-gray-600">
            Out of <strong>{data.totalEntries.toLocaleString()}</strong> users who entered the funnel,{' '}
            <strong>{data.totalConversions.toLocaleString()}</strong> completed all steps, 
            resulting in an overall conversion rate of{' '}
            <strong className={getConversionColor(data.overallConversionRate)}>
              {data.overallConversionRate.toFixed(1)}%
            </strong>.
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversionFunnel;