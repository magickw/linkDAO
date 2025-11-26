#!/bin/bash
# Pre-build script to remove playwright directories before Next.js build

echo "Current directory: $(pwd)"
echo "Clearing Next.js cache..."
rm -rf .next

echo "Mocking playwright packages..."

# Function to mock a package
mock_package() {
  local pkg_name=$1
  echo "Mocking $pkg_name..."
  
  # Find all instances of the package
  find node_modules -name "$pkg_name" -type d -prune | while read dir; do
    echo "  Found at $dir"
    rm -rf "$dir"/*
    mkdir -p "$dir"
    echo '{"name": "'"$pkg_name"'", "version": "0.0.0", "main": "index.js"}' > "$dir/package.json"
    echo 'module.exports = {};' > "$dir/index.js"
    # Create specific paths that might be referenced
    mkdir -p "$dir/lib/client"
    echo 'module.exports = {};' > "$dir/lib/client/index.js"
    mkdir -p "$dir/lib/server"
    echo 'module.exports = {};' > "$dir/lib/server/index.js"
    # Create page.js to prevent "doesn't have a root layout" error if it's still scanned
    # But wait, if it's scanned as a page, it needs a default export.
    # If I make it empty, it might still fail.
    # But if I make it NOT a page (e.g. index.js), Next.js won't treat it as a page?
    # The error was specifically about page.js.
    # My mock creates index.js. It does NOT create page.js.
    # So Next.js won't find page.js! This is perfect.
  done
}

mock_package "playwright"
mock_package "playwright-core"
mock_package "@playwright"

echo "Playwright packages mocked. Starting Next.js build..."
npm run build
