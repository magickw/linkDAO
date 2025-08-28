#!/bin/bash

# Exit on any error
set -e

echo "Testing LinkDAO project setup..."

# Test root workspace
echo "Testing root workspace..."
npm test

# Test contracts workspace
echo "Testing contracts workspace..."
cd contracts
npm run build
cd ..

# Test frontend workspace
echo "Testing frontend workspace..."
cd frontend
npm run build
cd ..

# Test backend workspace
echo "Testing backend workspace..."
cd backend
npm run build
cd ..

# Test mobile workspace
echo "Testing mobile workspace..."
cd mobile
npm test
cd ..

echo "All tests completed successfully!"