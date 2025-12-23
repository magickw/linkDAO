// Fix for reaction functionality
// This file contains patches to fix the reaction system

import { tokenReactionService } from '../services/tokenReactionService';
import { enhancedAuthService } from '../services/enhancedAuthService';

// 1. Fix for authentication check
export const checkAuthentication = () => {
  const token = enhancedAuthService.getToken() || 
                localStorage.getItem('linkdao_access_token') ||
                localStorage.getItem('token') ||
                localStorage.getItem('authToken') ||
                localStorage.getItem('auth_token');
  
  return !!token;
};

// 2. Fix for wallet connection check
export const checkWalletConnection = () => {
  if (typeof window === 'undefined') return false;
  return !!(window as any).ethereum?.selectedAddress;
};

// 3. Fix for post ID validation and conversion
export const ensureValidPostId = (postId: string): string => {
  // If it's already a valid UUID, return as-is
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(postId)) {
    return postId;
  }
  
  // If it's a numeric ID, return it as-is
  const numericIdRegex = /^\d+$/;
  if (numericIdRegex.test(postId)) {
    return postId;
  }
  
  // For any other format, return as-is (might be a valid format we don't recognize)
  console.warn('Unrecognized post ID format, using as-is:', postId);
  return postId;
};

// 4. Enhanced reaction handler with proper error handling
export const handleReactionWithAuth = async (
  postId: string,
  reactionType: string,
  amount: number = 0
) => {
  // Note: Authentication should be checked by the caller before calling this function
  // This function focuses on making the API request with proper auth headers
  
  // Ensure valid post ID
  const validPostId = ensureValidPostId(postId);
  
  try {
    // Get auth headers - Awaiting since getAuthHeaders is async
    const authHeaders = await enhancedAuthService.getAuthHeaders();
    const hasAuthHeader = authHeaders.Authorization && authHeaders.Authorization !== 'Bearer null';
    
    // Debug logging
    console.log('Reaction request:', {
      postId: validPostId,
      reactionType,
      hasAuthHeader,
      tokenPreview: hasAuthHeader ? authHeaders.Authorization?.substring(0, 20) + '...' : 'none'
    });
    
    // Try the feed service endpoint first
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000'}/api/feed/${validPostId}/react`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      },
      body: JSON.stringify({
        type: reactionType,
        tokenAmount: amount
      })
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      
      // Provide more specific error messages based on error code
      if (response.status === 401) {
        // Check the specific error code from backend
        const errorCode = error.error?.code || error.code;
        console.error('Authentication error:', { status: 401, errorCode, error });
        
        if (errorCode === 'MISSING_TOKEN') {
          throw new Error('Please sign in to react to posts. Click the wallet icon in the header to connect and authenticate.');
        } else if (errorCode === 'INVALID_TOKEN') {
          throw new Error('Your session has expired. Please refresh the page and sign in again.');
        } else {
          throw new Error('Authentication required. Please sign in to react to posts.');
        }
      } else if (response.status === 403) {
        throw new Error('You do not have permission to react to this post.');
      } else if (response.status === 404) {
        throw new Error('This post may have been removed or is no longer available.');
      } else {
        const errorMessage = error.error?.message || error.message || error.error || `Failed to react: ${response.statusText}`;
        throw new Error(errorMessage);
      }
    }
    
    const responseData = await response.json();
    return responseData.data || responseData; // Return the data field if it exists, otherwise the whole response
  } catch (error) {
    console.error('Reaction error:', error);
    throw error;
  }
};

// 5. Fix for getting reactions with proper error handling
export const getReactionsWithFallback = async (postId: string) => {
  const validPostId = ensureValidPostId(postId);
  
  try {
    // Try the token reaction service first
    const summaries = await tokenReactionService.getReactionSummaries(validPostId);
    return summaries;
  } catch (error) {
    console.warn('Failed to get reactions from token service, trying fallback:', error);
    
    // Fallback to reactions endpoint
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000'}/api/reactions/${validPostId}/summaries`, {
        headers: await enhancedAuthService.getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.reactions || [];
      }
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
    }
    
    // Return empty array as last resort
    return [];
  }
};