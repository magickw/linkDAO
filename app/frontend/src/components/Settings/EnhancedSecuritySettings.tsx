import React, { useState, useEffect } from 'react';
import { securityService } from '@/services/securityService';
import type { Session, ActivityLogEntry, TrustedDevice, SecurityAlert, SecurityAlertsConfig, PrivacySettings } from '@/services/securityService';

export function EnhancedSecuritySettings() {
    // State management
    const [loading, setLoading] = useState(true);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
    const [trustedDevices, setTrustedDevices] = useState<TrustedDevice[]>([]);
    const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
    const [alertsConfig, setAlertsConfig] = useState<SecurityAlertsConfig | null>(null);
    const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);
    const [show2FASetup, setShow2FASetup] = useState(false);
    const [qrCode, setQrCode] = useState<string>('');
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [verificationCode, setVerificationCode] = useState('');

    // Load all security data on mount
    useEffect(() => {
        loadSecurityData();
    }, []);

    const loadSecurityData = async () => {
        try {
            setLoading(true);
            const [
                sessionsData,
                activityData,
                devicesData,
                alertsData,
                configData,
                privacyData
            ] = await Promise.all([
                securityService.getSessions().catch(() => []),
                securityService.getActivityLog(10).catch(() => []),
                securityService.getTrustedDevices().catch(() => []),
                securityService.getAlerts(true).catch(() => []),
                securityService.getAlertsConfig().catch(() => null),
                securityService.getPrivacySettings().catch(() => null)
            ]);

            setSessions(sessionsData);
            setActivityLog(activityData);
            setTrustedDevices(devicesData);
            setAlerts(alertsData);
            setAlertsConfig(configData);
            setPrivacySettings(privacyData);
        } catch (error) {
            console.error('Error loading security data:', error);
        } finally {
            setLoading(false);
        }
    };

    // 2FA handlers
    const handleSetup2FA = async () => {
        try {
            const result = await securityService.setupTOTP();
            setQrCode(result.qrCode);
            setBackupCodes(result.backupCodes);
            setShow2FASetup(true);
        } catch (error) {
            console.error('Error setting up 2FA:', error);
            alert('Failed to setup 2FA. Please try again.');
        }
    };

    const handleVerify2FA = async () => {
        try {
            await securityService.verifyAndEnableTOTP(verificationCode);
            setShow2FASetup(false);
            setVerificationCode('');
            alert('2FA enabled successfully!');
            loadSecurityData();
        } catch (error) {
            console.error('Error verifying 2FA:', error);
            alert('Invalid verification code. Please try again.');
        }
    };

    // Session handlers
    const handleTerminateSession = async (sessionId: string) => {
        if (!confirm('Are you sure you want to terminate this session?')) return;

        try {
            await securityService.terminateSession(sessionId);
            setSessions(sessions.filter(s => s.id !== sessionId));
        } catch (error) {
            console.error('Error terminating session:', error);
            alert('Failed to terminate session.');
        }
    };

    const handleTerminateAllSessions = async () => {
        if (!confirm('This will log you out of all other devices. Continue?')) return;

        try {
            await securityService.terminateAllOtherSessions();
            loadSecurityData();
            alert('All other sessions terminated successfully!');
        } catch (error) {
            console.error('Error terminating sessions:', error);
            alert('Failed to terminate sessions.');
        }
    };

    // Alert config handlers
    const handleToggleAlert = async (key: keyof SecurityAlertsConfig, value: boolean) => {
        if (!alertsConfig) return;

        try {
            await securityService.updateAlertsConfig({ [key]: value });
            setAlertsConfig({ ...alertsConfig, [key]: value });
        } catch (error) {
            console.error('Error updating alert config:', error);
        }
    };

    // Privacy settings handlers
    const handleTogglePrivacy = async (key: keyof PrivacySettings, value: boolean) => {
        if (!privacySettings) return;

        try {
            await securityService.updatePrivacySettings({ [key]: value });
            setPrivacySettings({ ...privacySettings, [key]: value });
        } catch (error) {
            console.error('Error updating privacy settings:', error);
        }
    };

    // Trusted device handlers
    const handleRemoveDevice = async (deviceId: string) => {
        if (!confirm('Remove this trusted device?')) return;

        try {
            await securityService.removeTrustedDevice(deviceId);
            setTrustedDevices(trustedDevices.filter(d => d.id !== deviceId));
        } catch (error) {
            console.error('Error removing device:', error);
            alert('Failed to remove device.');
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    <span className="ml-3 text-gray-600 dark:text-gray-400">Loading security settings...</span>
                </div>
            </div>
        );
    }
    return (
        <div className="p-6">
            <div className="flex items-center mb-6">
                <span className="text-2xl mr-3">🔒</span>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Security & Privacy</h2>
            </div>

            <div className="space-y-6">
                {/* Security Status Overview */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-start">
                        <div className="flex-shrink-0">
                            <span className="text-green-500 text-xl">✅</span>
                        </div>
                        <div className="ml-3 flex-1">
                            <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                                Security Status: Good
                            </h3>
                            <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                                Your account is protected with wallet-based authentication. Consider enabling additional security features below.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Two-Factor Authentication */}
                <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Two-Factor Authentication</h3>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">Authenticator App (TOTP)</div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">Use an authenticator app for additional security</div>
                            </div>
                            <button className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors">
                                Enable
                            </button>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-600">
                            <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">Email Verification</div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">Receive verification codes via email</div>
                            </div>
                            <button className="px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 bg-primary-50 hover:bg-primary-100 dark:bg-primary-900/50 rounded-lg transition-colors">
                                Configure
                            </button>
                        </div>
                    </div>
                </div>

                {/* Active Sessions */}
                <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Active Sessions</h3>
                    <div className="space-y-3">
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start space-x-3">
                                    <span className="text-2xl">💻</span>
                                    <div>
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">Current Session</div>
                                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                            <div>macOS • Chrome</div>
                                            <div className="mt-1">Last active: Just now</div>
                                        </div>
                                    </div>
                                </div>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                    Active
                                </span>
                            </div>
                        </div>
                        <button className="w-full text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium py-2">
                            Terminate All Other Sessions
                        </button>
                    </div>
                </div>

                {/* Recent Activity */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Recent Activity</h3>
                        <button className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium">
                            View All
                        </button>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-600">
                        <div className="p-3 flex items-center space-x-3">
                            <span className="text-lg">🔐</span>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">Wallet Connected</div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">Just now</div>
                            </div>
                        </div>
                        <div className="p-3 flex items-center space-x-3">
                            <span className="text-lg">✏️</span>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">Profile Updated</div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">2 hours ago</div>
                            </div>
                        </div>
                        <div className="p-3 flex items-center space-x-3">
                            <span className="text-lg">🔔</span>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">Notification Settings Changed</div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">Yesterday</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Security Alerts */}
                <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Security Alerts</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="text-sm font-medium text-gray-900 dark:text-white">New Device Login Alerts</label>
                                <p className="text-xs text-gray-600 dark:text-gray-400">Get notified when your account is accessed from a new device</p>
                            </div>
                            <input type="checkbox" className="rounded" defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="text-sm font-medium text-gray-900 dark:text-white">Suspicious Activity Alerts</label>
                                <p className="text-xs text-gray-600 dark:text-gray-400">Receive alerts for unusual account activity</p>
                            </div>
                            <input type="checkbox" className="rounded" defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="text-sm font-medium text-gray-900 dark:text-white">Large Transaction Alerts</label>
                                <p className="text-xs text-gray-600 dark:text-gray-400">Get notified for transactions above a certain threshold</p>
                            </div>
                            <input type="checkbox" className="rounded" />
                        </div>
                    </div>
                </div>

                {/* Trusted Devices */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Trusted Devices</h3>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                                <span className="text-xl">💻</span>
                                <div>
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">MacBook Pro</div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400">Added today</div>
                                </div>
                            </div>
                            <button className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 font-medium">
                                Remove
                            </button>
                        </div>
                    </div>
                </div>

                {/* Privacy Controls */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Privacy Controls</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="text-sm font-medium text-gray-900 dark:text-white">Hide Transaction History</label>
                                <p className="text-xs text-gray-600 dark:text-gray-400">Make your transaction history private</p>
                            </div>
                            <input type="checkbox" className="rounded" />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="text-sm font-medium text-gray-900 dark:text-white">Anonymous Mode</label>
                                <p className="text-xs text-gray-600 dark:text-gray-400">Hide your wallet address from public view</p>
                            </div>
                            <input type="checkbox" className="rounded" />
                        </div>
                    </div>
                </div>

                {/* Data Management */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Data Management</h3>
                    <div className="space-y-3">
                        <button className="w-full text-left p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                            <div className="flex items-center">
                                <span className="text-lg mr-3">📥</span>
                                <div>
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">Export My Data</div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400">Download a copy of your data</div>
                                </div>
                            </div>
                        </button>
                        <button className="w-full text-left p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                            <div className="flex items-center">
                                <span className="text-lg mr-3">🗑️</span>
                                <div>
                                    <div className="text-sm font-medium text-red-600 dark:text-red-400">Delete Account</div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400">Permanently delete your account and data</div>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Security Best Practices */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Security Best Practices</h3>
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                            <li className="flex items-start">
                                <span className="mr-2">🔐</span>
                                <span>Never share your private keys or seed phrase with anyone</span>
                            </li>
                            <li className="flex items-start">
                                <span className="mr-2">🎯</span>
                                <span>Always verify URLs before connecting your wallet</span>
                            </li>
                            <li className="flex items-start">
                                <span className="mr-2">💾</span>
                                <span>Store your seed phrase securely offline</span>
                            </li>
                            <li className="flex items-start">
                                <span className="mr-2">🔒</span>
                                <span>Consider using a hardware wallet for large amounts</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
