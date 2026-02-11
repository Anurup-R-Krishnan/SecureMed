# Pharmacy Inventory API Documentation

## Base URL
```
http://localhost:8000/api/pharmacy/
```

## Authentication
All endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Endpoints

### 1. Drugs Management

#### List All Drugs
```bash
GET /api/pharmacy/drugs/
```

**Example:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/pharmacy/drugs/
```

**Response:**
```json
{
  "count": 10,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "drug_code": "PARA500",
      "name": "Paracetamol",
      "generic_name": "Acetaminophen",
      "manufacturer": "PharmaCorp",
      "dosage_form": "tablet",
      "strength": "500mg",
      "unit_price": "5.00",
      "reorder_level": 100,
      "current_stock": 250,
      "needs_reorder": false
    }
  ]
}
```

#### Search Drugs
```bash
GET /api/pharmacy/drugs/?search=<query>
```

**Example:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/pharmacy/drugs/?search=paracetamol"
```

#### Get Low Stock Drugs
```bash
GET /api/pharmacy/drugs/low_stock/
```

**Example:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/pharmacy/drugs/low_stock/
```

#### Create Drug
```bash
POST /api/pharmacy/drugs/
```

**Example:**
```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "drug_code": "IBUP400",
    "name": "Ibuprofen",
    "generic_name": "Ibuprofen",
    "manufacturer": "MediPharm",
    "dosage_form": "tablet",
    "strength": "400mg",
    "unit_price": 8.50,
    "reorder_level": 50
  }' \
  http://localhost:8000/api/pharmacy/drugs/
```

### 2. Drug Batches

#### List All Batches
```bash
GET /api/pharmacy/batches/
```

#### Get Expiring Soon Batches
```bash
GET /api/pharmacy/batches/expiring_soon/
```

Returns batches expiring within 90 days.

**Example:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/pharmacy/batches/expiring_soon/
```

#### Get Expired Batches
```bash
GET /api/pharmacy/batches/expired/
```

**Example:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/pharmacy/batches/expired/
```

#### Create Batch
```bash
POST /api/pharmacy/batches/
```

**Example:**
```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "drug": 1,
    "batch_number": "BATCH001",
    "quantity": 500,
    "expiry_date": "2026-12-31",
    "supplier": "Global Pharma",
    "purchase_price": 4.50
  }' \
  http://localhost:8000/api/pharmacy/batches/
```

**Note:** Creating a batch automatically updates the drug stock.

### 3. Stock Transactions

#### List Transaction History
```bash
GET /api/pharmacy/transactions/
```

**Example:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/pharmacy/transactions/
```

#### Create Transaction
```bash
POST /api/pharmacy/transactions/
```

**Transaction Types:**
- `purchase` - Add stock
- `dispense` - Remove stock (prescription fulfillment)
- `return` - Add stock (patient return)
- `adjustment` - Remove stock (inventory adjustment)
- `expired` - Remove stock (expired drugs)

**Example - Purchase:**
```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "drug": 1,
    "transaction_type": "purchase",
    "quantity": 100,
    "notes": "Monthly stock replenishment"
  }' \
  http://localhost:8000/api/pharmacy/transactions/
```

**Example - Dispense:**
```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "drug": 1,
    "transaction_type": "dispense",
    "quantity": 10,
    "notes": "Prescription #12345"
  }' \
  http://localhost:8000/api/pharmacy/transactions/
```

**Note:** Stock is automatically updated based on transaction type.

### 4. Stock Alerts

#### Get Stock Alerts
```bash
GET /api/pharmacy/stock/alerts/
```

Returns drugs that need reordering (stock <= reorder_level).

**Example:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/pharmacy/stock/alerts/
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Insufficient stock",
  "detail": "Cannot dispense 50 units. Available: 30"
}
```

### 401 Unauthorized
```json
{
  "detail": "Authentication credentials were not provided."
}
```

### 404 Not Found
```json
{
  "detail": "Not found."
}
```

### 429 Too Many Requests
```json
{
  "error": "Rate limit exceeded",
  "detail": "Too many requests. Please try again later.",
  "retry_after": 60
}
```

## Complete Workflow Example

### 1. Login
```bash
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"pharmacist","password":"Pharma@2026"}' \
  | jq -r '.access')
```

### 2. Create a Drug
```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "drug_code": "AMOX500",
    "name": "Amoxicillin",
    "generic_name": "Amoxicillin",
    "manufacturer": "AntiBio Pharma",
    "dosage_form": "capsule",
    "strength": "500mg",
    "unit_price": 12.00,
    "reorder_level": 75
  }' \
  http://localhost:8000/api/pharmacy/drugs/
```

### 3. Add Stock via Batch
```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "drug": 1,
    "batch_number": "AMX2026001",
    "quantity": 200,
    "expiry_date": "2027-06-30",
    "supplier": "AntiBio Pharma",
    "purchase_price": 10.00
  }' \
  http://localhost:8000/api/pharmacy/batches/
```

### 4. Dispense Medication
```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "drug": 1,
    "transaction_type": "dispense",
    "quantity": 20,
    "notes": "Prescription #67890"
  }' \
  http://localhost:8000/api/pharmacy/transactions/
```

### 5. Check Low Stock
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/pharmacy/drugs/low_stock/
```

### 6. Check Expiring Batches
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/pharmacy/batches/expiring_soon/
```

## Notes

- All data comes from the database - no mock/dummy data
- Stock updates are automatic and transactional
- Insufficient stock validation prevents over-dispensing
- Expiry tracking with 90-day alerts
- Complete audit trail via transaction history
- Rate limiting: 100 requests/minute (default)
