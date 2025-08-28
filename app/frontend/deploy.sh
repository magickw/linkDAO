#!/bin/bash

# LinkDAO Frontend Deployment Script for Vercel

echo "🚀 LinkDAO Frontend Deployment Script"
echo "======================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json not found. Please run this script from the frontend directory."
  exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
  echo "⚠️  Vercel CLI not found. Installing..."
  npm install -g vercel
fi

echo "✅ Vercel CLI is ready"

# Check for required environment variables
echo "📋 Checking environment variables..."

if [ -z "$NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID" ]; then
  echo "⚠️  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID not set in environment"
  echo "   Please set it in your Vercel project settings"
fi

if [ -z "$NEXT_PUBLIC_API_URL" ]; then
  echo "⚠️  NEXT_PUBLIC_API_URL not set in environment"
  echo "   Please set it in your Vercel project settings to point to your backend API"
fi

echo "🏗️  Building the application..."
npm run build

if [ $? -eq 0 ]; then
  echo "✅ Build successful"
else
  echo "❌ Build failed. Please check the error messages above."
  exit 1
fi

echo "🌐 Deploying to Vercel..."
vercel --prod

if [ $? -eq 0 ]; then
  echo "✅ Deployment successful!"
  echo "🎉 Your LinkDAO frontend is now deployed!"
else
  echo "❌ Deployment failed. Please check the error messages above."
  exit 1
fi