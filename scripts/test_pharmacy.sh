#!/bin/bash

echo "🧪 Testing Pharmacy Endpoints..."
echo ""

# Login as pharmacist
echo "1️⃣ Logging in as pharmacist..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"pharmacist@securemed.com","password":"Pharma@2026"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  echo "$LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login successful"
echo ""

# Get pharmacy orders
echo "2️⃣ Fetching pharmacy orders..."
ORDERS=$(curl -s -X GET http://localhost:8000/api/medical-records/pharmacy-orders/ \
  -H "Authorization: Bearer $TOKEN")

echo "$ORDERS" | head -c 500
echo ""
echo ""

# Check if there are any orders
ORDER_COUNT=$(echo "$ORDERS" | grep -o '"id"' | wc -l)
echo "📦 Found $ORDER_COUNT pharmacy orders"
echo ""

if [ "$ORDER_COUNT" -gt 0 ]; then
  # Get first order ID
  ORDER_ID=$(echo "$ORDERS" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
  echo "3️⃣ Testing verify endpoint for order #$ORDER_ID..."
  
  VERIFY=$(curl -s -X POST http://localhost:8000/api/medical-records/pharmacy-orders/$ORDER_ID/verify/ \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"pickup_code":"TEST123"}')
  
  echo "$VERIFY"
  echo ""
fi

echo "✅ Pharmacy endpoints are accessible"
