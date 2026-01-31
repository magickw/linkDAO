/**
 * Message Template Service
 * Handles CRUD operations for message templates used for quick replies
 */

export interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  category?: string;
  tags?: string[];
  isActive: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateInput {
  name: string;
  content: string;
  category?: string;
  tags?: string[];
}

export interface UpdateTemplateInput {
  name?: string;
  content?: string;
  category?: string;
  tags?: string[];
  isActive?: boolean;
}

const BACKEND_API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

class MessageTemplateService {
  /**
   * Get all message templates for the current user
   */
  async getTemplates(): Promise<MessageTemplate[]> {
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/marketplace/messaging/templates`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch templates: ${response.statusText}`);
      }

      const data = await response.json();
      return Array.isArray(data) ? data : data.templates || [];
    } catch (error) {
      console.error('Error fetching message templates:', error);
      return [];
    }
  }

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(category: string): Promise<MessageTemplate[]> {
    try {
      const templates = await this.getTemplates();
      return templates.filter(t => t.category === category);
    } catch (error) {
      console.error('Error fetching templates by category:', error);
      return [];
    }
  }

  /**
   * Create a new message template
   */
  async createTemplate(input: CreateTemplateInput): Promise<MessageTemplate | null> {
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/marketplace/messaging/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error(`Failed to create template: ${response.statusText}`);
      }

      const data = await response.json();
      return data.template || data;
    } catch (error) {
      console.error('Error creating message template:', error);
      return null;
    }
  }

  /**
   * Update an existing message template
   */
  async updateTemplate(id: string, input: UpdateTemplateInput): Promise<MessageTemplate | null> {
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/marketplace/messaging/templates/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error(`Failed to update template: ${response.statusText}`);
      }

      const data = await response.json();
      return data.template || data;
    } catch (error) {
      console.error('Error updating message template:', error);
      return null;
    }
  }

  /**
   * Delete a message template
   */
  async deleteTemplate(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/marketplace/messaging/templates/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete template: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error('Error deleting message template:', error);
      return false;
    }
  }

  /**
   * Increment template usage count
   */
  async incrementUsageCount(id: string): Promise<void> {
    try {
      // This would be called internally when a template is used
      // Backend should handle incrementing usageCount
      await this.updateTemplate(id, {});
    } catch (error) {
      console.warn('Error incrementing template usage:', error);
    }
  }
}

export const messageTemplateService = new MessageTemplateService();
