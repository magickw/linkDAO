import React, { useState, useCallback, useEffect } from 'react';
import { useAdminDashboardStore } from '../../../stores/adminDashboardStore';
import { MobileDashboardWidget } from './MobileDashboardWidget';
import { MobileWidgetSelector } from './MobileWidgetSelector';
import { Plus, Grid, List, Filter } from 'lucide-react';

interface MobileDashboardGridProps {
  className?: string;
}

export const MobileDashboardGrid: React.FC<MobileDashboardGridProps> = ({
  className = ''
}) => {
  const {
    dashboardConfig,
    isEditMode,
    toggleEditMode,
    addWidget,
    removeWidget,
    updateWidget,
    reorderWidgets
  } = useAdminDashboardStore();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showWidgetSelector, setShowWidgetSelector] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);

  // Filter visible widgets
  const visibleWidgets = dashboardConfig.layout.filter(widget => 
    widget.visible && 
    (filterCategory === 'all' || widget.category === filterCategory)
  );

  // Widget categories for filtering
  const categories = [
    { id: 'all', label: 'All' },
    { id: 'metrics', label: 'Metrics' },
    { id: 'charts', label: 'Charts' },
    { id: 'tables', label: 'Tables' },
    { id: 'alerts', label: 'Alerts' }
  ];

  // Handle drag start
  const handleDragStart = useCallback((widgetId: string) => {
    if (!isEditMode) return;
    setDraggedWidget(widgetId);
  }, [isEditMode]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggedWidget(null);
  }, []);

  // Handle drop
  const handleDrop = useCallback((targetWidgetId: string) => {
    if (!draggedWidget || draggedWidget === targetWidgetId) return;
    
    const draggedIndex = visibleWidgets.findIndex(w => w.id === draggedWidget);
    const targetIndex = visibleWidgets.findIndex(w => w.id === targetWidgetId);
    
    if (draggedIndex !== -1 && targetIndex !== -1) {
      reorderWidgets(draggedWidget, targetIndex);
    }
    
    setDraggedWidget(null);
  }, [draggedWidget, visibleWidgets, reorderWidgets]);

  // Handle widget action
  const handleWidgetAction = useCallback((widgetId: string, action: string) => {
    switch (action) {
      case 'remove':
        removeWidget(widgetId);
        break;
      case 'configure':
        // TODO: Open widget configuration modal
        break;
      case 'refresh':
        // TODO: Refresh widget data
        break;
      default:
        console.warn(`Unknown widget action: ${action}`);
    }
  }, [removeWidget]);

  return (
    <div className={`mobile-dashboard-grid ${className}`}>
      {/* Header Controls */}
      <div className="flex items-center justify-between mb-4 p-4 bg-white/10 backdrop-blur-md rounded-lg">
        <div className="flex items-center space-x-2">
          <h2 className="text-lg font-semibold text-white">Dashboard</h2>
          <span className="text-sm text-white/70">
            ({visibleWidgets.length} widgets)
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* View Mode Toggle */}
          <div className="flex bg-white/10 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'list'
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Edit Mode Toggle */}
          <button
            onClick={toggleEditMode}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isEditMode
                ? 'bg-purple-600 text-white'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {isEditMode ? 'Done' : 'Edit'}
          </button>
        </div>
      </div>

      {/* Filter Categories */}
      <div className="flex space-x-2 mb-4 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setFilterCategory(category.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filterCategory === category.id
                ? 'bg-purple-600 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* Add Widget Button */}
      {isEditMode && (
        <button
          onClick={() => setShowWidgetSelector(true)}
          className="w-full mb-4 p-4 border-2 border-dashed border-white/30 rounded-lg text-white/70 hover:border-white/50 hover:text-white transition-colors flex items-center justify-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Add Widget</span>
        </button>
      )}

      {/* Widgets Grid/List */}
      <div className={`widgets-container ${viewMode === 'grid' ? 'grid-view' : 'list-view'}`}>
        {visibleWidgets.length > 0 ? (
          visibleWidgets.map((widget, index) => (
            <MobileDashboardWidget
              key={widget.id}
              widget={widget}
              isEditMode={isEditMode}
              viewMode={viewMode}
              isDragging={draggedWidget === widget.id}
              onAction={handleWidgetAction}
              onDragStart={() => handleDragStart(widget.id)}
              onDragEnd={handleDragEnd}
              onDrop={() => handleDrop(widget.id)}
            />
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <div className="text-white/50 mb-4">
              <Grid className="w-12 h-12 mx-auto mb-2" />
              <p className="text-lg font-medium">No widgets to display</p>
              <p className="text-sm">Add widgets to customize your dashboard</p>
            </div>
            {isEditMode && (
              <button
                onClick={() => setShowWidgetSelector(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Add Your First Widget
              </button>
            )}
          </div>
        )}
      </div>

      {/* Widget Selector Modal */}
      {showWidgetSelector && (
        <MobileWidgetSelector
          onClose={() => setShowWidgetSelector(false)}
          onAddWidget={(widgetType) => {
            addWidget(widgetType);
            setShowWidgetSelector(false);
          }}
        />
      )}

      {/* Styles */}
      <style jsx>{`
        .widgets-container.grid-view {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }

        @media (min-width: 640px) {
          .widgets-container.grid-view {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .widgets-container.list-view {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .mobile-dashboard-grid {
          padding-bottom: 20px;
        }

        /* Drag and drop styles */
        .widget-dragging {
          opacity: 0.5;
          transform: rotate(2deg);
          z-index: 1000;
        }

        .widget-drop-target {
          border: 2px dashed #8b5cf6;
          background: rgba(139, 92, 246, 0.1);
        }

        /* Smooth animations */
        .widgets-container > * {
          transition: all 0.2s ease-in-out;
        }

        /* Loading states */
        .widget-loading {
          background: linear-gradient(90deg, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 75%);
          background-size: 200% 100%;
          animation: loading 1.5s infinite;
        }

        @keyframes loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};