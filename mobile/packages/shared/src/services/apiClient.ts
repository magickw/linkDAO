/**
 * API Client
 * Centralized HTTP client for all API requests
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ENV_CONFIG } from '../constants/environment';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  statusCode?: number;
}

export interface ApiError {
  message: string;
  statusCode?: number;
  code?: string;
  details?: any;
}

class ApiClient {
  private instance: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.instance = axios.create({
      baseURL: ENV_CONFIG.BACKEND_URL,
      timeout: ENV_CONFIG.API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * Set authentication token
   */
  setToken(token: string | null): void {
    this.token = token;
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.instance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // Add auth token if available
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error: AxiosError) => {
        return Promise.reject(this.handleError(error));
      }
    );

    // Response interceptor
    this.instance.interceptors.response.use(
      (response) => {
        return response;
      },
      (error: AxiosError) => {
        return Promise.reject(this.handleError(error));
      }
    );
  }

  /**
   * Handle API errors
   */
  private handleError(error: AxiosError): ApiError {
    if (error.response) {
      // Server responded with error status
      const data = error.response.data as any;
      return {
        message: data?.error || data?.message || 'An error occurred',
        statusCode: error.response.status,
        code: data?.code,
        details: data?.details,
      };
    } else if (error.request) {
      // Request made but no response
      return {
        message: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR',
      };
    } else {
      // Error in request setup
      return {
        message: error.message || 'An unexpected error occurred',
        code: 'REQUEST_ERROR',
      };
    }
  }

  /**
   * GET request
   */
  async get<T = any>(url: string, config?: InternalAxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.instance.get<T>(url, config);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: (error as ApiError).message };
    }
  }

  /**
   * POST request
   */
  async post<T = any>(url: string, data?: any, config?: InternalAxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.instance.post<T>(url, data, config);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: (error as ApiError).message };
    }
  }

  /**
   * PUT request
   */
  async put<T = any>(url: string, data?: any, config?: InternalAxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.instance.put<T>(url, data, config);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: (error as ApiError).message };
    }
  }

  /**
   * PATCH request
   */
  async patch<T = any>(url: string, data?: any, config?: InternalAxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.instance.patch<T>(url, data, config);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: (error as ApiError).message };
    }
  }

  /**
   * DELETE request
   */
  async delete<T = any>(url: string, config?: InternalAxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.instance.delete<T>(url, config);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: (error as ApiError).message };
    }
  }

  /**
   * Upload file
   */
  async upload<T = any>(url: string, file: any, onProgress?: (progress: number) => void): Promise<ApiResponse<T>> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await this.instance.post<T>(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = (progressEvent.loaded / progressEvent.total) * 100;
            onProgress(progress);
          }
        },
      });

      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: (error as ApiError).message };
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();