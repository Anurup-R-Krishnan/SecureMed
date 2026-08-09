// Custom Cypress commands used across the SecureMed E2E suite.
//
// Adding a new command:
// 1. Implement it below with Cypress.Commands.add
// 2. Declare its type in the Cypress namespace so specs typecheck

/**
 * Log in through the UI as a seeded portal user.
 *
 * Requires the Next dev server and Django backend to be running with the
 * seed data present (see securemed-backend seed scripts).
 *
 * @example cy.login("rahul.verma@example.com", "SecureMed@123")
 */
Cypress.Commands.add(
  "login",
  (email: string, password: string) => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.visit("/login");
    cy.get("#email").type(email);
    cy.get("#password").type(password);
    cy.get('button[type="submit"]').click();
    // Wait for the SPA to finish authenticating and redirect away from /login
    cy.location("pathname", { timeout: 10000 }).should("not.include", "/login");
  },
);

declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
    }
  }
}

export {};
