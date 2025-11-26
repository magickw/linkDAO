#!/bin/bash
echo "Cleaning .next..."
rm -rf .next

echo "Removing problematic playwright page.js files..."

# Remove/overwrite ONLY files that Next.js detects as pages
find node_modules -path "*/playwright*/lib/client/page.js" | while read file; do
  echo "  Neutralizing $file"
  cat > "$file" <<EOF
// Stubbed to prevent Next.js from treating this as a page
module.exports = {};
EOF
done

echo "Neutralizing nested testmode copies..."
find node_modules -path "*/next/*/testmode/*/page.js" | while read file; do
  echo "  Stub $file"
  echo 'module.exports = {};' > "$file"
done

echo "Neutralizing playwright config files..."
find . -maxdepth 3 -type f \( -name "playwright.config.js" -o -name "playwright.config.ts" \) | while read cfg; do
  echo "  Stub config $cfg"
  mv "$cfg" "$cfg.backup"
  if [[ $cfg == *.ts ]]; then
    echo "export default {};" > "$cfg"
  else
    echo "module.exports = {};" > "$cfg"
  fi
done

echo "Finished patching. Running Next.js build..."
npm run build