#!/bin/bash

# Exit on any error
set -e

echo "Initializing LinkDAO project..."

# Install root dependencies
echo "Installing root dependencies..."
npm install

# Initialize contracts workspace
echo "Setting up contracts workspace..."
cd contracts
npm install
cd ..

# Initialize frontend workspace
echo "Setting up frontend workspace..."
cd frontend
npm install
cd ..

# Initialize backend workspace
echo "Setting up backend workspace..."
cd backend
npm install
cd ..

# Initialize mobile workspace
echo "Setting up mobile workspace..."
cd mobile
npm install
cd ..

echo "All workspaces initialized successfully!"
echo ""
echo "To start development:"
echo "1. For contracts: cd contracts && npm run build"
echo "2. For frontend: cd frontend && npm run dev"
echo "3. For backend: cd backend && npm run dev"
echo "4. For mobile: cd mobile && npm start"