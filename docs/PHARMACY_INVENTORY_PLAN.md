# Pharmacy Inventory Management Implementation Plan

## Task 1: Backend Models & Database
- Create Drug model (drug_code, name, generic_name, manufacturer, dosage_form, strength, unit_price, reorder_level)
- Create DrugStock model (drug, quantity, last_updated)
- Create DrugBatch model (drug, batch_number, quantity, manufacturing_date, expiry_date, supplier, purchase_price)
- Create StockTransaction model (drug, batch, transaction_type, quantity, reference_id, performed_by, notes)
- Create migrations
- Run migrations

## Task 2: Backend Serializers
- DrugSerializer (with stock_quantity, needs_reorder)
- DrugStockSerializer
- DrugBatchSerializer (with is_expired, days_to_expiry)
- StockTransactionSerializer

## Task 3: Backend Views & APIs
- DrugViewSet (CRUD, search, low_stock action)
- DrugStockViewSet (read-only, alerts action)
- DrugBatchViewSet (CRUD, expiring_soon, expired actions)
- StockTransactionViewSet (create with stock update, list with filters)

## Task 4: Backend URLs
- /api/pharmacy/drugs/
- /api/pharmacy/stock/
- /api/pharmacy/batches/
- /api/pharmacy/transactions/

## Task 5: Frontend - Inventory List Page
- Display all drugs with current stock
- Search by name/generic name/drug code
- Show low stock alerts
- No mock data - fetch from API

## Task 6: Frontend - Add Drug Form
- Form to add new drug
- Fields: drug_code, name, generic_name, manufacturer, dosage_form, strength, unit_price, reorder_level
- Submit to API

## Task 7: Frontend - Batch Management
- List batches by drug
- Show expiry dates with alerts
- Add new batch form
- Mark expired batches

## Task 8: Frontend - Stock Transactions
- Record stock in/out
- Transaction types: purchase, dispense, return, adjustment, expired
- Auto-update stock levels
- Transaction history view

## Task 9: Frontend - Dashboard/Alerts
- Low stock alerts
- Expiring soon alerts (90 days)
- Expired batches list
- Stock summary

## Task 10: Integration & Testing
- Test all CRUD operations
- Test stock updates on transactions
- Test batch expiry calculations
- Verify no mock/fallback data
