describe('Admin Security Audit Workflow', () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.visit('http://localhost:3000/login');
    cy.get('#email').type('admin@securemed.com');
    cy.get('#password').type('SecureMed@123');
    cy.get('button[type="submit"]').click();
    cy.location('pathname', { timeout: 10000 }).should('not.include', '/login');
  });

  it('Allows admin to view system audit logs', () => {
    cy.url().should('include', '/admin');
    cy.contains(/Hospital Administration Suite/i).should('be.visible');
  });

  it('Ensures admin cannot view clinical patient data without break-glass protocol', () => {
    // Attempt to access a clinical record
    cy.visit('http://localhost:3000/doctor/records');
    cy.url().should('include', '/admin');
  });
});
