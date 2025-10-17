import React, { memo, useMemo } from 'react';
import { LayoutConfig } from '../../../stores/adminDashboardStore';
import { MetricWidget } from './Widgets/MetricWidget';
import { ChartWidget } from './Widgets/ChartWidget';
import { TableWidget } from './Widgets/TableWidget';
import { AlertWidget } from './Widgets/AlertWidget';
import { CustomWidget } from './Widgets/CustomWidget';

interface DashboardWidgetProps {
  widget: LayoutConfig;
  isEditMode: boolean;
  onAction: (widgetId: string, action: string) => void;
}

export const DashboardWidget: React.FC<DashboardWidgetProps> = memo(({
  widget,
  isEditMode,
  onAction
}) => {
  // Render appropriate widget based on type
  const renderWidget = useMemo(() => {
    const commonProps = {
      widget,
      isEditMode,
      onAction
    };

    switch (widget.type) {
      case 'metric':
        return <MetricWidget {...commonProps} />;
      case 'chart':
        return <ChartWidget {...commonProps} />;
      case 'table':
        return <TableWidget {...commonProps} />;
      case 'alert':
        return <AlertWidget {...commonProps} />;
      case 'custom':
        return <CustomWidget {...commonProps} />;
      default:
        return (
          <div className="widget-error">
            <div className="p-4 text-center">
              <div className="text-red-500 text-sm">
                Unknown widget type: {widget.type}
              </div>
            </div>
          </div>
        );
    }
  }, [widget, isEditMode, onAction]);

  return (
    <div 
      className={`dashboard-widget ${widget.minimized ? 'minimized' : ''} ${isEditMode ? 'edit-mode' : ''}`}
      data-widget-id={widget.id}
      data-widget-type={widget.type}
    >
      {renderWidget}
      
      <style jsx>{`
        .dashboard-widget {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          position: relative;
        }

        .dashboard-widget.minimized {
          height: 40px;
          overflow: hidden;
        }

        .dashboard-widget.edit-mode {
          border: 2px dashed transparent;
          transition: border-color 0.2s ease;
        }

        .dashboard-widget.edit-mode:hover {
          border-color: #3b82f6;
        }

        .widget-error {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          background: #fef2f2;
          border: 1px solid #fecaca;
        }
      `}</style>
    </div>
  );
});

DashboardWidget.displayName = 'DashboardWidget';