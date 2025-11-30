#!/bin/bash

# Script to run moderation system database migration
# This creates all necessary tables for the admin moderation panel

set -e  # Exit on error

echo "🔧 Running Moderation System Database Migration"
echo "================================================"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo "Please set DATABASE_URL before running this script"
    exit 1
fi

echo "✅ DATABASE_URL is set"
echo ""

# Run the migration
echo "📊 Applying migration: 0016_human_moderation_interface.sql"
echo "This will create the following tables:"
echo "  - moderators"
echo "  - moderator_stats"
echo "  - queue_assignments"
echo "  - policy_templates"
echo "  - moderator_activity_logs"
echo "  - moderator_daily_metrics"
echo "  - moderation_audit_logs"
echo "  - moderation_metrics"
echo "  - content_hashes"
echo "  - reputation_impacts"
echo "  - appeal_jurors"
echo "  - moderation_vendors"
echo "  - moderation_policies"
echo ""

read -p "Continue with migration? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Migration cancelled"
    exit 1
fi

# Apply the migration
psql "$DATABASE_URL" -f drizzle/0016_human_moderation_interface.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "  1. Verify tables were created: psql \$DATABASE_URL -c '\\dt moderation*'"
    echo "  2. Deploy latest backend code to production"
    echo "  3. Restart backend server"
    echo "  4. Test admin panel moderation endpoint"
    echo ""
else
    echo ""
    echo "❌ Migration failed!"
    echo "Please check the error messages above"
    exit 1
fi
