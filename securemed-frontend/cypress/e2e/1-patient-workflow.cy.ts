describe('Patient Workflow', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/login');
    cy.get('#email').type('rahul.verma@example.com');
    cy.get('#password').type('SecureMed@123');
    cy.get('button[type="submit"]').click();
  });

  it('Loads the patient dashboard', () => {
    cy.url().should('include', '/patient');
    cy.contains(/Personal Health Command Center/i).should('be.visible');
  });

  it('Loads the appointments page', () => {
    cy.visit('http://localhost:3000/patient/appointments');
    cy.contains(/Book New Appointment/i).should('be.visible');
  });
});
