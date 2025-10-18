import { 
  ReportTemplate, 
  ReportSection, 
  DataSourceConnection, 
  ComponentDefinition, 
  QueryResult,
  ValidationError
} from '../types/reporting';

class ReportBuilderService {
  private baseUrl = '/api/admin/report-builder';

  // Template methods
  async createTemplate(template: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Promise<ReportTemplate> {
    const response = await fetch(`${this.baseUrl}/templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(template),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create template');
    }

    const result = await response.json();
    return result.data;
  }

  async getTemplate(id: string): Promise<ReportTemplate> {
    const response = await fetch(`${this.baseUrl}/templates/${id}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get template');
    }

    const result = await response.json();
    return result.data;
  }

  async updateTemplate(id: string, updates: Partial<ReportTemplate>): Promise<ReportTemplate> {
    const response = await fetch(`${this.baseUrl}/templates/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update template');
    }

    const result = await response.json();
    return result.data;
  }

  async listTemplates(filters?: {
    category?: string;
    createdBy?: string;
    tags?: string[];
    isPublic?: boolean;
  }): Promise<ReportTemplate[]> {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.category) params.append('category', filters.category);
      if (filters.createdBy) params.append('createdBy', filters.createdBy);
      if (filters.tags) params.append('tags', filters.tags.join(','));
      if (filters.isPublic !== undefined) params.append('isPublic', filters.isPublic.toString());
    }

    const response = await fetch(`${this.baseUrl}/templates?${params}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to list templates');
    }

    const result = await response.json();
    return result.data;
  }

  async deleteTemplate(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/templates/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete template');
    }
  }

  async duplicateTemplate(id: string, newName: string): Promise<ReportTemplate> {
    const response = await fetch(`${this.baseUrl}/templates/${id}/duplicate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: newName }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to duplicate template');
    }

    const result = await response.json();
    return result.data;
  }

  // Section methods
  async addSection(templateId: string, section: Omit<ReportSection, 'id'>): Promise<ReportSection> {
    const response = await fetch(`${this.baseUrl}/templates/${templateId}/sections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(section),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add section');
    }

    const result = await response.json();
    return result.data;
  }

  async updateSection(templateId: string, sectionId: string, updates: Partial<ReportSection>): Promise<ReportSection> {
    const response = await fetch(`${this.baseUrl}/templates/${templateId}/sections/${sectionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update section');
    }

    const result = await response.json();
    return result.data;
  }

  async deleteSection(templateId: string, sectionId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/templates/${templateId}/sections/${sectionId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete section');
    }
  }

  // Data source methods
  async createDataSource(dataSource: Omit<DataSourceConnection, 'id' | 'lastTested'>): Promise<DataSourceConnection> {
    const response = await fetch(`${this.baseUrl}/data-sources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dataSource),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create data source');
    }

    const result = await response.json();
    return result.data;
  }

  async getDataSources(): Promise<DataSourceConnection[]> {
    const response = await fetch(`${this.baseUrl}/data-sources`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get data sources');
    }

    const result = await response.json();
    return result.data;
  }

  async testDataSource(dataSource: Partial<DataSourceConnection>): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/data-sources/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dataSource),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to test data source');
    }

    const result = await response.json();
    return result.data.isValid;
  }

  async executeQuery(dataSourceId: string, query: string, parameters?: Record<string, any>): Promise<QueryResult> {
    const response = await fetch(`${this.baseUrl}/data-sources/${dataSourceId}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, parameters }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to execute query');
    }

    const result = await response.json();
    return result.data;
  }

  // Component library methods
  async getComponentLibrary(): Promise<ComponentDefinition[]> {
    const response = await fetch(`${this.baseUrl}/components`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get component library');
    }

    const result = await response.json();
    return result.data;
  }

  async getComponentDefinition(type: string): Promise<ComponentDefinition> {
    const response = await fetch(`${this.baseUrl}/components/${type}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get component definition');
    }

    const result = await response.json();
    return result.data;
  }

  // Preview and validation methods
  async previewTemplate(id: string, parameters?: Record<string, any>): Promise<any> {
    const response = await fetch(`${this.baseUrl}/templates/${id}/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ parameters: parameters || {} }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to preview template');
    }

    const result = await response.json();
    return result.data;
  }

  async validateTemplate(template: Partial<ReportTemplate>): Promise<{ isValid: boolean; errors: ValidationError[] }> {
    const response = await fetch(`${this.baseUrl}/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(template),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to validate template');
    }

    const result = await response.json();
    return result.data;
  }

  // Utility methods
  generateDefaultSection(type: string, position: { x: number; y: number }): Partial<ReportSection> {
    const baseSection = {
      type: type as 'chart' | 'table' | 'metric' | 'text' | 'image',
      title: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      position: {
        x: position.x,
        y: position.y,
        width: 400,
        height: 300
      },
      config: {},
      dataSource: {
        type: 'database' as const,
        connection: '',
        query: ''
      },
      styling: {
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        borderRadius: 8,
        padding: 16
      }
    };

    // Add type-specific defaults
    switch (type) {
      case 'chart':
        baseSection.config = { chartType: 'line' };
        break;
      case 'table':
        baseSection.config = { columns: [] };
        break;
      case 'metric':
        baseSection.config = { aggregation: 'sum' };
        baseSection.position.height = 150;
        break;
      case 'text':
        baseSection.position.height = 200;
        break;
      case 'image':
        baseSection.position.height = 250;
        break;
    }

    return baseSection;
  }

  generateDefaultTemplate(): Partial<ReportTemplate> {
    return {
      name: 'New Report',
      description: '',
      category: 'general',
      sections: [],
      parameters: [],
      scheduling: {
        enabled: false,
        frequency: 'daily',
        timezone: 'UTC',
        recipients: [],
        format: 'pdf'
      },
      permissions: {
        view: [],
        edit: [],
        delete: [],
        schedule: [],
        share: []
      },
      isPublic: false,
      tags: []
    };
  }
}

export const reportBuilderService = new ReportBuilderService();