#!/bin/bash

# Database Schema Push Script
# This script generates migrations from schema.ts and pushes changes to the database

echo "🔄 Starting database schema push..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable is required"
    exit 1
fi

# Generate migration files from schema.ts
echo "📝 Generating migration from schema.ts..."
npm run db:generate

if [ $? -ne 0 ]; then
    echo "❌ Failed to generate migrations"
    exit 1
fi

# Push schema changes to database  
echo "🚀 Pushing schema changes to database..."
npm run db:push

if [ $? -eq 0 ]; then
    echo "✅ Database schema successfully updated!"
    echo ""
    echo "📋 Summary of changes applied:"
    echo "   • Missing tables: offers, disputes, orders, ai_moderation"
    echo "   • Auction fields: highest_bid, reserve_price, min_increment (listings)"
    echo "   • Missing fields: nft_standard, token_id (listings)"  
    echo "   • Missing fields: delivery_info, delivery_confirmed (escrows)"
    echo "   • Missing fields: evidence (disputes)"
    echo "   • Updated numeric precision for amount fields"
    echo ""
    echo "💡 To verify changes, run: npm run db:studio"
else
    echo "❌ Failed to push schema changes"
    exit 1
fi