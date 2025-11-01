import { useState, useCallback } from 'react';
import { communityInteractionService } from '../services/communityInteractionService';
import { analyticsService } from '../services/analyticsService';
import useRateLimit from './useRateLimit';

export interface AIAssistedPostCreationReturn {
  // State
  loading: boolean;
  error: string | null;
  suggestions: string[];
  
  // AI assistance functions
  generatePostTitle: (content: string, communityId: string, communityName: string) => Promise<string | null>;
  generatePostContent: (topic: string, communityId: string, communityName: string) => Promise<string | null>;
  generatePostTags: (content: string, communityId: string, communityName: string) => Promise<string[]>;
  improvePostContent: (content: string, communityId: string, communityName: string) => Promise<string | null>;
  
  // Rate limit state
  rateLimitState: {
    isRateLimited: boolean;
    remainingRequests: number;
    resetTime: number | null;
  };
  
  // Clear error
  clearError: () => void;
}

/**
 * Custom hook for AI-assisted post creation functionality
 * Provides functions for generating titles, content, tags, and improving content
 * Includes rate limiting and client-side validation
 */
export const useAIAssistedPostCreation = (): AIAssistedPostCreationReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  // Rate limiter for AI operations
  const aiRateLimiter = useRateLimit({
    maxRequests: 10,
    timeWindow: 60000, // 1 minute
    onError: (errorMsg) => setError(errorMsg)
  });

  // Client-side validation
  const validateInput = useCallback((content: string, minLength: number = 10): boolean => {
    if (!content || content.trim().length < minLength) {
      setError(`Content must be at least ${minLength} characters long`);
      return false;
    }
    return true;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const generatePostTitle = useCallback(async (
    content: string, 
    communityId: string, 
    communityName: string
  ): Promise<string | null> => {
    // Validate input
    if (!validateInput(content, 20)) {
      return null;
    }

    // Check rate limit
    if (aiRateLimiter.state.isRateLimited) {
      setError('Rate limit exceeded. Please try again later.');
      return null;
    }

    setLoading(true);
    setError(null);
    setSuggestions([]);

    try {
      // Track AI title generation request
      analyticsService.trackUserEvent('ai_title_generation_requested', {
        communityId,
        communityName,
        contentLength: content.length
      });

      const result = await aiRateLimiter.execute(
        communityInteractionService.generatePostTitle,
        content,
        communityId,
        communityName
      );

      if (result?.title) {
        // Track successful title generation
        analyticsService.trackUserEvent('ai_title_generation_success', {
          communityId,
          communityName,
          titleLength: result.title.length
        });
        return result.title;
      } else {
        throw new Error('Failed to generate title');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate title';
      setError(errorMessage);
      
      // Track error
      analyticsService.trackUserEvent('ai_title_generation_error', {
        communityId,
        communityName,
        error: errorMessage
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [aiRateLimiter, validateInput]);

  const generatePostContent = useCallback(async (
    topic: string, 
    communityId: string, 
    communityName: string
  ): Promise<string | null> => {
    // Validate input
    if (!validateInput(topic, 5)) {
      return null;
    }

    // Check rate limit
    if (aiRateLimiter.state.isRateLimited) {
      setError('Rate limit exceeded. Please try again later.');
      return null;
    }

    setLoading(true);
    setError(null);
    setSuggestions([]);

    try {
      // Track AI content generation request
      analyticsService.trackUserEvent('ai_content_generation_requested', {
        communityId,
        communityName,
        topicLength: topic.length
      });

      const result = await aiRateLimiter.execute(
        communityInteractionService.generatePostContent,
        topic,
        communityId,
        communityName
      );

      if (result?.content) {
        // Track successful content generation
        analyticsService.trackUserEvent('ai_content_generation_success', {
          communityId,
          communityName,
          contentLength: result.content.length
        });
        return result.content;
      } else {
        throw new Error('Failed to generate content');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate content';
      setError(errorMessage);
      
      // Track error
      analyticsService.trackUserEvent('ai_content_generation_error', {
        communityId,
        communityName,
        error: errorMessage
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [aiRateLimiter, validateInput]);

  const generatePostTags = useCallback(async (
    content: string, 
    communityId: string, 
    communityName: string
  ): Promise<string[]> => {
    // Validate input
    if (!validateInput(content, 30)) {
      return [];
    }

    // Check rate limit
    if (aiRateLimiter.state.isRateLimited) {
      setError('Rate limit exceeded. Please try again later.');
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      // Track AI tag generation request
      analyticsService.trackUserEvent('ai_tag_generation_requested', {
        communityId,
        communityName,
        contentLength: content.length
      });

      const result = await aiRateLimiter.execute(
        communityInteractionService.generatePostTags,
        content,
        communityId,
        communityName
      );

      if (result?.tags) {
        // Track successful tag generation
        analyticsService.trackUserEvent('ai_tag_generation_success', {
          communityId,
          communityName,
          tagCount: result.tags.length
        });
        
        setSuggestions(result.tags);
        return result.tags;
      } else {
        throw new Error('Failed to generate tags');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate tags';
      setError(errorMessage);
      
      // Track error
      analyticsService.trackUserEvent('ai_tag_generation_error', {
        communityId,
        communityName,
        error: errorMessage
      });
      
      return [];
    } finally {
      setLoading(false);
    }
  }, [aiRateLimiter, validateInput]);

  const improvePostContent = useCallback(async (
    content: string, 
    communityId: string, 
    communityName: string
  ): Promise<string | null> => {
    // Validate input
    if (!validateInput(content, 50)) {
      return null;
    }

    // Check rate limit
    if (aiRateLimiter.state.isRateLimited) {
      setError('Rate limit exceeded. Please try again later.');
      return null;
    }

    setLoading(true);
    setError(null);
    setSuggestions([]);

    try {
      // Track AI content improvement request
      analyticsService.trackUserEvent('ai_content_improvement_requested', {
        communityId,
        communityName,
        contentLength: content.length
      });

      const result = await aiRateLimiter.execute(
        communityInteractionService.improvePostContent,
        content,
        communityId,
        communityName
      );

      if (result?.improvedContent) {
        // Track successful content improvement
        analyticsService.trackUserEvent('ai_content_improvement_success', {
          communityId,
          communityName,
          originalLength: content.length,
          improvedLength: result.improvedContent.length
        });
        return result.improvedContent;
      } else {
        throw new Error('Failed to improve content');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to improve content';
      setError(errorMessage);
      
      // Track error
      analyticsService.trackUserEvent('ai_content_improvement_error', {
        communityId,
        communityName,
        error: errorMessage
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [aiRateLimiter, validateInput]);

  return {
    loading,
    error,
    suggestions,
    generatePostTitle,
    generatePostContent,
    generatePostTags,
    improvePostContent,
    rateLimitState: aiRateLimiter.state,
    clearError
  };
};