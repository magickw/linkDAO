#!/usr/bin/env node

/**
 * Emergency CORS Fix Script
 * This script applies immediate fixes to resolve CORS 403 errors
 */

const fs = require('fs');
const path = require('path');

console.log('🚨 Applying Emergency CORS Fix...');

// 1. Update the main index.ts to use emergency CORS middleware
const indexPath = path.join(__dirname, 'app/backend/src/index.ts');
const indexContent = fs.readFileSync(indexPath, 'utf8');

// Replace the CORS middleware import and usage
const updatedIndexContent = indexContent
  .replace(
    "import { corsMiddleware } from './middleware/corsMiddleware';",
    `import { corsMiddleware } from './middleware/corsMiddleware';
import { emergencyCorsMiddleware, emergencyPreflightHandler, emergencyCorsHeaders } from './middleware/emergencyCorsMiddleware';`
  )
  .replace(
    'app.use(corsMiddleware);',
    `// EMERGENCY CORS FIX - Use permissive CORS temporarily
app.use(emergencyCorsHeaders);
app.use(emergencyPreflightHandler);
app.use(emergencyCorsMiddleware);`
  );

fs.writeFileSync(indexPath, updatedIndexContent);
console.log('✅ Updated main server file with emergency CORS middleware');

// 2. Create a simple CORS bypass for immediate deployment
const bypassCorsPath = path.join(__dirname, 'app/backend/src/middleware/bypassCors.ts');
const bypassCorsContent = `
import { Request, Response, NextFunction } from 'express';

/**
 * Bypass CORS middleware - allows all origins
 * TEMPORARY FIX for production deployment
 */
export const bypassCorsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Set permissive CORS headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Expose-Headers', '*');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
};
`;

fs.writeFileSync(bypassCorsPath, bypassCorsContent);
console.log('✅ Created bypass CORS middleware');

// 3. Update environment variables to include all necessary origins
const envPath = path.join(__dirname, 'app/backend/.env');
let envContent = fs.readFileSync(envPath, 'utf8');

// Add comprehensive CORS origins
const corsOrigins = [
  'https://www.linkdao.io',
  'https://linkdao.io', 
  'https://app.linkdao.io',
  'https://marketplace.linkdao.io',
  'https://linkdao.vercel.app',
  'https://linkdao-backend.onrender.com',
  'https://api.linkdao.io',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:8080',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001'
].join(',');

// Update or add CORS configuration
if (envContent.includes('CORS_ORIGIN=')) {
  envContent = envContent.replace(/CORS_ORIGIN=.*/, `CORS_ORIGIN=${corsOrigins}`);
} else {
  envContent += `\n# Emergency CORS Fix\nCORS_ORIGIN=${corsOrigins}\n`;
}

if (envContent.includes('ALLOWED_ORIGINS=')) {
  envContent = envContent.replace(/ALLOWED_ORIGINS=.*/, `ALLOWED_ORIGINS=${corsOrigins}`);
} else {
  envContent += `ALLOWED_ORIGINS=${corsOrigins}\n`;
}

fs.writeFileSync(envPath, envContent);
console.log('✅ Updated environment variables with comprehensive CORS origins');

// 4. Create a deployment-ready CORS configuration
const deploymentCorsPath = path.join(__dirname, 'app/backend/src/config/deploymentCors.ts');
const deploymentCorsContent = `
/**
 * Deployment-ready CORS configuration
 * Optimized for production deployment with comprehensive origin support
 */

export const deploymentCorsConfig = {
  origin: true, // Allow all origins temporarily
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Request-ID',
    'X-Correlation-ID',
    'X-Session-ID',
    'X-Wallet-Address',
    'X-Chain-ID',
    'X-API-Key',
    'X-Client-Version',
    'X-CSRF-Token',
    'x-csrf-token',
    'csrf-token',
    'Cache-Control'
  ],
  exposedHeaders: [
    'X-Request-ID',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'RateLimit-Limit',
    'RateLimit-Remaining',
    'RateLimit-Reset',
    'RateLimit-Policy',
    'X-Total-Count'
  ],
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 200
};

export const productionOrigins = [
  'https://www.linkdao.io',
  'https://linkdao.io',
  'https://app.linkdao.io', 
  'https://marketplace.linkdao.io',
  'https://linkdao.vercel.app',
  'https://linkdao-backend.onrender.com',
  'https://api.linkdao.io',
  /https:\\/\\/linkdao-.*\\.vercel\\.app$/,
  /https:\\/\\/.*\\.vercel\\.app$/
];
`;

fs.writeFileSync(deploymentCorsPath, deploymentCorsContent);
console.log('✅ Created deployment-ready CORS configuration');

console.log('\n🎉 Emergency CORS fix applied successfully!');
console.log('\n📋 Next steps:');
console.log('1. Restart the backend server');
console.log('2. Test the frontend connections');
console.log('3. Monitor for any remaining CORS issues');
console.log('4. Plan to implement proper CORS security after fixing immediate issues');

console.log('\n⚠️  SECURITY NOTE:');
console.log('This is a temporary fix that allows all origins.');
console.log('Implement proper CORS restrictions once the immediate issues are resolved.');