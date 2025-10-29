#!/bin/bash

# Security Cron Setup Script
# This script sets up cron jobs for regular security checks

echo "🕒 Setting up security cron jobs..."

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT_PATH="$PROJECT_ROOT/scripts/run-security-checks.sh"

echo "📂 Project root: $PROJECT_ROOT"
echo "📜 Script path: $SCRIPT_PATH"

# Check if script exists
if [ ! -f "$SCRIPT_PATH" ]; then
  echo "❌ Security check script not found at $SCRIPT_PATH"
  exit 1
fi

# Make sure script is executable
chmod +x "$SCRIPT_PATH"

# Create a temporary crontab file
CRON_TEMP=$(mktemp)

# Add our cron jobs
echo "# LinkDAO Security Checks" > "$CRON_TEMP"
echo "# Daily security audit at 2:00 AM" >> "$CRON_TEMP"
echo "0 2 * * * cd $PROJECT_ROOT && $SCRIPT_PATH >> $PROJECT_ROOT/security-reports/cron.log 2>&1" >> "$CRON_TEMP"
echo "" >> "$CRON_TEMP"

# Add some comments about other potential schedules
echo "# Weekly detailed scan (uncomment to enable)" >> "$CRON_TEMP"
echo "# 0 3 * * 1 cd $PROJECT_ROOT && node scripts/dependency-security-scan.js >> $PROJECT_ROOT/security-reports/weekly.log 2>&1" >> "$CRON_TEMP"
echo "" >> "$CRON_TEMP"
echo "# Monthly package update check (uncomment to enable)" >> "$CRON_TEMP"
echo "# 0 4 1 * * cd $PROJECT_ROOT && node scripts/check-updates.js >> $PROJECT_ROOT/security-reports/monthly.log 2>&1" >> "$CRON_TEMP"

# Install the new crontab
crontab "$CRON_TEMP"

# Clean up
rm "$CRON_TEMP"

echo "✅ Security cron jobs installed!"
echo ""
echo "Current crontab:"
crontab -l

echo ""
echo "📝 The following cron jobs have been installed:"
echo "   • Daily security checks at 2:00 AM"
echo ""
echo "💡 To modify the schedule:"
echo "   1. Run 'crontab -e' to edit"
echo "   2. Modify the cron expressions as needed"
echo "   3. Save and exit"
echo ""
echo "📊 Reports will be saved to: $PROJECT_ROOT/security-reports/"
echo "📋 Logs will be saved to: $PROJECT_ROOT/security-reports/cron.log"