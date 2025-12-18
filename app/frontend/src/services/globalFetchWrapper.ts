import { enhancedAuthService } from './enhancedAuthService';

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
  skipRetry?: boolean;
  maxRetries?: number;
}

interface FetchResponse<T = any> {
  data?: T;
  success: boolean;
  error?: string;
  status: number;
  headers: Headers;
}

// Track ongoing refresh requests to prevent multiple simultaneous refreshes
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

// Queue of failed requests that need to be retried after token refresh
const failedRequestQueue: Array<{
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  requestInfo: RequestInfo;
  requestInit: FetchOptions;
}> = [];

/**
 * Global fetch wrapper with automatic token refresh and retry logic
 */
export async function globalFetch<T = any>(
  requestInfo: RequestInfo,
  requestInit: FetchOptions = {}
): Promise<FetchResponse<T>> {
  const {
    skipAuth = false,
    skipRetry = false,
    maxRetries = 1,
    ...fetchOptions
  } = requestInit;

  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt <= maxRetries) {
    try {
      // Prepare headers
      const headers = new Headers(fetchOptions.headers);
      
      // Add auth headers if not skipped
      if (!skipAuth && enhancedAuthService.isAuthenticated()) {
        const authHeaders = await enhancedAuthService.getAuthHeaders();
        Object.entries(authHeaders).forEach(([key, value]) => {
          headers.set(key, value);
        });
      }

      // Ensure Content-Type is set for POST/PUT/PATCH requests with body
      if (!headers.has('Content-Type') && 
          ['POST', 'PUT', 'PATCH'].includes(fetchOptions.method?.toUpperCase() || '') &&
          fetchOptions.body) {
        headers.set('Content-Type', 'application/json');
      }

      const response = await fetch(requestInfo, {
        ...fetchOptions,
        headers
      });

      // Handle successful responses
      if (response.ok) {
        let data: T | undefined;
        
        try {
          const contentType = response.headers.get('content-type');
          if (contentType?.includes('application/json')) {
            data = await response.json();
          } else if (contentType?.includes('text/')) {
            data = await response.text() as unknown as T;
          }
        } catch (parseError) {
          // If parsing fails, we still return the response
          console.warn('Failed to parse response body:', parseError);
        }

        return {
          data,
          success: true,
          status: response.status,
          headers: response.headers
        };
      }

      // Handle authentication errors (401 or 403)
      if ((response.status === 401 || response.status === 403) && !skipAuth && !skipRetry) {
        // If we're already refreshing, queue this request
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedRequestQueue.push({
              resolve,
              reject,
              requestInfo,
              requestInit: { ...requestInit, skipRetry: true } // Don't retry again
            });
          });
        }

        // Try to refresh the token
        const refreshSuccess = await refreshToken();
        
        if (refreshSuccess) {
          // Token refreshed successfully, retry the request
          attempt++;
          continue;
        } else {
          // Refresh failed, clear auth and reject
          await enhancedAuthService.logout();
          return {
            success: false,
            error: 'Authentication failed. Please log in again.',
            status: response.status,
            headers: response.headers
          };
        }
      }

      // Handle other HTTP errors
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        // If we can't parse error as JSON, use the default message
      }

      return {
        success: false,
        error: errorMessage,
        status: response.status,
        headers: response.headers
      };

    } catch (error) {
      lastError = error as Error;
      attempt++;
      
      // If this is the last attempt, return the error
      if (attempt > maxRetries) {
        return {
          success: false,
          error: lastError.message || 'Network error',
          status: 0,
          headers: new Headers()
        };
      }

      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
    }
  }

  // This should never be reached, but just in case
  return {
    success: false,
    error: lastError?.message || 'Unknown error',
    status: 0,
    headers: new Headers()
  };
}

/**
 * Refresh the authentication token
 */
async function refreshToken(): Promise<boolean> {
  if (isRefreshing) {
    // If already refreshing, wait for the existing refresh to complete
    return refreshPromise || false;
  }

  isRefreshing = true;
  refreshPromise = performTokenRefresh();

  try {
    const result = await refreshPromise;
    return result;
  } finally {
    isRefreshing = false;
    refreshPromise = null;
  }
}

/**
 * Perform the actual token refresh
 */
async function performTokenRefresh(): Promise<boolean> {
  try {
    const refreshResult = await enhancedAuthService.refreshToken();
    
    if (refreshResult.success) {
      // Token refreshed successfully, retry all queued requests
      const queuedRequests = [...failedRequestQueue];
      failedRequestQueue.length = 0; // Clear the queue
      
      // Process queued requests
      queuedRequests.forEach(({ resolve, reject, requestInfo, requestInit }) => {
        globalFetch(requestInfo, requestInit)
          .then(resolve)
          .catch(reject);
      });
      
      return true;
    } else {
      // Refresh failed, reject all queued requests
      const queuedRequests = [...failedRequestQueue];
      failedRequestQueue.length = 0;
      
      queuedRequests.forEach(({ reject }) => {
        reject(new Error('Token refresh failed'));
      });
      
      return false;
    }
  } catch (error) {
    console.error('Token refresh error:', error);
    
    // Reject all queued requests
    const queuedRequests = [...failedRequestQueue];
    failedRequestQueue.length = 0;
    
    queuedRequests.forEach(({ reject }) => {
      reject(error);
    });
    
    return false;
  }
}

/**
 * Convenience method for GET requests
 */
export function get<T = any>(url: string, options: FetchOptions = {}): Promise<FetchResponse<T>> {
  return globalFetch<T>(url, { ...options, method: 'GET' });
}

/**
 * Convenience method for POST requests
 */
export function post<T = any>(url: string, data?: any, options: FetchOptions = {}): Promise<FetchResponse<T>> {
  return globalFetch<T>(url, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined
  });
}

/**
 * Convenience method for PUT requests
 */
export function put<T = any>(url: string, data?: any, options: FetchOptions = {}): Promise<FetchResponse<T>> {
  return globalFetch<T>(url, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined
  });
}

/**
 * Convenience method for PATCH requests
 */
export function patch<T = any>(url: string, data?: any, options: FetchOptions = {}): Promise<FetchResponse<T>> {
  return globalFetch<T>(url, {
    ...options,
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined
  });
}

/**
 * Convenience method for DELETE requests
 */
export function del<T = any>(url: string, options: FetchOptions = {}): Promise<FetchResponse<T>> {
  return globalFetch<T>(url, { ...options, method: 'DELETE' });
}

// Export the main function for advanced usage
export default globalFetch;