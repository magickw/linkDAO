/**
 * Test page for non-custodial wallet login
 * This page allows testing the complete authentication flow
 */

import React, { useState } from 'react';
import Head from 'next/head';
import { NonCustodialWalletLogin } from '@/components/Auth/NonCustodialWalletLogin';
import { useAuth } from '@/context/AuthContext';
import { LogOut } from 'lucide-react';

export default function TestNonCustodialLoginPage() {
  const { user, isAuthenticated, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(!isAuthenticated);

  const handleLoginSuccess = () => {
    setShowLogin(false);
  };

  const handleLogout = async () => {
    await logout();
    setShowLogin(true);
  };

  return (
    <>
      <Head>
        <title>Test Non-Custodial Wallet Login - LinkDAO</title>
        <meta name="description" content="Test page for non-custodial wallet authentication" />
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Non-Custodial Wallet Login Test
          </h1>

          {isAuthenticated && user ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Authentication Successful!
                </h2>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    User ID
                  </p>
                  <p className="text-lg text-gray-900 dark:text-white font-mono">
                    {user.id}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Wallet Address
                  </p>
                  <p className="text-lg text-gray-900 dark:text-white font-mono">
                    {user.address}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Handle
                  </p>
                  <p className="text-lg text-gray-900 dark:text-white">
                    {user.handle}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Role
                  </p>
                  <p className="text-lg text-gray-900 dark:text-white">
                    {user.role}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    KYC Status
                  </p>
                  <p className="text-lg text-gray-900 dark:text-white">
                    {user.kycStatus || 'none'}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Created At
                  </p>
                  <p className="text-lg text-gray-900 dark:text-white">
                    {new Date(user.createdAt).toLocaleString()}
                  </p>
                </div>

                {user.email && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Email
                    </p>
                    <p className="text-lg text-gray-900 dark:text-white">
                      {user.email}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : showLogin ? (
            <NonCustodialWalletLogin
              onSuccess={handleLoginSuccess}
              onCancel={() => setShowLogin(false)}
            />
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Not authenticated
              </p>
              <button
                onClick={() => setShowLogin(true)}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Login with Non-Custodial Wallet
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}