
const { getDocsDirectory, getDocPath, getAvailableDocuments } = require('./app/frontend/src/utils/docUtils');
const fs = require('fs');
const path = require('path');

console.log('--- Verifying docUtils ---');

// Test getDocsDirectory
const docsDir = getDocsDirectory();
console.log(`Docs Directory: ${docsDir}`);

if (docsDir && fs.existsSync(docsDir)) {
    console.log('✅ Docs directory found and exists.');
} else {
    console.error('❌ Docs directory NOT found.');
}

// Test getAvailableDocuments
const docs = getAvailableDocuments();
console.log(`Available Documents (${docs.length}):`, docs);

if (docs.length > 0) {
    console.log('✅ Found available documents.');
} else {
    console.error('❌ No documents found.');
}

// Test getDocPath for specific files
const testFiles = ['introduction', 'technical-whitepaper', 'marketplace-guide'];

testFiles.forEach(slug => {
    const docPath = getDocPath(slug);
    console.log(`Path for ${slug}: ${docPath}`);

    if (docPath && fs.existsSync(docPath)) {
        console.log(`✅ Found ${slug} at ${docPath}`);
    } else {
        console.error(`❌ Could not find ${slug}`);
    }
});

console.log('--- Verification Complete ---');
