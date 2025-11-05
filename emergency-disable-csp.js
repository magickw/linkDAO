#!/usr/bin/env node

const fs = require('fs');

// Completely disable CSP for development
function disableCSP() {
  console.log('🚨 EMERGENCY: Disabling CSP completely...');
  
  // Update Next.js config
  const nextConfigPath = 'next.config.js';
  if (fs.existsSync(nextConfigPath)) {
    let content = fs.readFileSync(nextConfigPath, 'utf8');
    
    // Replace headers function with empty one
    const emptyHeaders = `  // Security headers (DISABLED FOR DEVELOPMENT)
  async headers() {
    return [];
  },`;
    
    const headersRegex = /// Security headers[\s\S]*?async headers\(\)[\s\S]*?\},/;
    content = content.replace(headersRegex, emptyHeaders);
    
    fs.writeFileSync(nextConfigPath, content);
    console.log('✅ Disabled CSP in Next.js config');
  }
  
  // Create CSP-free HTML template
  const htmlTemplate = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>LinkDAO - Development Mode</title>
</head>
<body>
  <div id="__next"></div>
</body>
</html>`;
  
  fs.writeFileSync('app/frontend/public/index-dev.html', htmlTemplate);
  console.log('✅ Created CSP-free HTML template');
  
  console.log('🎉 CSP completely disabled for development');
  console.log('⚠️ Remember to re-enable for production!');
}

if (require.main === module) {
  disableCSP();
}

module.exports = { disableCSP };
