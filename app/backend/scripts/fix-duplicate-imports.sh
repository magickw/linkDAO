#!/bin/bash

# Script to remove duplicate imports from TypeScript files

BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Fixing duplicate imports in backend files..."

# Find all TypeScript files in controllers, routes, and services
find "$BACKEND_DIR/src" -type f \( -name "*.ts" -o -name "*.tsx" \) | while read -r file; do
  # Create temp file
  temp_file=$(mktemp)
  
  # Process file: keep only first occurrence of each import line
  awk '
    /^import / {
      if (!seen[$0]++) {
        print
      }
      next
    }
    { print }
  ' "$file" > "$temp_file"
  
  # Replace original file if changes were made
  if ! cmp -s "$file" "$temp_file"; then
    mv "$temp_file" "$file"
    echo "Fixed: $file"
  else
    rm "$temp_file"
  fi
done

echo "Done! Duplicate imports removed."
