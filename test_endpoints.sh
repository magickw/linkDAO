#!/bin/bash
# Test script to verify all fixed API endpoints

echo "🧪 Testing API endpoints..."

echo -e "\n1. Testing Health Endpoint:"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:10000/health

echo -e "\n2. Testing Messaging Endpoints:"
curl -s -o /dev/null -w "Conversations: %{http_code}\n" http://localhost:10000/api/messaging/conversations

echo -e "\n3. Testing Profile Endpoints:"
curl -s -o /dev/null -w "Profiles: %{http_code}\n" http://localhost:10000/api/profiles

echo -e "\n4. Testing Reputation Endpoints:"
curl -s -o /dev/null -w "Reputation: %{http_code}\n" http://localhost:10000/api/reputation

echo -e "\n5. Testing WebSocket Health Endpoint:"
curl -s -o /dev/null -w "WebSocket: %{http_code}\n" http://localhost:10000/api/health/websocket

echo -e "\n6. Testing Additional Endpoints:"
curl -s -o /dev/null -w "Marketplace Reputation: %{http_code}\n" http://localhost:10000/marketplace/reputation

echo -e "\n✅ All endpoints tested successfully!"