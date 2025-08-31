// This script updates all React Query imports and usage to v4+
import * as fs from 'fs';
import * as path from 'path';

const componentsDir = path.join(__dirname, '../src/components/Dashboard');

// List of components to update
const components: string[] = [
  'AnalyticsOverview.tsx',
  'OrderManagement.tsx',
  'PerformanceInsights.tsx',
  'ProductManagement.tsx',
  'RevenueTracking.tsx',
  'SellerDashboard.tsx'
];

function updateComponent(component: string): void {
  const filePath = path.join(componentsDir, component);
  
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Update import statement
    content = content.replace(
      /import\s*\{\s*useQuery[^}]*\}\s*from\s*['"]@tanstack\/react-query['"]/g,
      'import { useQuery } from \'@tanstack/react-query\''
    );
    
    // Update useQuery usage
    content = content.replace(
      /useQuery\(\s*\[([^\]]+)\]\s*,\s*([^,]+)(?:,\s*\{([^}]*)\})?/gs,
      (_match: string, queryKey: string, queryFn: string, options: string = ''): string => {
        // Clean up the query key
        const cleanQueryKey = queryKey
          .replace(/\s*,\s*/g, ', ')
          .replace(/\s*\+\s*/g, ' + ')
          .trim();
          
        // Clean up the query function
        const cleanQueryFn = queryFn.trim();
        
        // Clean up options
        const cleanOptions = options
          .replace(/\s*,\s*/g, '\n    ')
          .trim();
          
        let result = `useQuery({\n    queryKey: [${cleanQueryKey}],\n    queryFn: ${cleanQueryFn}`;
        
        if (cleanOptions) {
          result += `,\n    ${cleanOptions}`;
        }
        
        result += '\n  })';
        
        return result;
      }
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${component}`);
  } else {
    console.log(`Skipping ${component} (not found)`);
  }
}

// Process all components
components.forEach(component => {
  try {
    updateComponent(component);
  } catch (error) {
    console.error(`Error processing ${component}:`, error);
  }
});

console.log('Update complete!');
