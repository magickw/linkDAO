#!/bin/bash

# Install dependencies for the frontend workspace
npm install --workspace=frontend

# Build the Next.js application
npm run build --workspace=frontend
