#!/bin/bash

# Script to normalize wallet addresses to lowercase in the database
# This fixes case sensitivity issues when querying by wallet address

set -e  # Exit on error

echo "🔄 Starting wallet address normalization..."
echo "⚠️  This will update wallet addresses to lowercase across all tables"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo "Please set it with: export DATABASE_URL='your-database-url'"
    exit 1
fi

echo "📊 Current database: $DATABASE_URL"
echo ""

# Ask for confirmation
read -p "Do you want to proceed with normalization? (yes/no): " confirm
if [[ "$confirm" != "yes" && "$confirm" != "y" ]]; then
    echo "❌ Normalization cancelled"
    exit 0
fi

echo ""
echo "🚀 Running normalization script..."
echo ""

# Run the SQL script
psql "$DATABASE_URL" -f normalize-wallet-addresses.sql

echo ""
echo "✅ Normalization complete!"
echo ""
echo "📝 Next steps:"
echo "1. Verify the changes in your database"
echo "2. Test creating a new product listing"
echo "3. Check that listings appear on seller dashboard and marketplace"
