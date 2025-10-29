#!/bin/bash

# Security Checks Automation Script
# This script runs all security checks and generates reports

set -e  # Exit on any error

echo "🔐 LinkDAO Security Checks Automation"
echo "======================================"

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "📂 Working directory: $PROJECT_ROOT"

# Create reports directory if it doesn't exist
REPORTS_DIR="$PROJECT_ROOT/security-reports"
mkdir -p "$REPORTS_DIR"

echo "📁 Reports directory: $REPORTS_DIR"

# 1. Run basic npm audit
echo -e "\n🔍 Running npm audit..."
npm audit --audit-level=high || echo "⚠️  Vulnerabilities found (see detailed report)"

# 2. Run detailed security scan
echo -e "\n📊 Running detailed security scan..."
node scripts/dependency-security-scan.js

# 3. Check for package updates
echo -e "\n🔄 Checking for package updates..."
node scripts/check-updates.js

# 4. Run security monitor
echo -e "\n🛡️  Running security monitor..."
node scripts/security-monitor.js

# 5. Move reports to reports directory
echo -e "\n📦 Organizing reports..."
mv security-audit-report.json "$REPORTS_DIR/" 2>/dev/null || true
mv package-update-report.json "$REPORTS_DIR/" 2>/dev/null || true
mv detailed-security-report.json "$REPORTS_DIR/" 2>/dev/null || true
mv security-summary-report.json "$REPORTS_DIR/" 2>/dev/null || true

echo -e "\n✅ Security checks completed!"
echo "📋 Reports available in: $REPORTS_DIR"

# 6. Show summary
if [ -f "$REPORTS_DIR/security-summary-report.json" ]; then
  echo -e "\n📈 Summary:"
  CRITICAL=$(jq -r '.critical' "$REPORTS_DIR/security-summary-report.json")
  HIGH=$(jq -r '.high' "$REPORTS_DIR/security-summary-report.json")
  MODERATE=$(jq -r '.moderate' "$REPORTS_DIR/security-summary-report.json")
  LOW=$(jq -r '.low' "$REPORTS_DIR/security-summary-report.json")
  TOTAL=$(jq -r '.totalVulnerabilities' "$REPORTS_DIR/security-summary-report.json")
  
  echo "   🔴 Critical: $CRITICAL"
  echo "   🟠 High: $HIGH"
  echo "   🟡 Moderate: $MODERATE"
  echo "   🟢 Low: $LOW"
  echo "   📊 Total: $TOTAL"
  
  if [ "$CRITICAL" -gt 0 ]; then
    echo -e "\n🚨 CRITICAL VULNERABILITIES DETECTED!"
    echo "   Please review $REPORTS_DIR/detailed-security-report.json"
    exit 1
  fi
else
  echo "⚠️  Summary report not found"
fi

echo -e "\n🔒 Security checks automation completed successfully!"