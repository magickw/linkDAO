import React, { useState } from 'react';
import { ReportTemplate, ReportSection, ReportParameter } from '../../../types/reporting';

interface PropertyPanelProps {
  template: Partial<ReportTemplate>;
  selectedSection?: ReportSection | null;
  onTemplateChange: (updates: Partial<ReportTemplate>) => void;
  onSectionChange: (updates: Partial<ReportSection>) => void;
}

export const PropertyPanel: React.FC<PropertyPanelProps> = ({
  template,
  selectedSection,
  onTemplateChange,
  onSectionChange
}) => {
  const [activeTab, setActiveTab] = useState<'template' | 'section' | 'data'>('template');

  const handleTemplatePropertyChange = (field: keyof ReportTemplate, value: any) => {
    onTemplateChange({ [field]: value });
  };

  const handleSectionPropertyChange = (field: keyof ReportSection, value: any) => {
    if (selectedSection) {
      onSectionChange({ [field]: value });
    }
  };

  const handleSectionConfigChange = (configField: string, value: any) => {
    if (selectedSection) {
      onSectionChange({
        config: {
          ...selectedSection.config,
          [configField]: value
        }
      });
    }
  };

  const handleSectionStylingChange = (styleField: string, value: any) => {
    if (selectedSection) {
      onSectionChange({
        styling: {
          ...selectedSection.styling,
          [styleField]: value
        }
      });
    }
  };

  const addParameter = () => {
    const newParameter: ReportParameter = {
      id: `param_${Date.now()}`,
      name: 'newParameter',
      type: 'string',
      label: 'New Parameter',
      required: false,
      validation: []
    };

    onTemplateChange({
      parameters: [...(template.parameters || []), newParameter]
    });
  };

  const updateParameter = (index: number, updates: Partial<ReportParameter>) => {
    const parameters = [...(template.parameters || [])];
    parameters[index] = { ...parameters[index], ...updates };
    onTemplateChange({ parameters });
  };

  const removeParameter = (index: number) => {
    const parameters = [...(template.parameters || [])];
    parameters.splice(index, 1);
    onTemplateChange({ parameters });
  };

  const renderTemplateProperties = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Report Name
        </label>
        <input
          type="text"
          value={template.name || ''}
          onChange={(e) => handleTemplatePropertyChange('name', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter report name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          value={template.description || ''}
          onChange={(e) => handleTemplatePropertyChange('description', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter report description"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Category
        </label>
        <select
          value={template.category || ''}
          onChange={(e) => handleTemplatePropertyChange('category', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select category</option>
          <option value="analytics">Analytics</option>
          <option value="performance">Performance</option>
          <option value="financial">Financial</option>
          <option value="operational">Operational</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tags
        </label>
        <input
          type="text"
          value={template.tags?.join(', ') || ''}
          onChange={(e) => handleTemplatePropertyChange('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter tags separated by commas"
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="isPublic"
          checked={template.isPublic || false}
          onChange={(e) => handleTemplatePropertyChange('isPublic', e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-700">
          Make this report template public
        </label>
      </div>

      {/* Parameters Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700">Parameters</h4>
          <button
            onClick={addParameter}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add Parameter
          </button>
        </div>

        <div className="space-y-3">
          {template.parameters?.map((param, index) => (
            <div key={param.id} className="p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <input
                  type="text"
                  value={param.label}
                  onChange={(e) => updateParameter(index, { label: e.target.value })}
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded mr-2"
                  placeholder="Parameter label"
                />
                <button
                  onClick={() => removeParameter(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={param.name}
                  onChange={(e) => updateParameter(index, { name: e.target.value })}
                  className="px-2 py-1 text-xs border border-gray-300 rounded"
                  placeholder="Parameter name"
                />
                <select
                  value={param.type}
                  onChange={(e) => updateParameter(index, { type: e.target.value as any })}
                  className="px-2 py-1 text-xs border border-gray-300 rounded"
                >
                  <option value="string">String</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="boolean">Boolean</option>
                  <option value="select">Select</option>
                  <option value="multiselect">Multi-select</option>
                </select>
              </div>
              
              <div className="mt-2 flex items-center">
                <input
                  type="checkbox"
                  checked={param.required}
                  onChange={(e) => updateParameter(index, { required: e.target.checked })}
                  className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-1 text-xs text-gray-600">Required</label>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSectionProperties = () => {
    if (!selectedSection) {
      return (
        <div className="flex items-center justify-center h-32 text-gray-500">
          <div className="text-center">
            <div className="text-sm">No section selected</div>
            <div className="text-xs mt-1">Click on a section to edit its properties</div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Section Title
          </label>
          <input
            type="text"
            value={selectedSection.title}
            onChange={(e) => handleSectionPropertyChange('title', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={selectedSection.description || ''}
            onChange={(e) => handleSectionPropertyChange('description', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Position and Size */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Position & Size</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">X Position</label>
              <input
                type="number"
                value={selectedSection.position.x}
                onChange={(e) => handleSectionPropertyChange('position', {
                  ...selectedSection.position,
                  x: parseInt(e.target.value) || 0
                })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Y Position</label>
              <input
                type="number"
                value={selectedSection.position.y}
                onChange={(e) => handleSectionPropertyChange('position', {
                  ...selectedSection.position,
                  y: parseInt(e.target.value) || 0
                })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Width</label>
              <input
                type="number"
                value={selectedSection.position.width}
                onChange={(e) => handleSectionPropertyChange('position', {
                  ...selectedSection.position,
                  width: parseInt(e.target.value) || 200
                })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Height</label>
              <input
                type="number"
                value={selectedSection.position.height}
                onChange={(e) => handleSectionPropertyChange('position', {
                  ...selectedSection.position,
                  height: parseInt(e.target.value) || 150
                })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              />
            </div>
          </div>
        </div>

        {/* Type-specific Configuration */}
        {selectedSection.type === 'chart' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chart Type
            </label>
            <select
              value={selectedSection.config.chartType || 'line'}
              onChange={(e) => handleSectionConfigChange('chartType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="line">Line Chart</option>
              <option value="bar">Bar Chart</option>
              <option value="pie">Pie Chart</option>
              <option value="doughnut">Doughnut Chart</option>
              <option value="scatter">Scatter Plot</option>
              <option value="heatmap">Heatmap</option>
            </select>
          </div>
        )}

        {selectedSection.type === 'metric' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Aggregation
            </label>
            <select
              value={selectedSection.config.aggregation || 'sum'}
              onChange={(e) => handleSectionConfigChange('aggregation', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="sum">Sum</option>
              <option value="avg">Average</option>
              <option value="count">Count</option>
              <option value="min">Minimum</option>
              <option value="max">Maximum</option>
            </select>
          </div>
        )}

        {/* Styling */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Styling</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Background Color</label>
              <input
                type="color"
                value={selectedSection.styling?.backgroundColor || '#ffffff'}
                onChange={(e) => handleSectionStylingChange('backgroundColor', e.target.value)}
                className="w-full h-8 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Border Color</label>
              <input
                type="color"
                value={selectedSection.styling?.borderColor || '#e2e8f0'}
                onChange={(e) => handleSectionStylingChange('borderColor', e.target.value)}
                className="w-full h-8 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Border Radius</label>
              <input
                type="number"
                value={selectedSection.styling?.borderRadius || 8}
                onChange={(e) => handleSectionStylingChange('borderRadius', parseInt(e.target.value) || 0)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                min="0"
                max="50"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Padding</label>
              <input
                type="number"
                value={selectedSection.styling?.padding || 16}
                onChange={(e) => handleSectionStylingChange('padding', parseInt(e.target.value) || 0)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                min="0"
                max="100"
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDataSourceProperties = () => {
    if (!selectedSection) {
      return (
        <div className="flex items-center justify-center h-32 text-gray-500">
          <div className="text-center">
            <div className="text-sm">No section selected</div>
            <div className="text-xs mt-1">Select a section to configure its data source</div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data Source Type
          </label>
          <select
            value={selectedSection.dataSource.type}
            onChange={(e) => handleSectionPropertyChange('dataSource', {
              ...selectedSection.dataSource,
              type: e.target.value as any
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="database">Database</option>
            <option value="api">API</option>
            <option value="file">File</option>
            <option value="realtime">Real-time</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Connection
          </label>
          <select
            value={selectedSection.dataSource.connection}
            onChange={(e) => handleSectionPropertyChange('dataSource', {
              ...selectedSection.dataSource,
              connection: e.target.value
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select connection</option>
            <option value="ds_analytics">Analytics Database</option>
            <option value="ds_users">User Database</option>
            <option value="ds_marketplace">Marketplace API</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Query
          </label>
          <textarea
            value={selectedSection.dataSource.query}
            onChange={(e) => handleSectionPropertyChange('dataSource', {
              ...selectedSection.dataSource,
              query: e.target.value
            })}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            placeholder="SELECT * FROM table_name WHERE condition"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Refresh Interval (seconds)</label>
            <input
              type="number"
              value={selectedSection.dataSource.refreshInterval || 0}
              onChange={(e) => handleSectionPropertyChange('dataSource', {
                ...selectedSection.dataSource,
                refreshInterval: parseInt(e.target.value) || 0
              })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              min="0"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Cache Timeout (seconds)</label>
            <input
              type="number"
              value={selectedSection.dataSource.cacheTimeout || 300}
              onChange={(e) => handleSectionPropertyChange('dataSource', {
                ...selectedSection.dataSource,
                cacheTimeout: parseInt(e.target.value) || 300
              })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              min="0"
            />
          </div>
        </div>

        <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
          Test Query
        </button>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Properties</h3>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-4" aria-label="Tabs">
          {[
            { id: 'template', label: 'Template', icon: '📄' },
            { id: 'section', label: 'Section', icon: '🔧' },
            { id: 'data', label: 'Data', icon: '🗄️' }
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
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'template' && renderTemplateProperties()}
        {activeTab === 'section' && renderSectionProperties()}
        {activeTab === 'data' && renderDataSourceProperties()}
      </div>
    </div>
  );
};