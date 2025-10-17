import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Responsive, WidthProvider, Layout, Layouts } from 'react-grid-layout';
import { useAdminDashboardStore, selectDashboardConfig, selectIsEditMode } from '../../../stores/adminDashboardStore';
import { DashboardWidget } from './DashboardWidget';
import { WidgetToolbar } from './WidgetToolbar';
import { GridOverlay } from './GridOverlay';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface ResponsiveDashboardGridProps {
  className?: string;
  onLayoutChange?: (layout: Layout[], layouts: Layouts) => void;
  onBreakpointChange?: (breakpoint: string, cols: number) => void;
}

// Breakpoint configuration
const BREAKPOINTS = {
  xxl: 1600,
  xl: 1200,
  lg: 996,
  md: 768,
  sm: 576,
  xs: 0
};

const COLS = {
  xxl: 24,
  xl: 20,
  lg: 16,
  md: 12,
  sm: 8,
  xs: 4
};

// Row height configuration
const ROW_HEIGHT = 60;
const MARGIN: [number, number] = [16, 16];
const CONTAINER_PADDING: [number, number] = [16, 16];

export const ResponsiveDashboardGrid: React.FC<ResponsiveDashboardGridProps> = ({
  className = '',
  onLayoutChange,
  onBreakpointChange
}) => {
  const dashboardConfig = useAdminDashboardStore(selectDashboardConfig);
  const isEditMode = useAdminDashboardStore(selectIsEditMode);
  const {
    updateWidget,
    moveWidget,
    resizeWidget,
    selectWidget,
    setDraggedWidget,
    removeWidget,
    toggleWidgetVisibility,
    minimizeWidget,
    maximizeWidget
  } = useAdminDashboardStore();

  const [currentBreakpoint, setCurrentBreakpoint] = useState<string>('lg');
  const [compactType, setCompactType] = useState<'vertical' | 'horizontal' | null>('vertical');
  const [mounted, setMounted] = useState(false);

  // Handle component mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Generate layouts for all breakpoints
  const layouts = useMemo(() => {
    const generatedLayouts: Layouts = {};
    
    Object.keys(BREAKPOINTS).forEach(breakpoint => {
      generatedLayouts[breakpoint] = dashboardConfig.layout
        .filter(widget => widget.visible)
        .map(widget => ({
          i: widget.id,
          x: widget.position.x,
          y: widget.position.y,
          w: widget.position.w,
          h: widget.position.h,
          minW: 2,
          minH: 2,
          maxW: COLS[breakpoint as keyof typeof COLS],
          maxH: 20,
          isDraggable: isEditMode,
          isResizable: isEditMode,
          static: !isEditMode || widget.minimized
        }));
    });
    
    return generatedLayouts;
  }, [dashboardConfig.layout, isEditMode]);

  // Handle layout changes
  const handleLayoutChange = useCallback((layout: Layout[], layouts: Layouts) => {
    if (!isEditMode) return;

    // Update widget positions in store
    layout.forEach(layoutItem => {
      const widget = dashboardConfig.layout.find(w => w.id === layoutItem.i);
      if (widget) {
        const newPosition = {
          x: layoutItem.x,
          y: layoutItem.y,
          w: layoutItem.w,
          h: layoutItem.h
        };
        
        // Only update if position actually changed
        if (JSON.stringify(widget.position) !== JSON.stringify(newPosition)) {
          updateWidget(widget.id, { position: newPosition });
        }
      }
    });

    // Call external handler if provided
    onLayoutChange?.(layout, layouts);
  }, [isEditMode, dashboardConfig.layout, updateWidget, onLayoutChange]);

  // Handle breakpoint changes
  const handleBreakpointChange = useCallback((breakpoint: string, cols: number) => {
    setCurrentBreakpoint(breakpoint);
    onBreakpointChange?.(breakpoint, cols);
  }, [onBreakpointChange]);

  // Handle drag start
  const handleDragStart = useCallback((layout: Layout[], oldItem: Layout, newItem: Layout, placeholder: Layout, e: MouseEvent, element: HTMLElement) => {
    setDraggedWidget(oldItem.i);
    selectWidget(oldItem.i);
  }, [setDraggedWidget, selectWidget]);

  // Handle drag stop
  const handleDragStop = useCallback((layout: Layout[], oldItem: Layout, newItem: Layout, placeholder: Layout, e: MouseEvent, element: HTMLElement) => {
    setDraggedWidget(null);
    
    // Update widget position
    moveWidget(newItem.i, { x: newItem.x, y: newItem.y });
  }, [setDraggedWidget, moveWidget]);

  // Handle resize start
  const handleResizeStart = useCallback((layout: Layout[], oldItem: Layout, newItem: Layout, placeholder: Layout, e: MouseEvent, element: HTMLElement) => {
    selectWidget(oldItem.i);
  }, [selectWidget]);

  // Handle resize stop
  const handleResizeStop = useCallback((layout: Layout[], oldItem: Layout, newItem: Layout, placeholder: Layout, e: MouseEvent, element: HTMLElement) => {
    // Update widget size
    resizeWidget(newItem.i, { w: newItem.w, h: newItem.h });
  }, [resizeWidget]);

  // Handle widget actions
  const handleWidgetAction = useCallback((widgetId: string, action: string) => {
    switch (action) {
      case 'remove':
        removeWidget(widgetId);
        break;
      case 'toggle-visibility':
        toggleWidgetVisibility(widgetId);
        break;
      case 'minimize':
        minimizeWidget(widgetId);
        break;
      case 'maximize':
        maximizeWidget(widgetId);
        break;
      case 'configure':
        selectWidget(widgetId);
        break;
      default:
        console.warn(`Unknown widget action: ${action}`);
    }
  }, [removeWidget, toggleWidgetVisibility, minimizeWidget, maximizeWidget, selectWidget]);

  // Generate grid items
  const generateGridItems = useCallback(() => {
    return dashboardConfig.layout
      .filter(widget => widget.visible)
      .map(widget => (
        <div key={widget.id} className="dashboard-grid-item">
          {isEditMode && (
            <WidgetToolbar
              widgetId={widget.id}
              widget={widget}
              onAction={handleWidgetAction}
            />
          )}
          <DashboardWidget
            widget={widget}
            isEditMode={isEditMode}
            onAction={handleWidgetAction}
          />
        </div>
      ));
  }, [dashboardConfig.layout, isEditMode, handleWidgetAction]);

  // Don't render until mounted to avoid SSR issues
  if (!mounted) {
    return (
      <div className="dashboard-grid-loading">
        <div className="animate-pulse">
          <div className="grid grid-cols-12 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="col-span-6 h-32 bg-gray-200 rounded-lg"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`dashboard-grid-container ${className}`}>
      {/* Grid overlay for edit mode */}
      {isEditMode && (
        <GridOverlay
          breakpoint={currentBreakpoint}
          cols={COLS[currentBreakpoint as keyof typeof COLS]}
          rowHeight={ROW_HEIGHT}
          margin={MARGIN}
        />
      )}

      {/* Responsive grid layout */}
      <ResponsiveGridLayout
        className="dashboard-grid"
        layouts={layouts}
        breakpoints={BREAKPOINTS}
        cols={COLS}
        rowHeight={ROW_HEIGHT}
        margin={MARGIN}
        containerPadding={CONTAINER_PADDING}
        isDraggable={isEditMode}
        isResizable={isEditMode}
        compactType={compactType}
        preventCollision={false}
        useCSSTransforms={true}
        measureBeforeMount={false}
        onLayoutChange={handleLayoutChange}
        onBreakpointChange={handleBreakpointChange}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        onResizeStart={handleResizeStart}
        onResizeStop={handleResizeStop}
        draggableHandle=".widget-drag-handle"
        resizeHandles={['se', 'sw', 'ne', 'nw']}
      >
        {generateGridItems()}
      </ResponsiveGridLayout>

      {/* Grid controls */}
      {isEditMode && (
        <div className="dashboard-grid-controls">
          <div className="flex items-center space-x-4 p-4 bg-white border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">
                Compact Type:
              </label>
              <select
                value={compactType || 'none'}
                onChange={(e) => setCompactType(
                  e.target.value === 'none' ? null : e.target.value as 'vertical' | 'horizontal'
                )}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="none">None</option>
                <option value="vertical">Vertical</option>
                <option value="horizontal">Horizontal</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                Breakpoint: <span className="font-medium">{currentBreakpoint}</span>
              </span>
              <span className="text-sm text-gray-500">
                Columns: <span className="font-medium">{COLS[currentBreakpoint as keyof typeof COLS]}</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Custom styles */}
      <style jsx>{`
        .dashboard-grid-container {
          position: relative;
          width: 100%;
          min-height: 100vh;
        }

        .dashboard-grid {
          position: relative;
        }

        .dashboard-grid-item {
          position: relative;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
          transition: all 0.2s ease-in-out;
          overflow: hidden;
        }

        .dashboard-grid-item:hover {
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .dashboard-grid-item.react-draggable-dragging {
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          transform: rotate(2deg);
          z-index: 1000;
        }

        .dashboard-grid-item.react-resizable-resizing {
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          z-index: 999;
        }

        .dashboard-grid-loading {
          padding: 16px;
        }

        .dashboard-grid-controls {
          position: sticky;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 100;
          background: white;
          border-top: 1px solid #e5e7eb;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .dashboard-grid-item {
            border-radius: 6px;
          }
          
          .dashboard-grid-controls {
            padding: 8px;
          }
          
          .dashboard-grid-controls .flex {
            flex-direction: column;
            space-y: 2;
          }
        }

        /* Edit mode styles */
        .dashboard-grid.edit-mode .dashboard-grid-item {
          border: 2px dashed #d1d5db;
          background: rgba(249, 250, 251, 0.8);
        }

        .dashboard-grid.edit-mode .dashboard-grid-item:hover {
          border-color: #3b82f6;
          background: rgba(239, 246, 255, 0.8);
        }

        /* Drag handle styles */
        .widget-drag-handle {
          cursor: move;
          background: #f3f4f6;
          border-bottom: 1px solid #e5e7eb;
          padding: 8px 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .widget-drag-handle:hover {
          background: #e5e7eb;
        }

        /* Resize handle styles */
        .react-resizable-handle {
          background: #3b82f6;
          border: 1px solid #2563eb;
        }

        .react-resizable-handle:hover {
          background: #2563eb;
        }

        /* Grid lines for edit mode */
        .dashboard-grid.edit-mode::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: 
            linear-gradient(to right, rgba(0, 0, 0, 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 0, 0, 0.1) 1px, transparent 1px);
          background-size: ${ROW_HEIGHT + MARGIN[0]}px ${ROW_HEIGHT + MARGIN[1]}px;
          pointer-events: none;
          z-index: -1;
        }
      `}</style>
    </div>
  );
};