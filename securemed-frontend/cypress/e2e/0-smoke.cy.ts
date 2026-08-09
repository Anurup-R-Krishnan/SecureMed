describe("Landing Page Smoke", () => {
  beforeEach(() => {
    cy.viewport(1280, 720);
    cy.visit("/");
  });

  it("Renders the hero without requiring authentication", () => {
    cy.contains("h1", /Healthcare Reimagined/i).should("be.visible");
  });

  it("Exposes the emergency intake and login entry points", () => {
    cy.contains(/Emergency/i).should("exist");
    cy.get('a[href="/login"]').should("be.visible");
  });
});
