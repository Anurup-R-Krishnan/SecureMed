describe('Doctor Consultation Workflow', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/login');
    cy.get('#email').type('dr.smith@securemed.com');
    cy.get('#password').type('SecureMed@123');
    cy.get('button[type="submit"]').click();
  });

  it('Displays doctor dashboard and appointments', () => {
    cy.url().should('include', '/doctor');
    cy.contains(/Clinical Command Center Active/i).should('be.visible');
  });

  it('Allows doctor to view medical records', () => {
    cy.visit('http://localhost:3000/doctor/records');
    cy.contains(/Medical Records/i).should('be.visible');
  });
});
