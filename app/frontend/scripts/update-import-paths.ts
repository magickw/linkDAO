import * as fs from 'fs';
import * as path from 'path';

const componentsDir = path.join(__dirname, '../src/components/Dashboard');

// List of components to update
const components: string[] = [
  'OrderManagement.tsx',
  'PerformanceInsights.tsx',
  'ProductManagement.tsx',
  'RevenueTracking.tsx',
  'SellerDashboard.tsx'
];

function updateImports(component: string): void {
  const filePath = path.join(componentsDir, component);
  
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Update import path for useMarketplace
    content = content.replace(
      /import\s*\{\s*useMarketplace\s*\}\s*from\s*['"]@\/hooks\/useMarketplace['"]/g,
      'import { useMarketplace } from \'../../hooks/useMarketplace\''
    );
    
    // Update import path for react-query
    content = content.replace(
      /import\s*\{\s*useQuery[^}]*\}\s*from\s*['"]react-query['"]/g,
      'import { useQuery } from \'@tanstack/react-query\''
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated imports in ${component}`);
  } else {
    console.log(`Skipping ${component} (not found)`);
  }
}

// Process all components
components.forEach(component => {
  try {
    updateImports(component);
  } catch (error) {
    console.error(`Error processing ${component}:`, error);
  }
});

console.log('Import path updates complete!');
