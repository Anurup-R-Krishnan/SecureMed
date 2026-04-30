/**
 * Centralised URL constants for the SecureMed frontend.
 *
 * All /api/* requests are proxied by Next.js rewrites (next.config.mjs)
 * to the Django backend, so we use a relative base URL in the browser.
 *
 * NEXT_PUBLIC_API_URL  – set in docker-compose / .env (defaults to /api)
 * BACKEND_URL          – server-side only, used by Next.js rewrites
 */

/** Relative base used by axios / fetch in the browser (goes through Next.js proxy). */
export const API_BASE_URL: string = process.env.NEXT_PUBLIC_API_URL ?? "/api";

/**
 * The raw backend origin – used when a full absolute URL is needed
 * (e.g. WebSocket connections, server-side fetches).
 * Falls back to localhost for local dev outside Docker.
 */
export const API_ORIGIN: string =
  process.env.NEXT_PUBLIC_BACKEND_ORIGIN ?? "http://localhost:8000";
