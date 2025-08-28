#!/bin/bash

# Dependency Audit Script for LinkDAO
# This script checks for known vulnerabilities in project dependencies

echo "Running Dependency Audit for LinkDAO"
echo "===================================="

# Check if npm is installed
if ! command -v npm &> /dev/null
then
    echo "npm could not be found. Please install Node.js and npm."
    exit 1
fi

# Audit backend dependencies
echo "Auditing backend dependencies..."
cd /Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/backend
npm audit

echo ""
echo "------------------------------------"
echo ""

# Audit frontend dependencies
echo "Auditing frontend dependencies..."
cd /Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/frontend
npm audit

echo ""
echo "------------------------------------"
echo ""

# Audit smart contract dependencies
echo "Auditing smart contract dependencies..."
cd /Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/contracts
if command -v forge &> /dev/null
then
    forge update
else
    echo "Foundry (forge) not found. Skipping smart contract dependency audit."
fi

echo ""
echo "Dependency audit complete."
echo "Please review any reported vulnerabilities and update dependencies as needed."