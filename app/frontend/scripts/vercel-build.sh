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
    # Completely remove the directory
    rm -rf "$dir"
    mkdir -p "$dir"
    echo '{"name": "'"$pkg_name"'", "version": "0.0.0", "main": "index.js"}' > "$dir/package.json"
    echo 'module.exports = {};' > "$dir/index.js"
    
    # Create all possible subdirectories that might be referenced
    mkdir -p "$dir/lib"
    mkdir -p "$dir/lib/client"
    mkdir -p "$dir/lib/server"
    mkdir -p "$dir/dist"
    mkdir -p "$dir/dist/experimental/testmode"
    mkdir -p "$dir/experimental/testmode"
    
    # Create empty index.js files for all subdirectories
    echo 'module.exports = {};' > "$dir/lib/index.js"
    echo 'module.exports = {};' > "$dir/lib/client/index.js"
    echo 'module.exports = {};' > "$dir/lib/server/index.js"
    echo 'module.exports = {};' > "$dir/dist/index.js"
    echo 'module.exports = {};' > "$dir/dist/experimental/index.js"
    echo 'module.exports = {};' > "$dir/dist/experimental/testmode/index.js"
    echo 'module.exports = {};' > "$dir/experimental/index.js"
    echo 'module.exports = {};' > "$dir/experimental/testmode/index.js"
    
    # Specifically create empty page.js to prevent Next.js from trying to build it
    echo '// Mocked playwright file - not a Next.js page' > "$dir/lib/server/page.js"
    echo '// Mocked playwright file - not a Next.js page' > "$dir/page.js"
    
    # Also mock any other common playwright files
    find "$dir" -name "*.js" -type f -exec rm -f {} \; 2>/dev/null || true
  done
}

mock_package "playwright"
mock_package "playwright-core"
mock_package "@playwright"

# Also mock any playwright config files that might be scanned
echo "Mocking playwright config files..."
find . -name "playwright*.config.*" -type f | while read config_file; do
  echo "  Mocking config: $config_file"
  # Backup original and replace with empty module
  mv "$config_file" "$config_file.backup"
  echo '// Mocked playwright config file' > "$config_file"
  echo 'module.exports = {};' >> "$config_file"
done

echo "Playwright packages mocked. Starting Next.js build..."
npm run build
