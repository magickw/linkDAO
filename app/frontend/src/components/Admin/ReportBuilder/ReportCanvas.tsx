import React, { useRef, useState } from 'react';
import { useDrop } from 'react-dnd';
import { ReportTemplate, ReportSection, DragItem } from '../../../types/reporting';
import { SectionComponent } from './SectionComponent';

interface ReportCanvasProps {
  template: Partial<ReportTemplate>;
  selectedSection?: string | null;
  onSectionAdd: (componentType: string, position: { x: number; y: number }) => void;
  onSectionUpdate: (sectionId: string, updates: Partial<ReportSection>) => void;
  onSectionDelete: (sectionId: string) => void;
  onSectionSelect: (sectionId: string | null) => void;
}

export const ReportCanvas: React.FC<ReportCanvasProps> = ({
  template,
  selectedSection,
  onSectionAdd,
  onSectionUpdate,
  onSectionDelete,
  onSectionSelect
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragPreview, setDragPreview] = useState<{ x: number; y: number; type: string } | null>(null);

  const [{ isOver, dragItem }, drop] = useDrop({
    accept: 'component',
    drop: (item: DragItem, monitor) => {
      if (!canvasRef.current || !item.component) return;

      const canvasRect = canvasRef.current.getBoundingClientRect();
      const dropPosition = monitor.getClientOffset();
      
      if (dropPosition) {
        const x = dropPosition.x - canvasRect.left;
        const y = dropPosition.y - canvasRect.top;
        
        onSectionAdd(item.component.type, { x, y });
      }
      
      setDragPreview(null);
    },
    hover: (item: DragItem, monitor) => {
      if (!canvasRef.current || !item.component) return;

      const canvasRect = canvasRef.current.getBoundingClientRect();
      const hoverPosition = monitor.getClientOffset();
      
      if (hoverPosition) {
        const x = hoverPosition.x - canvasRect.left;
        const y = hoverPosition.y - canvasRect.top;
        
        setDragPreview({ x, y, type: item.component.type });
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      dragItem: monitor.getItem(),
    }),
  });

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onSectionSelect(null);
    }
  };

  const handleSectionMove = (sectionId: string, newPosition: { x: number; y: number }) => {
    onSectionUpdate(sectionId, {
      position: {
        ...template.sections?.find(s => s.id === sectionId)?.position!,
        x: newPosition.x,
        y: newPosition.y
      }
    });
  };

  const handleSectionResize = (sectionId: string, newSize: { width: number; height: number }) => {
    onSectionUpdate(sectionId, {
      position: {
        ...template.sections?.find(s => s.id === sectionId)?.position!,
        width: newSize.width,
        height: newSize.height
      }
    });
  };

  drop(canvasRef);

  return (
    <div className="flex-1 flex flex-col bg-gray-100">
      {/* Canvas Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {template.name || 'Untitled Report'}
            </h2>
            <p className="text-sm text-gray-600">
              {template.description || 'No description'}
            </p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span>{template.sections?.length || 0} sections</span>
            {selectedSection && (
              <>
                <span>•</span>
                <span className="text-blue-600">Section selected</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 overflow-auto">
        <div
          ref={canvasRef}
          className={`
            relative min-h-full w-full bg-white m-4 rounded-lg shadow-sm border-2 border-dashed
            ${isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}
            transition-colors duration-200
          `}
          style={{ minHeight: '800px', minWidth: '1200px' }}
          onClick={handleCanvasClick}
        >
          {/* Drop Zone Hint */}
          {(!template.sections || template.sections.length === 0) && !dragPreview && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-xl font-medium mb-2">Start Building Your Report</h3>
                <p className="text-sm">
                  Drag components from the sidebar to begin creating your report
                </p>
              </div>
            </div>
          )}

          {/* Drag Preview */}
          {dragPreview && (
            <div
              className="absolute pointer-events-none border-2 border-blue-400 bg-blue-100 rounded-lg opacity-50"
              style={{
                left: dragPreview.x,
                top: dragPreview.y,
                width: 400,
                height: 300,
                transform: 'translate(-50%, -50%)'
              }}
            >
              <div className="flex items-center justify-center h-full text-blue-600 font-medium">
                New {dragPreview.type.charAt(0).toUpperCase() + dragPreview.type.slice(1)}
              </div>
            </div>
          )}

          {/* Render Sections */}
          {template.sections?.map((section) => (
            <SectionComponent
              key={section.id}
              section={section}
              isSelected={selectedSection === section.id}
              onSelect={() => onSectionSelect(section.id)}
              onMove={(position) => handleSectionMove(section.id, position)}
              onResize={(size) => handleSectionResize(section.id, size)}
              onDelete={() => onSectionDelete(section.id)}
              onUpdate={(updates) => onSectionUpdate(section.id, updates)}
            />
          ))}

          {/* Grid Lines (optional) */}
          <div className="absolute inset-0 pointer-events-none opacity-10">
            <svg width="100%" height="100%">
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#gray" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>
        </div>
      </div>

      {/* Canvas Footer */}
      <div className="bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center space-x-4">
            <span>Zoom: 100%</span>
            <span>Grid: 20px</span>
          </div>
          <div className="flex items-center space-x-2">
            {isOver && (
              <span className="text-blue-600 font-medium">
                Drop component here
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};