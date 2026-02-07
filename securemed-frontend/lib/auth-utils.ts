/**
 * Auth Token Utilities
 * Centralized functions for managing JWT tokens in localStorage
 */

export interface AuthTokens {
    access: string;
    refresh: string;
}

/**
 * Get the access token from localStorage
 */
export function getAccessToken(): string | null {
    try {
        const storedTokens = localStorage.getItem('auth_tokens');
        if (storedTokens) {
            const tokens: AuthTokens = JSON.parse(storedTokens);
            return tokens.access || null;
        }
    } catch (e) {
        console.error('Failed to parse auth tokens:', e);
    }
    return null;
}

/**
 * Get the refresh token from localStorage
 */
export function getRefreshToken(): string | null {
    try {
        const storedTokens = localStorage.getItem('auth_tokens');
        if (storedTokens) {
            const tokens: AuthTokens = JSON.parse(storedTokens);
            return tokens.refresh || null;
        }
    } catch (e) {
        console.error('Failed to parse auth tokens:', e);
    }
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
