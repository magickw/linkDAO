import React from 'react';

export default function TestEnv() {
  // These will be replaced at build time with actual values
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Environment Variables Test</h1>
      <p>NEXT_PUBLIC_BACKEND_URL: {backendUrl}</p>
      <p>NEXT_PUBLIC_API_URL: {apiUrl}</p>
      <p>Expected: http://localhost:10000</p>
    </div>
  );
}