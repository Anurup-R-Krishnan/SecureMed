describe('Patient Workflow', () => {
  beforeEach(() => {
    // Navigate to local frontend URL before each test
    cy.visit('http://localhost:3000');
  });

  it('Allows a new patient to register an account', () => {
    cy.contains(/login|register|get started/i).click();
    cy.get('input[type="text"]').first().type('newpatient@test.com');
    cy.get('input[type="password"]').first().type('SecurePass123!');
    cy.contains(/submit|register|sign up/i).click();
    
    // Verify successful routing
    cy.url().should('include', '/dashboard');
    cy.contains(/welcome|profile/i).should('be.visible');
  });

  it('Allows a patient to request an appointment', () => {
    cy.visit('http://localhost:3000/patient/dashboard');
    cy.contains(/book appointment|schedule/i).click({ force: true });
    
    // Select doctor
    cy.get('select').first().select(1);
    cy.get('input[type="date"]').type('2026-12-01');
    cy.contains(/confirm|book/i).click();
    
    cy.contains(/success|scheduled/i).should('be.visible');
  });
});
