import React, { useState, useEffect, useRef } from 'react';
import { TooltipConfig } from './types';

interface DynamicTooltipProps {
  config: TooltipConfig;
  data: any;
  position: { x: number; y: number };
  visible: boolean;
  onClose?: () => void;
}

interface TooltipSection {
  title: string;
  content: React.ReactNode;
  icon?: React.ReactNode;
}

const DynamicTooltip: React.FC<DynamicTooltipProps> = ({
  config,
  data,
  position,
  visible,
  onClose,
}) => {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);
  const [sections, setSections] = useState<TooltipSection[]>([]);

  // Adjust tooltip position to stay within viewport
  useEffect(() => {
    if (!tooltipRef.current || !visible) return;

    const tooltip = tooltipRef.current;
    const rect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let newX = position.x;
    let newY = position.y;

    // Adjust horizontal position
    if (position.x + rect.width > viewportWidth - 20) {
      newX = position.x - rect.width - 10;
    }

    // Adjust vertical position
    if (position.y + rect.height > viewportHeight - 20) {
      newY = position.y - rect.height - 10;
    }

    // Ensure tooltip doesn't go off-screen
    newX = Math.max(10, Math.min(newX, viewportWidth - rect.width - 10));
    newY = Math.max(10, Math.min(newY, viewportHeight - rect.height - 10));

    setAdjustedPosition({ x: newX, y: newY });
  }, [position, visible]);

  // Generate tooltip sections based on data
  useEffect(() => {
    if (!data) {
      setSections([]);
      return;
    }

    const newSections: TooltipSection[] = [];

    // Primary data section
    if (data.label || data.value !== undefined) {
      newSections.push({
        title: 'Data Point',
        content: (
          <div className="space-y-1">
            {data.label && (
              <div className="flex justify-between">
                <span className="text-gray-600">Label:</span>
                <span className="font-medium">{data.label}</span>
              </div>
            )}
            {data.value !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-600">Value:</span>
                <span className="font-medium">
                  {config.format ? config.format(data.value, data.label) : data.value.toLocaleString()}
                </span>
              </div>
            )}
            {data.percentage && (
              <div className="flex justify-between">
                <span className="text-gray-600">Percentage:</span>
                <span className="font-medium">{data.percentage}%</span>
              </div>
            )}
          </div>
        ),
        icon: (
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        ),
      });
    }

    // Dataset information
    if (data.dataset) {
      newSections.push({
        title: 'Dataset',
        content: (
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600">Series:</span>
              <span className="font-medium">{data.dataset.label}</span>
            </div>
            {data.dataset.backgroundColor && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Color:</span>
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded border"
                    style={{ backgroundColor: data.dataset.backgroundColor }}
                  />
                  <span className="text-xs font-mono">{data.dataset.backgroundColor}</span>
                </div>
              </div>
            )}
          </div>
        ),
        icon: (
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
        ),
      });
    }

    // Statistical information
    if (data.statistics) {
      newSections.push({
        title: 'Statistics',
        content: (
          <div className="space-y-1">
            {Object.entries(data.statistics).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                <span className="font-medium">
                  {typeof value === 'number' ? value.toLocaleString() : String(value)}
                </span>
              </div>
            ))}
          </div>
        ),
        icon: (
          <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        ),
      });
    }

    // Contextual actions
    if (data.actions && data.actions.length > 0) {
      newSections.push({
        title: 'Actions',
        content: (
          <div className="space-y-2">
            {data.actions.map((action: any, index: number) => (
              <button
                key={index}
                onClick={action.onClick}
                className="w-full text-left px-2 py-1 text-sm bg-gray-50 hover:bg-gray-100 rounded transition-colors"
              >
                {action.label}
              </button>
            ))}
          </div>
        ),
        icon: (
          <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        ),
      });
    }

    setSections(newSections);
  }, [data, config]);

  if (!visible || sections.length === 0) {
    return null;
  }

  return (
    <div
      ref={tooltipRef}
      className="fixed z-50 pointer-events-auto"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
        backgroundColor: config.backgroundColor || '#ffffff',
        borderColor: config.borderColor || '#e5e7eb',
        color: config.textColor || '#374151',
      }}
    >
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-100">
          <h3 className="font-semibold text-sm">Details</h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-3 space-y-4">
          {sections.map((section, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center space-x-2">
                {section.icon}
                <h4 className="font-medium text-sm text-gray-900">{section.title}</h4>
              </div>
              <div className="ml-6">
                {section.content}
              </div>
            </div>
          ))}
        </div>

        {/* Footer with timestamp */}
        <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 rounded-b-lg">
          <div className="text-xs text-gray-500">
            Updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DynamicTooltip;