/**
 * Enhanced Security Settings with New Security Services
 * Integrates all new security services including 2FA, hardware wallets, etc.
 */

import React, { useState, useEffect } from 'react';
import { Shield, Smartphone, Usb, AlertTriangle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { useAccount } from 'wagmi';
import { totpService } from '@/services/totpService';
import { contractVerificationService } from '@/services/contractVerificationService';
import { walletConnectSecurityService } from '@/services/walletConnectSecurityService';
import { realHardwareWalletService } from '@/services/hardwareWalletService.real';
import { auditLogger } from '@/services/auditLogger';
import { intrusionDetectionService } from '@/services/intrusionDetectionService';
import { TwoFactorSetup } from '@/components/Auth/TwoFactorSetup';
import { HardwareWalletConnect } from '@/components/Wallet/HardwareWalletConnect';

export function EnhancedSecuritySettingsNew() {
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'2fa' | 'hardware' | 'contracts' | 'audit' | 'sessions'>('2fa');
  const [userStatus, setUserStatus] = useState<any>(null);
  const [hardwareConnected, setHardwareConnected] = useState(false);
  const [walletConnectSessions, setWalletConnectSessions] = useState(0);
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [intrusionAlerts, setIntrusionAlerts] = useState<any[]>([]);

  useEffect(() => {
    if (isConnected && address) {
      loadSecurityData();
    }
  }, [isConnected, address]);

  const loadSecurityData = async () => {
    if (!address) return;

    try {
      setLoading(true);

      // Load 2FA status
      const status = totpService.getUserStatus(address);
      setUserStatus(status);

      // Check hardware wallet connection
      const ledgerConnected = await realHardwareWalletService.isLedgerConnected();
      const trezorConnected = await realHardwareWalletService.isTrezorConnected();
      setHardwareConnected(ledgerConnected || trezorConnected);

      // Get WalletConnect sessions
      const wcStats = walletConnectSecurityService.getStats();
      setWalletConnectSessions(wcStats.activeSessions);

      // Get recent audit events
      const events = auditLogger.getEvents();
      setAuditEvents(events.slice(0, 10));

      // Get intrusion alerts
      const alerts = intrusionDetectionService.getAlerts();
      setIntrusionAlerts(alerts.slice(0, 10));
    } catch (error) {
      console.error('Error loading security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: '2fa', name: 'Two-Factor Auth', icon: Smartphone },
    { id: 'hardware', name: 'Hardware Wallet', icon: Usb },
    { id: 'contracts', name: 'Contract Verification', icon: Shield },
    { id: 'audit', name: 'Audit Logs', icon: CheckCircle },
    { id: 'sessions', name: 'Active Sessions', icon: RefreshCw },
  ];

  if (!isConnected) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          Wallet Not Connected
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Please connect your wallet to access security settings
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-0" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === '2fa' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Two-Factor Authentication
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Add an extra layer of security to your wallet
                </p>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                userStatus?.enabled && userStatus?.verified
                  ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}>
                {userStatus?.enabled && userStatus?.verified ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Enabled
                  </>
                ) : (
                  'Disabled'
                )}
              </div>
            </div>

            <TwoFactorSetup
              userId={address || ''}
              onComplete={() => loadSecurityData()}
              onCancel={() => loadSecurityData()}
            />

            {userStatus?.enabled && userStatus?.verified && (
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  2FA Status
                </h4>
                <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="font-medium">Enabled</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Backup Codes:</span>
                    <span className="font-medium">{userStatus.remainingBackupCodes} remaining</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Blocked:</span>
                    <span className="font-medium">{userStatus.isBlocked ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'hardware' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Hardware Wallet
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Connect your Ledger or Trezor hardware wallet for enhanced security
              </p>
            </div>

            <HardwareWalletConnect
              onConnect={(walletInfo) => {
                loadSecurityData();
              }}
              onDisconnect={() => {
                loadSecurityData();
              }}
            />

            {hardwareConnected && (
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Hardware wallet connected</span>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'contracts' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Contract Verification
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Verify smart contracts before interacting with them
              </p>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    Automatic Contract Verification
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    All contract interactions are automatically verified using Etherscan API. You'll receive warnings for unverified or high-risk contracts.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Verification Features
              </h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>✓ Source code verification via Etherscan</li>
                <li>✓ Security risk assessment</li>
                <li>✓ Common vulnerability detection</li>
                <li>✓ Compiler version validation</li>
                <li>✓ Automatic warnings for risky contracts</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Security Audit Logs
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Recent security events and activities
              </p>
            </div>

            {auditEvents.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {auditEvents.map((event, index) => (
                  <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {event.type}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                    </div>
                    {event.walletAddress && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Wallet: {event.walletAddress.substring(0, 10)}...
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No recent audit events
              </div>
            )}

            {intrusionAlerts.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Intrusion Alerts
                </h4>
                <div className="space-y-2">
                  {intrusionAlerts.map((alert, index) => (
                    <div key={index} className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {alert.metric}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Deviation: {alert.deviation?.toFixed(2)}x
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Active Sessions
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Manage your active wallet connections
              </p>
            </div>

            <div className="space-y-2">
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Current Session
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {address?.substring(0, 10)}...
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">Active</span>
                  </div>
                </div>
              </div>

              {walletConnectSessions > 0 && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        WalletConnect Sessions
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {walletConnectSessions} active session{walletConnectSessions !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {hardwareConnected && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Hardware Wallet
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Ledger/Trezor connected
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}