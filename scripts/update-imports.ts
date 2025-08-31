import fs from 'fs';
import path from 'path';

// Directory containing the Dashboard components
const dashboardDir = path.join(__dirname, '../app/frontend/src/components/Marketplace/Dashboard');

// Files to update
const files = [
  'ActivityFeed.tsx',
  'AnalyticsOverview.tsx',
  'OrderManagement.tsx',
  'PerformanceInsights.tsx',
  'ProductManagement.tsx',
  'RevenueTracking.tsx',
  'SellerDashboard.tsx'
];

// Update imports in each file
files.forEach(file => {
  const filePath = path.join(dashboardDir, file);
  
  if (fs.existsSync(filePath)) {
    // Read file content
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Update import paths for useMarketplace
    content = content.replace(
      /from ['"](?:\.\.\/){2,}hooks\/useMarketplace['"]/g, 
      "from '@/hooks/useMarketplace'"
    );
    
    // Update import paths for UI components
    content = content.replace(
      /from ['"](?:\.\.\/){2,}ui\/([^'"\/]+)['"]/g, 
      "from '@/components/ui/$1'"
    );
    
    // Write updated content back to file
    fs.writeFileSync(filePath, content);
    
    console.log(`Updated imports in: ${file}`);
  } else {
    console.warn(`File not found: ${filePath}`);
  }
});

console.log('Import paths updated successfully!');
