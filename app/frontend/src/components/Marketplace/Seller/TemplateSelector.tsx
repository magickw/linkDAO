import React, { useState, useEffect } from 'react';
import { Save, Copy, Trash2, Download, Upload, Search, Clock, Folder } from 'lucide-react';
import { Button } from '@/design-system/components/Button';
import { SpecificationData } from './SpecificationEditor';
import { SizeConfig } from './SizeConfigurationSystem';
import { templateManager, SpecificationTemplate } from './templateManager';

interface TemplateSelectorProps {
  category: string;
  currentSpecs: SpecificationData;
  currentSizeConfig: SizeConfig;
  onLoadTemplate: (template: SpecificationTemplate) => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  category,
  currentSpecs,
  currentSizeConfig,
  onLoadTemplate
}) => {
  const [templates, setTemplates] = useState<SpecificationTemplate[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showRecentOnly, setShowRecentOnly] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, [category]);

  const loadTemplates = () => {
    const categoryTemplates = templateManager.getTemplatesByCategory(category);
    setTemplates(categoryTemplates);
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) return;

    templateManager.saveTemplate(
      templateName,
      category,
      templateDescription || undefined,
      currentSpecs,
      currentSizeConfig
    );

    setTemplateName('');
    setTemplateDescription('');
    setShowSaveDialog(false);
    loadTemplates();
  };

  const handleDuplicateTemplate = (template: SpecificationTemplate) => {
    const newName = `${template.name} (Copy)`;
    templateManager.duplicateTemplate(template.id, newName);
    loadTemplates();
  };

  const handleDeleteTemplate = (id: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      templateManager.deleteTemplate(id);
      loadTemplates();
    }
  };

  const handleExportTemplates = () => {
    const jsonData = templateManager.exportTemplates();
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `linkdao-templates-${category}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportTemplates = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const jsonData = e.target?.result as string;
      const result = templateManager.importTemplates(jsonData);
      
      if (result.imported > 0) {
        alert(`Successfully imported ${result.imported} template(s)`);
        loadTemplates();
      }
      
      if (result.errors.length > 0) {
        alert(`Errors:\n${result.errors.join('\n')}`);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = !searchQuery || 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesRecent = !showRecentOnly || 
      (Date.now() - t.updatedAt) < (7 * 24 * 60 * 60 * 1000);
    
    return matchesSearch && matchesRecent;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Folder className="w-5 h-5 text-indigo-400" />
          <h3 className="text-lg font-semibold text-white">Specification Templates</h3>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportTemplates}
            className="border-white/20 text-white/80"
          >
            <Download size={16} className="mr-2" />
            Export
          </Button>
          <label className="cursor-pointer">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-white/20 text-white/80"
            >
              <Upload size={16} className="mr-2" />
              Import
            </Button>
            <input
              type="file"
              accept=".json"
              onChange={handleImportTemplates}
              className="hidden"
            />
          </label>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setShowSaveDialog(true)}
          >
            <Save size={16} className="mr-2" />
            Save as Template
          </Button>
        </div>
      </div>

      {/* Save Template Dialog */}
      {showSaveDialog && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/90 mb-2">Template Name</label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g., Standard T-Shirt Specs"
              className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/90 mb-2">Description (Optional)</label>
            <textarea
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              placeholder="Brief description of when to use this template..."
              rows={2}
              className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowSaveDialog(false);
                setTemplateName('');
                setTemplateDescription('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSaveTemplate}
              disabled={!templateName.trim()}
            >
              Save Template
            </Button>
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full bg-white/10 border border-white/20 rounded-md pl-10 pr-3 py-2 text-white focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowRecentOnly(!showRecentOnly)}
          className={`px-3 py-2 rounded-md text-sm transition-colors ${
            showRecentOnly
              ? 'bg-indigo-600 text-white'
              : 'bg-white/10 text-white/70 hover:bg-white/20'
          }`}
        >
          <Clock size={16} className="mr-1" />
          Recent
        </button>
      </div>

      {/* Template List */}
      <div className="space-y-2">
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-8 text-white/50">
            <Folder className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No templates found</p>
            <p className="text-xs mt-1">Save your current specifications as a template to get started</p>
          </div>
        ) : (
          filteredTemplates.map(template => (
            <div
              key={template.id}
              className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-white mb-1">{template.name}</h4>
                  {template.description && (
                    <p className="text-xs text-white/60 mb-2">{template.description}</p>
                  )}
                  <p className="text-xs text-white/40">
                    Updated {new Date(template.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onLoadTemplate(template)}
                    className="border-white/20 text-white/80"
                  >
                    Load
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDuplicateTemplate(template)}
                    className="border-white/20 text-white/80"
                  >
                    <Copy size={16} />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="border-white/20 text-red-400 hover:text-red-300"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TemplateSelector;