import React, { useState, useEffect } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Shield, AlertTriangle, Lock, Key, UserCheck, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { Button, GlassPanel } from '@/design-system';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/authService';

const AdminLoginPage: NextPage = () => {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { connect, connectors, error: connectError, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { user, isAuthenticated, isLoading, refreshUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'wallet' | 'credentials'>('wallet');
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Check if user is already authenticated and has admin role
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      const isAdminUser = ['admin', 'super_admin', 'moderator'].includes(user.role);
      if (isAdminUser) {
        const redirectTo = (router.query.redirect as string) || '/admin';
        router.push(redirectTo);
      } else {
        setError('Your account does not have administrative privileges. Please contact your system administrator.');
      }
    }
  }, [isAuthenticated, isLoading, user, router]);

  // Handle wallet connection completion
  useEffect(() => {
    if (isConnected && address && loginMethod === 'wallet') {
      // Wallet is connected, now authenticate with backend
      console.log('Wallet connected:', address);
      authenticateWithBackend();
    }
  }, [isConnected, address, loginMethod]);

  // Function to authenticate with backend
  const authenticateWithBackend = async () => {
    if (!address) return;
    
    setIsSubmitting(true);
    setError('');
    
    try {
      // Find the connected connector or use the first available one
      const connectedConnector = connectors.find(c => c.ready) || connectors[0];
      const result = await authService.authenticateWallet(address, connectedConnector, 'connected');
      
      if (result.success && result.user) {
        // Refresh user context to get updated role
        await refreshUser();
        setSuccessMessage('Authentication successful! Checking admin privileges...');
        
        // Check if user has admin role
        const isAdminUser = ['admin', 'super_admin', 'moderator'].includes(result.user.role);
        if (isAdminUser) {
          setTimeout(() => {
            const redirectTo = (router.query.redirect as string) || '/admin';
            router.push(redirectTo);
          }, 1500);
        } else {
          setError('Your account does not have administrative privileges. Please contact your system administrator.');
        }
      } else {
        setError(result.error || 'Authentication failed. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      const result = await authService.adminLogin(formData.email, formData.password);
      
      if (result.success && result.user) {
        // Refresh user context to get updated permissions
        await refreshUser();
        setSuccessMessage('Login successful! Redirecting to admin dashboard...');
        
        // Small delay to show success message
        setTimeout(() => {
          const isAdminUser = ['admin', 'super_admin', 'moderator'].includes(result.user!.role);
          if (isAdminUser) {
            const redirectTo = (router.query.redirect as string) || '/admin';
            router.push(redirectTo);
          } else {
            setError('Your account does not have administrative privileges.');
          }
        }, 1500);
      } else {
        setError(result.error || 'Invalid credentials. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center p-4">
        <GlassPanel className="p-8 text-center">
          <div className="animate-spin w-12 h-12 border-3 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-white text-lg">Verifying credentials...</p>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Branding & Info */}
        <div className="hidden lg:flex flex-col justify-center space-y-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">LinkDAO Admin</h1>
                <p className="text-purple-300">Secure Administration Portal</p>
              </div>
            </div>

            <GlassPanel className="p-6 space-y-4">
              <h3 className="text-xl font-semibold text-white mb-4">Admin Access Features</h3>
              
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <UserCheck className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium">User Management</h4>
                    <p className="text-gray-400 text-sm">Manage users, roles, and permissions</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Shield className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium">Content Moderation</h4>
                    <p className="text-gray-400 text-sm">Review and moderate platform content</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Key className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium">System Configuration</h4>
                    <p className="text-gray-400 text-sm">Configure platform settings and features</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4 text-orange-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium">Security Monitoring</h4>
                    <p className="text-gray-400 text-sm">Monitor security events and audit logs</p>
                  </div>
                </div>
              </div>
            </GlassPanel>

            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Lock className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-yellow-300 font-medium text-sm mb-1">Secure Access Required</h4>
                  <p className="text-yellow-200/80 text-xs">
                    This portal is restricted to authorized administrators only. All access attempts are logged and monitored.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Login Form */}
        <div className="flex flex-col justify-center">
          <GlassPanel className="p-8">
            {/* Mobile Branding */}
            <div className="lg:hidden mb-6">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">LinkDAO Admin</h1>
                  <p className="text-purple-300 text-sm">Administration Portal</p>
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">Admin Sign In</h2>
            <p className="text-gray-400 mb-6">
              Choose your authentication method to access the admin dashboard
            </p>

            {/* Login Method Toggle */}
            <div className="flex space-x-2 mb-6 bg-gray-800/50 rounded-lg p-1">
              <button
                onClick={() => setLoginMethod('wallet')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  loginMethod === 'wallet'
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Wallet Connect
              </button>
              <button
                onClick={() => setLoginMethod('credentials')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  loginMethod === 'credentials'
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Email & Password
              </button>
            </div>

            {/* Success Message */}
            {successMessage && (
              <div className="mb-6 bg-green-900/50 border border-green-500/50 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <p className="text-green-200 text-sm">{successMessage}</p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-6 bg-red-900/50 border border-red-500/50 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-200 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Connection Error */}
            {connectError && (
              <div className="mb-6 bg-red-900/50 border border-red-500/50 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-200 text-sm">{connectError.message}</p>
                </div>
              </div>
            )}

            {/* Wallet Connection */}
            {loginMethod === 'wallet' && (
              <div className="space-y-4">
                {isConnected && address ? (
                  <div className="text-center space-y-4">
                    <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${
                      isSubmitting 
                        ? 'bg-yellow-500 animate-pulse' 
                        : user && ['admin', 'super_admin', 'moderator'].includes(user.role)
                        ? 'bg-gradient-to-r from-green-500 to-blue-500'
                        : 'bg-gradient-to-r from-red-500 to-orange-500'
                    }`}>
                      {isSubmitting ? (
                        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <UserCheck className="w-8 h-8 text-white" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">
                        {isSubmitting ? 'Authenticating...' : 'Wallet Connected'}
                      </h3>
                      <div className="bg-gray-800 rounded-lg p-3 mb-4">
                        <p className="text-sm text-gray-400 mb-1">Connected Address:</p>
                        <p className="text-white font-mono text-sm break-all">{address}</p>
                      </div>
                      {isSubmitting && (
                        <p className="text-yellow-400 text-sm mb-4">
                          Signing message to verify admin privileges...
                        </p>
                      )}
                      {!isSubmitting && user && (
                        <div className="mb-4">
                          {['admin', 'super_admin', 'moderator'].includes(user.role) ? (
                            <p className="text-green-400 text-sm">
                              ✅ Admin privileges confirmed. Redirecting...
                            </p>
                          ) : (
                            <div>
                              <p className="text-red-400 text-sm mb-2">
                                ❌ Your account does not have admin privileges
                              </p>
                              <Button 
                                onClick={() => disconnect()} 
                                variant="outline" 
                                size="small"
                                className="mt-2"
                              >
                                Disconnect & Try Again
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <Button onClick={() => disconnect()} variant="outline" size="small">
                      Disconnect Wallet
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-gray-400 text-sm mb-4">
                      Connect your admin wallet to sign in securely using Web3 authentication.
                    </p>
                    {connectors.map((connector, index) => {
                      const isUnsupported = !connector.ready;
                      return (
                      <Button
                        key={`${connector.id}-${index}`}
                        onClick={() => {
                          if (isUnsupported) {
                            // Show installation instructions for unsupported wallets
                            const walletUrls: Record<string, string> = {
                              'MetaMask': 'https://metamask.io/download/',
                              'WalletConnect': 'https://walletconnect.com/',
                              'Rainbow': 'https://rainbow.me/',
                              'Safe': 'https://apps.gnosis-safe.io/',
                              'Base Account': 'https://www.base.org/',
                            };
                            const url = walletUrls[connector.name];
                            if (url) {
                              window.open(url, '_blank');
                            }
                          } else {
                            connect({ connector });
                          }
                        }}
                        variant={isUnsupported ? 'outline' : 'primary'}
                        className="w-full justify-between"
                        disabled={isPending}
                      >
                        <div className="flex items-center">
                          <div className={`w-8 h-8 rounded-full mr-3 flex items-center justify-center ${
                            isUnsupported 
                              ? 'bg-gray-600' 
                              : 'bg-gradient-to-r from-purple-500 to-blue-500'
                          }`}>
                            <Shield className="w-4 h-4 text-white" />
                          </div>
                          <span>{connector.name}</span>
                          {isUnsupported && (
                            <span className="text-xs text-gray-400 ml-2">
                              (Click to install)
                            </span>
                          )}
                        </div>
                        {isPending && (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        )}
                      </Button>
                      );
                    })}
                    
                    {/* Add the same ConnectButton as the main site */}
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <p className="text-gray-400 text-sm mb-3">Or use the standard wallet connection:</p>
                      <ConnectButton.Custom>
                        {({ openConnectModal, authenticationStatus, mounted }) => {
                          const ready = mounted && authenticationStatus !== 'loading';
                          return (
                            <Button
                              onClick={() => {
                                openConnectModal();
                                // Set up a listener to detect when wallet connects
                                const checkInterval = setInterval(() => {
                                  if (isConnected && address) {
                                    clearInterval(checkInterval);
                                    // Trigger authentication after wallet connects
                                    authenticateWithBackend();
                                  }
                                }, 500);
                                // Clear interval after 30 seconds to prevent memory leak
                                setTimeout(() => clearInterval(checkInterval), 30000);
                              }}
                              disabled={!ready}
                              variant="outline"
                              className="w-full"
                            >
                              <div className="flex items-center justify-center">
                                <Shield className="w-4 h-4 mr-2" />
                                Connect Wallet (Standard)
                              </div>
                            </Button>
                          );
                        }}
                      </ConnectButton.Custom>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Credentials Login */}
            {loginMethod === 'credentials' && (
              <form onSubmit={handleCredentialsLogin} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                    Admin Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="admin@linkdao.io"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-12"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-purple-600 bg-gray-800 border-gray-700 rounded focus:ring-purple-500 focus:ring-2"
                    />
                    <span className="text-sm text-gray-400">Remember me</span>
                  </label>
                  <button
                    type="button"
                    className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Signing In...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Sign In to Admin Panel
                    </>
                  )}
                </Button>
              </form>
            )}

            {/* Footer Links */}
            <div className="mt-6 pt-6 border-t border-gray-700">
              <p className="text-center text-sm text-gray-400">
                Need admin access?{' '}
                <a
                  href="mailto:admin@linkdao.io"
                  className="text-purple-400 hover:text-purple-300 transition-colors"
                >
                  Contact support
                </a>
              </p>
            </div>
          </GlassPanel>

          {/* Security Notice - Mobile */}
          <div className="lg:hidden mt-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Lock className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-yellow-300 font-medium text-sm mb-1">Secure Access</h4>
                <p className="text-yellow-200/80 text-xs">
                  All access attempts are logged and monitored.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;