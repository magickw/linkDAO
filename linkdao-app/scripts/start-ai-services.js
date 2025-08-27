#!/usr/bin/env node

/**
 * AI Services Startup Script
 * 
 * This script helps start all AI services for LinkDAO.
 * Run with: node scripts/start-ai-services.js
 */

const { spawn } = require('child_process');
const path = require('path');

// Function to execute a command
function executeCommand(command, cwd, description) {
  return new Promise((resolve, reject) => {
    console.log(`\n🚀 ${description}`);
    console.log(`   Command: ${command}\n`);
    
    const [cmd, ...args] = command.split(' ');
    const process = spawn(cmd, args, { 
      cwd,
      stdio: 'inherit',
      shell: true
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${description} completed successfully\n`);
        resolve();
      } else {
        console.log(`❌ ${description} failed with exit code ${code}\n`);
        reject(new Error(`${description} failed`));
      }
    });
    
    process.on('error', (error) => {
      console.log(`❌ ${description} failed with error: ${error.message}\n`);
      reject(error);
    });
  });
}

// Function to check if required environment variables are set
function checkEnvironmentVariables() {
  console.log('🔍 Checking environment variables...\n');
  
  const requiredVars = ['OPENAI_API_KEY', 'RPC_URL'];
  const missingVars = [];
  
  requiredVars.forEach(envVar => {
    if (!process.env[envVar]) {
      missingVars.push(envVar);
    }
  });
  
  if (missingVars.length > 0) {
    console.log(`❌ Missing required environment variables: ${missingVars.join(', ')}\n`);
    console.log('📝 Please set these variables in backend/.env:\n');
    missingVars.forEach(envVar => {
      console.log(`   ${envVar}=your_value_here`);
    });
    console.log('\n💡 Get your OpenAI API key from: https://platform.openai.com/api-keys');
    return false;
  }
  
  console.log('✅ All required environment variables are set\n');
  return true;
}

// Main startup function
async function startAIServices() {
  console.log('🤖 LinkDAO AI Services Startup Script');
  console.log('====================================\n');
  
  try {
    // Load environment variables
    require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });
    
    // Check environment variables
    if (!checkEnvironmentVariables()) {
      process.exit(1);
    }
    
    const rootDir = path.join(__dirname, '..');
    const backendDir = path.join(rootDir, 'backend');
    
    // Build the backend
    await executeCommand('npm run build', backendDir, 'Building backend services');
    
    // Start the backend in development mode
    console.log('🚀 Starting backend services...');
    console.log('   The backend will start on port 3002');
    console.log('   Press Ctrl+C to stop the services\n');
    
    const backendProcess = spawn('npm', ['run', 'dev'], { 
      cwd: backendDir,
      stdio: 'inherit'
    });
    
    // Handle process termination
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down backend services...');
      backendProcess.kill('SIGINT');
      process.exit(0);
    });
    
    backendProcess.on('close', (code) => {
      console.log(`\n🛑 Backend services stopped with exit code ${code}`);
      process.exit(code);
    });
    
    backendProcess.on('error', (error) => {
      console.log(`\n❌ Backend services failed to start: ${error.message}`);
      process.exit(1);
    });
    
  } catch (error) {
    console.log(`\n❌ Failed to start AI services: ${error.message}`);
    process.exit(1);
  }
}

// Run the startup script
if (require.main === module) {
  startAIServices();
}

module.exports = { startAIServices };