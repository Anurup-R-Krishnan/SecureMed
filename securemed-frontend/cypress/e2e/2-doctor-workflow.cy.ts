describe("Doctor Consultation Workflow", () => {
  beforeEach(() => {
    cy.login("dr.smith@securemed.com", "SecureMed@123");
  });

  it("Displays doctor dashboard and appointments", () => {
    cy.url().should("include", "/doctor");
    cy.contains(/Clinical Command Center Active/i).should("be.visible");
  });

  it("Allows doctor to view medical records", () => {
    cy.visit("/doctor/records");
    cy.contains(/Medical Records/i).should("be.visible");
  });
});
