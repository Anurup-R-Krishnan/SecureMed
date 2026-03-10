describe('Pharmacist Inventory Workflow', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/login');
    cy.get('#email').type('pharmacist@securemed.com');
    cy.get('#password').type('SecureMed@123');
    cy.get('button[type="submit"]').click();
  });

  it('Allows pharmacist to check stock levels', () => {
    cy.url().should('include', '/pharmacy');
    cy.visit('http://localhost:3000/pharmacy/inventory');
    cy.contains(/Drugs \\(/i).should('be.visible');
  });

  it('Allows pharmacist to view orders', () => {
    cy.visit('http://localhost:3000/pharmacy/orders');
    cy.contains(/Recent Orders|Process Orders/i).should('be.visible');
  });
});
