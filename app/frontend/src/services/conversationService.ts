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
        return await fetchWithRetry<ConversationResponse>(
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
      } catch (error) {
        console.debug(`Endpoint ${endpoint} failed:`, error);
        lastError = error as Error;
        continue;
      }
    }

    // If we get here, all endpoints failed
    throw new Error('Unable to fetch conversations - service unavailable');
  }
}