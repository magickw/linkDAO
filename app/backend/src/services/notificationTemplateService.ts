/**
 * Notification Template Service
 * Manages dynamic notification templates for different channels (email, push, SMS)
 * Supports variable interpolation and version control
 */

import { randomUUID } from 'crypto';
import ejs from 'ejs';
import { safeLogger } from '../utils/safeLogger';
import { DatabaseService } from './databaseService';

export type NotificationChannel = 'email' | 'push' | 'sms';

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  required: boolean;
  description?: string;
  defaultValue?: any;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  channel: NotificationChannel;
  subject?: string;
  bodyTemplate: string;
  variables: TemplateVariable[];
  isActive: boolean;
  version: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RenderedTemplate {
  subject?: string;
  body: string;
  channel: NotificationChannel;
}

export class NotificationTemplateService {
  private databaseService: DatabaseService;
  private templateCache: Map<string, NotificationTemplate> = new Map();
  private cacheTTL: number = 5 * 60 * 1000; // 5 minutes
  private cacheTimestamps: Map<string, number> = new Map();

  constructor() {
    this.databaseService = new DatabaseService();
  }

  /**
   * Create a new notification template
   */
  async createTemplate(
    name: string,
    channel: NotificationChannel,
    bodyTemplate: string,
    variables: TemplateVariable[],
    options?: {
      subject?: string;
      description?: string;
    }
  ): Promise<NotificationTemplate> {
    try {
      // Validate template syntax
      try {
        ejs.render(bodyTemplate, {}, { async: false });
      } catch (error) {
        throw new Error(`Invalid EJS template syntax: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      const template: NotificationTemplate = {
        id: randomUUID(),
        name,
        channel,
        subject: options?.subject,
        bodyTemplate,
        variables,
        isActive: true,
        version: 1,
        description: options?.description,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store in database
      try {
        await this.databaseService.createNotificationTemplate(template);
      } catch (dbError) {
        safeLogger.warn('Failed to store template in database:', dbError);
      }

      // Invalidate cache
      this.templateCache.delete(name);

      safeLogger.info(`Notification template created: ${name} (${channel})`);
      return template;
    } catch (error) {
      safeLogger.error('Error creating notification template:', error);
      throw error;
    }
  }

  /**
   * Get template by name
   */
  async getTemplate(name: string): Promise<NotificationTemplate | null> {
    try {
      // Check cache first
      const cached = this.templateCache.get(name);
      const cacheTime = this.cacheTimestamps.get(name) || 0;
      const now = Date.now();

      if (cached && (now - cacheTime) < this.cacheTTL) {
        return cached;
      }

      // Fetch from database
      const template = await this.databaseService.getNotificationTemplate(name);
      if (template) {
        this.templateCache.set(name, template);
        this.cacheTimestamps.set(name, now);
      }

      return template || null;
    } catch (error) {
      safeLogger.error(`Error fetching template ${name}:`, error);
      return null;
    }
  }

  /**
   * List all active templates
   */
  async listTemplates(channel?: NotificationChannel): Promise<NotificationTemplate[]> {
    try {
      return await this.databaseService.listNotificationTemplates(channel);
    } catch (error) {
      safeLogger.error('Error listing templates:', error);
      return [];
    }
  }

  /**
   * Update a template
   */
  async updateTemplate(
    name: string,
    updates: {
      bodyTemplate?: string;
      subject?: string;
      variables?: TemplateVariable[];
      description?: string;
      isActive?: boolean;
    }
  ): Promise<NotificationTemplate | null> {
    try {
      const template = await this.getTemplate(name);
      if (!template) {
        throw new Error(`Template not found: ${name}`);
      }

      // Validate new template syntax if provided
      if (updates.bodyTemplate) {
        try {
          ejs.render(updates.bodyTemplate, {}, { async: false });
        } catch (error) {
          throw new Error(`Invalid EJS template syntax: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Update template with new version
      const updatedTemplate: NotificationTemplate = {
        ...template,
        ...updates,
        version: template.version + 1,
        updatedAt: new Date(),
      };

      // Store in database
      try {
        await this.databaseService.updateNotificationTemplate(name, updatedTemplate);
      } catch (dbError) {
        safeLogger.warn('Failed to update template in database:', dbError);
      }

      // Invalidate cache
      this.templateCache.delete(name);

      safeLogger.info(`Template updated: ${name} (v${updatedTemplate.version})`);
      return updatedTemplate;
    } catch (error) {
      safeLogger.error(`Error updating template ${name}:`, error);
      return null;
    }
  }

  /**
   * Delete a template
   */
  async deleteTemplate(name: string): Promise<boolean> {
    try {
      await this.databaseService.deleteNotificationTemplate(name);

      // Invalidate cache
      this.templateCache.delete(name);

      safeLogger.info(`Template deleted: ${name}`);
      return true;
    } catch (error) {
      safeLogger.error(`Error deleting template ${name}:`, error);
      return false;
    }
  }

  /**
   * Validate data against template variables
   */
  validateData(variables: TemplateVariable[], data: Record<string, any>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const variable of variables) {
      if (variable.required && !(variable.name in data)) {
        errors.push(`Required variable missing: ${variable.name}`);
        continue;
      }

      if (variable.name in data) {
        const value = data[variable.name];
        const valueType = typeof value;

        // Type checking
        if (variable.type === 'date') {
          if (!(value instanceof Date) && isNaN(Date.parse(value))) {
            errors.push(`Invalid date for variable: ${variable.name}`);
          }
        } else if (valueType !== variable.type) {
          errors.push(`Type mismatch for variable: ${variable.name}. Expected ${variable.type}, got ${valueType}`);
        }
      } else if (variable.defaultValue !== undefined) {
        // Use default value if not provided
        data[variable.name] = variable.defaultValue;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Render a template with data
   */
  async renderTemplate(
    templateName: string,
    data: Record<string, any>,
    includeValidation: boolean = true
  ): Promise<RenderedTemplate | null> {
    try {
      const template = await this.getTemplate(templateName);
      if (!template) {
        throw new Error(`Template not found: ${templateName}`);
      }

      // Validate data if required
      if (includeValidation && template.variables.length > 0) {
        const validation = this.validateData(template.variables, data);
        if (!validation.valid) {
          throw new Error(`Data validation failed: ${validation.errors.join(', ')}`);
        }
      }

      // Render templates
      let subject: string | undefined;
      if (template.subject) {
        subject = ejs.render(template.subject, data, {
          async: false,
          cache: true,
          filename: `template:${templateName}-subject`,
        });
      }

      const body = ejs.render(template.bodyTemplate, data, {
        async: false,
        cache: true,
        filename: `template:${templateName}-body`,
      });

      safeLogger.info(`Template rendered: ${templateName}`);
      return {
        subject,
        body,
        channel: template.channel,
      };
    } catch (error) {
      safeLogger.error(`Error rendering template ${templateName}:`, error);
      return null;
    }
  }

  /**
   * Get template version history
   */
  async getTemplateHistory(name: string): Promise<NotificationTemplate[]> {
    try {
      return await this.databaseService.getNotificationTemplateHistory(name);
    } catch (error) {
      safeLogger.error(`Error fetching template history for ${name}:`, error);
      return [];
    }
  }

  /**
   * Get built-in templates
   */
  getBuiltInTemplates(): Record<string, NotificationTemplate> {
    return {
      'order_confirmation': {
        id: randomUUID(),
        name: 'order_confirmation',
        channel: 'email',
        subject: 'Order Confirmed - <%= orderNumber %>',
        bodyTemplate: `
          <h2>Order Confirmed!</h2>
          <p>Hello <%= customerName %>,</p>
          <p>Your order #<strong><%= orderNumber %></strong> has been confirmed.</p>
          <p><strong>Order Details:</strong></p>
          <ul>
            <li>Order Date: <%= new Date(orderDate).toLocaleDateString() %></li>
            <li>Total Amount: <%= total %> <%= currency %></li>
            <li>Status: Pending Shipment</li>
          </ul>
          <p>You will receive a shipping notification once your items are dispatched.</p>
        `,
        variables: [
          { name: 'customerName', type: 'string', required: true },
          { name: 'orderNumber', type: 'string', required: true },
          { name: 'orderDate', type: 'date', required: true },
          { name: 'total', type: 'number', required: true },
          { name: 'currency', type: 'string', required: true, defaultValue: 'USD' },
        ],
        isActive: true,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      'order_shipped': {
        id: randomUUID(),
        name: 'order_shipped',
        channel: 'email',
        subject: 'Your Order Has Shipped - <%= orderNumber %>',
        bodyTemplate: `
          <h2>Order Shipped!</h2>
          <p>Hello <%= customerName %>,</p>
          <p>Your order #<strong><%= orderNumber %></strong> has been shipped!</p>
          <p><strong>Tracking Details:</strong></p>
          <ul>
            <li>Tracking Number: <%= trackingNumber %></li>
            <li>Carrier: <%= carrier %></li>
            <li>Estimated Delivery: <%= new Date(estimatedDelivery).toLocaleDateString() %></li>
          </ul>
          <p><a href="<%= trackingUrl %>">Track Your Package</a></p>
        `,
        variables: [
          { name: 'customerName', type: 'string', required: true },
          { name: 'orderNumber', type: 'string', required: true },
          { name: 'trackingNumber', type: 'string', required: true },
          { name: 'carrier', type: 'string', required: true },
          { name: 'estimatedDelivery', type: 'date', required: true },
          { name: 'trackingUrl', type: 'string', required: true },
        ],
        isActive: true,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      'receipt_ready': {
        id: randomUUID(),
        name: 'receipt_ready',
        channel: 'email',
        subject: 'Your Receipt is Ready - <%= receiptNumber %>',
        bodyTemplate: `
          <h2>Receipt Available</h2>
          <p>Hello <%= customerName %>,</p>
          <p>Your receipt #<strong><%= receiptNumber %></strong> is now available for download.</p>
          <p><strong>Receipt Details:</strong></p>
          <ul>
            <li>Order: <%= orderNumber %></li>
            <li>Amount: <%= total %> <%= currency %></li>
            <li>Date: <%= new Date(issuedAt).toLocaleDateString() %></li>
          </ul>
          <p><a href="<%= downloadUrl %>">Download Receipt (PDF)</a></p>
        `,
        variables: [
          { name: 'customerName', type: 'string', required: true },
          { name: 'receiptNumber', type: 'string', required: true },
          { name: 'orderNumber', type: 'string', required: true },
          { name: 'total', type: 'number', required: true },
          { name: 'currency', type: 'string', required: true, defaultValue: 'USD' },
          { name: 'issuedAt', type: 'date', required: true },
          { name: 'downloadUrl', type: 'string', required: true },
        ],
        isActive: true,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      'invoice_generated': {
        id: randomUUID(),
        name: 'invoice_generated',
        channel: 'email',
        subject: 'Invoice Generated - <%= invoiceNumber %>',
        bodyTemplate: `
          <h2>Invoice Available</h2>
          <p>Hello <%= recipientName %>,</p>
          <p>Your invoice #<strong><%= invoiceNumber %></strong> has been generated.</p>
          <p><strong>Invoice Details:</strong></p>
          <ul>
            <li>Invoice Date: <%= new Date(invoiceDate).toLocaleDateString() %></li>
            <li>Amount Due: <%= totalAmount %> <%= currency %></li>
            <li>Due Date: <%= new Date(dueDate).toLocaleDateString() %></li>
          </ul>
          <p><a href="<%= invoiceUrl %>">View Invoice</a></p>
        `,
        variables: [
          { name: 'recipientName', type: 'string', required: true },
          { name: 'invoiceNumber', type: 'string', required: true },
          { name: 'invoiceDate', type: 'date', required: true },
          { name: 'dueDate', type: 'date', required: true },
          { name: 'totalAmount', type: 'number', required: true },
          { name: 'currency', type: 'string', required: true, defaultValue: 'USD' },
          { name: 'invoiceUrl', type: 'string', required: true },
        ],
        isActive: true,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
  }

  /**
   * Clear template cache
   */
  clearCache(): void {
    this.templateCache.clear();
    this.cacheTimestamps.clear();
    safeLogger.info('Template cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; ttl: number } {
    return {
      size: this.templateCache.size,
      ttl: this.cacheTTL,
    };
  }
}

// Export singleton instance
export const notificationTemplateService = new NotificationTemplateService();
