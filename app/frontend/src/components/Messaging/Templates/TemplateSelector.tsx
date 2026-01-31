/**
 * Template Selector Component
 * Allows users to browse and insert pre-written message templates
 */

import React, { useState, useEffect } from 'react';
import { useMessageTemplates } from '@/hooks/useMessageTemplates';
import { MessageTemplate } from '@/services/messageTemplateService';
import { ChevronDown, Copy, Edit2, Trash2, Plus, Search } from 'lucide-react';

interface TemplateSelectorProps {
  onSelectTemplate: (content: string) => void;
  onManageTemplates?: () => void;
}

export function TemplateSelector({ onSelectTemplate, onManageTemplates }: TemplateSelectorProps) {
  const { templates, loading, error } = useMessageTemplates();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Get unique categories
  const categories = Array.from(new Set(templates.filter(t => t.category).map(t => t.category || '')));

  // Filter templates by search and category
  const filteredTemplates = templates.filter(t => {
    if (!t.isActive) return false;
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSelectTemplate = (template: MessageTemplate) => {
    onSelectTemplate(template.content);
    setIsOpen(false);
    // Increment usage count
    messageTemplateService.incrementUsageCount(template.id);
  };

  if (!templates.length) {
    return null;
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 bg-gray-50 dark:bg-gray-700 rounded-lg transition-colors"
        title="Insert template"
      >
        <Copy className="h-4 w-4" />
        Templates
        <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          {/* Search and Filter */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="relative mb-2">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Category Filter */}
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    !selectedCategory
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      selectedCategory === cat
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Template List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-sm text-gray-500">Loading...</div>
            ) : error ? (
              <div className="p-4 text-center text-sm text-red-500">{error}</div>
            ) : filteredTemplates.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">No templates found</div>
            ) : (
              filteredTemplates.map(template => (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className="w-full p-3 text-left border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                >
                  <div className="font-medium text-gray-900 dark:text-white mb-1">
                    {template.name}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400 line-clamp-2">
                    {template.content}
                  </div>
                  {template.tags && template.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {template.tags.map(tag => (
                        <span
                          key={tag}
                          className="inline-block text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    Used {template.usageCount} times
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          {onManageTemplates && (
            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  onManageTemplates();
                  setIsOpen(false);
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-1.5 text-sm text-primary-600 dark:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <Plus className="h-4 w-4" />
                Manage Templates
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Import at the top of the file
import { messageTemplateService } from '@/services/messageTemplateService';
