import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';

export default function TestWalletConnection() {
  const { address, isConnected, isConnecting } = useAccount();
  const [backendTest, setBackendTest] = useState<any>(null);

  useEffect(() => {
    const testBackend = async () => {
      if (!address) return;
      
      try {
        console.log('Testing backend with address:', address);
        
        // Test GET request
        const getResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/marketplace/seller/profile/${address}`);
        const getData = await getResponse.json();
        console.log('GET response:', getData);
        
        // Test PUT request
        const putResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/marketplace/seller/profile/${address}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            displayName: 'Real User Profile',
            storeName: 'Real User Store',
            bio: 'This is my actual profile',
            description: 'Updated from frontend'
          })
        });
        const putData = await putResponse.json();
        console.log('PUT response:', putData);
        
        // Test GET again to verify update
        const getResponse2 = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/marketplace/seller/profile/${address}`);
        const getData2 = await getResponse2.json();
        console.log('GET after update:', getData2);
        
        setBackendTest({
          address,
          beforeUpdate: getData,
          updateResponse: putData,
          afterUpdate: getData2
        });
        
      } catch (error) {
        console.error('Backend test error:', error);
        setBackendTest({ error: error.message });
      }
    };

    if (address) {
      testBackend();
    }
  }, [address]);

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Wallet Connection Test</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Wallet Status</h2>
          <div className="space-y-2 text-gray-300">
            <p><strong>Connected:</strong> {isConnected ? 'Yes' : 'No'}</p>
            <p><strong>Connecting:</strong> {isConnecting ? 'Yes' : 'No'}</p>
            <p><strong>Address:</strong> {address || 'Not connected'}</p>
            <p><strong>Backend URL:</strong> {process.env.NEXT_PUBLIC_BACKEND_URL}</p>
          </div>
        </div>

        {backendTest && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Backend Test Results</h2>
            <pre className="text-gray-300 text-sm overflow-auto bg-gray-900 p-4 rounded">
              {JSON.stringify(backendTest, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-6">
          <p className="text-gray-400 text-sm">
            This page tests the wallet connection and backend communication.
            Open browser console to see detailed logs.
          </p>
        </div>
      </div>
    </div>
  );
}