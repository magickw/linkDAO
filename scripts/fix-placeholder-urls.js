#!/usr/bin/env node

/**
 * Script to replace placehold.co URLs with local placeholder service calls
 */

const fs = require('fs');
const path = require('path');

// Files to process (from the grep search results)
const filesToProcess = [
  'app/backend/src/services/enhancedSearchService.ts',
  'app/frontend/src/components/FacebookStylePostComposer.tsx',
  'app/frontend/src/pages/communities.tsx',
  'app/frontend/src/pages/profile.tsx',
  'app/frontend/src/pages/dao/[community].tsx',
  'app/frontend/src/pages/dashboard.tsx',
  'app/frontend/src/services/communityWeb3Service.ts',
  'app/frontend/src/e2e/socialDashboardWorkflows.e2e.test.tsx',
  'app/frontend/src/components/DashboardRightSidebar.tsx',
  'app/frontend/src/components/Web3SocialPostCard.tsx',
  'app/frontend/src/components/FollowerList.tsx',
  'app/frontend/src/components/SmartRightSidebar/TrendingContentWidget.tsx'
];

// Replacement patterns
const replacements = [
  {
    // Replace direct placehold.co URLs with placeholder service calls
    pattern: /'https:\/\/placehold\.co\/(\d+)'/g,
    replacement: "getPlaceholderImage('https://placehold.co/$1')"
  },
  {
    // Replace placehold.co URLs with dimensions
    pattern: /'https:\/\/placehold\.co\/(\d+x\d+)'/g,
    replacement: "getPlaceholderImage('https://placehold.co/$1')"
  },
  {
    // Replace placehold.co URLs with colors and text
    pattern: /'https:\/\/placehold\.co\/([^']+)'/g,
    replacement: "getPlaceholderImage('https://placehold.co/$1')"
  }
];

// Import statement to add
const importStatement = "import { getPlaceholderImage } from '../utils/placeholderService';";
const backendImportStatement = "// Note: Replace with actual placeholder service for backend";

function processFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${filePath}`);
      return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Check if file contains placehold.co URLs
    if (!content.includes('placehold.co')) {
      return;
    }

    console.log(`Processing: ${filePath}`);

    // Apply replacements
    replacements.forEach(({ pattern, replacement }) => {
      const matches = content.match(pattern);
      if (matches) {
        content = content.replace(pattern, replacement);
        modified = true;
        console.log(`  - Replaced ${matches.length} placeholder URLs`);
      }
    });

    if (modified) {
      // Add import statement if it's a frontend TypeScript file and doesn't already have it
      if (filePath.includes('app/frontend/') && 
          filePath.endsWith('.tsx') && 
          !content.includes('placeholderService') &&
          !content.includes('getPlaceholderImage')) {
        
        // Find the last import statement
        const importLines = content.split('\n');
        let lastImportIndex = -1;
        
        for (let i = 0; i < importLines.length; i++) {
          if (importLines[i].trim().startsWith('import ')) {
            lastImportIndex = i;
          }
        }
        
        if (lastImportIndex >= 0) {
          importLines.splice(lastImportIndex + 1, 0, importStatement);
          content = importLines.join('\n');
          console.log(`  - Added import statement`);
        }
      }

      // Add comment for backend files
      if (filePath.includes('app/backend/') && !content.includes('placeholder service for backend')) {
        content = `${backendImportStatement}\n${content}`;
        console.log(`  - Added backend comment`);
      }

      // Write the modified content back
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`  ✓ Updated ${filePath}`);
    }

  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

function main() {
  console.log('🔧 Fixing placeholder URLs...\n');

  filesToProcess.forEach(processFile);

  console.log('\n✅ Placeholder URL fix completed!');
  console.log('\n📝 Next steps:');
  console.log('1. Review the changes in each file');
  console.log('2. Update any remaining hardcoded URLs manually');
  console.log('3. Test the application to ensure placeholders work correctly');
  console.log('4. The service worker will now intercept placehold.co requests');
}

if (require.main === module) {
  main();
}

module.exports = { processFile, replacements };