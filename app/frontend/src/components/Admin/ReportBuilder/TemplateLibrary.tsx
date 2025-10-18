import React, { useState, useEffect } from 'react';
import { ReportTemplate } from '../../../types/reporting';

interface TemplateLibraryProps {
  onSelectTemplate?: (template: ReportTemplate) => void;
  onCreateNew?: () => void;
}

interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  templates: string[];
}

interface SearchFilters {
  text: string;
  category: string;
  tags: string[];
  sortBy: 'name' | 'created' | 'updated' | 'usage' | 'rating';
  sortOrder: 'asc' | 'desc';
}

export const TemplateLibrary: React.FC<TemplateLibraryProps> = ({
  onSelectTemplate,
  onCreateNew
}) => {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({
    text: '',
    category: '',
    tags: [],
    sortBy: 'updated',
    sortOrder: 'desc'
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    loadCategories();
    searchTemplates();
  }, []);

  useEffect(() => {
    searchTemplates();
  }, [filters, selectedCategory]);

  const loadCategories = async () => {
    try {
      // Mock categories data
      const mockCategories: TemplateCategory[] = [
        {
          id: 'analytics',
          name: 'Analytics',
          description: 'User behavior and performance analytics',
          icon: '📊',
          templates: []
        },
        {
          id: 'financial',
          name: 'Financial',
          description: 'Revenue and financial reports',
          icon: '💰',
          templates: []
        },
        {
          id: 'operational',
          name: 'Operational',
          description: 'System health and operations',
          icon: '⚙️',
          templates: []
        },
        {
          id: 'marketing',
          name: 'Marketing',
          description: 'Campaign and marketing analytics',
          icon: '📈',
          templates: []
        },
        {
          id: 'executive',
          name: 'Executive',
          description: 'High-level executive summaries',
          icon: '👔',
          templates: []
        }
      ];
      setCategories(mockCategories);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const searchTemplates = async () => {
    try {
      setIsLoading(true);
      
      // Mock templates data
      const mockTemplates: ReportTemplate[] = [
        {
          id: 'tpl_1',
          name: 'User Analytics Dashboard',
          description: 'Comprehensive user behavior and engagement analytics with cohort analysis',
          category: 'analytics',
          sections: [],
          parameters: [],
          scheduling: { enabled: false, frequency: 'daily', timezone: 'UTC', recipients: [], format: 'pdf' },
          permissions: { view: [], edit: [], delete: [], schedule: [], share: [] },
          createdBy: 'admin',
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-20'),
          version: 3,
          isPublic: true,
          tags: ['analytics', 'users', 'cohort', 'engagement']
        },
        {
          id: 'tpl_2',
          name: 'Monthly Revenue Report',
          description: 'Monthly financial performance with revenue breakdown and trends',
          category: 'financial',
          sections: [],
          parameters: [],
          scheduling: { enabled: false, frequency: 'daily', timezone: 'UTC', recipients: [], format: 'pdf' },
          permissions: { view: [], edit: [], delete: [], schedule: [], share: [] },
          createdBy: 'finance_team',
          createdAt: new Date('2024-01-10'),
          updatedAt: new Date('2024-01-18'),
          version: 2,
          isPublic: true,
          tags: ['financial', 'revenue', 'monthly', 'trends']
        },
        {
          id: 'tpl_3',
          name: 'System Health Monitor',
          description: 'Real-time system performance and health monitoring dashboard',
          category: 'operational',
          sections: [],
          parameters: [],
          scheduling: { enabled: false, frequency: 'daily', timezone: 'UTC', recipients: [], format: 'pdf' },
          permissions: { view: [], edit: [], delete: [], schedule: [], share: [] },
          createdBy: 'ops_team',
          createdAt: new Date('2024-01-12'),
          updatedAt: new Date('2024-01-22'),
          version: 1,
          isPublic: true,
          tags: ['operational', 'health', 'monitoring', 'realtime']
        }
      ];

      // Apply filters
      let filteredTemplates = mockTemplates;

      if (filters.text) {
        const searchText = filters.text.toLowerCase();
        filteredTemplates = filteredTemplates.filter(t =>
          t.name.toLowerCase().includes(searchText) ||
          t.description?.toLowerCase().includes(searchText) ||
          t.tags.some(tag => tag.toLowerCase().includes(searchText))
        );
      }

      if (selectedCategory) {
        filteredTemplates = filteredTemplates.filter(t => t.category === selectedCategory);
      }

      // Apply sorting
      filteredTemplates.sort((a, b) => {
        let comparison = 0;
        
        switch (filters.sortBy) {
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'created':
            comparison = a.createdAt.getTime() - b.createdAt.getTime();
            break;
          case 'updated':
            comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
            break;
          case 'usage':
            // Mock usage data
            comparison = 0;
            break;
          case 'rating':
            // Mock rating data
            comparison = 0;
            break;
        }

        return filters.sortOrder === 'desc' ? -comparison : comparison;
      });

      setTemplates(filteredTemplates);
    } catch (error) {
      console.error('Failed to search templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (field: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleTemplateSelect = (template: ReportTemplate) => {
    onSelectTemplate?.(template);
  };

  const renderTemplateCard = (template: ReportTemplate) => {
    const category = categories.find(c => c.id === template.category);
    
    return (
      <div
        key={template.id}
        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200 cursor-pointer"
        onClick={() => handleTemplateSelect(template)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{category?.icon || '📄'}</span>
            <div>
              <h3 className="font-medium text-gray-900 text-sm">{template.name}</h3>
              <p className="text-xs text-gray-500">v{template.version}</p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <div className="flex items-center text-yellow-400">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-xs text-gray-600 ml-1">4.5</span>
            </div>
            <span className="text-xs text-gray-500">•</span>
            <span className="text-xs text-gray-500">142 uses</span>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{template.description}</p>

        <div className="flex flex-wrap gap-1 mb-3">
          {template.tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
            >
              {tag}
            </span>
          ))}
          {template.tags.length > 3 && (
            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
              +{template.tags.length - 3}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>By {template.createdBy}</span>
          <span>{template.updatedAt.toLocaleDateString()}</span>
        </div>
      </div>
    );
  };

  const renderTemplateList = (template: ReportTemplate) => {
    const category = categories.find(c => c.id === template.category);
    
    return (
      <div
        key={template.id}
        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow duration-200 cursor-pointer"
        onClick={() => handleTemplateSelect(template)}
      >
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            <span className="text-2xl">{category?.icon || '📄'}</span>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900 truncate">{template.name}</h3>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div className="flex items-center text-yellow-400">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="ml-1">4.5</span>
                </div>
                <span>•</span>
                <span>142 uses</span>
                <span>•</span>
                <span>v{template.version}</span>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 mt-1 line-clamp-1">{template.description}</p>
            
            <div className="flex items-center justify-between mt-2">
              <div className="flex flex-wrap gap-1">
                {template.tags.slice(0, 4).map(tag => (
                  <span
                    key={tag}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              
              <div className="text-xs text-gray-500">
                By {template.createdBy} • {template.updatedAt.toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Template Library</h1>
            <p className="text-gray-600 mt-1">Browse and select from pre-built report templates</p>
          </div>
          
          <button
            onClick={onCreateNew}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Create New</span>
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={filters.text}
                onChange={(e) => handleFilterChange('text', e.target.value)}
                placeholder="Search templates..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <select
            value={filters.sortBy}
            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="updated">Recently Updated</option>
            <option value="created">Recently Created</option>
            <option value="name">Name</option>
            <option value="usage">Most Used</option>
            <option value="rating">Highest Rated</option>
          </select>

          <div className="flex items-center space-x-1 bg-gray-100 rounded-md p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Categories Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Categories</h3>
            
            <div className="space-y-1">
              <button
                onClick={() => setSelectedCategory('')}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors duration-200 ${
                  selectedCategory === '' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                All Templates
              </button>
              
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors duration-200 flex items-center space-x-2 ${
                    selectedCategory === category.id 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span>{category.icon}</span>
                  <span>{category.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Templates Grid/List */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading templates...</span>
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium mb-2">No templates found</h3>
              <p className="text-sm text-center">
                {filters.text || selectedCategory 
                  ? 'Try adjusting your search criteria or filters'
                  : 'Get started by creating your first template'
                }
              </p>
            </div>
          ) : (
            <div className={
              viewMode === 'grid' 
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                : 'space-y-3'
            }>
              {templates.map(template => 
                viewMode === 'grid' 
                  ? renderTemplateCard(template)
                  : renderTemplateList(template)
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};