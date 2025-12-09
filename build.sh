#!/bin/bash

# Change to the frontend directory
cd app/frontend || exit

# Install dependencies
npm install --legacy-peer-deps

# Build the Next.js application
npm run build
