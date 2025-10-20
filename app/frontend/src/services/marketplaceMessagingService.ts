import { apiClient } from './apiClient';

export class MarketplaceMessagingService {
  /**
   * Create order conversation
   */
  async createOrderConversation(orderId: number) {
    const response = await apiClient.post(`/marketplace/messaging/conversations/order/${orderId}`);
    return response.data;
  }

  /**
   * Get order timeline
   */
  async getOrderTimeline(conversationId: string) {
    const response = await apiClient.get(`/marketplace/messaging/conversations/${conversationId}/order-timeline`);
    return response.data;
  }

  /**
   * Send message
   */
  async sendMessage(conversationId: string, content: string) {
    const response = await apiClient.post(`/messaging/conversations/${conversationId}/messages`, {
      content
    });
    return response.data;
  }

  /**
   * Get messages
   */
  async getMessages(conversationId: string) {
    const response = await apiClient.get(`/messaging/conversations/${conversationId}/messages`);
    return response.data;
  }

  /**
   * Suggest quick replies
   */
  async suggestQuickReplies(message: string) {
    const response = await apiClient.get('/marketplace/messaging/quick-replies/suggest', {
      params: { message }
    });
    return response.data;
  }

  /**
   * Get conversation analytics
   */
  async getConversationAnalytics(conversationId: string) {
    const response = await apiClient.get(`/marketplace/messaging/conversations/${conversationId}/analytics`);
    return response.data;
  }

  /**
   * Get seller messaging analytics
   */
  async getSellerMessagingAnalytics() {
    const response = await apiClient.get('/marketplace/messaging/seller/analytics/messaging');
    return response.data;
  }

  /**
   * Send automated notification
   */
  async sendAutomatedNotification(conversationId: string, eventType: string, data: any) {
    const response = await apiClient.post(`/marketplace/messaging/conversations/${conversationId}/auto-notify`, {
      eventType,
      data
    });
    return response.data;
  }

  /**
   * Escalate to dispute
   */
  async escalateToDispute(conversationId: string) {
    const response = await apiClient.post(`/marketplace/messaging/conversations/${conversationId}/escalate`);
    return response.data;
  }

  /**
   * Get templates
   */
  async getTemplates() {
    const response = await apiClient.get('/marketplace/messaging/templates');
    return response.data;
  }

  /**
   * Create template
   */
  async createTemplate(templateData: any) {
    const response = await apiClient.post('/marketplace/messaging/templates', templateData);
    return response.data;
  }

  /**
   * Update template
   */
  async updateTemplate(templateId: string, templateData: any) {
    const response = await apiClient.put(`/marketplace/messaging/templates/${templateId}`, templateData);
    return response.data;
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId: string) {
    const response = await apiClient.delete(`/marketplace/messaging/templates/${templateId}`);
    return response.data;
  }

  /**
   * Create quick reply
   */
  async createQuickReply(quickReplyData: any) {
    const response = await apiClient.post('/marketplace/messaging/quick-replies', quickReplyData);
    return response.data;
  }
}

export const marketplaceMessagingService = new MarketplaceMessagingService();