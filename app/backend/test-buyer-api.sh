#!/bin/bash

# API Endpoint Testing Script for Centralized Buyer Data System
# Make sure your backend server is running: npm run dev

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="http://localhost:5000"
AUTH_TOKEN="${AUTH_TOKEN:-your-test-token-here}"

echo -e "${BLUE}=== Centralized Buyer Data System API Tests ===${NC}\n"

# Function to make API calls
api_test() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo -e "${BLUE}Testing: ${description}${NC}"
    echo "  ${method} ${endpoint}"
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X ${method} \
            "${API_BASE_URL}${endpoint}" \
            -H "Authorization: Bearer ${AUTH_TOKEN}" \
            -H "Content-Type: application/json")
    else
        response=$(curl -s -w "\n%{http_code}" -X ${method} \
            "${API_BASE_URL}${endpoint}" \
            -H "Authorization: Bearer ${AUTH_TOKEN}" \
            -H "Content-Type: application/json" \
            -d "${data}")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "  ${GREEN}✓ Success (${http_code})${NC}"
        echo "  Response: $(echo $body | jq -C '.' 2>/dev/null || echo $body)"
    else
        echo -e "  ${RED}✗ Failed (${http_code})${NC}"
        echo "  Response: $(echo $body | jq -C '.' 2>/dev/null || echo $body)"
    fi
    echo ""
}

# 1. ADDRESS ENDPOINTS
echo -e "${BLUE}=== 1. Address Management Tests ===${NC}\n"

api_test "GET" "/api/user/addresses" "" "Get all addresses"

api_test "POST" "/api/user/addresses" '{
  "addressType": "shipping",
  "label": "Home",
  "firstName": "John",
  "lastName": "Doe",
  "addressLine1": "123 Main St",
  "addressLine2": "Apt 4B",
  "city": "San Francisco",
  "state": "CA",
  "postalCode": "94102",
  "country": "US",
  "phone": "+1-555-0123",
  "isDefault": true,
  "deliveryInstructions": "Leave at front door"
}' "Create new shipping address"

api_test "POST" "/api/user/addresses" '{
  "addressType": "billing",
  "label": "Work",
  "firstName": "John",
  "lastName": "Doe",
  "addressLine1": "456 Office Blvd",
  "city": "San Francisco",
  "state": "CA",
  "postalCode": "94103",
  "country": "US",
  "isDefault": true
}' "Create new billing address"

# Store the first address ID for further tests (you'll need to update this manually)
ADDRESS_ID="replace-with-actual-id"

# api_test "GET" "/api/user/addresses/${ADDRESS_ID}" "" "Get specific address"
# api_test "PUT" "/api/user/addresses/${ADDRESS_ID}" '{"label": "Home (Updated)"}' "Update address"
# api_test "POST" "/api/user/addresses/${ADDRESS_ID}/set-default" "" "Set address as default"

# 2. PAYMENT METHOD ENDPOINTS
echo -e "${BLUE}=== 2. Payment Method Tests ===${NC}\n"

api_test "GET" "/api/user/payment-methods" "" "Get all payment methods"

api_test "POST" "/api/user/payment-methods" '{
  "methodType": "credit_card",
  "provider": "stripe",
  "label": "Personal Visa",
  "cardLast4": "4242",
  "cardBrand": "visa",
  "cardExpMonth": 12,
  "cardExpYear": 2025,
  "stripePaymentMethodId": "pm_test_123456",
  "isDefault": true
}' "Add credit card payment method"

api_test "POST" "/api/user/payment-methods" '{
  "methodType": "crypto_wallet",
  "provider": "metamask",
  "label": "MetaMask Wallet",
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "walletType": "metamask",
  "chainId": 1,
  "isDefault": false
}' "Add crypto wallet payment method"

# 3. WISHLIST ENDPOINTS
echo -e "${BLUE}=== 3. Wishlist Tests ===${NC}\n"

api_test "GET" "/api/user/wishlists" "" "Get all wishlists"

api_test "POST" "/api/user/wishlists" '{
  "name": "Holiday Gifts",
  "description": "Gifts for the holidays",
  "isPublic": false
}' "Create new wishlist"

api_test "POST" "/api/user/wishlists" '{
  "name": "Birthday Wishlist",
  "description": "Things I want for my birthday",
  "isPublic": true
}' "Create public wishlist"

# Store wishlist ID for item tests (update manually)
WISHLIST_ID="replace-with-actual-id"
PRODUCT_ID="replace-with-actual-product-id"

# api_test "GET" "/api/user/wishlists/${WISHLIST_ID}/items" "" "Get wishlist items"
# api_test "POST" "/api/user/wishlists/${WISHLIST_ID}/items" "{
#   \"productId\": \"${PRODUCT_ID}\",
#   \"quantity\": 2,
#   \"priority\": \"high\",
#   \"notes\": \"Size Large\",
#   \"priceAtAdd\": 99.99,
#   \"priceAlertThreshold\": 79.99
# }" "Add item to wishlist"

# 4. BUYER PROFILE ENDPOINTS
echo -e "${BLUE}=== 4. Buyer Profile Tests ===${NC}\n"

api_test "GET" "/api/user/buyer-profile" "" "Get buyer profile"

api_test "GET" "/api/user/buyer-profile/stats" "" "Get buyer statistics"

api_test "PUT" "/api/user/buyer-profile/preferences" '{
  "preferredCurrency": "USD",
  "emailNotifications": true,
  "smsNotifications": false,
  "pushNotifications": true,
  "marketingEmails": false,
  "priceDropAlerts": true
}' "Update buyer preferences"

api_test "PUT" "/api/user/buyer-profile/visibility" '{
  "visibility": "private"
}' "Update profile visibility"

echo -e "${BLUE}=== Test Summary ===${NC}"
echo "All tests completed. Review the results above."
echo ""
echo "Note: Some tests are commented out because they require actual IDs."
echo "After creating resources, update the script with real IDs to test those endpoints."
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo "1. Review test results"
echo "2. Update ADDRESS_ID, WISHLIST_ID, PRODUCT_ID with real values"
echo "3. Uncomment and run additional tests"
echo "4. Build frontend components"
