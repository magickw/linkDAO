import React, { useState } from 'react';
import { useSeller } from '../hooks/useSeller';
import { Button } from '../design-system';

export default function TestSellerProfile() {
  const { profile, loading, error, updateProfile, isConnected, walletAddress } = useSeller();
  const [testData, setTestData] = useState({
    displayName: 'Test Seller Updated',
    storeName: 'Test Store Updated',
    bio: 'This is a test bio update',
    description: 'This is a test description update',
    email: 'test@example.com',
    phone: '+1234567890'
  });
  const [updateStatus, setUpdateStatus] = useState<string>('');

  const handleTestUpdate = async () => {
    try {
      setUpdateStatus('Updating...');
      console.log('Testing profile update with data:', testData);
      console.log('Wallet connected:', isConnected);
      console.log('Wallet address:', walletAddress);
      
      const result = await updateProfile(testData);
      console.log('Update result:', result);
      setUpdateStatus('✅ Profile updated successfully!');
    } catch (err) {
      console.error('Update failed:', err);
      setUpdateStatus(`❌ Update failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Seller Profile Update Test</h1>
        
        {/* Connection Status */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Connection Status</h2>
          <div className="space-y-2">
            <p className="text-gray-300">
              <span className="font-medium">Wallet Connected:</span> 
              <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
                {isConnected ? ' ✅ Yes' : ' ❌ No'}
              </span>
            </p>
            <p className="text-gray-300">
              <span className="font-medium">Wallet Address:</span> 
              <span className="text-blue-400">{walletAddress || 'Not connected'}</span>
            </p>
            <p className="text-gray-300">
              <span className="font-medium">Backend URL:</span> 
              <span className="text-blue-400">{process.env.NEXT_PUBLIC_BACKEND_URL || 'Not set'}</span>
            </p>
          </div>
        </div>

        {/* Current Profile */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Current Profile</h2>
          {loading && <p className="text-yellow-400">Loading profile...</p>}
          {error && <p className="text-red-400">Error: {error}</p>}
          {profile && (
            <div className="space-y-2 text-gray-300">
              <p><span className="font-medium">Display Name:</span> {profile.displayName || 'Not set'}</p>
              <p><span className="font-medium">Store Name:</span> {profile.storeName || 'Not set'}</p>
              <p><span className="font-medium">Bio:</span> {profile.bio || 'Not set'}</p>
              <p><span className="font-medium">Description:</span> {profile.description || 'Not set'}</p>
              <p><span className="font-medium">Email:</span> {profile.email || 'Not set'}</p>
              <p><span className="font-medium">Phone:</span> {profile.phone || 'Not set'}</p>
              <p><span className="font-medium">Last Updated:</span> {profile.updatedAt}</p>
            </div>
          )}
        </div>

        {/* Test Data */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Test Update Data</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">Display Name</label>
              <input
                type="text"
                value={testData.displayName}
                onChange={(e) => setTestData(prev => ({ ...prev, displayName: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Store Name</label>
              <input
                type="text"
                value={testData.storeName}
                onChange={(e) => setTestData(prev => ({ ...prev, storeName: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Bio</label>
              <input
                type="text"
                value={testData.bio}
                onChange={(e) => setTestData(prev => ({ ...prev, bio: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Email</label>
              <input
                type="email"
                value={testData.email}
                onChange={(e) => setTestData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-gray-400 text-sm mb-1">Description</label>
              <textarea
                value={testData.description}
                onChange={(e) => setTestData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
              />
            </div>
          </div>
        </div>

        {/* Test Button and Status */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <Button 
              onClick={handleTestUpdate}
              disabled={!isConnected || loading}
              variant="primary"
            >
              Test Profile Update
            </Button>
            {updateStatus && (
              <p className={`font-medium ${
                updateStatus.includes('✅') ? 'text-green-400' : 
                updateStatus.includes('❌') ? 'text-red-400' : 
                'text-yellow-400'
              }`}>
                {updateStatus}
              </p>
            )}
          </div>
          
          {!isConnected && (
            <p className="text-yellow-400 mt-4">
              ⚠️ Please connect your wallet to test profile updates
            </p>
          )}
        </div>

        {/* Debug Info */}
        <div className="bg-gray-800 rounded-lg p-6 mt-6">
          <h2 className="text-xl font-semibold text-white mb-4">Debug Information</h2>
          <div className="text-gray-300 text-sm space-y-1">
            <p><span className="font-medium">Environment:</span> {process.env.NODE_ENV}</p>
            <p><span className="font-medium">Backend URL:</span> {process.env.NEXT_PUBLIC_BACKEND_URL}</p>
            <p><span className="font-medium">Current Time:</span> {new Date().toISOString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}