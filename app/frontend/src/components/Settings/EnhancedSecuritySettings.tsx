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
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [show2FASetup, setShow2FASetup] = useState(false);
    const [showEmail2FASetup, setShowEmail2FASetup] = useState(false);
    const [qrCode, setQrCode] = useState<string>('');
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [verificationCode, setVerificationCode] = useState('');
    const [emailVerificationCode, setEmailVerificationCode] = useState('');
    const [email2FAMessage, setEmail2FAMessage] = useState('');
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

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
                privacyData,
                twoFactorData
            ] = await Promise.all([
                securityService.getSessions().catch(() => []),
                securityService.getActivityLog(10).catch(() => []),
                securityService.getTrustedDevices().catch(() => []),
                securityService.getAlerts(true).catch(() => []),
                securityService.getAlertsConfig().catch(() => null),
                securityService.getPrivacySettings().catch(() => null),
                securityService.get2FAStatus().catch(() => ({ enabled: false, methods: [] }))
            ]);

            setSessions(sessionsData);
            setActivityLog(activityData);
            setTrustedDevices(devicesData);
            setAlerts(alertsData);
            setAlertsConfig(configData);
            setPrivacySettings(privacyData);
            setTwoFactorEnabled(twoFactorData.enabled);
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
            const errorMessage = error instanceof Error ? error.message : 'Failed to setup 2FA. Please try again.';
            alert(errorMessage);
        }
    };

    const handleVerify2FA = async () => {
        try {
            await securityService.verifyAndEnableTOTP(verificationCode);
            setShow2FASetup(false);
            setVerificationCode('');
            setSuccessMessage('2FA enabled successfully! Your account is now more secure.');
            setShowSuccessMessage(true);
            loadSecurityData();
            
            // Auto-hide success message after 5 seconds
            setTimeout(() => {
                setShowSuccessMessage(false);
            }, 5000);
        } catch (error) {
            console.error('Error verifying 2FA:', error);
            alert('Invalid verification code. Please try again.');
        }
    };

    const handleSetupEmail2FA = async () => {
        try {
            const result = await securityService.setupEmail2FA();
            setEmail2FAMessage(result.message || 'Verification code sent to your email');
            setShowEmail2FASetup(true);
        } catch (error) {
            console.error('Error setting up email 2FA:', error);
            alert('Failed to setup email 2FA. Please try again.');
        }
    };

    const handleVerifyEmail2FA = async () => {
        try {
            await securityService.verifyAndEnableEmail2FA(emailVerificationCode);
            setShowEmail2FASetup(false);
            setEmailVerificationCode('');
            setSuccessMessage('Email 2FA enabled successfully! Your account is now more secure.');
            setShowSuccessMessage(true);
            loadSecurityData();
            
            // Auto-hide success message after 5 seconds
            setTimeout(() => {
                setShowSuccessMessage(false);
            }, 5000);
        } catch (error) {
            console.error('Error verifying email 2FA:', error);
            alert('Invalid verification code. Please try again.');
        }
    };

    const handleDisable2FA = async () => {
        if (!confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
            return;
        }

        try {
            await securityService.disable2FA();
            setSuccessMessage('2FA disabled successfully.');
            setShowSuccessMessage(true);
            loadSecurityData();
            
            // Auto-hide success message after 5 seconds
            setTimeout(() => {
                setShowSuccessMessage(false);
            }, 5000);
        } catch (error) {
            console.error('Error disabling 2FA:', error);
            alert('Failed to disable 2FA. Please try again.');
        }
    };

    const handleResendEmailCode = async () => {
        try {
            const result = await securityService.resendEmailVerificationCode();
            setEmail2FAMessage(result.message || 'New verification code sent to your email');
        } catch (error) {
            console.error('Error resending verification code:', error);
            alert('Failed to resend verification code. Please try again.');
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

            {/* Success Message */}
            {showSuccessMessage && (
                <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-start">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3 flex-1">
                            <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                                Success
                            </h3>
                            <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                                {successMessage}
                            </div>
                        </div>
                        <div className="ml-auto pl-3">
                            <div className="-mx-1.5 -my-1.5">
                                <button
                                    onClick={() => setShowSuccessMessage(false)}
                                    className="inline-flex bg-green-50 dark:bg-green-900/20 rounded-md p-1.5 text-green-500 hover:bg-green-100 dark:hover:bg-green-900/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-green-50 focus:ring-green-600"
                                >
                                    <span className="sr-only">Dismiss</span>
                                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                            {twoFactorEnabled ? (
                                <button
                                    onClick={handleDisable2FA}
                                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                                >
                                    Disable
                                </button>
                            ) : (
                                <button
                                    onClick={handleSetup2FA}
                                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
                                >
                                    Enable
                                </button>
                            )}
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-600">
                            <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">Email Verification</div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">Receive verification codes via email</div>
                            </div>
                            <button
                                onClick={handleSetupEmail2FA}
                                className="px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 bg-primary-50 hover:bg-primary-100 dark:bg-primary-900/50 rounded-lg transition-colors"
                            >
                                Enable
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

                {/* Email Notification Preferences */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Email Notification Preferences</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                Email Frequency
                            </label>
                            <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                                <option value="immediate">Immediate - Receive emails as events occur</option>
                                <option value="hourly">Hourly Digest - Batched summary every hour</option>
                                <option value="daily">Daily Digest - One email per day</option>
                                <option value="weekly">Weekly Digest - One email per week</option>
                                <option value="off">Off - No emails (except critical alerts)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                Digest Time (for daily/weekly)
                            </label>
                            <input
                                type="time"
                                defaultValue="09:00"
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                Large Transaction Threshold
                            </label>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-600 dark:text-gray-400">$</span>
                                <input
                                    type="number"
                                    defaultValue="1000"
                                    min="0"
                                    step="100"
                                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                />
                                <span className="text-sm text-gray-600 dark:text-gray-400">USD</span>
                            </div>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                            <p className="text-xs text-blue-800 dark:text-blue-200">
                                💡 Critical security alerts (new device, suspicious activity) will always be sent immediately regardless of your email frequency setting.
                            </p>
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

            {/* 2FA Setup Modal */}
            {show2FASetup && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShow2FASetup(false)}></div>

                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                                            Set Up Two-Factor Authentication
                                        </h3>

                                        <div className="mt-4 space-y-4">
                                            {/* QR Code */}
                                            {qrCode && (
                                                <div className="flex flex-col items-center">
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                                        Scan this QR code with your authenticator app
                                                    </p>
                                                    <div className="bg-white p-4 rounded-lg">
                                                        <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Backup Codes */}
                                            {backupCodes.length > 0 && (
                                                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                                                    <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                                                        Backup Codes
                                                    </h4>
                                                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-2">
                                                        Save these codes in a safe place. You can use them to access your account if you lose your device.
                                                    </p>
                                                    <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                                                        {backupCodes.map((code, index) => (
                                                            <div key={index} className="bg-white dark:bg-gray-700 p-2 rounded">
                                                                {code}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Verification Code Input */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Enter verification code from your app
                                                </label>
                                                <input
                                                    type="text"
                                                    value={verificationCode}
                                                    onChange={(e) => setVerificationCode(e.target.value)}
                                                    placeholder="000000"
                                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center text-lg tracking-widest"
                                                    maxLength={6}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button
                                    type="button"
                                    onClick={handleVerify2FA}
                                    disabled={verificationCode.length !== 6}
                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Verify and Enable
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShow2FASetup(false);
                                        setVerificationCode('');
                                    }}
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:w-auto sm:text-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Email 2FA Setup Modal */}
            {showEmail2FASetup && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => {
                            setShowEmail2FASetup(false);
                            setEmailVerificationCode('');
                            setEmail2FAMessage('');
                        }}></div>

                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                                            Set Up Email Verification
                                        </h3>

                                        <div className="mt-4 space-y-4">
                                            {/* Message */}
                                            {email2FAMessage && (
                                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                                    <p className="text-sm text-blue-800 dark:text-blue-200">
                                                        {email2FAMessage}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Verification Code Input */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Enter verification code sent to your email
                                                </label>
                                                <input
                                                    type="text"
                                                    value={emailVerificationCode}
                                                    onChange={(e) => setEmailVerificationCode(e.target.value)}
                                                    placeholder="000000"
                                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center text-lg tracking-widest"
                                                    maxLength={6}
                                                />
                                            </div>

                                            {/* Resend Code Button */}
                                            <button
                                                type="button"
                                                onClick={handleResendEmailCode}
                                                className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium"
                                            >
                                                Resend verification code
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button
                                    type="button"
                                    onClick={handleVerifyEmail2FA}
                                    disabled={emailVerificationCode.length !== 6}
                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Verify and Enable
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEmail2FASetup(false);
                                        setEmailVerificationCode('');
                                        setEmail2FAMessage('');
                                    }}
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:w-auto sm:text-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
