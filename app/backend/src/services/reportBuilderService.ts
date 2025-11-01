import { ReportTemplate, ReportSection, ReportParameter, ValidationError, ComponentDefinition, QueryResult } from '../types/reporting';
import { safeLogger } from '../utils/safeLogger';

export class ReportBuilderService {
  private templates: Map<string, ReportTemplate> = new Map();
  private dataSources: Map<string, DataSourceConnection> = new Map();
  private componentLibrary: ComponentDefinition[] = [];

  constructor() {
    this.initializeComponentLibrary();
    this.initializeDefaultDataSources();
  }

  // Template Management
  async createTemplate(template: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Promise<ReportTemplate> {
    const newTemplate: ReportTemplate = {
      ...template,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    };

    const validationErrors = this.validateTemplate(newTemplate);
    if (validationErrors.length > 0) {
      throw new Error(`Template validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
    }

    this.templates.set(newTemplate.id, newTemplate);
    return newTemplate;
  }

  async updateTemplate(id: string, updates: Partial<ReportTemplate>): Promise<ReportTemplate> {
    const existing = this.templates.get(id);
    if (!existing) {
      throw new Error(`Template with id ${id} not found`);
    }

    const updated: ReportTemplate = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
      version: existing.version + 1
    };

    const validationErrors = this.validateTemplate(updated);
    if (validationErrors.length > 0) {
      throw new Error(`Template validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
    }

    this.templates.set(id, updated);
    return updated;
  }

  async getTemplate(id: string): Promise<ReportTemplate | null> {
    return this.templates.get(id) || null;
  }

  async listTemplates(filters?: {
    category?: string;
    createdBy?: string;
    tags?: string[];
    isPublic?: boolean;
  }): Promise<ReportTemplate[]> {
    let templates = Array.from(this.templates.values());

    if (filters) {
      if (filters.category) {
        templates = templates.filter(t => t.category === filters.category);
      }
      if (filters.createdBy) {
        templates = templates.filter(t => t.createdBy === filters.createdBy);
      }
      if (filters.tags && filters.tags.length > 0) {
        templates = templates.filter(t => 
          filters.tags!.some(tag => t.tags.includes(tag))
        );
      }
      if (filters.isPublic !== undefined) {
        templates = templates.filter(t => t.isPublic === filters.isPublic);
      }
    }

    return templates.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async deleteTemplate(id: string): Promise<boolean> {
    return this.templates.delete(id);
  }

  async duplicateTemplate(id: string, newName: string): Promise<ReportTemplate> {
    const original = this.templates.get(id);
    if (!original) {
      throw new Error(`Template with id ${id} not found`);
    }

    const duplicate: ReportTemplate = {
      ...original,
      id: this.generateId(),
      name: newName,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    };

    this.templates.set(duplicate.id, duplicate);
    return duplicate;
  }

  // Section Management
  async addSection(templateId: string, section: Omit<ReportSection, 'id'>): Promise<ReportSection> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template with id ${templateId} not found`);
    }

    const newSection: ReportSection = {
      ...section,
      id: this.generateId()
    };

    template.sections.push(newSection);
    template.updatedAt = new Date();
    template.version += 1;

    this.templates.set(templateId, template);
    return newSection;
  }

  async updateSection(templateId: string, sectionId: string, updates: Partial<ReportSection>): Promise<ReportSection> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template with id ${templateId} not found`);
    }

    const sectionIndex = template.sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) {
      throw new Error(`Section with id ${sectionId} not found`);
    }

    const updatedSection: ReportSection = {
      ...template.sections[sectionIndex],
      ...updates,
      id: sectionId
    };

    template.sections[sectionIndex] = updatedSection;
    template.updatedAt = new Date();
    template.version += 1;

    this.templates.set(templateId, template);
    return updatedSection;
  }

  async deleteSection(templateId: string, sectionId: string): Promise<boolean> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template with id ${templateId} not found`);
    }

    const sectionIndex = template.sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) {
      return false;
    }

    template.sections.splice(sectionIndex, 1);
    template.updatedAt = new Date();
    template.version += 1;

    this.templates.set(templateId, template);
    return true;
  }

  // Data Source Management
  async createDataSource(dataSource: Omit<DataSourceConnection, 'id' | 'lastTested'>): Promise<DataSourceConnection> {
    const newDataSource: DataSourceConnection = {
      ...dataSource,
      id: this.generateId(),
      lastTested: new Date()
    };

    // Test connection
    const testResult = await this.testDataSourceConnection(newDataSource);
    newDataSource.status = testResult ? 'active' : 'error';

    this.dataSources.set(newDataSource.id, newDataSource);
    return newDataSource;
  }

  async getDataSources(): Promise<DataSourceConnection[]> {
    return Array.from(this.dataSources.values());
  }

  async testDataSourceConnection(dataSource: DataSourceConnection): Promise<boolean> {
    try {
      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 100));
      return Math.random() > 0.1; // 90% success rate for simulation
    } catch (error) {
      safeLogger.error('Data source connection test failed:', error);
      return false;
    }
  }

  async executeQuery(dataSourceId: string, query: string, parameters?: Record<string, any>): Promise<QueryResult> {
    const dataSource = this.dataSources.get(dataSourceId);
    if (!dataSource) {
      throw new Error(`Data source with id ${dataSourceId} not found`);
    }

    if (dataSource.status !== 'active') {
      throw new Error(`Data source ${dataSourceId} is not active`);
    }

    const startTime = Date.now();

    try {
      // Simulate query execution with mock data
      const mockData = this.generateMockQueryResult(query);
      const executionTime = Date.now() - startTime;

      return {
        data: mockData.data,
        columns: mockData.columns,
        totalRows: mockData.data.length,
        executionTime
      };
    } catch (error) {
      return {
        data: [],
        columns: [],
        totalRows: 0,
        executionTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Component Library
  getComponentLibrary(): ComponentDefinition[] {
    return this.componentLibrary;
  }

  getComponentDefinition(type: string): ComponentDefinition | null {
    return this.componentLibrary.find(c => c.type === type) || null;
  }

  // Validation
  validateTemplate(template: ReportTemplate): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!template.name || template.name.trim().length === 0) {
      errors.push({
        field: 'name',
        message: 'Template name is required',
        severity: 'error'
      });
    }

    if (!template.category || template.category.trim().length === 0) {
      errors.push({
        field: 'category',
        message: 'Template category is required',
        severity: 'error'
      });
    }

    if (template.sections.length === 0) {
      errors.push({
        field: 'sections',
        message: 'Template must have at least one section',
        severity: 'warning'
      });
    }

    // Validate sections
    template.sections.forEach(section => {
      const sectionErrors = this.validateSection(section);
      errors.push(...sectionErrors);
    });

    // Validate parameters
    template.parameters.forEach(param => {
      const paramErrors = this.validateParameter(param);
      errors.push(...paramErrors);
    });

    return errors;
  }

  validateSection(section: ReportSection): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!section.title || section.title.trim().length === 0) {
      errors.push({
        sectionId: section.id,
        field: 'title',
        message: 'Section title is required',
        severity: 'error'
      });
    }

    if (!section.dataSource.connection) {
      errors.push({
        sectionId: section.id,
        field: 'dataSource.connection',
        message: 'Data source connection is required',
        severity: 'error'
      });
    }

    if (!section.dataSource.query || section.dataSource.query.trim().length === 0) {
      errors.push({
        sectionId: section.id,
        field: 'dataSource.query',
        message: 'Data source query is required',
        severity: 'error'
      });
    }

    // Validate position
    if (section.position.width <= 0 || section.position.height <= 0) {
      errors.push({
        sectionId: section.id,
        field: 'position',
        message: 'Section must have positive width and height',
        severity: 'error'
      });
    }

    return errors;
  }

  validateParameter(parameter: ReportParameter): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!parameter.name || parameter.name.trim().length === 0) {
      errors.push({
        field: `parameter.${parameter.id}.name`,
        message: 'Parameter name is required',
        severity: 'error'
      });
    }

    if (!parameter.label || parameter.label.trim().length === 0) {
      errors.push({
        field: `parameter.${parameter.id}.label`,
        message: 'Parameter label is required',
        severity: 'error'
      });
    }

    if (parameter.type === 'select' || parameter.type === 'multiselect') {
      if (!parameter.options || parameter.options.length === 0) {
        errors.push({
          field: `parameter.${parameter.id}.options`,
          message: 'Select parameters must have options',
          severity: 'error'
        });
      }
    }

    return errors;
  }

  // Preview and Testing
  async previewTemplate(templateId: string, parameters?: Record<string, any>): Promise<any> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template with id ${templateId} not found`);
    }

    const previewData = {
      template,
      sections: [],
      parameters: parameters || {},
      generatedAt: new Date()
    };

    // Generate preview data for each section
    for (const section of template.sections) {
      try {
        const queryResult = await this.executeQuery(
          section.dataSource.connection,
          section.dataSource.query,
          parameters
        );

        previewData.sections.push({
          sectionId: section.id,
          data: queryResult.data.slice(0, 10), // Limit preview data
          columns: queryResult.columns,
          summary: {
            totalRows: queryResult.totalRows,
            aggregations: {},
            trends: []
          }
        });
      } catch (error) {
        previewData.sections.push({
          sectionId: section.id,
          data: [],
          columns: [],
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return previewData;
  }

  // Private helper methods
  private generateId(): string {
    return `rpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeComponentLibrary(): void {
    this.componentLibrary = [
      {
        type: 'chart',
        icon: '📊',
        label: 'Chart',
        description: 'Interactive charts and graphs',
        defaultConfig: {
          chartType: 'line'
        },
        requiredFields: ['dataSource', 'chartType']
      },
      {
        type: 'table',
        icon: '📋',
        label: 'Table',
        description: 'Data tables with sorting and filtering',
        defaultConfig: {
          columns: []
        },
        requiredFields: ['dataSource', 'columns']
      },
      {
        type: 'metric',
        icon: '🔢',
        label: 'Metric',
        description: 'Key performance indicators',
        defaultConfig: {
          aggregation: 'sum'
        },
        requiredFields: ['dataSource', 'aggregation']
      },
      {
        type: 'text',
        icon: '📝',
        label: 'Text',
        description: 'Rich text content',
        defaultConfig: {},
        requiredFields: []
      },
      {
        type: 'image',
        icon: '🖼️',
        label: 'Image',
        description: 'Images and media content',
        defaultConfig: {},
        requiredFields: []
      }
    ];
  }

  private initializeDefaultDataSources(): void {
    const defaultDataSources: DataSourceConnection[] = [
      {
        id: 'ds_analytics',
        name: 'Analytics Database',
        type: 'postgresql',
        config: {
          host: 'localhost',
          port: 5432,
          database: 'analytics',
          username: 'admin',
          ssl: true
        },
        status: 'active',
        lastTested: new Date(),
        createdBy: 'system'
      },
      {
        id: 'ds_users',
        name: 'User Database',
        type: 'postgresql',
        config: {
          host: 'localhost',
          port: 5432,
          database: 'users',
          username: 'admin',
          ssl: true
        },
        status: 'active',
        lastTested: new Date(),
        createdBy: 'system'
      },
      {
        id: 'ds_marketplace',
        name: 'Marketplace API',
        type: 'api',
        config: {
          url: 'https://api.marketplace.com',
          apiKey: 'mock_api_key',
          timeout: 30000
        },
        status: 'active',
        lastTested: new Date(),
        createdBy: 'system'
      }
    ];

    defaultDataSources.forEach(ds => {
      this.dataSources.set(ds.id, ds);
    });
  }

  private generateMockQueryResult(query: string): { data: any[]; columns: any[] } {
    // Generate mock data based on query patterns
    const columns = [
      { key: 'id', label: 'ID', type: 'number' },
      { key: 'name', label: 'Name', type: 'string' },
      { key: 'value', label: 'Value', type: 'number' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'string' }
    ];

    const data = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      name: `Item ${i + 1}`,
      value: Math.floor(Math.random() * 1000),
      date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      status: ['active', 'inactive', 'pending'][Math.floor(Math.random() * 3)]
    }));

    return { data, columns };
  }
}

export const reportBuilderService = new ReportBuilderService();
