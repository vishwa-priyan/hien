/**
 * HIEN Centralized API Client
 * Connects directly to the FastAPI + PostgreSQL backend on /api
 * Handles JWT Bearer token authentication, error normalization, and fallback.
 */

export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
  timestamp: string;
}

export interface ApiError {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
}

export class ApiClient {
  private static baseUrl: string = '/api';
  private static simulatedLatencyMs: number = 0; // 0 for real backend

  static setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  static getBaseUrl(): string {
    return this.baseUrl;
  }

  static getToken(): string | null {
    return localStorage.getItem('hien_access_token');
  }

  static setToken(token: string) {
    localStorage.setItem('hien_access_token', token);
  }

  static clearToken() {
    localStorage.removeItem('hien_access_token');
  }

  private static getHeaders(isJson: boolean = true): HeadersInit {
    const headers: Record<string, string> = {};
    if (isJson) {
      headers['Content-Type'] = 'application/json';
    }
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const isFormData = options.body instanceof FormData;
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.getHeaders(!isFormData),
        ...(options.headers || {}),
      },
    };

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        let errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
        try {
          const errData = await response.json();
          if (errData && errData.detail) {
            errorMsg = typeof errData.detail === 'string' ? errData.detail : JSON.stringify(errData.detail);
          }
        } catch {
          // not json
        }
        throw {
          status: response.status,
          message: errorMsg,
          timestamp: new Date().toISOString(),
        } as ApiError;
      }
      return (await response.json()) as T;
    } catch (err: any) {
      if (err.status) {
        throw err;
      }
      throw {
        status: 500,
        message: err.message || 'Network request failed',
        timestamp: new Date().toISOString(),
      } as ApiError;
    }
  }

  static async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    let finalUrl = endpoint;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          searchParams.append(k, String(v));
        }
      });
      const qs = searchParams.toString();
      if (qs) {
        finalUrl += (finalUrl.includes('?') ? '&' : '?') + qs;
      }
    }
    return this.request<T>(finalUrl, { method: 'GET' });
  }

  static async post<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  static async put<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  static async patch<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  static async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  static async simulateDelay(): Promise<void> {
    if (this.simulatedLatencyMs > 0) {
      await new Promise(resolve => setTimeout(resolve, this.simulatedLatencyMs));
    }
  }

  static wrapResponse<T>(data: T, message: string = 'Success'): ApiResponse<T> {
    return {
      data,
      status: 200,
      message,
      timestamp: new Date().toISOString(),
    };
  }

  static throwError(message: string, status: number = 400): never {
    throw {
      status,
      message,
      timestamp: new Date().toISOString(),
    } as ApiError;
  }
}
