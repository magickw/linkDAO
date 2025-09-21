import { CreatePollInput, PollVoteInput, PollResult, PollApiResponse, VotingHistoryItem } from '@/types/poll';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000';

export class PollService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = localStorage.getItem('authToken');
    
    const response = await fetch(`${API_BASE_URL}/api/polls${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Create a new poll
   */
  async createPoll(input: CreatePollInput): Promise<string> {
    const response = await this.makeRequest<{ success: boolean; pollId: string }>('/create', {
      method: 'POST',
      body: JSON.stringify(input),
    });

    return response.pollId;
  }

  /**
   * Get poll by ID
   */
  async getPollById(pollId: string): Promise<PollResult | null> {
    try {
      const response = await this.makeRequest<PollApiResponse>(`/poll/${pollId}`);
      return response.poll || null;
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get poll by post ID
   */
  async getPollByPostId(postId: number): Promise<PollResult | null> {
    try {
      const response = await this.makeRequest<PollApiResponse>(`/post/${postId}/poll`);
      return response.poll || null;
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Vote on a poll
   */
  async voteOnPoll(input: PollVoteInput): Promise<PollResult> {
    const response = await this.makeRequest<PollApiResponse>(`/poll/${input.pollId}/vote`, {
      method: 'POST',
      body: JSON.stringify({
        optionIds: input.optionIds,
        tokenAmount: input.tokenAmount,
      }),
    });

    if (!response.poll) {
      throw new Error('Invalid response from server');
    }

    return response.poll;
  }

  /**
   * Get user's voting history
   */
  async getUserVotingHistory(limit: number = 50): Promise<VotingHistoryItem[]> {
    const response = await this.makeRequest<{ success: boolean; history: VotingHistoryItem[] }>(
      `/user/voting-history?limit=${limit}`
    );

    return response.history;
  }

  /**
   * Get polls expiring soon
   */
  async getExpiringSoonPolls(hours: number = 24): Promise<PollResult[]> {
    const response = await this.makeRequest<{ success: boolean; polls: PollResult[] }>(
      `/expiring-soon?hours=${hours}`
    );

    return response.polls;
  }

  /**
   * Delete a poll (admin/moderator function)
   */
  async deletePoll(pollId: string): Promise<void> {
    await this.makeRequest(`/poll/${pollId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Update poll expiration (admin/moderator function)
   */
  async updatePollExpiration(pollId: string, expiresAt: Date | null): Promise<void> {
    await this.makeRequest(`/poll/${pollId}/expiration`, {
      method: 'PATCH',
      body: JSON.stringify({
        expiresAt: expiresAt?.toISOString(),
      }),
    });
  }
}

export const pollService = new PollService();