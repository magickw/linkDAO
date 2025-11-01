import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { reportBuilderService } from '../services/reportBuilderService';
import { ReportTemplate, ReportSection, DataSourceConnection } from '../types/reporting';

export class ReportBuilderController {
  // Template endpoints
  async createTemplate(req: Request, res: Response): Promise<void> {
    try {
      const templateData = req.body;
      const template = await reportBuilderService.createTemplate(templateData);
      res.status(201).json({
        success: true,
        data: template,
        message: 'Template created successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create template'
      });
    }
  }

  async getTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const template = await reportBuilderService.getTemplate(id);
      
      if (!template) {
        res.status(404).json({
          success: false,
          error: 'Template not found'
        });
        return;
      }

      res.json({
        success: true,
        data: template
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get template'
      });
    }
  }

  async updateTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;
      const template = await reportBuilderService.updateTemplate(id, updates);
      
      res.json({
        success: true,
        data: template,
        message: 'Template updated successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update template'
      });
    }
  }

  async listTemplates(req: Request, res: Response): Promise<void> {
    try {
      const filters = {
        category: req.query.category as string,
        createdBy: req.query.createdBy as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        isPublic: req.query.isPublic ? req.query.isPublic === 'true' : undefined
      };

      const templates = await reportBuilderService.listTemplates(filters);
      
      res.json({
        success: true,
        data: templates,
        total: templates.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list templates'
      });
    }
  }

  async deleteTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await reportBuilderService.deleteTemplate(id);
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Template not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Template deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete template'
      });
    }
  }

  async duplicateTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name } = req.body;
      
      if (!name) {
        res.status(400).json({
          success: false,
          error: 'New template name is required'
        });
        return;
      }

      const duplicate = await reportBuilderService.duplicateTemplate(id, name);
      
      res.status(201).json({
        success: true,
        data: duplicate,
        message: 'Template duplicated successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to duplicate template'
      });
    }
  }

  // Section endpoints
  async addSection(req: Request, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;
      const sectionData = req.body;
      const section = await reportBuilderService.addSection(templateId, sectionData);
      
      res.status(201).json({
        success: true,
        data: section,
        message: 'Section added successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add section'
      });
    }
  }

  async updateSection(req: Request, res: Response): Promise<void> {
    try {
      const { templateId, sectionId } = req.params;
      const updates = req.body;
      const section = await reportBuilderService.updateSection(templateId, sectionId, updates);
      
      res.json({
        success: true,
        data: section,
        message: 'Section updated successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update section'
      });
    }
  }

  async deleteSection(req: Request, res: Response): Promise<void> {
    try {
      const { templateId, sectionId } = req.params;
      const deleted = await reportBuilderService.deleteSection(templateId, sectionId);
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Section not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Section deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete section'
      });
    }
  }

  // Data source endpoints
  async createDataSource(req: Request, res: Response): Promise<void> {
    try {
      const dataSourceData = req.body;
      const dataSource = await reportBuilderService.createDataSource(dataSourceData);
      
      res.status(201).json({
        success: true,
        data: dataSource,
        message: 'Data source created successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create data source'
      });
    }
  }

  async getDataSources(req: Request, res: Response): Promise<void> {
    try {
      const dataSources = await reportBuilderService.getDataSources();
      
      res.json({
        success: true,
        data: dataSources
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get data sources'
      });
    }
  }

  async testDataSource(req: Request, res: Response): Promise<void> {
    try {
      const dataSourceData = req.body;
      const isValid = await reportBuilderService.testDataSourceConnection(dataSourceData);
      
      res.json({
        success: true,
        data: { isValid },
        message: isValid ? 'Connection successful' : 'Connection failed'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to test data source'
      });
    }
  }

  async executeQuery(req: Request, res: Response): Promise<void> {
    try {
      const { dataSourceId } = req.params;
      const { query, parameters } = req.body;
      
      if (!query) {
        res.status(400).json({
          success: false,
          error: 'Query is required'
        });
        return;
      }

      const result = await reportBuilderService.executeQuery(dataSourceId, query, parameters);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute query'
      });
    }
  }

  // Component library endpoints
  async getComponentLibrary(req: Request, res: Response): Promise<void> {
    try {
      const components = reportBuilderService.getComponentLibrary();
      
      res.json({
        success: true,
        data: components
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get component library'
      });
    }
  }

  async getComponentDefinition(req: Request, res: Response): Promise<void> {
    try {
      const { type } = req.params;
      const component = reportBuilderService.getComponentDefinition(type);
      
      if (!component) {
        res.status(404).json({
          success: false,
          error: 'Component type not found'
        });
        return;
      }

      res.json({
        success: true,
        data: component
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get component definition'
      });
    }
  }

  // Preview and validation endpoints
  async previewTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const parameters = req.body.parameters || {};
      
      const preview = await reportBuilderService.previewTemplate(id, parameters);
      
      res.json({
        success: true,
        data: preview
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to preview template'
      });
    }
  }

  async validateTemplate(req: Request, res: Response): Promise<void> {
    try {
      const templateData = req.body;
      const errors = reportBuilderService.validateTemplate(templateData);
      
      res.json({
        success: true,
        data: {
          isValid: errors.length === 0,
          errors
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate template'
      });
    }
  }
}

export const reportBuilderController = new ReportBuilderController();
