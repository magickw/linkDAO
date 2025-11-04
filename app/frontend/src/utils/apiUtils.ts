import { API_BASE_URL, FALLBACK_API_URL } from '../config/api';

interface RetryOptions {
  maxAttempts?: number;
  backoffMs?: number;
  maxBackoffMs?: number;
}

const defaultRetryOptions: RetryOptions = {
  maxAttempts: 3,
  backoffMs: 3000,
  maxBackoffMs: 30000,
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function fetchWithRetry<T>(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<T> {
  const { maxAttempts, backoffMs, maxBackoffMs } = {
    ...defaultRetryOptions,
    ...retryOptions,
  };

  let lastError: Error | null = null;
  let attempt = 0;

  const urls = [
    url,
    url.replace(API_BASE_URL, FALLBACK_API_URL)
  ];

  while (attempt < maxAttempts!) {
    for (const currentUrl of urls) {
      try {
        const response = await fetch(currentUrl, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });

        if (!response.ok) {
          throw new ApiError(
            `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            await response.json().catch(() => null)
          );
        }

        return await response.json();
      } catch (error) {
        lastError = error as Error;
        console.warn(
          `Request failed for ${currentUrl}, attempt ${attempt + 1}/${maxAttempts}:`,
          error
        );
      }
    }

    attempt++;
    if (attempt < maxAttempts!) {
      const delay = Math.min(backoffMs! * Math.pow(2, attempt - 1), maxBackoffMs!);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Request failed after all attempts');
}