/**
 * Hook for Message Template Management
 * Provides React integration for template CRUD and usage
 */

import { useEffect, useState, useCallback } from 'react';
import { messageTemplateService, MessageTemplate, CreateTemplateInput, UpdateTemplateInput } from '@/services/messageTemplateService';

interface UseMessageTemplatesReturn {
  templates: MessageTemplate[];
  loading: boolean;
  error: string | null;
  createTemplate: (input: CreateTemplateInput) => Promise<MessageTemplate | null>;
  updateTemplate: (id: string, input: UpdateTemplateInput) => Promise<MessageTemplate | null>;
  deleteTemplate: (id: string) => Promise<boolean>;
  getTemplatesByCategory: (category: string) => MessageTemplate[];
  refresh: () => Promise<void>;
}

export function useMessageTemplates(): UseMessageTemplatesReturn {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await messageTemplateService.getTemplates();
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleCreateTemplate = useCallback(async (input: CreateTemplateInput) => {
    try {
      const result = await messageTemplateService.createTemplate(input);
      if (result) {
        setTemplates(prev => [...prev, result]);
      }
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template');
      return null;
    }
  }, []);

  const handleUpdateTemplate = useCallback(async (id: string, input: UpdateTemplateInput) => {
    try {
      const result = await messageTemplateService.updateTemplate(id, input);
      if (result) {
        setTemplates(prev => prev.map(t => t.id === id ? result : t));
      }
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update template');
      return null;
    }
  }, []);

  const handleDeleteTemplate = useCallback(async (id: string) => {
    try {
      const success = await messageTemplateService.deleteTemplate(id);
      if (success) {
        setTemplates(prev => prev.filter(t => t.id !== id));
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
      return false;
    }
  }, []);

  const getTemplatesByCategory = useCallback((category: string) => {
    return templates.filter(t => t.category === category && t.isActive);
  }, [templates]);

  return {
    templates,
    loading,
    error,
    createTemplate: handleCreateTemplate,
    updateTemplate: handleUpdateTemplate,
    deleteTemplate: handleDeleteTemplate,
    getTemplatesByCategory,
    refresh: loadTemplates,
  };
}
