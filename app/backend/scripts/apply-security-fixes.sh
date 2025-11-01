#!/bin/bash

# Security Fixes Application Script
# Applies CSRF protection, input validation, and safe logging

set -e

echo "🔒 Applying Security Fixes..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BACKEND_DIR"

echo -e "${YELLOW}Step 1: Adding CSRF protection to route files...${NC}"

# Find all route files
ROUTE_FILES=$(find src/routes -name "*.ts" -type f)

for file in $ROUTE_FILES; do
  # Check if file already has csrfProtection import
  if ! grep -q "csrfProtection" "$file"; then
    # Check if file has any POST/PUT/DELETE/PATCH routes
    if grep -qE "router\.(post|put|delete|patch)" "$file"; then
      echo "  Adding CSRF to: $file"
      
      # Add import after other imports
      sed -i '' "/^import.*from/a\\
import { csrfProtection } from '../middleware/csrfProtection';
" "$file"
      
      # Add csrfProtection to POST routes
      sed -i '' "s/router\.post(\([^,]*\),\s*/router.post(\1, csrfProtection, /g" "$file"
      
      # Add csrfProtection to PUT routes
      sed -i '' "s/router\.put(\([^,]*\),\s*/router.put(\1, csrfProtection, /g" "$file"
      
      # Add csrfProtection to DELETE routes
      sed -i '' "s/router\.delete(\([^,]*\),\s*/router.delete(\1, csrfProtection, /g" "$file"
      
      # Add csrfProtection to PATCH routes
      sed -i '' "s/router\.patch(\([^,]*\),\s*/router.patch(\1, csrfProtection, /g" "$file"
    fi
  fi
done

echo -e "${GREEN}✓ CSRF protection added to route files${NC}"

echo -e "${YELLOW}Step 2: Replacing console.log/error with safeLogger...${NC}"

# Find all TypeScript files
TS_FILES=$(find src -name "*.ts" -type f)

for file in $TS_FILES; do
  # Check if file uses console.log/error/warn
  if grep -qE "console\.(log|error|warn|info)" "$file"; then
    # Check if file already has safeLogger import
    if ! grep -q "safeLogger" "$file"; then
      echo "  Adding safeLogger to: $file"
      
      # Add import
      sed -i '' "/^import.*from/a\\
import { safeLogger } from '../utils/safeLogger';
" "$file"
    fi
    
    # Replace console methods
    sed -i '' "s/console\.error/safeLogger.error/g" "$file"
    sed -i '' "s/console\.warn/safeLogger.warn/g" "$file"
    sed -i '' "s/console\.info/safeLogger.info/g" "$file"
    sed -i '' "s/console\.log/safeLogger.info/g" "$file"
  fi
done

echo -e "${GREEN}✓ Replaced console methods with safeLogger${NC}"

echo -e "${YELLOW}Step 3: Adding input validation to controllers...${NC}"

# Find all controller files
CONTROLLER_FILES=$(find src/controllers -name "*.ts" -type f)

for file in $CONTROLLER_FILES; do
  # Check if file already has sanitization imports
  if ! grep -q "inputSanitization" "$file"; then
    # Check if file uses req.params or req.body
    if grep -qE "req\.(params|body)" "$file"; then
      echo "  Adding validation imports to: $file"
      
      # Add import
      sed -i '' "/^import.*from/a\\
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
" "$file"
    fi
  fi
done

echo -e "${GREEN}✓ Added validation imports to controllers${NC}"

echo -e "${YELLOW}Step 4: Creating backup of modified files...${NC}"

# Create backup directory
BACKUP_DIR="$BACKEND_DIR/backups/security-fixes-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Copy modified files to backup
cp -r src "$BACKUP_DIR/"

echo -e "${GREEN}✓ Backup created at: $BACKUP_DIR${NC}"

echo -e "${GREEN}🎉 Security fixes applied successfully!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review changes: git diff"
echo "2. Test the application"
echo "3. Fix any TypeScript errors"
echo "4. Manually fix SQL injection in database queries"
echo "5. Add specific input validation in controller methods"
echo ""
echo -e "${RED}⚠️  Important:${NC}"
echo "- SQL injection fixes require manual review"
echo "- Add specific validation logic in each controller"
echo "- Test all endpoints after changes"
