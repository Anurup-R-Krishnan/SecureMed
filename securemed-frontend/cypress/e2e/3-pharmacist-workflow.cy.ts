describe("Pharmacist Inventory Workflow", () => {
  beforeEach(() => {
    cy.viewport(1280, 720);
    cy.login("pharmacist@securemed.com", "SecureMed@123");
  });

  it("Allows pharmacist to check stock levels", () => {
    cy.url().should("include", "/pharmacy");
    cy.visit("/pharmacy/inventory");
    cy.contains(/Drugs \(/i).should("be.visible");
  });

  it("Allows pharmacist to view orders", () => {
    cy.visit("/pharmacy/orders");
    cy.contains("h2", /^Orders$/i).should("be.visible");
  });
});
