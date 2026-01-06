const fs = require('fs');
const path = require('path');

function findPackage(startPath) {
    try {
        const pkgPath = require.resolve(startPath);
        console.log(`✅ Found ${startPath} at:`, pkgPath);
        console.log('Exports:', Object.keys(require(startPath)));
    } catch (e) {
        console.log(`❌ Could not resolve ${startPath}:`, e.message);
    }
}

console.log('--- Debugging @x402 imports ---');
findPackage('@x402/express');
findPackage('@x402/core');
findPackage('@x402/core/server');
findPackage('@x402/extensions');
findPackage('@x402/extensions/evm/exact/server');
findPackage('@x402/evm/exact/server');

// Check node_modules/ direct structure if possible
const extensionsPath = path.join(__dirname, '../node_modules/@x402/extensions');
if (fs.existsSync(extensionsPath)) {
    console.log('Extensions Dir Structure:', fs.readdirSync(extensionsPath));
    try {
        console.log('Extensions/evm:', fs.readdirSync(path.join(extensionsPath, 'evm')));
    } catch (e) { }
}
