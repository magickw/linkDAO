#!/usr/bin/env node

/**
 * Script to test the placeholder fix by checking for placehold.co URLs
 */

const fs = require('fs');
const path = require('path');

// Files to check
const filesToCheck = [
  'app/frontend/src/components/Web3SocialPostCard.tsx',
  'app/frontend/src/components/DashboardRightSidebar.tsx',
  'app/backend/src/services/enhancedSearchService.ts',
  'app/frontend/public/sw.js'
];

function checkFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`❌ File not found: ${filePath}`);
      return false;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const placeholderMatches = content.match(/placehold\.co/g);
    
    if (placeholderMatches) {
      console.log(`⚠️  ${filePath}: Found ${placeholderMatches.length} placehold.co references`);
      
      // Show context for each match
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (line.includes('placehold.co')) {
          console.log(`   Line ${index + 1}: ${line.trim()}`);
        }
      });
      return false;
    } else {
      console.log(`✅ ${filePath}: No placehold.co references found`);
      return true;
    }
  } catch (error) {
    console.error(`❌ Error checking ${filePath}:`, error.message);
    return false;
  }
}

function checkServiceWorkerIntegration() {
  const swPath = 'app/frontend/public/sw.js';
  
  if (!fs.existsSync(swPath)) {
    console.log('❌ Service worker not found');
    return false;
  }
  
  const content = fs.readFileSync(swPath, 'utf8');
  
  const hasPlaceholderHandler = content.includes('handlePlaceholderRequest');
  const hasPlaceholderInterception = content.includes('placehold.co');
  const hasSVGGeneration = content.includes('generatePlaceholderSVG');
  
  console.log('\n📋 Service Worker Integration Check:');
  console.log(`   Placeholder handler: ${hasPlaceholderHandler ? '✅' : '❌'}`);
  console.log(`   URL interception: ${hasPlaceholderInterception ? '✅' : '❌'}`);
  console.log(`   SVG generation: ${hasSVGGeneration ? '✅' : '❌'}`);
  
  return hasPlaceholderHandler && hasPlaceholderInterception && hasSVGGeneration;
}

function checkPlaceholderService() {
  const servicePath = 'app/frontend/src/utils/placeholderService.ts';
  
  if (!fs.existsSync(servicePath)) {
    console.log('❌ Placeholder service not found');
    return false;
  }
  
  const content = fs.readFileSync(servicePath, 'utf8');
  
  const hasGetPlaceholderImage = content.includes('getPlaceholderImage');
  const hasGenerateAvatar = content.includes('generateAvatarPlaceholder');
  const hasCommonPlaceholders = content.includes('COMMON_PLACEHOLDERS');
  
  console.log('\n🛠️  Placeholder Service Check:');
  console.log(`   getPlaceholderImage function: ${hasGetPlaceholderImage ? '✅' : '❌'}`);
  console.log(`   generateAvatarPlaceholder function: ${hasGenerateAvatar ? '✅' : '❌'}`);
  console.log(`   COMMON_PLACEHOLDERS export: ${hasCommonPlaceholders ? '✅' : '❌'}`);
  
  return hasGetPlaceholderImage && hasGenerateAvatar && hasCommonPlaceholders;
}

function main() {
  console.log('🔍 Testing Placeholder Fix Implementation\n');
  
  let allGood = true;
  
  // Check individual files
  console.log('📁 Checking files for remaining placehold.co references:');
  filesToCheck.forEach(file => {
    const result = checkFile(file);
    if (!result) allGood = false;
  });
  
  // Check service worker integration
  const swIntegration = checkServiceWorkerIntegration();
  if (!swIntegration) allGood = false;
  
  // Check placeholder service
  const placeholderService = checkPlaceholderService();
  if (!placeholderService) allGood = false;
  
  console.log('\n📊 Summary:');
  if (allGood) {
    console.log('🎉 All checks passed! The placeholder fix should be working.');
    console.log('\n📝 Next steps:');
    console.log('1. Clear browser cache and reload the application');
    console.log('2. Check browser network tab - should see no requests to placehold.co');
    console.log('3. Verify placeholders are displaying correctly');
    console.log('4. Test offline functionality');
  } else {
    console.log('⚠️  Some issues found. Please review the output above.');
  }
  
  return allGood;
}

if (require.main === module) {
  const success = main();
  process.exit(success ? 0 : 1);
}

module.exports = { checkFile, checkServiceWorkerIntegration, checkPlaceholderService };