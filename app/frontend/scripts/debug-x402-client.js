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

console.log('--- Debugging @x402 frontend imports ---');
findPackage('@x402/next');
findPackage('@x402/core');

// Check if there is a client entry point
try {
    const nextPkg = require('@x402/next/package.json');
    console.log('@x402/next exports:', nextPkg.exports);
} catch (e) { }
