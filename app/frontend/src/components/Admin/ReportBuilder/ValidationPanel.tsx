import React from 'react';
import { ValidationError } from '../../../types/reporting';

interface ValidationPanelProps {
  errors: ValidationError[];
  onClose: () => void;
  onSectionSelect?: (sectionId: string) => void;
}

export const ValidationPanel: React.FC<ValidationPanelProps> = ({
  errors,
  onClose,
  onSectionSelect
}) => {
  const errorsBySection = errors.reduce((acc, error) => {
    const sectionId = error.sectionId || 'template';
    if (!acc[sectionId]) {
      acc[sectionId] = [];
    }
    acc[sectionId].push(error);
    return acc;
  }, {} as Record<string, ValidationError[]>);

  const errorCount = errors.length;
  const warningCount = errors.filter(e => e.severity === 'warning').length;
  const criticalCount = errors.filter(e => e.severity === 'error').length;

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'warning':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'info':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const handleErrorClick = (error: ValidationError) => {
    if (error.sectionId && onSectionSelect) {
      onSectionSelect(error.sectionId);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-4/5 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold text-gray-900">Validation Results</h2>
            <div className="flex items-center space-x-2 text-sm">
              {criticalCount > 0 && (
                <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full">
                  {criticalCount} error{criticalCount !== 1 ? 's' : ''}
                </span>
              )}
              {warningCount > 0 && (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">
                  {warningCount} warning{warningCount !== 1 ? 's' : ''}
                </span>
              )}
              {errorCount === 0 && (
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">
                  All valid ✓
                </span>
              )}
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {errorCount === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-green-600">
                <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-medium">Validation Passed!</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Your report template is valid and ready to use.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Summary</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
                    <div className="text-xs text-gray-600">Errors</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-600">{warningCount}</div>
                    <div className="text-xs text-gray-600">Warnings</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-600">{errorCount}</div>
                    <div className="text-xs text-gray-600">Total Issues</div>
                  </div>
                </div>
              </div>

              {/* Errors by Section */}
              {Object.entries(errorsBySection).map(([sectionId, sectionErrors]) => (
                <div key={sectionId} className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
                    <span>
                      {sectionId === 'template' ? 'Template Issues' : `Section: ${sectionId}`}
                    </span>
                    <span className="text-sm text-gray-500">
                      ({sectionErrors.length} issue{sectionErrors.length !== 1 ? 's' : ''})
                    </span>
                  </h3>

                  <div className="space-y-2">
                    {sectionErrors.map((error, index) => (
                      <div
                        key={index}
                        className={`
                          p-3 border rounded-lg cursor-pointer transition-colors duration-200
                          ${getSeverityColor(error.severity)}
                          ${error.sectionId ? 'hover:shadow-sm' : ''}
                        `}
                        onClick={() => handleErrorClick(error)}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {getSeverityIcon(error.severity)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">
                                {error.field}
                              </p>
                              <span className="text-xs uppercase tracking-wide font-medium">
                                {error.severity}
                              </span>
                            </div>
                            <p className="text-sm mt-1">
                              {error.message}
                            </p>
                            {error.sectionId && (
                              <p className="text-xs text-gray-500 mt-1">
                                Click to navigate to this section
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Help Text */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">Validation Help</h4>
                    <div className="text-sm text-blue-700 mt-1 space-y-1">
                      <p>• <strong>Errors</strong> must be fixed before the report can be saved or generated</p>
                      <p>• <strong>Warnings</strong> indicate potential issues but don't prevent saving</p>
                      <p>• Click on section-specific issues to navigate directly to that section</p>
                      <p>• Use the property panel to fix configuration issues</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {errorCount > 0 ? (
              <>
                Fix {criticalCount > 0 ? 'errors' : 'issues'} to continue
              </>
            ) : (
              'Report is ready to save'
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};