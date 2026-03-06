describe('Doctor Consultation Workflow', () => {
  beforeEach(() => {
    // Setup authenticated state for Doctor portal
    cy.visit('http://localhost:3000/login');
    cy.get('input[type="text"]').type('doctor@securemed.com');
    cy.get('input[type="password"]').type('DoctorPass123!');
    cy.contains(/login|sign in/i).click();
  });

  it('Displays doctor dashboard and appointments', () => {
    cy.url().should('include', '/doctor');
    cy.contains(/upcoming appointments|schedule/i).should('be.visible');
  });

  it('Allows doctor to view a patient record and add a note', () => {
    cy.visit('http://localhost:3000/doctor/records');
    
    // Assuming there's a list of patients, click the first one's record
    cy.contains(/view record|history/i).first().click({ force: true });
    
    // Add clinical note
    cy.get('textarea').type('Patient reports mild headache. Prescribing rest.', { force: true });
    cy.contains(/save note|submit/i).click({ force: true });
    
    // Verify note was added
    cy.contains('Patient reports mild headache').should('be.visible');
  });
});
