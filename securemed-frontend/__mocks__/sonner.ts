import { jest } from "@jest/globals";

/**
 * Stub for `sonner` toasts used in unit tests via jest moduleNameMapper.
 * Toasts render to the DOM via a portal and are not needed in unit tests;
 * user-visible notifications are covered by Cypress E2E specs.
 */

export const toast = {
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  message: jest.fn(),
  promise: jest.fn(),
};

export function Toaster() {
  return null;
}
