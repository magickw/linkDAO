#!/bin/bash

# Fix ethers v6 syntax to v5 syntax in test files
# This script updates test files that were mistakenly written with ethers v6 API

echo "🔧 Fixing ethers v5 syntax in test files..."

# Find all TypeScript test files
TEST_FILES=$(find test -name "*.ts" -type f)

for file in $TEST_FILES; do
    echo "Processing: $file"

    # Replace ethers.parseEther with ethers.utils.parseEther
    sed -i '' 's/ethers\.parseEther/ethers.utils.parseEther/g' "$file"

    # Replace ethers.parseUnits with ethers.utils.parseUnits
    sed -i '' 's/ethers\.parseUnits/ethers.utils.parseUnits/g' "$file"

    # Replace .waitForDeployment() with .deployed()
    sed -i '' 's/\.waitForDeployment()/\.deployed()/g' "$file"

    # Replace await contract.getAddress() with contract.address
    sed -i '' 's/await \([a-zA-Z0-9_]*\)\.getAddress()/\1.address/g' "$file"

    # Replace contract.getAddress() in non-await contexts
    sed -i '' 's/\([a-zA-Z0-9_]*\)\.getAddress()/\1.address/g' "$file"
done

echo "✅ Ethers v5 syntax fix complete!"
echo "📝 Modified files: $(echo "$TEST_FILES" | wc -l | tr -d ' ') files"
