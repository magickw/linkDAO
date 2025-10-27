#!/bin/bash
# LDAO Purchase Flow - Quick Test Script
# Run this to verify the frontend is working

set -e

echo "🚀 LDAO Token Purchase - Quick Test Setup"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -d "app/frontend" ]; then
    echo "❌ Error: Please run this from the LinkDAO root directory"
    exit 1
fi

cd app/frontend

# Check if .env.local exists and has required variables
echo "📋 Checking environment configuration..."
if [ ! -f ".env.local" ]; then
    echo "❌ Error: .env.local not found!"
    exit 1
fi

# Verify contract addresses are set
if ! grep -q "NEXT_PUBLIC_LDAO_TOKEN_ADDRESS=0xc9F690B45e33ca909bB9ab97836091673232611B" .env.local; then
    echo "⚠️  Warning: LDAO token address might not be set correctly"
fi

if ! grep -q "NEXT_PUBLIC_LDAO_TREASURY_ADDRESS=0xeF85C8CcC03320dA32371940b315D563be2585e5" .env.local; then
    echo "⚠️  Warning: Treasury address might not be set correctly"
fi

echo "✅ Environment configuration looks good!"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
else
    echo "✅ Dependencies already installed"
fi

echo ""
echo "🎯 Test Checklist:"
echo "=================="
echo ""
echo "Prerequisites:"
echo "  [ ] MetaMask installed"
echo "  [ ] Sepolia network added to MetaMask"
echo "  [ ] Have Sepolia ETH (get from: https://sepoliafaucet.com/)"
echo "  [ ] Optional: Test USDC for USDC purchases"
echo ""
echo "Starting development server..."
echo ""
echo "Once the server starts:"
echo "  1. Open http://localhost:3000/token in your browser"
echo "  2. Click 'Buy LDAO Tokens' button"
echo "  3. Follow the 4-step wizard:"
echo "     Step 1: Select 'Pay with Crypto'"
echo "     Step 2: Enter amount (try 1000 LDAO)"
echo "     Step 3: Select ETH"
echo "     Step 4: Review and confirm"
echo "  4. Approve transaction in MetaMask"
echo "  5. Wait for confirmation (~15-30 seconds)"
echo "  6. Click 'View on Etherscan' to verify"
echo ""
echo "Expected Results:"
echo "  ✓ Modal opens with wizard interface"
echo "  ✓ Real-time price quote displays"
echo "  ✓ Network auto-switches to Sepolia (if needed)"
echo "  ✓ MetaMask opens for transaction"
echo "  ✓ Transaction confirms successfully"
echo "  ✓ Success message with transaction hash"
echo "  ✓ Sepolia Etherscan link works"
echo ""
echo "🔍 If you encounter issues:"
echo "  - Check browser console (F12) for errors"
echo "  - Verify you're on Sepolia network"
echo "  - Ensure you have enough Sepolia ETH"
echo "  - Check transaction on https://sepolia.etherscan.io"
echo ""
echo "📖 See LDAO_PURCHASE_TESTING_GUIDE.md for detailed instructions"
echo ""
echo "Starting server in 3 seconds..."
sleep 3

npm run dev
