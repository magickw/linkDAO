#!/usr/bin/env node

/**
 * Trigger backend deployment by making a small change to force redeployment
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Triggering backend deployment...');

// Add a deployment timestamp to the main server file to trigger redeployment
const serverPath = path.join(__dirname, 'app/backend/src/index.ts');
const serverContent = fs.readFileSync(serverPath, 'utf8');

// Add a comment with timestamp at the end to trigger redeployment
const timestamp = new Date().toISOString();
const deploymentComment = `// Deployment trigger: ${timestamp}`;

// Check if there's already a deployment trigger comment and replace it
const updatedContent = serverContent.replace(
  /\/\/ Deployment trigger: .*/g, 
  deploymentComment
).replace(
  /\/\/ Force redeployment.*/g,
  ''
) + '\n' + deploymentComment;

fs.writeFileSync(serverPath, updatedContent);

console.log('✅ Added deployment trigger to backend');
console.log(`📅 Timestamp: ${timestamp}`);

// Also update the package.json version to trigger deployment
const packagePath = path.join(__dirname, 'app/backend/package.json');
if (fs.existsSync(packagePath)) {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const currentVersion = packageJson.version || '1.0.0';
  const versionParts = currentVersion.split('.');
  const patchVersion = parseInt(versionParts[2] || '0') + 1;
  const newVersion = `${versionParts[0]}.${versionParts[1]}.${patchVersion}`;
  
  packageJson.version = newVersion;
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
  
  console.log(`✅ Updated backend version: ${currentVersion} → ${newVersion}`);
}

console.log('');
console.log('🎯 Backend deployment triggered!');
console.log('');
console.log('Changes made:');
console.log('1. ✅ Fixed CORS headers to include x-csrf-token, X-CSRF-Token, and csrf-token');
console.log('2. ✅ Updated production CORS middleware to be more explicit');
console.log('3. ✅ Added deployment trigger timestamp');
console.log('4. ✅ Bumped backend version number');
console.log('');
console.log('The backend should redeploy automatically and pick up the CORS fixes.');
console.log('Wait 2-3 minutes for deployment, then test post creation again.');