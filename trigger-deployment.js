#!/usr/bin/env node

/**
 * Trigger Deployment Script
 * Forces a deployment by updating a timestamp in the main server file
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Triggering deployment...');

const serverFilePath = path.join(__dirname, 'app/backend/src/index.ts');

try {
  let content = fs.readFileSync(serverFilePath, 'utf8');
  
  // Update the deployment trigger timestamp at the end of the file
  const timestamp = new Date().toISOString();
  const triggerComment = `// Deployment trigger: ${timestamp}`;
  
  // Replace existing trigger or add new one
  if (content.includes('// Deployment trigger:')) {
    content = content.replace(/\/\/ Deployment trigger:.*$/m, triggerComment);
  } else {
    content += `\n\n${triggerComment}\n`;
  }
  
  fs.writeFileSync(serverFilePath, content);
  console.log(`✅ Updated deployment trigger: ${timestamp}`);
  
  // Also update the emergency CORS middleware to ensure it's being used
  const emergencyCorsPath = path.join(__dirname, 'app/backend/src/middleware/emergencyCorsMiddleware.ts');
  if (fs.existsSync(emergencyCorsPath)) {
    let corsContent = fs.readFileSync(emergencyCorsPath, 'utf8');
    corsContent += `\n// Updated: ${timestamp}\n`;
    fs.writeFileSync(emergencyCorsPath, corsContent);
    console.log('✅ Updated emergency CORS middleware');
  }
  
  console.log('\n🔄 Deployment should trigger automatically on Render');
  console.log('📊 Monitor the Render dashboard for deployment progress');
  console.log('⏱️ Deployment typically takes 2-5 minutes');
  
} catch (error) {
  console.error('❌ Failed to trigger deployment:', error.message);
}