import React, { useState, useEffect } from 'react';
import { Bell, Mail, Clock, DollarSign, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface EmailPreferences {
    emailNotificationsEnabled: boolean;
    emailFrequency: 'immediate' | 'hourly' | 'daily' | 'weekly' | 'off';
    digestTime: string;
    transactionThreshold: string;
    newDeviceAlerts: boolean;
    suspiciousActivityAlerts: boolean;
    largeTransactionAlerts: boolean;
    securityChangeAlerts: boolean;
}

export default function EmailPreferences() {
    const [preferences, setPreferences] = useState<EmailPreferences>({
        emailNotificationsEnabled: true,
        emailFrequency: 'immediate',
        digestTime: '09:00:00',
        transactionThreshold: '1000.00',
        newDeviceAlerts: true,
        suspiciousActivityAlerts: true,
        largeTransactionAlerts: false,
        securityChangeAlerts: true,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        loadPreferences();
    }, []);

    const loadPreferences = async () => {
        try {
            const response = await fetch('/api/security/alerts/config');
            if (!response.ok) throw new Error('Failed to load preferences');
            const data = await response.json();

            setPreferences({
                emailNotificationsEnabled: data.emailNotificationsEnabled ?? true,
                emailFrequency: data.emailFrequency || 'immediate',
                digestTime: data.digestTime || '09:00:00',
                transactionThreshold: data.transactionThreshold || '1000.00',
                newDeviceAlerts: data.newDeviceAlerts ?? true,
                suspiciousActivityAlerts: data.suspiciousActivityAlerts ?? true,
                largeTransactionAlerts: data.largeTransactionAlerts ?? false,
                securityChangeAlerts: data.securityChangeAlerts ?? true,
            });
        } catch (error) {
            console.error('Error loading preferences:', error);
            setMessage({ type: 'error', text: 'Failed to load email preferences' });
        } finally {
            setLoading(false);
        }
    };

    const savePreferences = async () => {
        setSaving(true);
        setMessage(null);

        try {
            const response = await fetch('/api/security/alerts/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(preferences),
            });

            if (!response.ok) throw new Error('Failed to save preferences');

            setMessage({ type: 'success', text: 'Email preferences saved successfully!' });
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            console.error('Error saving preferences:', error);
            setMessage({ type: 'error', text: 'Failed to save preferences. Please try again.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Mail className="h-6 w-6 text-primary-600" />
                    Email Notification Preferences
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Control how and when you receive security email notifications
                </p>
            </div>

            {/* Success/Error Message */}
            {message && (
                <div className={`p-4 rounded-lg flex items-center gap-3 ${message.type === 'success'
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                        : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                    }`}>
                    {message.type === 'success' ? (
                        <CheckCircle2 className="h-5 w-5" />
                    ) : (
                        <AlertCircle className="h-5 w-5" />
                    )}
                    <span className="text-sm font-medium">{message.text}</span>
                </div>
            )}

            {/* Master Toggle */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">Email Notifications</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Enable or disable all email notifications
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setPreferences({ ...preferences, emailNotificationsEnabled: !preferences.emailNotificationsEnabled })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${preferences.emailNotificationsEnabled ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
                            }`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${preferences.emailNotificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                    </button>
                </div>
            </div>

            {/* Email Frequency */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Clock className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">Email Frequency</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Choose how often you want to receive emails
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    {[
                        { value: 'immediate', label: 'Immediate', description: 'Receive emails as events occur' },
                        { value: 'hourly', label: 'Hourly Digest', description: 'Batched summary every hour' },
                        { value: 'daily', label: 'Daily Digest', description: 'One email per day at specified time' },
                        { value: 'weekly', label: 'Weekly Digest', description: 'One email per week' },
                        { value: 'off', label: 'Off', description: 'No emails (except critical security alerts)' },
                    ].map((option) => (
                        <label
                            key={option.value}
                            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${preferences.emailFrequency === option.value
                                    ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                }`}
                        >
                            <input
                                type="radio"
                                name="frequency"
                                value={option.value}
                                checked={preferences.emailFrequency === option.value}
                                onChange={(e) => setPreferences({ ...preferences, emailFrequency: e.target.value as any })}
                                className="mt-1"
                            />
                            <div className="flex-1">
                                <div className="font-medium text-gray-900 dark:text-white">{option.label}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">{option.description}</div>
                            </div>
                        </label>
                    ))}
                </div>

                {/* Digest Time Picker */}
                {(preferences.emailFrequency === 'daily' || preferences.emailFrequency === 'weekly') && (
                    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Digest Time
                        </label>
                        <input
                            type="time"
                            value={preferences.digestTime.substring(0, 5)}
                            onChange={(e) => setPreferences({ ...preferences, digestTime: e.target.value + ':00' })}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                    </div>
                )}
            </div>

            {/* Alert Types */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <AlertCircle className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">Alert Types</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Choose which types of alerts you want to receive
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    {[
                        { key: 'newDeviceAlerts', label: 'New Device Login', description: 'Alert when logging in from a new device', critical: true },
                        { key: 'suspiciousActivityAlerts', label: 'Suspicious Activity', description: 'Alert for unusual account activity', critical: true },
                        { key: 'securityChangeAlerts', label: 'Security Changes', description: 'Alert when security settings are modified', critical: false },
                        { key: 'largeTransactionAlerts', label: 'Large Transactions', description: 'Alert for transactions above threshold', critical: false },
                    ].map((alert) => (
                        <div key={alert.key} className="flex items-start justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900 dark:text-white">{alert.label}</span>
                                    {alert.critical && (
                                        <span className="px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded">
                                            Critical
                                        </span>
                                    )}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{alert.description}</div>
                            </div>
                            <button
                                onClick={() => setPreferences({ ...preferences, [alert.key]: !preferences[alert.key as keyof EmailPreferences] })}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${preferences[alert.key as keyof EmailPreferences] ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
                                    }`}
                                disabled={alert.critical}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${preferences[alert.key as keyof EmailPreferences] ? 'translate-x-6' : 'translate-x-1'
                                    }`} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Transaction Threshold */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <DollarSign className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">Large Transaction Threshold</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Set the amount that triggers a large transaction alert
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-gray-600 dark:text-gray-400">$</span>
                    <input
                        type="number"
                        value={preferences.transactionThreshold}
                        onChange={(e) => setPreferences({ ...preferences, transactionThreshold: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        min="0"
                        step="100"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">USD</span>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-3">
                <button
                    onClick={loadPreferences}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    disabled={saving}
                >
                    Reset
                </button>
                <button
                    onClick={savePreferences}
                    disabled={saving}
                    className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {saving ? 'Saving...' : 'Save Preferences'}
                </button>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                        <p className="font-medium mb-1">Important Notes:</p>
                        <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-300">
                            <li>Critical security alerts (new device, suspicious activity) will always be sent unless you completely unsubscribe</li>
                            <li>Digest emails are currently in development and will be available soon</li>
                            <li>You can unsubscribe from all non-critical emails at any time</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
