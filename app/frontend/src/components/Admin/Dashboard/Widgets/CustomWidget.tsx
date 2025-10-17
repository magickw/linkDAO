import React from 'react';
import { LayoutConfig } from '../../../../stores/adminDashboardStore';

interface CustomWidgetProps {
  widget: LayoutConfig;
  isEditMode: boolean;
  onAction: (widgetId: string, action: string) => void;
}

export const CustomWidget: React.FC<CustomWidgetProps> = ({
  widget,
  isEditMode,
  onAction
}) => {
  if (widget.minimized) {
    return (
      <div className="custom-widget minimized">
        <div className="minimized-content">
          <span className="widget-title">{widget.config.title || 'Custom Widget'}</span>
          <span className="widget-type">Custom</span>
        </div>
      </div>
    );
  }

  return (
    <div className="custom-widget">
      <div className="widget-header">
        <h3 className="widget-title">{widget.config.title || 'Custom Widget'}</h3>
        <div className="widget-badge">Custom</div>
      </div>

      <div className="widget-content">
        <div className="placeholder-content">
          <div className="placeholder-icon">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 7.172V5L8 4z" />
            </svg>
          </div>
          <h4 className="placeholder-title">Custom Widget</h4>
          <p className="placeholder-description">
            This is a placeholder for custom widget content. You can configure this widget to display custom data, embed external content, or create specialized visualizations.
          </p>
          <div className="placeholder-features">
            <div className="feature-item">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Custom HTML/React components</span>
            </div>
            <div className="feature-item">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>External API integrations</span>
            </div>
            <div className="feature-item">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Embedded iframes</span>
            </div>
            <div className="feature-item">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Custom styling and themes</span>
            </div>
          </div>
          {!isEditMode && (
            <button className="configure-btn">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Configure Widget
            </button>
          )}
        </div>
      </div>

      {isEditMode && (
        <div className="edit-overlay">
          <div className="edit-message">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
            <span>Customize widget</span>
          </div>
        </div>
      )}

      <style jsx>{`
        .custom-widget {
          height: 100%;
          display: flex;
          flex-direction: column;
          position: relative;
          background: white;
        }

        .custom-widget.minimized {
          height: 40px;
          overflow: hidden;
        }

        .minimized-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          height: 100%;
        }

        .widget-type {
          font-size: 0.75rem;
          color: #6b7280;
          font-weight: 500;
          background: #f3f4f6;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .widget-header {
          padding: 12px 16px 8px;
          border-bottom: 1px solid #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .widget-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          margin: 0;
        }

        .widget-badge {
          font-size: 0.75rem;
          color: #7c3aed;
          font-weight: 500;
          background: #f3e8ff;
          padding: 4px 8px;
          border-radius: 4px;
        }

        .widget-content {
          flex: 1;
          padding: 24px 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .placeholder-content {
          text-align: center;
          max-width: 320px;
        }

        .placeholder-icon {
          color: #9ca3af;
          margin-bottom: 16px;
          display: flex;
          justify-content: center;
        }

        .placeholder-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #374151;
          margin: 0 0 8px 0;
        }

        .placeholder-description {
          font-size: 0.875rem;
          color: #6b7280;
          line-height: 1.5;
          margin: 0 0 20px 0;
        }

        .placeholder-features {
          margin-bottom: 24px;
          space-y: 8px;
        }

        .feature-item {
          display: flex;
          align-items: center;
          space-x: 8px;
          font-size: 0.875rem;
          color: #374151;
          text-align: left;
        }

        .feature-item svg {
          color: #10b981;
          flex-shrink: 0;
        }

        .configure-btn {
          display: flex;
          align-items: center;
          space-x: 8px;
          background: #3b82f6;
          color: white;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s ease;
          margin: 0 auto;
        }

        .configure-btn:hover {
          background: #2563eb;
          transform: translateY(-1px);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .edit-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(124, 58, 237, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s ease;
          cursor: pointer;
        }

        .custom-widget:hover .edit-overlay {
          opacity: 1;
        }

        .edit-message {
          display: flex;
          align-items: center;
          space-x: 8px;
          color: #7c3aed;
          font-size: 0.875rem;
          font-weight: 500;
          background: white;
          padding: 8px 12px;
          border-radius: 6px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .widget-content {
            padding: 16px 12px;
          }
          
          .placeholder-content {
            max-width: 280px;
          }
          
          .placeholder-title {
            font-size: 1rem;
          }
          
          .placeholder-description {
            font-size: 0.8125rem;
          }
          
          .feature-item {
            font-size: 0.8125rem;
          }
          
          .configure-btn {
            padding: 6px 12px;
            font-size: 0.8125rem;
          }
        }
      `}</style>
    </div>
  );
};