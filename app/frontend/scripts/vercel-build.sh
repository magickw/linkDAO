#!/bin/bash
# Pre-build script to mock playwright packages before Next.js build

echo "Current directory: $(pwd)"
echo "Clearing Next.js cache..."
rm -rf .next

echo "Mocking playwright packages..."

mock_package() {
  local pkg_name=$1
  echo "Mocking $pkg_name..."

  find node_modules -type d -name "$pkg_name" | while read dir; do
    echo "  Found at $dir"

    rm -rf "$dir"
    mkdir -p "$dir"

    # package.json
    cat > "$dir/package.json" <<EOF
{
  "name": "$pkg_name",
  "version": "0.0.0",
  "main": "index.js"
}
EOF

    # main entry
    echo 'module.exports = {};' > "$dir/index.js"

    # minimal subdirs used by Next.js resolver
    mkdir -p "$dir/lib/server"
    echo 'module.exports = {};' > "$dir/lib/server/index.js"

    # prevent Next.js from treating anything as a page
    echo '// Mocked file' > "$dir/lib/server/page.js"
  done
}

mock_package "playwright"
mock_package "playwright-core"
mock_package "@playwright"

echo "Mocking top-level playwright config files..."

# Only mock real config files that affect Next.js resolution
find . -maxdepth 3 -type f \( -name "playwright.config.js" -o -name "playwright.config.ts" \) | while read config_file; do
  echo "  Mocking config: $config_file"
  mv "$config_file" "$config_file.backup"

  if [[ $config_file == *.ts ]]; then
    echo "export default {};" > "$config_file"
  else
    echo "module.exports = {};" > "$config_file"
  fi
done

echo "Done mocking. Running Next.js build..."
npm run build