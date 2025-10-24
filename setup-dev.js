#!/usr/bin/env node

/**
 * LinkDAO Development Environment Setup Script
 * Sets up the complete development environment for the Web3 social platform
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up LinkDAO development environment...\n');

// Check prerequisites
function checkPrerequisites() {
  console.log('📋 Checking prerequisites...');
  
  try {
    execSync('node --version', { stdio: 'pipe' });
    console.log('✅ Node.js is installed');
  } catch (error) {
    console.error('❌ Node.js is not installed. Please install Node.js 18+ first.');
    process.exit(1);
  }

  try {
    execSync('docker --version', { stdio: 'pipe' });
    console.log('✅ Docker is installed');
  } catch (error) {
    console.error('❌ Docker is not installed. Please install Docker first.');
    process.exit(1);
  }

  try {
    execSync('docker-compose --version', { stdio: 'pipe' });
    console.log('✅ Docker Compose is installed');
  } catch (error) {
    console.error('❌ Docker Compose is not installed. Please install Docker Compose first.');
    process.exit(1);
  }
}

// Install dependencies
function installDependencies() {
  console.log('\n📦 Installing dependencies...');
  
  // Install root dependencies
  console.log('Installing root dependencies...');
  execSync('npm install', { stdio: 'inherit' });
  
  // Install app dependencies
  console.log('Installing app dependencies...');
  execSync('cd app && npm install', { stdio: 'inherit' });
}

// Setup environment files
function setupEnvironment() {
  console.log('\n🔧 Setting up environment configuration...');
  
  const envExamplePath = path.join(__dirname, 'app', '.env.example');
  const backendEnvPath = path.join(__dirname, 'app', 'backend', '.env.local');
  const frontendEnvPath = path.join(__dirname, 'app', 'frontend', '.env.local');
  
  if (!fs.existsSync(backendEnvPath)) {
    console.log('Creating backend .env.local file...');
    const envContent = `# LinkDAO Backend Local Development
JWT_SECRET=dev-jwt-secret-change-in-production
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/linkdao
REDIS_URL=redis://localhost:6379
PORT=10000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:10000
RPC_URL=http://localhost:8545
`;
    fs.writeFileSync(backendEnvPath, envContent);
    console.log('✅ Backend environment file created');
  }
  
  if (!fs.existsSync(frontendEnvPath)) {
    console.log('Creating frontend .env.local file...');
    const envContent = `# LinkDAO Frontend Local Development
NEXT_PUBLIC_BACKEND_URL=http://localhost:10000
NEXT_PUBLIC_WS_URL=ws://localhost:10000
NEXT_PUBLIC_IPFS_GATEWAY=http://localhost:8080
NEXT_PUBLIC_CHAIN_ID=31337
`;
    fs.writeFileSync(frontendEnvPath, envContent);
    console.log('✅ Frontend environment file created');
  }
}

// Start Docker services
function startDockerServices() {
  console.log('\n🐳 Starting Docker services...');
  
  try {
    execSync('docker-compose up -d', { stdio: 'inherit' });
    console.log('✅ Docker services started');
  } catch (error) {
    console.error('❌ Failed to start Docker services');
    process.exit(1);
  }
  
  // Wait for services to be ready
  console.log('⏳ Waiting for services to be ready...');
  
  let retries = 30;
  while (retries > 0) {
    try {
      execSync('docker exec linkdao-postgres pg_isready -U postgres', { stdio: 'pipe' });
      console.log('✅ PostgreSQL is ready');
      break;
    } catch (error) {
      retries--;
      if (retries === 0) {
        console.error('❌ PostgreSQL failed to start');
        process.exit(1);
      }
      console.log('Waiting for PostgreSQL...');
      execSync('sleep 2', { stdio: 'pipe' });
    }
  }
  
  retries = 30;
  while (retries > 0) {
    try {
      execSync('docker exec linkdao-redis redis-cli ping', { stdio: 'pipe' });
      console.log('✅ Redis is ready');
      break;
    } catch (error) {
      retries--;
      if (retries === 0) {
        console.error('❌ Redis failed to start');
        process.exit(1);
      }
      console.log('Waiting for Redis...');
      execSync('sleep 2', { stdio: 'pipe' });
    }
  }
}

// Initialize database
function initializeDatabase() {
  console.log('\n🗄️ Initializing database...');
  
  try {
    execSync('cd app/backend && npm run db:push', { stdio: 'inherit' });
    console.log('✅ Database schema initialized');
  } catch (error) {
    console.log('⚠️ Database initialization failed, but continuing...');
  }
}

// Build contracts
function buildContracts() {
  console.log('\n🔨 Building smart contracts...');
  
  try {
    execSync('cd app/contracts && npm run build', { stdio: 'inherit' });
    console.log('✅ Smart contracts built');
  } catch (error) {
    console.log('⚠️ Contract build failed, but continuing...');
  }
}

// Main setup function
async function main() {
  try {
    checkPrerequisites();
    installDependencies();
    setupEnvironment();
    startDockerServices();
    initializeDatabase();
    buildContracts();
    
    console.log('\n🎉 LinkDAO development environment setup complete!\n');
    console.log('📋 Next steps:');
    console.log('1. Start the development servers:');
    console.log('   npm run dev');
    console.log('');
    console.log('2. Or start services individually:');
    console.log('   npm run dev:backend    # Backend API (port 10000)');
    console.log('   npm run dev:frontend   # Frontend (port 3000)');
    console.log('');
    console.log('3. Deploy contracts to local network:');
    console.log('   npm run deploy:contracts');
    console.log('');
    console.log('4. Access services:');
    console.log('   Frontend: http://localhost:3000');
    console.log('   Backend API: http://localhost:10000');
    console.log('   IPFS Gateway: http://localhost:8080');
    console.log('   IPFS API: http://localhost:5001');
    console.log('');
    console.log('🔧 Useful commands:');
    console.log('   npm run docker:down    # Stop Docker services');
    console.log('   npm run test:backend   # Run backend tests');
    console.log('   npm run test:frontend  # Run frontend tests');
    console.log('   npm run test:contracts # Run contract tests');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

main();