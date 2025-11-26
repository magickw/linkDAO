#!/bin/bash

# Manual Migration Runner Script
# This script helps run the manual quick posts migration

set -e

echo "🚀 Running manual quick posts migration..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo "Please set your DATABASE_URL and try again"
    exit 1
fi

# Extract connection details from DATABASE_URL
if [[ $DATABASE_URL =~ postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+) ]]; then
    DB_USER="${BASH_REMATCH[1]}"
    DB_PASS="${BASH_REMATCH[2]}"
    DB_HOST="${BASH_REMATCH[3]}"
    DB_PORT="${BASH_REMATCH[4]}"
    DB_NAME="${BASH_REMATCH[5]}"
else
    echo "❌ ERROR: Invalid DATABASE_URL format"
    echo "Expected format: postgresql://user:password@host:port/database"
    exit 1
fi

echo "📊 Database connection details:"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo ""

# Run the migration
echo "🔧 Executing migration script..."
PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f manual-quick-posts-migration.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo "🎉 Quick posts tables are now ready"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Restart your backend application"
    echo "   2. Test the quick posts API endpoints"
    echo "   3. Verify the deployment is working"
else
    echo ""
    echo "❌ Migration failed!"
    echo "Please check the error messages above and fix any issues"
    exit 1
fi