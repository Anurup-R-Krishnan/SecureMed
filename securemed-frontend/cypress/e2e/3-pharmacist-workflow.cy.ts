describe('Pharmacist Inventory Workflow', () => {
  beforeEach(() => {
    // Authenticate as pharmacist
    cy.visit('http://localhost:3000/login');
    cy.get('input[type="text"]').type('pharmacist@securemed.com');
    cy.get('input[type="password"]').type('PharmaPass123!');
    cy.contains(/login|sign in/i).click();
  });

  it('Allows pharmacist to check stock levels', () => {
    cy.url().should('include', '/pharmacy');
    cy.contains(/inventory|stock|medications/i).should('be.visible');
    
    // Check for low stock alerts
    cy.contains(/low stock|reorder/i).should('exist');
  });

  it('Allows pharmacist to view and process a prescription order', () => {
    cy.visit('http://localhost:3000/pharmacy/orders');
    
    // Find a pending prescription and dispense it
    cy.contains(/pending|new order/i).first().click();
    cy.contains(/dispense|fulfill/i).click();
    
    // Verify successful dispensing
    cy.contains(/success|dispensed/i).should('be.visible');
  });
});
