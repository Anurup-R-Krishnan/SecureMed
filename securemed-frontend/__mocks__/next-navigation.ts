import { jest } from "@jest/globals";

/**
 * Stub for `next/navigation` used in unit tests via jest moduleNameMapper.
 *
 * The next/jest SWC transform in this repo does not reliably apply
 * `jest.mock("next/navigation", ...)` factories, so we redirect the module
 * here instead. Router interactions that matter (redirects, pushes) are
 * asserted at the E2E layer with Cypress.
 */

export const useRouter = () => ({
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn(),
});

export const usePathname = () => "/";

export const useSearchParams = () => new URLSearchParams();

export function redirect(url: string): never {
  throw new Error(`next/navigation redirect called with: ${url}`);
}
