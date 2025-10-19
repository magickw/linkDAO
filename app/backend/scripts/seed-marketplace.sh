#!/bin/bash

# Marketplace Database Seeding Script
# Usage: ./scripts/seed-marketplace.sh [options]

set -e

echo "🌱 Marketplace Database Seeder"
echo "=============================="

# Default values
USERS=25
SELLERS=12
PRODUCTS=60
ORDERS=40
CLEAN=true

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --users=*)
      USERS="${1#*=}"
      shift
      ;;
    --sellers=*)
      SELLERS="${1#*=}"
      shift
      ;;
    --products=*)
      PRODUCTS="${1#*=}"
      shift
      ;;
    --orders=*)
      ORDERS="${1#*=}"
      shift
      ;;
    --no-clean)
      CLEAN=false
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --users=N       Number of users to create (default: 25)"
      echo "  --sellers=N     Number of sellers to create (default: 12)"
      echo "  --products=N    Number of products to create (default: 60)"
      echo "  --orders=N      Number of orders to create (default: 40)"
      echo "  --no-clean      Don't clean existing data before seeding"
      echo "  --help, -h      Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0                                    # Use default values"
      echo "  $0 --users=50 --products=100         # Create more data"
      echo "  $0 --no-clean                        # Add to existing data"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

echo "Configuration:"
echo "  Users: $USERS"
echo "  Sellers: $SELLERS"
echo "  Products: $PRODUCTS"
echo "  Orders: $ORDERS"
echo "  Clean existing data: $CLEAN"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL environment variable is not set"
  echo "Please set your database connection string:"
  echo "  export DATABASE_URL='postgresql://user:password@host:port/database'"
  exit 1
fi

# Build the command
CMD="ts-node scripts/seedDatabase.ts --users=$USERS --sellers=$SELLERS --products=$PRODUCTS --orders=$ORDERS"

if [ "$CLEAN" = false ]; then
  CMD="$CMD --no-clean"
fi

echo "Running: $CMD"
echo ""

# Execute the seeding
eval $CMD

echo ""
echo "✅ Marketplace seeding completed!"
echo ""
echo "You can now test the marketplace API endpoints:"
echo "  GET /api/marketplace/listings"
echo "  GET /api/marketplace/sellers"
echo "  GET /api/auth/profile"
echo "  GET /api/cart"
echo ""
echo "Or run the backend server:"
echo "  npm run dev"