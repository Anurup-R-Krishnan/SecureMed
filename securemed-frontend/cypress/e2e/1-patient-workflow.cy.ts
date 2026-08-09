describe("Patient Workflow", () => {
  beforeEach(() => {
    cy.viewport(1280, 720);
    cy.login("rahul.verma@example.com", "SecureMed@123");
  });

  it("Loads the patient dashboard", () => {
    cy.url().should("include", "/patient");
    cy.contains(/Personal Health Command Center/i).should("exist");
  });

  it("Loads the appointments page", () => {
    cy.visit("/patient/appointments");
    cy.contains(/Book New Appointment/i).should("be.visible");
  });
});
