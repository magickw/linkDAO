import React, { useRef, useEffect } from 'react';
import { useDrag } from 'react-dnd';
import { ComponentDefinition } from '../../../types/reporting';

interface ComponentLibraryProps {
  components: ComponentDefinition[];
  onComponentDrag?: (component: ComponentDefinition) => void;
}

interface DraggableComponentProps {
  component: ComponentDefinition;
  onDrag?: (component: ComponentDefinition) => void;
}

const DraggableComponent: React.FC<DraggableComponentProps> = ({ component, onDrag }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'component',
    item: { type: 'component', component },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    begin: () => {
      onDrag?.(component);
    },
  }), [component, onDrag]);
  
  const divRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (divRef.current) {
      drag(divRef.current);
    }
  }, [drag]);

  return (
    <div
      ref={divRef}
      className={`
        p-3 m-2 bg-white border border-gray-200 rounded-lg cursor-move
        hover:border-blue-300 hover:shadow-sm transition-all duration-200
        ${isDragging ? 'opacity-50' : 'opacity-100'}
      `}
    >
      <div className="flex items-center space-x-3">
        <div className="text-2xl">{component.icon}</div>
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-900">{component.label}</h4>
          <p className="text-xs text-gray-500 mt-1">{component.description}</p>
        </div>
      </div>
    </div>
  );
};

export const ComponentLibrary: React.FC<ComponentLibraryProps> = ({
  components,
  onComponentDrag
}) => {
  const componentCategories = {
    'Data Visualization': components.filter(c => ['chart', 'table', 'metric'].includes(c.type)),
    'Content': components.filter(c => ['text', 'image'].includes(c.type)),
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Components</h3>
        <p className="text-sm text-gray-600 mt-1">
          Drag components to the canvas to build your report
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {Object.entries(componentCategories).map(([category, categoryComponents]) => (
          <div key={category} className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3 px-2">
              {category}
            </h4>
            <div className="space-y-1">
              {categoryComponents.map((component) => (
                <DraggableComponent
                  key={component.type}
                  component={component}
                  onDrag={onComponentDrag}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Quick Start Guide */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Quick Start</h4>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• Drag components to the canvas</li>
            <li>• Click to select and configure</li>
            <li>• Use the property panel to customize</li>
            <li>• Preview your report anytime</li>
          </ul>
        </div>

        {/* Component Details */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Component Types</h4>
          <div className="space-y-2 text-xs text-gray-600">
            <div className="flex items-center space-x-2">
              <span>📊</span>
              <span><strong>Charts:</strong> Line, bar, pie, and more</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>📋</span>
              <span><strong>Tables:</strong> Sortable data tables</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>🔢</span>
              <span><strong>Metrics:</strong> KPIs and statistics</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>📝</span>
              <span><strong>Text:</strong> Rich text content</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>🖼️</span>
              <span><strong>Images:</strong> Media and graphics</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};