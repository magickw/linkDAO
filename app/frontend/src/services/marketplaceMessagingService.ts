export class MarketplaceMessagingService {
  private baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

  private createTimeoutSignal(timeoutMs: number): AbortSignal {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeoutMs);
    return controller.signal;
  }

  /**
   * Create order conversation
   */
  async createOrderConversation(orderId: number) {
    try {
      const response = await fetch(`${this.baseUrl}/api/marketplace/messaging/conversations/order/${orderId}`, {
        method: 'POST',
        signal: this.createTimeoutSignal(10000),
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to create order conversation');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating order conversation:', error);
      throw error;
    }
  }

  /**
   * Get order timeline
   */
  async getOrderTimeline(conversationId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/api/marketplace/messaging/conversations/${conversationId}/order-timeline`, {
        signal: this.createTimeoutSignal(10000)
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch order timeline');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching order timeline:', error);
      throw error;
    }
  }

  /**
   * Create product inquiry conversation
   */
  async createProductInquiry(productId: string, initialMessage?: string) {
    try {
      const response = await fetch(`${this.baseUrl}/api/marketplace/messaging/conversations/product/${productId}`, {
        method: 'POST',
        signal: this.createTimeoutSignal(10000),
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ initialMessage })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create product inquiry');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating product inquiry:', error);
      throw error;
    }
  }

  /**
   * Send message
   */
  async sendMessage(conversationId: string, content: string) {
    try {
      const response = await fetch(`${this.baseUrl}/messaging/conversations/${conversationId}/messages`, {
        method: 'POST',
        signal: this.createTimeoutSignal(10000),
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content })
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Get messages
   */
  async getMessages(conversationId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/messaging/conversations/${conversationId}/messages`, {
        signal: this.createTimeoutSignal(10000)
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }

  /**
   * Suggest quick replies
   */
  async suggestQuickReplies(message: string) {
    try {
      const params = new URLSearchParams({ message });
      const response = await fetch(`${this.baseUrl}/api/marketplace/messaging/quick-replies/suggest?${params.toString()}`, {
        signal: this.createTimeoutSignal(10000)
      });
      
      if (!response.ok) {
        throw new Error('Failed to suggest quick replies');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error suggesting quick replies:', error);
      throw error;
    }
  }

  /**
   * Get conversation analytics
   */
  async getConversationAnalytics(conversationId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/api/marketplace/messaging/conversations/${conversationId}/analytics`, {
        signal: this.createTimeoutSignal(10000)
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch conversation analytics');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching conversation analytics:', error);
      throw error;
    }
  }

  /**
   * Get seller messaging analytics
   */
  async getSellerMessagingAnalytics() {
    try {
      const response = await fetch(`${this.baseUrl}/api/marketplace/messaging/seller/analytics/messaging`, {
        signal: this.createTimeoutSignal(10000)
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch seller messaging analytics');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching seller messaging analytics:', error);
      throw error;
    }
  }

  /**
   * Send automated notification
   */
  async sendAutomatedNotification(conversationId: string, eventType: string, data: any) {
    try {
      const response = await fetch(`${this.baseUrl}/api/marketplace/messaging/conversations/${conversationId}/auto-notify`, {
        method: 'POST',
        signal: this.createTimeoutSignal(10000),
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventType, data })
      });
      
      if (!response.ok) {
        throw new Error('Failed to send automated notification');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error sending automated notification:', error);
      throw error;
    }
  }

  /**
   * Escalate to dispute
   */
  async escalateToDispute(conversationId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/api/marketplace/messaging/conversations/${conversationId}/escalate`, {
        method: 'POST',
        signal: this.createTimeoutSignal(10000)
      });
      
      if (!response.ok) {
        throw new Error('Failed to escalate to dispute');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error escalating to dispute:', error);
      throw error;
    }
  }

  /**
   * Get templates
   */
  async getTemplates() {
    try {
      const response = await fetch(`${this.baseUrl}/api/marketplace/messaging/templates`, {
        signal: this.createTimeoutSignal(10000)
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching templates:', error);
      throw error;
    }
  }

  /**
   * Create template
   */
  async createTemplate(templateData: any) {
    try {
      const response = await fetch(`${this.baseUrl}/api/marketplace/messaging/templates`, {
        method: 'POST',
        signal: this.createTimeoutSignal(10000),
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create template');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  }

  /**
   * Update template
   */
  async updateTemplate(templateId: string, templateData: any) {
    try {
      const response = await fetch(`${this.baseUrl}/api/marketplace/messaging/templates/${templateId}`, {
        method: 'PUT',
        signal: this.createTimeoutSignal(10000),
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update template');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating template:', error);
      throw error;
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/api/marketplace/messaging/templates/${templateId}`, {
        method: 'DELETE',
        signal: this.createTimeoutSignal(10000)
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete template');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  }

  /**
   * Create quick reply
   */
  async createQuickReply(quickReplyData: any) {
    try {
      const response = await fetch(`${this.baseUrl}/api/marketplace/messaging/quick-replies`, {
        method: 'POST',
        signal: this.createTimeoutSignal(10000),
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(quickReplyData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create quick reply');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating quick reply:', error);
      throw error;
    }
  }
}

export const marketplaceMessagingService = new MarketplaceMessagingService();