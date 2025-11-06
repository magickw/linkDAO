#!/usr/bin/env node

/**
 * Check Deployment Status
 * Monitors the backend deployment and CORS fix status
 */

const https = require('https');

const BACKEND_URL = 'https://api.linkdao.io';
const FRONTEND_ORIGIN = 'https://www.linkdao.io';

console.log('🔍 Checking deployment and CORS status...');

async function checkHealth() {
  return new Promise((resolve) => {
    const req = https.request(`${BACKEND_URL}/health`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const health = JSON.parse(data);
          resolve({
            status: res.statusCode,
            healthy: res.statusCode === 200,
            data: health
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            healthy: false,
            error: 'Invalid JSON response'
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({
        status: 0,
        healthy: false,
        error: error.message
      });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        status: 0,
        healthy: false,
        error: 'Timeout'
      });
    });

    req.end();
  });
}

async function checkCors() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.linkdao.io',
      path: '/health',
      method: 'GET',
      headers: {
        'Origin': FRONTEND_ORIGIN
      }
    };

    const req = https.request(options, (res) => {
      const allowOrigin = res.headers['access-control-allow-origin'];
      const hasMultipleOrigins = allowOrigin && allowOrigin.includes(',');
      
      resolve({
        status: res.statusCode,
        allowOrigin,
        hasMultipleOrigins,
        fixed: !hasMultipleOrigins && (allowOrigin === FRONTEND_ORIGIN || allowOrigin === '*'),
        headers: {
          'access-control-allow-origin': res.headers['access-control-allow-origin'],
          'access-control-allow-credentials': res.headers['access-control-allow-credentials'],
          'access-control-allow-methods': res.headers['access-control-allow-methods']
        }
      });
    });

    req.on('error', (error) => {
      resolve({
        status: 0,
        error: error.message,
        fixed: false
      });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        status: 0,
        error: 'Timeout',
        fixed: false
      });
    });

    req.end();
  });
}

async function checkApiEndpoint() {
  return new Promise((resolve) => {
    const req = https.request(`${BACKEND_URL}/api/posts`, (res) => {
      resolve({
        status: res.statusCode,
        working: res.statusCode !== 503
      });
    });

    req.on('error', (error) => {
      resolve({
        status: 0,
        working: false,
        error: error.message
      });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        status: 0,
        working: false,
        error: 'Timeout'
      });
    });

    req.end();
  });
}

async function runChecks() {
  console.log('\n1️⃣ Checking backend health...');
  const health = await checkHealth();
  console.log(`   Status: ${health.status} ${health.healthy ? '✅' : '❌'}`);
  if (health.error) console.log(`   Error: ${health.error}`);

  console.log('\n2️⃣ Checking CORS configuration...');
  const cors = await checkCors();
  console.log(`   Status: ${cors.status} ${cors.fixed ? '✅' : '❌'}`);
  console.log(`   Allow-Origin: ${cors.allowOrigin || 'Not set'}`);
  if (cors.hasMultipleOrigins) {
    console.log('   ⚠️ Multiple origins detected - fix not yet applied');
  } else if (cors.fixed) {
    console.log('   ✅ CORS headers look correct');
  }

  console.log('\n3️⃣ Checking API endpoints...');
  const api = await checkApiEndpoint();
  console.log(`   Status: ${api.status} ${api.working ? '✅' : '❌'}`);
  if (api.error) console.log(`   Error: ${api.error}`);

  console.log('\n📊 OVERALL STATUS:');
  const allGood = health.healthy && cors.fixed && api.working;
  console.log(`   Backend Health: ${health.healthy ? '✅' : '❌'}`);
  console.log(`   CORS Fixed: ${cors.fixed ? '✅' : '❌'}`);
  console.log(`   API Working: ${api.working ? '✅' : '❌'}`);
  console.log(`   Overall: ${allGood ? '✅ ALL SYSTEMS GO' : '⚠️ ISSUES DETECTED'}`);

  if (!allGood) {
    console.log('\n🔧 TROUBLESHOOTING:');
    if (!health.healthy) {
      console.log('   - Backend may still be deploying');
      console.log('   - Check Render dashboard for deployment status');
    }
    if (!cors.fixed) {
      console.log('   - CORS fix not yet applied');
      console.log('   - May need manual deployment trigger');
    }
    if (!api.working) {
      console.log('   - API endpoints returning errors');
      console.log('   - Check backend logs for issues');
    }
    console.log('\n   💡 Try running this check again in 2-3 minutes');
  }

  return allGood;
}

// Run checks with retry logic
async function monitorStatus() {
  const maxAttempts = 10;
  let attempt = 1;

  while (attempt <= maxAttempts) {
    console.log(`\n🔄 Check attempt ${attempt}/${maxAttempts}`);
    const success = await runChecks();

    if (success) {
      console.log('\n🎉 All systems operational!');
      break;
    }

    if (attempt < maxAttempts) {
      console.log(`\n⏳ Waiting 30 seconds before next check...`);
      await new Promise(resolve => setTimeout(resolve, 30000));
    }

    attempt++;
  }

  if (attempt > maxAttempts) {
    console.log('\n❌ Issues persist after multiple checks');
    console.log('🔧 Manual intervention may be required');
  }
}

monitorStatus();