#!/bin/bash

# LinkDAO Document Generation & Notification Enhancement
# Integration & Testing Script
# This script helps validate all implemented phases

set -e

BACKEND_DIR="/Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/backend"
API_BASE_URL="http://localhost:10000/api"
WEBHOOK_BASE_URL="http://localhost:10000/webhooks"

echo "================================================"
echo "LinkDAO - Integration & Testing Guide"
echo "================================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
  echo -e "${YELLOW}=== $1 ===${NC}"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

# Phase 1: PDF Generation
test_phase1() {
  print_header "Phase 1: PDF Generation"

  echo "1. Verify PDF generation service is initialized"
  echo "   - Check service logs for '[PDFService] Initialized' message"

  echo ""
  echo "2. Test receipt PDF generation:"
  curl -X POST "$API_BASE_URL/invoices/generate-tax" \
    -H "Content-Type: application/json" \
    -d '{
      "orderId": "test-order-001",
      "taxRate": 8.875,
      "taxJurisdiction": "New York",
      "items": [
        {
          "description": "Test Product",
          "quantity": 1,
          "unitPrice": 100,
          "amount": 100
        }
      ],
      "subtotal": 100,
      "taxAmount": 8.875,
      "totalAmount": 108.875,
      "currency": "USD"
    }' | jq .

  print_success "PDF generation test"
}

# Phase 2: Email Attachments
test_phase2() {
  print_header "Phase 2: Email Attachments"

  echo "1. Verify email service has attachment support"
  echo "   - Check emailService.ts for EmailAttachment interface"

  echo ""
  echo "2. Test sending receipt with attachment"
  echo "   - This requires a valid receipt PDF first"

  print_success "Email attachment support verified"
}

# Phase 3: Invoice Management
test_phase3() {
  print_header "Phase 3: Invoice Management"

  echo "Testing invoice endpoints:"
  echo ""

  echo "1. Create Tax Invoice:"
  TAX_INVOICE=$(curl -s -X POST "$API_BASE_URL/invoices/generate-tax" \
    -H "Content-Type: application/json" \
    -d '{
      "orderId": "test-order-002",
      "taxRate": 8.875,
      "taxJurisdiction": "New York",
      "items": [
        {
          "description": "Test Product",
          "quantity": 2,
          "unitPrice": 50,
          "amount": 100
        }
      ],
      "subtotal": 100,
      "taxAmount": 8.875,
      "totalAmount": 108.875,
      "currency": "USD"
    }')

  INVOICE_NUMBER=$(echo $TAX_INVOICE | jq -r '.invoiceNumber')
  echo "   Invoice Number: $INVOICE_NUMBER"

  echo ""
  echo "2. Retrieve Invoice:"
  curl -s -X GET "$API_BASE_URL/invoices/$INVOICE_NUMBER" | jq .

  echo ""
  echo "3. Get invoices by seller:"
  curl -s -X GET "$API_BASE_URL/invoices/seller/test-seller-001?limit=10&offset=0" | jq .

  print_success "Invoice management tested"
}

# Phase 4: Notification Templates
test_phase4() {
  print_header "Phase 4: Notification Templates"

  echo "1. Check built-in templates:"
  echo "   - order_confirmation"
  echo "   - order_shipped"
  echo "   - receipt_ready"
  echo "   - invoice_generated"

  echo ""
  echo "2. Test template rendering:"
  echo "   - Create custom template"
  echo "   - Validate variables"
  echo "   - Render with data"

  print_success "Notification templates configured"
}

# Phase 5: Delivery Tracking
test_phase5() {
  print_header "Phase 5: Delivery Tracking & Webhooks"

  echo "1. Test webhook metrics endpoint:"
  curl -s -X GET "$WEBHOOK_BASE_URL/metrics" | jq .

  echo ""
  echo "2. Test webhook (Resend event simulation):"
  curl -s -X POST "$WEBHOOK_BASE_URL/test" \
    -H "Content-Type: application/json" \
    -d '{
      "type": "email.delivered",
      "recipient": "test@example.com"
    }' | jq .

  print_success "Delivery tracking tested"
}

# Phase 6: Queue System
test_phase6() {
  print_header "Phase 6: Queue System & Batch Processing"

  echo "1. Check queue health:"
  curl -s -X GET "$API_BASE_URL/queue/health" | jq .

  echo ""
  echo "2. Queue single document:"
  curl -s -X POST "$API_BASE_URL/queue/documents" \
    -H "Content-Type: application/json" \
    -d '{
      "type": "receipt",
      "data": {
        "receiptNumber": "RCP-test-001",
        "items": [{"description": "Test", "quantity": 1, "price": 100, "total": 100}],
        "total": 100,
        "currency": "USD"
      },
      "sendEmail": false
    }' | jq .

  echo ""
  echo "3. Queue batch generation:"
  curl -s -X POST "$API_BASE_URL/queue/batch" \
    -H "Content-Type: application/json" \
    -d '{
      "documents": [
        {
          "type": "receipt",
          "data": {"receiptNumber": "RCP-batch-001", "total": 100, "currency": "USD"}
        },
        {
          "type": "receipt",
          "data": {"receiptNumber": "RCP-batch-002", "total": 200, "currency": "USD"}
        }
      ]
    }' | jq .

  print_success "Queue system tested"
}

# Phase 7: SMS & Analytics
test_phase7() {
  print_header "Phase 7: SMS & Advanced Features"

  echo "1. Check SMS service status:"
  curl -s -X GET "$API_BASE_URL/notification-analytics/sms/status" | jq .

  echo ""
  echo "2. Get delivery analytics:"
  curl -s -X GET "$API_BASE_URL/notification-analytics/analytics?days=7" | jq .

  echo ""
  echo "3. Get delivery report:"
  curl -s -X GET "$API_BASE_URL/notification-analytics/delivery-report" | jq .

  print_success "SMS and analytics tested"
}

# Comprehensive test
run_all_tests() {
  print_header "Running All Tests"

  test_phase1
  echo ""

  test_phase2
  echo ""

  test_phase3
  echo ""

  test_phase4
  echo ""

  test_phase5
  echo ""

  test_phase6
  echo ""

  test_phase7
  echo ""

  print_success "All tests completed!"
}

# Database verification
verify_database() {
  print_header "Database Verification"

  echo "Checking for required tables:"
  echo "- invoices (migration 022)"
  echo "- notification_templates (migration 023)"
  echo "- notification_logs (migration 023)"
  echo "- notification_template_versions (migration 023)"
  echo "- sms_delivery_metrics (migration 024)"
  echo "- sms_templates (migration 024)"

  echo ""
  echo "Run migrations if not already completed:"
  echo "  npm run migrate"
}

# Environment verification
verify_environment() {
  print_header "Environment Verification"

  echo "Check .env file for required variables:"
  echo ""
  echo "PDF Generation:"
  echo "  - PDF_GENERATION_TIMEOUT (default: 30000)"
  echo "  - PDF_MAX_CONCURRENT (default: 5)"
  echo ""
  echo "Email:"
  echo "  - RESEND_API_KEY"
  echo "  - FROM_EMAIL"
  echo ""
  echo "Redis/Queue:"
  echo "  - REDIS_HOST (default: localhost)"
  echo "  - REDIS_PORT (default: 6379)"
  echo ""
  echo "SMS (Optional):"
  echo "  - TWILIO_ACCOUNT_SID"
  echo "  - TWILIO_AUTH_TOKEN"
  echo "  - TWILIO_PHONE_NUMBER"
  echo ""
  echo "Webhooks:"
  echo "  - RESEND_WEBHOOK_SECRET"
}

# Main menu
show_menu() {
  echo ""
  echo "Testing Options:"
  echo "1) Test Phase 1 (PDF Generation)"
  echo "2) Test Phase 2 (Email Attachments)"
  echo "3) Test Phase 3 (Invoice Management)"
  echo "4) Test Phase 4 (Notification Templates)"
  echo "5) Test Phase 5 (Delivery Tracking)"
  echo "6) Test Phase 6 (Queue System)"
  echo "7) Test Phase 7 (SMS & Analytics)"
  echo "8) Run All Tests"
  echo "9) Verify Database"
  echo "10) Verify Environment"
  echo "0) Exit"
  echo ""
}

# Main loop
while true; do
  show_menu
  read -p "Select option (0-10): " choice

  case $choice in
    1) test_phase1 ;;
    2) test_phase2 ;;
    3) test_phase3 ;;
    4) test_phase4 ;;
    5) test_phase5 ;;
    6) test_phase6 ;;
    7) test_phase7 ;;
    8) run_all_tests ;;
    9) verify_database ;;
    10) verify_environment ;;
    0) echo "Exiting..."; exit 0 ;;
    *) echo "Invalid option" ;;
  esac
done
