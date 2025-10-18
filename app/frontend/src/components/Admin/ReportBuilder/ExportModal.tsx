import React, { useState } from 'react';
import { ReportTemplate } from '../../../types/reporting';

interface ExportModalProps {
  template: ReportTemplate;
  onClose: () => void;
  onExport?: (result: any) => void;
}

interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv' | 'html' | 'json';
  branding?: {
    logo?: string;
    companyName?: string;
    colors?: {
      primary?: string;
      secondary?: string;
      accent?: string;
    };
  };
  layout?: {
    pageSize?: 'A4' | 'A3' | 'Letter' | 'Legal';
    orientation?: 'portrait' | 'landscape';
    margins?: {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
    };
    header?: boolean;
    footer?: boolean;
    pageNumbers?: boolean;
  };
  compression?: boolean;
  password?: string;
  watermark?: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  template,
  onClose,
  onExport
}) => {
  const [selectedFormats, setSelectedFormats] = useState<string[]>(['pdf']);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'pdf',
    branding: {
      companyName: 'LinkDAO Admin',
      colors: {
        primary: '#3B82F6',
        secondary: '#6B7280',
        accent: '#10B981'
      }
    },
    layout: {
      pageSize: 'A4',
      orientation: 'portrait',
      margins: {
        top: 20,
        right: 20,
        bottom: 20,
        left: 20
      },
      header: true,
      footer: true,
      pageNumbers: true
    },
    compression: false
  });
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'formats' | 'branding' | 'layout' | 'security'>('formats');

  React.useEffect(() => {
    // Initialize parameters with default values
    const defaultParams: Record<string, any> = {};
    template.parameters?.forEach(param => {
      defaultParams[param.name] = param.defaultValue || '';
    });
    setParameters(defaultParams);
  }, [template]);

  const handleFormatToggle = (format: string) => {
    setSelectedFormats(prev => {
      if (prev.includes(format)) {
        return prev.filter(f => f !== format);
      } else {
        return [...prev, format];
      }
    });
  };

  const handleParameterChange = (paramName: string, value: any) => {
    setParameters(prev => ({ ...prev, [paramName]: value }));
  };

  const handleBrandingChange = (field: string, value: any) => {
    setExportOptions(prev => ({
      ...prev,
      branding: {
        ...prev.branding,
        [field]: value
      }
    }));
  };

  const handleColorChange = (colorType: string, value: string) => {
    setExportOptions(prev => ({
      ...prev,
      branding: {
        ...prev.branding,
        colors: {
          ...prev.branding?.colors,
          [colorType]: value
        }
      }
    }));
  };

  const handleLayoutChange = (field: string, value: any) => {
    setExportOptions(prev => ({
      ...prev,
      layout: {
        ...prev.layout,
        [field]: value
      }
    }));
  };

  const handleMarginChange = (side: string, value: number) => {
    setExportOptions(prev => ({
      ...prev,
      layout: {
        ...prev.layout,
        margins: {
          ...prev.layout?.margins,
          [side]: value
        }
      }
    }));
  };

  const handleExport = async () => {
    if (selectedFormats.length === 0) {
      setError('Please select at least one format');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const exportData = {
        formats: selectedFormats,
        parameters,
        ...exportOptions
      };

      // Simulate export API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      const mockResult = {
        success: true,
        exports: selectedFormats.map(format => ({
          format,
          fileName: `${template.name}_${Date.now()}.${format === 'excel' ? 'xlsx' : format}`,
          downloadUrl: `/api/admin/reports/download/${format}/${template.id}`,
          fileSize: Math.floor(Math.random() * 2000000) + 100000
        }))
      };

      onExport?.(mockResult);
      onClose();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsLoading(false);
    }
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
          />
        );
    }
  };

  const formatOptions = [
    { id: 'pdf', name: 'PDF', icon: '📄', description: 'Portable Document Format' },
    { id: 'excel', name: 'Excel', icon: '📊', description: 'Microsoft Excel Spreadsheet' },
    { id: 'csv', name: 'CSV', icon: '📋', description: 'Comma Separated Values' },
    { id: 'html', name: 'HTML', icon: '🌐', description: 'Web Page Format' },
    { id: 'json', name: 'JSON', icon: '🔧', description: 'JavaScript Object Notation' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Export Report</h2>
            <p className="text-sm text-gray-600 mt-1">{template.name}</p>
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

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {[
              { id: 'formats', label: 'Formats', icon: '📁' },
              { id: 'branding', label: 'Branding', icon: '🎨' },
              { id: 'layout', label: 'Layout', icon: '📐' },
              { id: 'security', label: 'Security', icon: '🔒' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'formats' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Select Export Formats</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {formatOptions.map((format) => (
                    <div
                      key={format.id}
                      className={`
                        p-4 border-2 rounded-lg cursor-pointer transition-all duration-200
                        ${selectedFormats.includes(format.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                        }
                      `}
                      onClick={() => handleFormatToggle(format.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">{format.icon}</div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{format.name}</h4>
                          <p className="text-sm text-gray-600">{format.description}</p>
                        </div>
                        <div className={`
                          w-5 h-5 rounded border-2 flex items-center justify-center
                          ${selectedFormats.includes(format.id)
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300'
                          }
                        `}>
                          {selectedFormats.includes(format.id) && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Parameters */}
              {template.parameters && template.parameters.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Report Parameters</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {template.parameters.map((param) => (
                      <div key={param.id}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {param.label}
                          {param.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {renderParameterInput(param)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'branding' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Branding Options</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={exportOptions.branding?.companyName || ''}
                      onChange={(e) => handleBrandingChange('companyName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter company name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Logo URL
                    </label>
                    <input
                      type="url"
                      value={exportOptions.branding?.logo || ''}
                      onChange={(e) => handleBrandingChange('logo', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://example.com/logo.png"
                    />
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Brand Colors</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Primary</label>
                        <input
                          type="color"
                          value={exportOptions.branding?.colors?.primary || '#3B82F6'}
                          onChange={(e) => handleColorChange('primary', e.target.value)}
                          className="w-full h-10 border border-gray-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Secondary</label>
                        <input
                          type="color"
                          value={exportOptions.branding?.colors?.secondary || '#6B7280'}
                          onChange={(e) => handleColorChange('secondary', e.target.value)}
                          className="w-full h-10 border border-gray-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Accent</label>
                        <input
                          type="color"
                          value={exportOptions.branding?.colors?.accent || '#10B981'}
                          onChange={(e) => handleColorChange('accent', e.target.value)}
                          className="w-full h-10 border border-gray-300 rounded"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'layout' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Layout Settings</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Page Size
                    </label>
                    <select
                      value={exportOptions.layout?.pageSize || 'A4'}
                      onChange={(e) => handleLayoutChange('pageSize', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="A4">A4</option>
                      <option value="A3">A3</option>
                      <option value="Letter">Letter</option>
                      <option value="Legal">Legal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Orientation
                    </label>
                    <select
                      value={exportOptions.layout?.orientation || 'portrait'}
                      onChange={(e) => handleLayoutChange('orientation', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Landscape</option>
                    </select>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Margins (mm)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {['top', 'right', 'bottom', 'left'].map((side) => (
                      <div key={side}>
                        <label className="block text-xs text-gray-600 mb-1 capitalize">{side}</label>
                        <input
                          type="number"
                          min="0"
                          max="50"
                          value={exportOptions.layout?.margins?.[side as keyof typeof exportOptions.layout.margins] || 20}
                          onChange={(e) => handleMarginChange(side, parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Page Elements</h4>
                  <div className="space-y-2">
                    {[
                      { key: 'header', label: 'Include Header' },
                      { key: 'footer', label: 'Include Footer' },
                      { key: 'pageNumbers', label: 'Show Page Numbers' }
                    ].map((option) => (
                      <div key={option.key} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={typeof exportOptions.layout?.[option.key as keyof typeof exportOptions.layout] === 'boolean' 
                            ? exportOptions.layout?.[option.key as keyof typeof exportOptions.layout] as boolean 
                            : false}
                          onChange={(e) => handleLayoutChange(option.key, e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 text-sm text-gray-700">{option.label}</label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Security Options</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={exportOptions.compression || false}
                      onChange={(e) => setExportOptions(prev => ({ ...prev, compression: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 text-sm text-gray-700">
                      Enable compression (reduces file size)
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password Protection (optional)
                    </label>
                    <input
                      type="password"
                      value={exportOptions.password || ''}
                      onChange={(e) => setExportOptions(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter password to protect the file"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Leave empty for no password protection
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Watermark Text (optional)
                    </label>
                    <input
                      type="text"
                      value={exportOptions.watermark || ''}
                      onChange={(e) => setExportOptions(prev => ({ ...prev, watermark: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter watermark text"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {selectedFormats.length > 0 ? (
              `${selectedFormats.length} format${selectedFormats.length !== 1 ? 's' : ''} selected`
            ) : (
              'No formats selected'
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isLoading || selectedFormats.length === 0}
              className={`
                px-4 py-2 text-sm font-medium rounded-md flex items-center space-x-2
                ${isLoading || selectedFormats.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
                }
              `}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Export Report</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};