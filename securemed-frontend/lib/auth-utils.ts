/**
 * Auth Token Utilities
 * Centralized functions for managing JWT tokens in localStorage
 */

export interface AuthTokens {
  access: string;
  refresh: string;
}

export function parseJSON<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    return null;
  }
}

/**
 * Get the access token from localStorage
 */
export function getAccessToken(): string | null {
  try {
    const storedTokens = localStorage.getItem("auth_tokens");
    if (storedTokens) {
      const tokens = parseJSON<AuthTokens>(storedTokens);
      return tokens?.access || null;
    }
  } catch (e) {}
  return null;
}

/**
 * Get the refresh token from localStorage
 */
export function getRefreshToken(): string | null {
  try {
    const storedTokens = localStorage.getItem("auth_tokens");
    if (storedTokens) {
      const tokens = parseJSON<AuthTokens>(storedTokens);
      return tokens?.refresh || null;
    }
  } catch (e) {}
  return null;
}

/**
 * Check if user is authenticated (has valid tokens)
 */
export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

/**
 * Get authorization header value
 */
export function getAuthHeader(): string | null {
  const token = getAccessToken();
  return token ? `Bearer ${token}` : null;
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: string;
  [key: string]: any;
}

export function getCurrentUser(): AuthUser | null {
  try {
    const storedUser = localStorage.getItem("auth_user");
    if (storedUser) {
      return JSON.parse(storedUser) as AuthUser;
    }
  } catch (e) {}
  return null;
}
