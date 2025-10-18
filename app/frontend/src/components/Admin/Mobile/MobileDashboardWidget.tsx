import React, { useState, useRef } from 'react';
import { MoreVertical, Maximize2, Minimize2, RefreshCw, Settings, Trash2, GripVertical } from 'lucide-react';
import { DashboardWidget as BaseDashboardWidget } from '../Dashboard/DashboardWidget';

interface Widget {
  id: string;
  type: string;
  title: string;
  position: { x: number; y: number; w: number; h: number };
  config: any;
  visible: boolean;
  minimized: boolean;
  category: string;
}

interface MobileDashboardWidgetProps {
  widget: Widget;
  isEditMode: boolean;
  viewMode: 'grid' | 'list';
  isDragging: boolean;
  onAction: (widgetId: string, action: string) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDrop: () => void;
}

export const MobileDashboardWidget: React.FC<MobileDashboardWidgetProps> = ({
  widget,
  isEditMode,
  viewMode,
  isDragging,
  onAction,
  onDragStart,
  onDragEnd,
  onDrop
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    onAction(widget.id, 'refresh');
    // Simulate refresh delay
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Handle drag events
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isEditMode) return;
    onDragStart();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isEditMode) return;
    onDragEnd();
  };

  // Menu actions
  const menuActions = [
    {
      id: 'refresh',
      label: 'Refresh',
      icon: RefreshCw,
      action: () => handleRefresh()
    },
    {
      id: 'configure',
      label: 'Configure',
      icon: Settings,
      action: () => onAction(widget.id, 'configure')
    },
    {
      id: 'minimize',
      label: widget.minimized ? 'Expand' : 'Minimize',
      icon: widget.minimized ? Maximize2 : Minimize2,
      action: () => onAction(widget.id, widget.minimized ? 'maximize' : 'minimize')
    },
    {
      id: 'remove',
      label: 'Remove',
      icon: Trash2,
      action: () => onAction(widget.id, 'remove'),
      destructive: true
    }
  ];

  return (
    <div
      ref={dragRef}
      className={`mobile-widget ${viewMode === 'list' ? 'list-mode' : 'grid-mode'} ${
        isDragging ? 'dragging' : ''
      } ${widget.minimized ? 'minimized' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      {/* Widget Header */}
      <div className="widget-header">
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          {isEditMode && (
            <div className="drag-handle">
              <GripVertical className="w-4 h-4 text-white/50" />
            </div>
          )}
          <h3 className="widget-title">{widget.title}</h3>
          {isRefreshing && (
            <RefreshCw className="w-4 h-4 text-white/70 animate-spin" />
          )}
        </div>

        {/* Widget Actions */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* Action Menu */}
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowMenu(false)}
              />
              <div
                ref={menuRef}
                className="absolute right-0 top-full mt-1 z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[140px]"
              >
                {menuActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      onClick={() => {
                        action.action();
                        setShowMenu(false);
                      }}
                      className={`w-full flex items-center space-x-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                        action.destructive ? 'text-red-600' : 'text-gray-700'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{action.label}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Widget Content */}
      {!widget.minimized && (
        <div className="widget-content">
          <BaseDashboardWidget
            widget={widget}
            isEditMode={false}
            onAction={onAction}
          />
        </div>
      )}

      {/* Minimized State */}
      {widget.minimized && (
        <div className="minimized-content">
          <p className="text-white/50 text-sm">Widget minimized</p>
          <button
            onClick={() => onAction(widget.id, 'maximize')}
            className="text-purple-400 text-sm hover:text-purple-300 transition-colors"
          >
            Tap to expand
          </button>
        </div>
      )}

      {/* Loading Overlay */}
      {isRefreshing && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <RefreshCw className="w-6 h-6 text-white animate-spin" />
          </div>
        </div>
      )}

      <style jsx>{`
        .mobile-widget {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.2s ease-in-out;
          position: relative;
        }

        .mobile-widget:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.3);
        }

        .mobile-widget.dragging {
          opacity: 0.7;
          transform: rotate(2deg) scale(1.02);
          z-index: 1000;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
        }

        .mobile-widget.grid-mode {
          min-height: 200px;
        }

        .mobile-widget.list-mode {
          min-height: 120px;
        }

        .mobile-widget.minimized {
          min-height: auto;
        }

        .widget-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
        }

        .drag-handle {
          cursor: grab;
          padding: 4px;
          margin: -4px;
          border-radius: 4px;
          transition: background-color 0.2s;
        }

        .drag-handle:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .drag-handle:active {
          cursor: grabbing;
        }

        .widget-title {
          font-size: 14px;
          font-weight: 600;
          color: white;
          truncate: true;
          flex: 1;
          min-width: 0;
        }

        .widget-content {
          padding: 16px;
          height: calc(100% - 49px);
          overflow: hidden;
        }

        .minimized-content {
          padding: 16px;
          text-align: center;
        }

        .loading-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
        }

        .loading-spinner {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 50%;
          padding: 12px;
        }

        /* List mode specific styles */
        .mobile-widget.list-mode .widget-content {
          padding: 12px 16px;
          height: calc(100% - 49px);
        }

        .mobile-widget.list-mode .widget-header {
          padding: 8px 16px;
        }

        /* Touch-friendly adjustments */
        @media (max-width: 640px) {
          .widget-header {
            padding: 10px 12px;
          }

          .widget-content {
            padding: 12px;
          }

          .widget-title {
            font-size: 13px;
          }
        }

        /* Animation for menu */
        .widget-menu {
          animation: slideIn 0.2s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Error state */
        .mobile-widget.error {
          border-color: rgba(239, 68, 68, 0.5);
          background: rgba(239, 68, 68, 0.1);
        }

        /* Success state */
        .mobile-widget.success {
          border-color: rgba(34, 197, 94, 0.5);
          background: rgba(34, 197, 94, 0.1);
        }
      `}</style>
    </div>
  );
};