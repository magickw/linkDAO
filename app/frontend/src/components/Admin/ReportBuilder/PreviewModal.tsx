import React, { useState, useEffect } from 'react';
import { ReportTemplate } from '../../../types/reporting';
import { reportBuilderService } from '../../../services/reportBuilderService';

interface PreviewModalProps {
  template: Partial<ReportTemplate>;
  onClose: () => void;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({ template, onClose }) => {
  const [previewData, setPreviewData] = useState<any>(null);
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showParameters, setShowParameters] = useState(false);

  useEffect(() => {
    // Initialize parameters with default values
    const defaultParams: Record<string, any> = {};
    template.parameters?.forEach(param => {
      defaultParams[param.name] = param.defaultValue || '';
    });
    setParameters(defaultParams);

    // Load preview if template has an ID
    if (template.id) {
      loadPreview(defaultParams);
    }
  }, [template]);

  const loadPreview = async (params: Record<string, any> = parameters) => {
    if (!template.id) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await reportBuilderService.previewTemplate(template.id, params);
      setPreviewData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preview');
    } finally {
      setIsLoading(false);
    }
  };

  const handleParameterChange = (paramName: string, value: any) => {
    const newParams = { ...parameters, [paramName]: value };
    setParameters(newParams);
  };

  const handleRefreshPreview = () => {
    loadPreview();
  };

  const renderParameterInput = (param: any) => {
    const value = parameters[param.name] || '';

    switch (param.type) {
      case 'string':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleParameterChange(param.name, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={param.description}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleParameterChange(param.name, parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={param.description}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleParameterChange(param.name, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        );

      case 'boolean':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => handleParameterChange(param.name, e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm text-gray-700">{param.description}</label>
          </div>
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleParameterChange(param.name, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select {param.label}</option>
            {param.options?.map((option: any) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleParameterChange(param.name, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={param.description}
          />
        );
    }
  };

  const renderSectionPreview = (section: any) => {
    const sectionData = previewData?.sections?.find((s: any) => s.sectionId === section.id);

    if (sectionData?.error) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2 text-red-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">Error in {section.title}</span>
          </div>
          <p className="text-sm text-red-600 mt-1">{sectionData.error}</p>
        </div>
      );
    }

    switch (section.type) {
      case 'chart':
        return (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-center h-48 text-gray-500">
              <div className="text-center">
                <div className="text-4xl mb-2">📊</div>
                <div className="text-sm font-medium">
                  {section.config?.chartType?.toUpperCase() || 'CHART'} Preview
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {sectionData?.data?.length || 0} data points
                </div>
              </div>
            </div>
          </div>
        );

      case 'table':
        return (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <div className="flex space-x-4 text-sm font-medium text-gray-700">
                {sectionData?.columns?.slice(0, 4).map((col: any) => (
                  <span key={col.key}>{col.label}</span>
                ))}
              </div>
            </div>
            <div className="max-h-32 overflow-y-auto">
              {sectionData?.data?.slice(0, 5).map((row: any, index: number) => (
                <div key={index} className="px-4 py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex space-x-4 text-sm text-gray-600">
                    {sectionData.columns?.slice(0, 4).map((col: any) => (
                      <span key={col.key} className="truncate">
                        {String(row[col.key] || '-')}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {sectionData?.data?.length > 5 && (
              <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500 text-center">
                ... and {sectionData.data.length - 5} more rows
              </div>
            )}
          </div>
        );

      case 'metric':
        return (
          <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-700">
                {sectionData?.summary?.aggregations?.value || '1,234'}
              </div>
              <div className="text-sm text-blue-600 mt-1">{section.title}</div>
              <div className="text-xs text-green-600 mt-1">+12.5% from last period</div>
            </div>
          </div>
        );

      case 'text':
        return (
          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">{section.title}</h3>
            <p className="text-sm text-gray-600">
              This is a preview of the text content. The actual content would be 
              rendered here based on the section configuration.
            </p>
          </div>
        );

      case 'image':
        return (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-center h-32 text-gray-400">
              <div className="text-center">
                <div className="text-4xl mb-2">🖼️</div>
                <div className="text-sm">Image Preview</div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="text-sm text-gray-500">Unknown section type: {section.type}</div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold text-gray-900">Report Preview</h2>
            <span className="text-sm text-gray-500">
              {template.name || 'Untitled Report'}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            {template.parameters && template.parameters.length > 0 && (
              <button
                onClick={() => setShowParameters(!showParameters)}
                className={`
                  px-3 py-2 text-sm rounded-md flex items-center space-x-1
                  ${showParameters 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
                <span>Parameters</span>
              </button>
            )}
            
            <button
              onClick={handleRefreshPreview}
              disabled={isLoading}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>
            
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Parameters Panel */}
        {showParameters && template.parameters && template.parameters.length > 0 && (
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Report Parameters</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {template.parameters.map((param) => (
                <div key={param.id}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {param.label}
                    {param.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {renderParameterInput(param)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading preview...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-red-600">
                <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="font-medium">Preview Error</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
          ) : !template.sections || template.sections.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <div className="text-6xl mb-4">📊</div>
                <p className="text-lg font-medium">No Sections to Preview</p>
                <p className="text-sm mt-1">Add some sections to your report to see the preview</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Report Header */}
              <div className="text-center border-b border-gray-200 pb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                  {template.name || 'Untitled Report'}
                </h1>
                {template.description && (
                  <p className="text-gray-600 mt-2">{template.description}</p>
                )}
                <p className="text-sm text-gray-500 mt-2">
                  Generated on {new Date().toLocaleDateString()}
                </p>
              </div>

              {/* Sections */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {template.sections.map((section) => (
                  <div key={section.id} className="space-y-2">
                    <h3 className="text-lg font-medium text-gray-900">{section.title}</h3>
                    {section.description && (
                      <p className="text-sm text-gray-600">{section.description}</p>
                    )}
                    {renderSectionPreview(section)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};