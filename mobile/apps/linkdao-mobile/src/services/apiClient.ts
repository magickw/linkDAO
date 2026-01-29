/**
 * API Client
 * Axios-based HTTP client for backend API calls
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENV } from '../constants/environment';

const API_URL = ENV.BACKEND_URL;

class ApiClient {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: API_URL,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Request interceptor - add auth token
        this.client.interceptors.request.use(
            async (config) => {
                const token = await AsyncStorage.getItem('auth_token');
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );

        // Response interceptor - handle errors
        this.client.interceptors.response.use(
            (response) => response,
            async (error) => {
                if (error.response?.status === 401) {
                    // Token expired or invalid
                    await AsyncStorage.removeItem('auth_token');
                    // Could trigger logout here
                }
                return Promise.reject(error);
            }
        );
    }

    private handleResponse<T>(response: AxiosResponse): any {
        const backendData = response.data;
        // If backend returns { success: true, data: ... }, extract the data
        if (backendData && typeof backendData === 'object' && 'success' in backendData) {
            if (backendData.success) {
                return { ...response, data: backendData.data as T };
            } else {
                throw new Error(backendData.message || backendData.error || 'API Error');
            }
        }
        return response;
    }

    async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        const response = await this.client.get<T>(url, config);
        return this.handleResponse<T>(response);
    }

    async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        const response = await this.client.post<T>(url, data, config);
        return this.handleResponse<T>(response);
    }

    async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        const response = await this.client.put<T>(url, data, config);
        return this.handleResponse<T>(response);
    }

    async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        const response = await this.client.patch<T>(url, data, config);
        return this.handleResponse<T>(response);
    }

    async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        const response = await this.client.delete<T>(url, config);
        return this.handleResponse<T>(response);
    }
}

export const apiClient = new ApiClient();
