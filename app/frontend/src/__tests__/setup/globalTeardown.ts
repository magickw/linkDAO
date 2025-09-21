import fs from 'fs';
import path from 'path';

export default async function globalTeardown() {
  console.log('🧹 Cleaning up Reddit-Style Community test environment...');

  // Calculate total test duration
  const testDuration = Date.now() - (global.testStartTime || Date.now());
  console.log(`⏱️ Total test execution time: ${(testDuration / 1000).toFixed(2)}s`);

  // Clean up temporary test files
  const testDataPath = path.join(process.cwd(), 'src', '__tests__', 'data');
  if (fs.existsSync(testDataPath)) {
    try {
      fs.rmSync(testDataPath, { recursive: true, force: true });
    } catch (error) {
      console.warn('Warning: Could not clean up test data directory:', error);
    }
  }

  // Generate final test summary
  const reportsDir = path.join(process.cwd(), 'test-reports', 'reddit-style');
  if (fs.existsSync(reportsDir)) {
    const summaryPath = path.join(reportsDir, 'test-summary.json');
    const summary = {
      timestamp: new Date().toISOString(),
      duration: testDuration,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      testCategories: [
        'unit',
        'integration',
        'e2e',
        'accessibility',
        'performance',
        'cross-browser'
      ],
      features: [
        'Reddit-style layout',
        'Post voting system',
        'Sidebar widgets',
        'Mobile responsiveness',
        'Governance integration',
        'Performance optimizations',
        'Accessibility compliance',
        'Cross-browser compatibility'
      ]
    };

    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  }

  // Reset environment variables
  delete process.env.REACT_APP_API_URL;
  delete process.env.REACT_APP_WS_URL;

  console.log('✅ Reddit-Style Community test environment cleanup complete');
}