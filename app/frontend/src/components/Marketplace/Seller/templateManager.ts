import { SpecificationData } from './SpecificationEditor';
import { SizeConfig } from './SizeConfigurationSystem';

export interface SpecificationTemplate {
  id: string;
  name: string;
  category: string;
  description?: string;
  specs: SpecificationData;
  sizeConfig: SizeConfig;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'linkdao_specification_templates';

/**
 * Template Manager for saving and loading specification templates
 */
export class TemplateManager {
  private static instance: TemplateManager;
  private templates: Map<string, SpecificationTemplate> = new Map();

  private constructor() {
    this.loadFromStorage();
  }

  static getInstance(): TemplateManager {
    if (!TemplateManager.instance) {
      TemplateManager.instance = new TemplateManager();
    }
    return TemplateManager.instance;
  }

  /**
   * Load templates from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.templates = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
      this.templates = new Map();
    }
  }

  /**
   * Save templates to localStorage
   */
  private saveToStorage(): void {
    try {
      const data = Object.fromEntries(this.templates);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save templates:', error);
    }
  }

  /**
   * Get all templates
   */
  getAllTemplates(): SpecificationTemplate[] {
    return Array.from(this.templates.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: string): SpecificationTemplate[] {
    return this.getAllTemplates().filter(t => t.category === category);
  }

  /**
   * Get a specific template by ID
   */
  getTemplate(id: string): SpecificationTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Save a new template
   */
  saveTemplate(
    name: string,
    category: string,
    description: string | undefined,
    specs: SpecificationData,
    sizeConfig: SizeConfig
  ): SpecificationTemplate {
    const id = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const template: SpecificationTemplate = {
      id,
      name,
      category,
      description,
      specs,
      sizeConfig,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.templates.set(id, template);
    this.saveToStorage();
    return template;
  }

  /**
   * Update an existing template
   */
  updateTemplate(
    id: string,
    updates: Partial<Omit<SpecificationTemplate, 'id' | 'createdAt'>>
  ): SpecificationTemplate | null {
    const existing = this.templates.get(id);
    if (!existing) return null;

    const updated: SpecificationTemplate = {
      ...existing,
      ...updates,
      updatedAt: Date.now()
    };

    this.templates.set(id, updated);
    this.saveToStorage();
    return updated;
  }

  /**
   * Delete a template
   */
  deleteTemplate(id: string): boolean {
    const deleted = this.templates.delete(id);
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }

  /**
   * Duplicate a template
   */
  duplicateTemplate(id: string, newName: string): SpecificationTemplate | null {
    const original = this.templates.get(id);
    if (!original) return null;

    return this.saveTemplate(
      newName,
      original.category,
      original.description,
      JSON.parse(JSON.stringify(original.specs)),
      JSON.parse(JSON.stringify(original.sizeConfig))
    );
  }

  /**
   * Search templates by name or description
   */
  searchTemplates(query: string): SpecificationTemplate[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllTemplates().filter(t =>
      t.name.toLowerCase().includes(lowerQuery) ||
      (t.description && t.description.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get recently used templates (last 7 days)
   */
  getRecentTemplates(): SpecificationTemplate[] {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    return this.getAllTemplates().filter(t => t.updatedAt > sevenDaysAgo);
  }

  /**
   * Export templates to JSON
   */
  exportTemplates(): string {
    const data = Array.from(this.templates.values());
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import templates from JSON
   */
  importTemplates(jsonData: string): { imported: number; errors: string[] } {
    const errors: string[] = [];
    let imported = 0;

    try {
      const data = JSON.parse(jsonData);
      if (!Array.isArray(data)) {
        throw new Error('Invalid format: expected array');
      }

      data.forEach((item, index) => {
        try {
          if (!item.id || !item.name || !item.category || !item.specs || !item.sizeConfig) {
            throw new Error(`Missing required fields`);
          }

          this.templates.set(item.id, {
            ...item,
            updatedAt: Date.now()
          });
          imported++;
        } catch (error) {
          errors.push(`Template ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      });

      if (imported > 0) {
        this.saveToStorage();
      }
    } catch (error) {
      errors.push(`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { imported, errors };
  }

  /**
   * Clear all templates
   */
  clearAllTemplates(): void {
    this.templates.clear();
    this.saveToStorage();
  }

  /**
   * Get template statistics
   */
  getStats(): { total: number; byCategory: Record<string, number> } {
    const templates = this.getAllTemplates();
    const byCategory: Record<string, number> = {};

    templates.forEach(t => {
      byCategory[t.category] = (byCategory[t.category] || 0) + 1;
    });

    return {
      total: templates.length,
      byCategory
    };
  }
}

export const templateManager = TemplateManager.getInstance();
export default TemplateManager;