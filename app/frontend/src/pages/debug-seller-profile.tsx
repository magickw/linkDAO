import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { sellerService } from '../services/sellerService';

export default function DebugSellerProfile() {
  const { address, isConnected } = useAccount();
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const fetchProfile = async () => {
    if (!address) return;
    
    setLoading(true);
    setError('');
    
    try {
      console.log('Fetching profile for address:', address);
      const profile = await sellerService.getSellerProfile(address);
      console.log('Received profile:', profile);
      setProfileData(profile);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const testDirectAPI = async () => {
    if (!address) return;
    
    try {
      console.log('Testing direct API call for address:', address);
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/marketplace/seller/profile/${address}`);
      const data = await response.json();
      console.log('Direct API response:', data);
    } catch (err) {
      console.error('Direct API error:', err);
    }
  };

  useEffect(() => {
    if (address) {
      fetchProfile();
      testDirectAPI();
    }
  }, [address]);

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Debug Seller Profile</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Connection Info</h2>
          <div className="space-y-2 text-gray-300">
            <p><strong>Connected:</strong> {isConnected ? 'Yes' : 'No'}</p>
            <p><strong>Address:</strong> {address || 'Not connected'}</p>
            <p><strong>Backend URL:</strong> {process.env.NEXT_PUBLIC_BACKEND_URL}</p>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Profile Data</h2>
          {loading && <p className="text-yellow-400">Loading...</p>}
          {error && <p className="text-red-400">Error: {error}</p>}
          {profileData && (
            <div className="space-y-2 text-gray-300">
              <p><strong>Display Name:</strong> {profileData.displayName || 'Not set'}</p>
              <p><strong>Store Name:</strong> {profileData.storeName || 'Not set'}</p>
              <p><strong>Bio:</strong> {profileData.bio || 'Not set'}</p>
              <p><strong>Description:</strong> {profileData.description || 'Not set'}</p>
              <p><strong>Email:</strong> {profileData.email || 'Not set'}</p>
              <p><strong>Phone:</strong> {profileData.phone || 'Not set'}</p>
              <p><strong>Wallet Address:</strong> {profileData.walletAddress}</p>
              <p><strong>Updated At:</strong> {profileData.updatedAt}</p>
            </div>
          )}
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibent text-white mb-4">Raw Profile JSON</h2>
          <pre className="text-gray-300 text-sm overflow-auto bg-gray-900 p-4 rounded">
            {profileData ? JSON.stringify(profileData, null, 2) : 'No data'}
          </pre>
        </div>

        <div className="mt-6">
          <button
            onClick={fetchProfile}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mr-4"
            disabled={!address}
          >
            Refresh Profile
          </button>
          <button
            onClick={testDirectAPI}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
            disabled={!address}
          >
            Test Direct API
          </button>
        </div>
      </div>
    </div>
  );
}