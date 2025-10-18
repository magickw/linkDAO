import React, { useState, useRef } from 'react';
import { ReportSection } from '../../../types/reporting';

interface SectionComponentProps {
  section: ReportSection;
  isSelected: boolean;
  onSelect: () => void;
  onMove: (position: { x: number; y: number }) => void;
  onResize: (size: { width: number; height: number }) => void;
  onDelete: () => void;
  onUpdate: (updates: Partial<ReportSection>) => void;
}

export const SectionComponent: React.FC<SectionComponentProps> = ({
  section,
  isSelected,
  onSelect,
  onMove,
  onResize,
  onDelete,
  onUpdate
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const sectionRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget && !e.currentTarget.contains(e.target as Node)) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    onSelect();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - section.position.x,
      y: e.clientY - section.position.y
    });
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: section.position.width,
      height: section.position.height
    });
  };

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = Math.max(0, e.clientX - dragStart.x);
        const newY = Math.max(0, e.clientY - dragStart.y);
        onMove({ x: newX, y: newY });
      } else if (isResizing) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        const newWidth = Math.max(200, resizeStart.width + deltaX);
        const newHeight = Math.max(150, resizeStart.height + deltaY);
        onResize({ width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragStart, resizeStart, onMove, onResize]);

  const renderSectionContent = () => {
    switch (section.type) {
      case 'chart':
        return (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-2">📊</div>
              <div className="text-sm font-medium">
                {section.config.chartType?.toUpperCase() || 'CHART'}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {section.dataSource.query ? 'Data connected' : 'No data source'}
              </div>
            </div>
          </div>
        );
      
      case 'table':
        return (
          <div className="p-4 h-full">
            <div className="text-sm font-medium text-gray-700 mb-2">Data Table</div>
            <div className="border border-gray-200 rounded">
              <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                <div className="flex space-x-4 text-xs font-medium text-gray-600">
                  <span>Column 1</span>
                  <span>Column 2</span>
                  <span>Column 3</span>
                </div>
              </div>
              <div className="p-3 text-xs text-gray-500">
                {section.dataSource.query ? 'Data will appear here' : 'Configure data source'}
              </div>
            </div>
          </div>
        );
      
      case 'metric':
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">1,234</div>
              <div className="text-sm text-gray-600 mt-1">Sample Metric</div>
              <div className="text-xs text-green-500 mt-1">+12.5%</div>
            </div>
          </div>
        );
      
      case 'text':
        return (
          <div className="p-4 h-full">
            <div className="text-sm text-gray-700">
              <h3 className="font-medium mb-2">Text Content</h3>
              <p className="text-xs text-gray-500">
                This is a text section. You can add rich text content, 
                formatted paragraphs, and other textual information here.
              </p>
            </div>
          </div>
        );
      
      case 'image':
        return (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <div className="text-4xl mb-2">🖼️</div>
              <div className="text-sm">Image Placeholder</div>
              <div className="text-xs mt-1">Click to configure</div>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <div className="text-sm">Unknown Component</div>
            </div>
          </div>
        );
    }
  };

  return (
    <div
      ref={sectionRef}
      className={`
        absolute border-2 rounded-lg bg-white shadow-sm cursor-move
        ${isSelected ? 'border-blue-500 shadow-lg' : 'border-gray-200 hover:border-gray-300'}
        ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
        transition-all duration-200
      `}
      style={{
        left: section.position.x,
        top: section.position.y,
        width: section.position.width,
        height: section.position.height,
        ...section.styling
      }}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Section Header */}
      <div className={`
        flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50 rounded-t-lg
        ${isSelected ? 'bg-blue-50 border-blue-200' : ''}
      `}>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">
            {section.title}
          </span>
          {section.type && (
            <span className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded">
              {section.type}
            </span>
          )}
        </div>
        
        {isSelected && (
          <div className="flex items-center space-x-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Handle edit action
              }}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
              title="Edit section"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1 text-gray-400 hover:text-red-600 rounded"
              title="Delete section"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Section Content */}
      <div className="flex-1 overflow-hidden">
        {renderSectionContent()}
      </div>

      {/* Resize Handle */}
      {isSelected && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 cursor-se-resize rounded-tl-lg"
          onMouseDown={handleResizeMouseDown}
          title="Resize section"
        >
          <div className="absolute bottom-1 right-1 w-2 h-2">
            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 8 8">
              <path d="M0 8L8 0V8H0Z"/>
            </svg>
          </div>
        </div>
      )}

      {/* Selection Indicators */}
      {isSelected && (
        <>
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full"></div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full"></div>
          <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 rounded-full"></div>
        </>
      )}
    </div>
  );
};