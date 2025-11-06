#!/bin/bash

# Test script to verify session ID handling in curl requests
SESSION_ID="60AF5E95-B327-4802-A981-1393E6E16150"
echo "Session ID: $SESSION_ID"

echo "=== Testing CSRF Token Generation ==="
CSRF_RESPONSE=$(curl -s -D - https://api.linkdao.io/api/csrf-token -H "x-session-id: $SESSION_ID")
echo "Response headers:"
echo "$CSRF_RESPONSE" | head -n -1
echo "Response body:"
echo "$CSRF_RESPONSE" | tail -n 1 | jq .

CSRF_TOKEN=$(echo "$CSRF_RESPONSE" | tail -n 1 | jq -r '.data.csrfToken')
echo "Extracted CSRF Token: $CSRF_TOKEN"

echo "=== Testing Post Creation ==="
POST_RESPONSE=$(curl -s -D - -X POST https://api.linkdao.io/api/posts \
  -H "Content-Type: application/json" \
  -H "x-session-id: $SESSION_ID" \
  -H "x-csrf-token: $CSRF_TOKEN" \
  -d '{"author": "0x123", "content": "Test post"}')
  
echo "Response headers:"
echo "$POST_RESPONSE" | head -n -1
echo "Response body:"
echo "$POST_RESPONSE" | tail -n 1 | jq .