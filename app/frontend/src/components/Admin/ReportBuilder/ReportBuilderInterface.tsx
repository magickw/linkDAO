import React, { useState, useEffect, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ReportTemplate, ReportSection, ComponentDefinition, ValidationError } from '../../../types/reporting';
import { reportBuilderService } from '../../../services/reportBuilderService';
import { ComponentLibrary } from './ComponentLibrary';
import { ReportCanvas } from './ReportCanvas';
import { PropertyPanel } from './PropertyPanel';
import { ReportToolbar } from './ReportToolbar';
import { PreviewModal } from './PreviewModal';
import { ValidationPanel } from './ValidationPanel';

interface ReportBuilderInterfaceProps {
  templateId?: string;
  onSave?: (template: ReportTemplate) => void;
  onCancel?: () => void;
}

export const ReportBuilderInterface: React.FC<ReportBuilderInterfaceProps> = ({
  templateId,
  onSave,
  onCancel
}) => {
  const [template, setTemplate] = useState<Partial<ReportTemplate>>(
    reportBuilderService.generateDefaultTemplate()
  );
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [componentLibrary, setComponentLibrary] = useState<ComponentDefinition[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isValidationOpen, setIsValidationOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load template if editing existing one
  useEffect(() => {
    if (templateId) {
      loadTemplate(templateId);
    }
    loadComponentLibrary();
  }, [templateId]);

  const loadTemplate = async (id: string) => {
    try {
      setIsLoading(true);
      const loadedTemplate = await reportBuilderService.getTemplate(id);
      setTemplate(loadedTemplate);
      setIsDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load template');
    } finally {
      setIsLoading(false);
    }
  };

  const loadComponentLibrary = async () => {
    try {
      const components = await reportBuilderService.getComponentLibrary();
      setComponentLibrary(components);
    } catch (err) {
      console.error('Failed to load component library:', err);
    }
  };

  const handleTemplateChange = useCallback((updates: Partial<ReportTemplate>) => {
    setTemplate(prev => ({ ...prev, ...updates }));
    setIsDirty(true);
  }, []);

  const handleSectionAdd = useCallback((componentType: string, position: { x: number; y: number }) => {
    const newSection = reportBuilderService.generateDefaultSection(componentType, position);
    const sections = [...(template.sections || []), newSection as ReportSection];
    handleTemplateChange({ sections });
  }, [template.sections, handleTemplateChange]);

  const handleSectionUpdate = useCallback((sectionId: string, updates: Partial<ReportSection>) => {
    const sections = (template.sections || []).map(section =>
      section.id === sectionId ? { ...section, ...updates } : section
    );
    handleTemplateChange({ sections });
  }, [template.sections, handleTemplateChange]);

  const handleSectionDelete = useCallback((sectionId: string) => {
    const sections = (template.sections || []).filter(section => section.id !== sectionId);
    handleTemplateChange({ sections });
    if (selectedSection === sectionId) {
      setSelectedSection(null);
    }
  }, [template.sections, selectedSection, handleTemplateChange]);

  const handleSectionSelect = useCallback((sectionId: string | null) => {
    setSelectedSection(sectionId);
  }, []);

  const handleSave = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate template before saving
      const validation = await reportBuilderService.validateTemplate(template);
      setValidationErrors(validation.errors);

      if (!validation.isValid) {
        setIsValidationOpen(true);
        return;
      }

      let savedTemplate: ReportTemplate;
      if (templateId) {
        savedTemplate = await reportBuilderService.updateTemplate(templateId, template);
      } else {
        savedTemplate = await reportBuilderService.createTemplate(template as Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt' | 'version'>);
      }

      setTemplate(savedTemplate);
      setIsDirty(false);
      onSave?.(savedTemplate);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreview = async () => {
    try {
      setIsPreviewOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open preview');
    }
  };

  const handleValidate = async () => {
    try {
      const validation = await reportBuilderService.validateTemplate(template);
      setValidationErrors(validation.errors);
      setIsValidationOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate template');
    }
  };

  const selectedSectionData = selectedSection 
    ? template.sections?.find(s => s.id === selectedSection) 
    : null;

  if (isLoading && !template.name) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading report builder...</span>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Toolbar */}
        <ReportToolbar
          template={template}
          isDirty={isDirty}
          isLoading={isLoading}
          onSave={handleSave}
          onPreview={handlePreview}
          onValidate={handleValidate}
          onCancel={onCancel}
          onTemplateChange={handleTemplateChange}
        />

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-600"
                >
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Component Library Sidebar */}
          <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
            <ComponentLibrary
              components={componentLibrary}
              onComponentDrag={(component) => {
                // Handle component drag start if needed
              }}
            />
          </div>

          {/* Canvas Area */}
          <div className="flex-1 flex flex-col">
            <ReportCanvas
              template={template}
              selectedSection={selectedSection}
              onSectionAdd={handleSectionAdd}
              onSectionUpdate={handleSectionUpdate}
              onSectionDelete={handleSectionDelete}
              onSectionSelect={handleSectionSelect}
            />
          </div>

          {/* Property Panel Sidebar */}
          <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
            <PropertyPanel
              template={template}
              selectedSection={selectedSectionData}
              onTemplateChange={handleTemplateChange}
              onSectionChange={(updates) => {
                if (selectedSection) {
                  handleSectionUpdate(selectedSection, updates);
                }
              }}
            />
          </div>
        </div>

        {/* Preview Modal */}
        {isPreviewOpen && (
          <PreviewModal
            template={template}
            onClose={() => setIsPreviewOpen(false)}
          />
        )}

        {/* Validation Panel */}
        {isValidationOpen && (
          <ValidationPanel
            errors={validationErrors}
            onClose={() => setIsValidationOpen(false)}
            onSectionSelect={handleSectionSelect}
          />
        )}
      </div>
    </DndProvider>
  );
};