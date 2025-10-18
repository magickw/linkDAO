import React, { useState } from 'react';
import { ReportTemplate } from '../../../types/reporting';

interface ReportToolbarProps {
  template: Partial<ReportTemplate>;
  isDirty: boolean;
  isLoading: boolean;
  onSave: () => void;
  onPreview: () => void;
  onValidate: () => void;
  onCancel?: () => void;
  onTemplateChange: (updates: Partial<ReportTemplate>) => void;
}

export const ReportToolbar: React.FC<ReportToolbarProps> = ({
  template,
  isDirty,
  isLoading,
  onSave,
  onPreview,
  onValidate,
  onCancel,
  onTemplateChange
}) => {
  const [showQuickActions, setShowQuickActions] = useState(false);

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left Section - Template Info */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {template.name || 'Untitled Report'}
              </h1>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>{template.sections?.length || 0} sections</span>
                {isDirty && (
                  <>
                    <span>•</span>
                    <span className="text-orange-600">Unsaved changes</span>
                  </>
                )}
                {template.version && (
                  <>
                    <span>•</span>
                    <span>v{template.version}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Center Section - Quick Actions */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <button
              onClick={() => setShowQuickActions(!showQuickActions)}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md flex items-center space-x-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
              <span>Quick Actions</span>
            </button>

            {showQuickActions && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                <div className="py-1">
                  <button
                    onClick={() => {
                      // Add chart section
                      setShowQuickActions(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <span>📊</span>
                    <span>Add Chart</span>
                  </button>
                  <button
                    onClick={() => {
                      // Add table section
                      setShowQuickActions(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <span>📋</span>
                    <span>Add Table</span>
                  </button>
                  <button
                    onClick={() => {
                      // Add metric section
                      setShowQuickActions(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <span>🔢</span>
                    <span>Add Metric</span>
                  </button>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button
                    onClick={() => {
                      // Clear all sections
                      onTemplateChange({ sections: [] });
                      setShowQuickActions(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                  >
                    <span>🗑️</span>
                    <span>Clear All</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-gray-300"></div>

          <button
            onClick={onValidate}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md flex items-center space-x-1"
            title="Validate report"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Validate</span>
          </button>

          <button
            onClick={onPreview}
            disabled={isLoading}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md flex items-center space-x-1 disabled:opacity-50"
            title="Preview report"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>Preview</span>
          </button>
        </div>

        {/* Right Section - Main Actions */}
        <div className="flex items-center space-x-3">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
            >
              Cancel
            </button>
          )}

          <button
            onClick={onSave}
            disabled={isLoading || !isDirty}
            className={`
              px-4 py-2 text-sm font-medium rounded-md flex items-center space-x-2
              ${isDirty && !isLoading
                ? 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                <span>Save</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Progress Indicator */}
      {isLoading && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
          <div className="h-full bg-blue-600 animate-pulse"></div>
        </div>
      )}
    </div>
  );
};