import { fetchWithRetry } from '../utils/apiUtils';
import { API_BASE_URL } from '../config/api';

// Ordered list of conversation endpoint patterns to try
const CONVERSATION_ENDPOINTS = [
  '/api/chat/conversations',
  '/api/conversations',
  '/api/messages/conversations',
  '/api/messaging/conversations'
];

export interface ConversationResponse {
  success: boolean;
  conversations: any[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
  };
}

export class ConversationService {
  static async getConversations(limit: number = 20, offset: number = 0): Promise<ConversationResponse> {
    let lastError: Error | null = null;
    
    for (const endpoint of CONVERSATION_ENDPOINTS) {
      try {
        const response = await fetchWithRetry<ConversationResponse>(
          `${API_BASE_URL}${endpoint}?limit=${limit}&offset=${offset}`,
          {
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include'
          },
          {
            maxAttempts: 2,
            backoffMs: 1000,
            maxBackoffMs: 5000
          }
        );
        
        return response;
      } catch (error) {
        console.debug(`Endpoint ${endpoint} failed:`, error);
        lastError = error as Error;
        continue;
      }
    }

    // If we get here, all endpoints failed
    // Provide more specific error message based on the last error
    if (lastError && lastError.message.includes('503')) {
      throw new Error('Messaging service is temporarily unavailable. Please check your connection and try again.');
    } else if (lastError && lastError.message.includes('offline')) {
      throw new Error('You appear to be offline. Please check your internet connection and try again.');
    } else {
      throw new Error('Unable to fetch conversations - service unavailable. Please try again later.');
    }
  }
}