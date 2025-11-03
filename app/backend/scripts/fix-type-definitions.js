#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get all controller files that use req.user
const { execSync } = require('child_process');

try {
  const controllerFiles = execSync('grep -l "req\\.user" src/controllers/*.ts', { 
    cwd: '/Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/backend',
    encoding: 'utf-8'
  }).trim().split('\n');

  console.log(`Found ${controllerFiles.length} controller files that use req.user`);

  const typeReference = '/// <reference path="../types/express.d.ts" />';

  controllerFiles.forEach(file => {
    if (!file || !fs.existsSync(file)) return;
    
    const filePath = path.join('/Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/backend', file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Check if the reference already exists
    if (content.includes(typeReference)) {
      console.log(`✓ Reference already exists in ${file}`);
      return;
    }
    
    // Add the reference at the top of the file
    const lines = content.split('\n');
    const newLines = [typeReference, ...lines];
    fs.writeFileSync(filePath, newLines.join('\n'));
    console.log(`✓ Added reference to ${file}`);
  });
  
  console.log('✅ All controller files updated with type references');
} catch (error) {
  console.error('Error updating controller files:', error.message);
  process.exit(1);
}