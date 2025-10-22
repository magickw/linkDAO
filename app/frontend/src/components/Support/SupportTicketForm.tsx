import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert } from '../ui/alert';

interface SupportTicketFormProps {
  userEmail?: string;
  documentationContext?: {
    documentsViewed: string[];
    searchQueries: string[];
    timeSpentInDocs: number;
    lastDocumentViewed?: string;
  };
}

interface TicketFormData {
  title: string;
  description: string;
  category: 'technical' | 'account' | 'payment' | 'security' | 'general';
  priority: 'low' | 'medium' | 'high' | 'critical';
  userEmail: string;
  tags: string[];
}

export const SupportTicketForm: React.FC<SupportTicketFormProps> = ({
  userEmail = '',
  documentationContext
}) => {
  const [formData, setFormData] = useState<TicketFormData>({
    title: '',
    description: '',
    category: 'general',
    priority: 'medium',
    userEmail,
    tags: []
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
    setFormData(prev => ({
      ...prev,
      tags
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: '' });

    try {
      const ticketData = {
        ...formData,
        status: 'open' as const,
        metadata: {
          userAgent: navigator.userAgent,
          referrer: document.referrer,
          sessionId: `session-${Date.now()}`,
          ...documentationContext
        }
      };

      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ticketData)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSubmitStatus({
          type: 'success',
          message: `Support ticket created successfully! Ticket ID: ${result.ticket.id}`
        });
        
        // Reset form
        setFormData({
          title: '',
          description: '',
          category: 'general',
          priority: 'medium',
          userEmail,
          tags: []
        });
      } else {
        throw new Error(result.error || 'Failed to create support ticket');
      }
    } catch (error) {
      setSubmitStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create Support Ticket</CardTitle>
        {documentationContext && (
          <div className="text-sm text-gray-600">
            <p>We noticed you've been viewing documentation. This context will help us assist you better.</p>
            <ul className="mt-2 space-y-1">
              <li>Documents viewed: {documentationContext.documentsViewed.length}</li>
              <li>Time spent: {Math.round(documentationContext.timeSpentInDocs / 60000)} minutes</li>
              {documentationContext.lastDocumentViewed && (
                <li>Last viewed: {documentationContext.lastDocumentViewed}</li>
              )}
            </ul>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {submitStatus.type && (
          <Alert className={`mb-4 ${
            submitStatus.type === 'success' 
              ? 'border-green-200 bg-green-50 text-green-800' 
              : 'border-red-200 bg-red-50 text-red-800'
          }`}>
            {submitStatus.message}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="userEmail" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              id="userEmail"
              name="userEmail"
              value={formData.userEmail}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="your.email@example.com"
            />
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Subject *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Brief description of your issue"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="general">General</option>
                <option value="technical">Technical</option>
                <option value="account">Account</option>
                <option value="payment">Payment</option>
                <option value="security">Security</option>
              </select>
            </div>

            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Please provide detailed information about your issue, including any error messages, steps you've taken, and what you expected to happen."
            />
          </div>

          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
              Tags (optional)
            </label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={formData.tags.join(', ')}
              onChange={handleTagsChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="wallet, metamask, staking (comma-separated)"
            />
            <p className="text-xs text-gray-500 mt-1">
              Add relevant tags to help us categorize your issue
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFormData({
                  title: '',
                  description: '',
                  category: 'general',
                  priority: 'medium',
                  userEmail,
                  tags: []
                });
                setSubmitStatus({ type: null, message: '' });
              }}
            >
              Clear
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? 'Creating Ticket...' : 'Create Ticket'}
            </Button>
          </div>
        </form>

        <div className="mt-6 p-4 bg-gray-50 rounded-md">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Need immediate help?</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p>• Check our <a href="/support" className="text-blue-600 hover:underline">documentation</a> for quick answers</p>
            <p>• Join our <a href="#" className="text-blue-600 hover:underline">Discord community</a> for peer support</p>
            <p>• For critical security issues, email <a href="mailto:security@linkdao.io" className="text-blue-600 hover:underline">security@linkdao.io</a></p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};