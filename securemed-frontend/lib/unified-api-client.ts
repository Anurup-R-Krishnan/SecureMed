/**
 * Unified API Client for SecureMed Frontend
 *
 * Features:
 * - Centralized error handling
 * - Automatic retry logic with exponential backoff
 * - Request deduplication
 * - Response logging
 * - Type-safe request/response handling
 * - Token management (auth token refresh)
 */

import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from "axios";

// Types
export interface ApiResponse<T = any> {
  data: T;
  status: number;
  message?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiErrorResponse {
  status: number;
  message: string;
  details?: Record<string, any>;
  url?: string;
  method?: string;
  timestamp?: string;
}

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableStatuses: number[];
}

// Constants
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";
const DEFAULT_TIMEOUT = 15000;
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 500,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

// Request deduplication cache
interface CacheEntry {
  promise: Promise<any>;
  timestamp: number;
  expiresAt: number;
}
const requestCache = new Map<string, CacheEntry>();
const CACHE_DURATION_MS = 100; // 100ms cache for deduplication

// Logger
class ApiLogger {
  debug(message: string, data?: any) {
    if (process.env.NODE_ENV === "development") {
    }
  }

  info(message: string, data?: any) {
    if (process.env.NODE_ENV === "development") {
    }
  }

  warn(message: string, data?: any) {}

  error(message: string, error?: any, context?: any) {}
}

const logger = new ApiLogger();

/**
 * Generate a cache key for request deduplication
 */
function getCacheKey(method: string, url: string, data?: any): string {
  const dataStr = data ? JSON.stringify(data) : "";
  return `${method}:${url}:${dataStr}`;
}

/**
 * Get token from localStorage
 */
function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;

  try {
    // Try new format first (access_token/refresh_token)
    const accessToken = localStorage.getItem("access_token");
    if (accessToken) return accessToken;

    // Fallback to old format (auth_tokens object)
    const authTokens = localStorage.getItem("auth_tokens");
    if (authTokens) {
      const tokens = JSON.parse(authTokens);
      return tokens.access || null;
    }
  } catch (e) {
    logger.warn("Failed to retrieve access token", e);
  }
  return null;
}

/**
 * Get refresh token from localStorage
 */
function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;

  try {
    // Try new format first (access_token/refresh_token)
    const refreshToken = localStorage.getItem("refresh_token");
    if (refreshToken) return refreshToken;

    // Fallback to old format (auth_tokens object)
    const authTokens = localStorage.getItem("auth_tokens");
    if (authTokens) {
      const tokens = JSON.parse(authTokens);
      return tokens.refresh || null;
    }
  } catch (e) {
    logger.warn("Failed to retrieve refresh token", e);
  }
  return null;
}

/**
 * Save tokens to localStorage
 */
function saveTokens(accessToken: string, refreshToken?: string): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem("access_token", accessToken);
    if (refreshToken) {
      localStorage.setItem("refresh_token", refreshToken);
    }
  } catch (e) {
    logger.error("Failed to save tokens", e);
  }
}

/**
 * Clear tokens from localStorage
 */
function clearTokens(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("auth_tokens");
    localStorage.removeItem("auth_user");
  } catch (e) {
    logger.error("Failed to clear tokens", e);
  }
}

/**
 * Sleep for a given duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
function getBackoffDelay(retryCount: number, config: RetryConfig): number {
  const delay =
    config.initialDelayMs * Math.pow(config.backoffMultiplier, retryCount);
  return Math.min(delay, config.maxDelayMs);
}

/**
 * Unified API Client Class
 */
export class UnifiedApiClient {
  private client: AxiosInstance;
  private retryConfig: RetryConfig;
  private isRefreshingToken = false;
  private refreshTokenPromise: Promise<string | null> | null = null;

  constructor(retryConfig?: Partial<RetryConfig>) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: DEFAULT_TIMEOUT,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.setupInterceptors();
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const token = getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        logger.debug(`[${config.method?.toUpperCase()}] ${config.url}`);
        return config;
      },
      (error) => {
        logger.error("Request interceptor error", error);
        return Promise.reject(error);
      },
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(`[${response.status}] ${response.config.url}`);
        return response;
      },
      async (error: AxiosError) => {
        const originalConfig = error.config as any;

        // Handle 401 with token refresh
        if (
          error.response?.status === 401 &&
          !originalConfig._retry &&
          getRefreshToken()
        ) {
          originalConfig._retry = true;

          try {
            const newAccessToken = await this.refreshAccessToken();
            if (newAccessToken) {
              originalConfig.headers.Authorization = `Bearer ${newAccessToken}`;
              return this.client(originalConfig);
            }
          } catch (refreshError) {
            logger.error("Token refresh failed", refreshError);
            clearTokens();
            if (typeof window !== "undefined") {
              window.location.href = "/";
            }
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(this.formatError(error));
      },
    );
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(): Promise<string | null> {
    if (this.isRefreshingToken) {
      return this.refreshTokenPromise || null;
    }

    this.isRefreshingToken = true;

    this.refreshTokenPromise = (async () => {
      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) return null;

        const response = await this.client.post<{
          access: string;
          refresh?: string;
        }>("/auth/token/refresh/", { refresh: refreshToken });

        if (response.status === 200) {
          const newAccessToken = response.data.access;
          const newRefreshToken = response.data.refresh;
          saveTokens(newAccessToken, newRefreshToken);
          logger.info("Token refreshed successfully");
          return newAccessToken;
        }
      } catch (error) {
        logger.error("Token refresh failed", error);
      } finally {
        this.isRefreshingToken = false;
        this.refreshTokenPromise = null;
      }

      return null;
    })();

    return this.refreshTokenPromise;
  }

  /**
   * Format error response
   */
  private formatError(error: AxiosError): ApiErrorResponse {
    const response = error.response?.data as any;

    return {
      status: error.response?.status || 500,
      message: this.extractErrorMessage(response || error),
      details: response?.errors || response?.details,
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Extract error message from various response formats
   */
  private extractErrorMessage(error: any): string {
    if (typeof error === "string") return error;
    if (!error) return "An unexpected error occurred";

    if (error.detail) return error.detail;
    if (error.error) return error.error;
    if (error.message) return error.message;
    if (error.errors) {
      const firstError = Object.values(error.errors)[0];
      if (Array.isArray(firstError)) return firstError[0];
      if (typeof firstError === "string") return firstError;
    }

    return "An unexpected error occurred";
  }

  /**
   * Check if error is retryable
   */
  private isRetryable(error: AxiosError): boolean {
    if (!error.response) return true; // Network errors are retryable
    return this.retryConfig.retryableStatuses.includes(error.response.status);
  }

  /**
   * Perform request with retry logic and deduplication
   */
  private async performRequest<T>(
    method: string,
    url: string,
    config?: AxiosRequestConfig,
    data?: any,
  ): Promise<T> {
    const cacheKey = getCacheKey(method, url, data);
    const now = Date.now();

    // Check cache for deduplication
    const cached = requestCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      logger.debug(`[Cache Hit] ${method} ${url}`);
      return cached.promise;
    }

    // Remove expired cache entry
    if (cached && cached.expiresAt <= now) {
      requestCache.delete(cacheKey);
    }

    // Create the request promise
    const requestPromise = (async () => {
      let lastError: AxiosError | null = null;

      for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
        try {
          let response: AxiosResponse<T>;

          switch (method.toUpperCase()) {
            case "GET":
              response = await this.client.get<T>(url, config);
              break;
            case "POST":
              response = await this.client.post<T>(url, data, config);
              break;
            case "PUT":
              response = await this.client.put<T>(url, data, config);
              break;
            case "PATCH":
              response = await this.client.patch<T>(url, data, config);
              break;
            case "DELETE":
              response = await this.client.delete<T>(url, config);
              break;
            default:
              throw new Error(`Unknown HTTP method: ${method}`);
          }

          logger.info(
            `[${method.toUpperCase()}] ${url} - Success on attempt ${attempt + 1}`,
          );
          return response.data;
        } catch (error) {
          lastError = error as AxiosError;

          if (
            !this.isRetryable(lastError) ||
            attempt === this.retryConfig.maxRetries
          ) {
            logger.error(
              `[${method.toUpperCase()}] ${url} - Failed after ${attempt + 1} attempt(s)`,
              lastError,
              { status: lastError.response?.status },
            );
            throw lastError;
          }

          const delay = getBackoffDelay(attempt, this.retryConfig);
          logger.warn(
            `[${method.toUpperCase()}] ${url} - Retrying in ${delay}ms (attempt ${attempt + 2}/${this.retryConfig.maxRetries + 1})`,
            { status: lastError.response?.status },
          );
          await sleep(delay);
        }
      }

      throw lastError || new Error("Unknown error");
    })();

    // Cache the promise
    requestCache.set(cacheKey, {
      promise: requestPromise,
      timestamp: now,
      expiresAt: now + CACHE_DURATION_MS,
    });

    return requestPromise;
  }

  /**
   * GET request
   */
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.performRequest<T>("GET", url, config);
  }

  /**
   * POST request
   */
  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return this.performRequest<T>("POST", url, config, data);
  }

  /**
   * PUT request
   */
  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return this.performRequest<T>("PUT", url, config, data);
  }

  /**
   * PATCH request
   */
  async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return this.performRequest<T>("PATCH", url, config, data);
  }

  /**
   * DELETE request
   */
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.performRequest<T>("DELETE", url, config);
  }

  /**
   * Clear request cache
   */
  clearCache(): void {
    requestCache.clear();
    logger.info("Request cache cleared");
  }

  /**
   * Get cache statistics (for debugging)
   */
  getCacheStats(): {
    size: number;
    entries: Array<{ key: string; expiresIn: number }>;
  } {
    const now = Date.now();
    return {
      size: requestCache.size,
      entries: Array.from(requestCache.entries()).map(([key, entry]) => ({
        key,
        expiresIn: Math.max(0, entry.expiresAt - now),
      })),
    };
  }
}

// Export singleton instance
export const apiClient = new UnifiedApiClient();

// Export for testing/customization
export { ApiLogger, DEFAULT_RETRY_CONFIG };

// Convenience functions (previously in lib/api.ts)
export const getDashboardStats = () => apiClient.get("/medical-records/dashboard/stats/");
