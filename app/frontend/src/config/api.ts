// API Configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000';
export const FALLBACK_API_URL = process.env.NEXT_PUBLIC_FALLBACK_API_URL || 'http://localhost:3000';

export const API_ENDPOINTS = {
  // User endpoints
  USERS: '/api/users',
  USER_PROFILE: '/api/users/profile',
  USER_SUGGESTIONS: '/api/users/suggestions',
  USER_SEARCH: '/api/users/search',
  USER_TRENDING: '/api/users/trending',
  USER_FOLLOW: '/api/users/follow',
  USER_FOLLOWERS: '/api/users/followers',
  USER_FOLLOWING: '/api/users/following',
  
  // Community endpoints
  COMMUNITIES: '/api/communities',
  
  // Feed endpoints
  FEED: '/api/feed',
  
  // Marketplace endpoints
  MARKETPLACE: '/api/marketplace',
  
  // Governance endpoints
  GOVERNANCE: '/api/governance',
} as const;

export const DEFAULT_REQUEST_OPTIONS: RequestInit = {
  headers: {
    'Content-Type': 'application/json',
  },
};

export const createApiUrl = (endpoint: string, params?: Record<string, string | number>): string => {
  let url = `${API_BASE_URL}${endpoint}`;
  
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, value.toString());
    });
    url += `?${searchParams.toString()}`;
  }
  
  return url;
};