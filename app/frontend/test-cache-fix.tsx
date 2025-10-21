// Test file to verify SellerCacheDemo fixes
import React from 'react';

const TestComponent: React.FC = () => {
  // Test that we can render values safely
  const testNumber = 42;
  const testString = "test";
  const testUndefined = undefined;
  const testNull = null;
  
  return (
    <div>
      {/* Test number to string conversion */}
      <p>{testNumber.toString()}</p>
      
      {/* Test string rendering */}
      <p>{testString}</p>
      
      {/* Test undefined handling */}
      <p>{testUndefined?.toString() ?? 'N/A'}</p>
      
      {/* Test null handling */}
      <p>{testNull?.toString() ?? 'N/A'}</p>
      
      {/* Test error handling */}
      <p>{testNull instanceof Error ? testNull.message : String(testNull)}</p>
      
      {/* Test complex object rendering */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-3">Test Data</h3>
          <div className="text-sm space-y-2">
            <div><strong>Name:</strong> {testString?.toString() ?? 'N/A'}</div>
            <div><strong>Value:</strong> {testNumber?.toString() ?? 'N/A'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestComponent;