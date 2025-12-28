import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Mail, CheckCircle2, XCircle, Loader2, Settings, ArrowLeft } from 'lucide-react';

export default function UnsubscribePage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleUnsubscribe = async () => {
        if (!token) {
            setStatus('error');
            setMessage('Invalid unsubscribe link. Please check your email and try again.');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/email/unsubscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to unsubscribe');
            }

            setStatus('success');
            setMessage(data.message || 'Successfully unsubscribed from non-critical security emails.');
        } catch (error: any) {
            console.error('Unsubscribe error:', error);
            setStatus('error');
            setMessage(error.message || 'Failed to process unsubscribe request. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResubscribe = async () => {
        if (!token) return;

        setLoading(true);

        try {
            const response = await fetch('/api/email/resubscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to resubscribe');
            }

            setStatus('success');
            setMessage(data.message || 'Successfully resubscribed to security email notifications.');
        } catch (error: any) {
            console.error('Resubscribe error:', error);
            setStatus('error');
            setMessage(error.message || 'Failed to resubscribe. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
                    <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Invalid Link</h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        This unsubscribe link is invalid or has expired. Please check your email and try again.
                    </p>
                    <button
                        onClick={() => navigate('/')}
                        className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
                    >
                        Go to Home
                    </button>
                </div>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
                    <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        {message.includes('resubscribed') ? 'Resubscribed!' : 'Unsubscribed Successfully'}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>

                    <div className="space-y-3">
                        {message.includes('Unsubscribed') && (
                            <button
                                onClick={handleResubscribe}
                                disabled={loading}
                                className="w-full px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                                Resubscribe
                            </button>
                        )}
                        <button
                            onClick={() => navigate('/settings?tab=security')}
                            className="w-full px-6 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <Settings className="h-4 w-4" />
                            Manage Preferences
                        </button>
                        <button
                            onClick={() => navigate('/')}
                            className="w-full px-6 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center justify-center gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Go to Home
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
                    <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Error</h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>

                    <div className="space-y-3">
                        <button
                            onClick={() => setStatus('idle')}
                            className="w-full px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
                        >
                            Try Again
                        </button>
                        <button
                            onClick={() => navigate('/')}
                            className="w-full px-6 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                            Go to Home
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
                <div className="text-center mb-6">
                    <Mail className="h-16 w-16 text-primary-600 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Unsubscribe from Email Notifications
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        You're about to unsubscribe from non-critical security email notifications
                    </p>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
                    <h3 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-2">What will happen:</h3>
                    <ul className="text-sm text-yellow-800 dark:text-yellow-300 space-y-1">
                        <li>✓ You'll stop receiving non-critical emails</li>
                        <li>✓ You'll still receive critical security alerts</li>
                        <li>✓ You can resubscribe anytime</li>
                        <li>✓ You can manage preferences in settings</li>
                    </ul>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">Critical alerts you'll still receive:</h3>
                    <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                        <li>• New device login attempts</li>
                        <li>• Suspicious activity detected</li>
                        <li>• Two-factor authentication changes</li>
                    </ul>
                </div>

                <div className="space-y-3">
                    <button
                        onClick={handleUnsubscribe}
                        disabled={loading}
                        className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                        {loading ? 'Processing...' : 'Confirm Unsubscribe'}
                    </button>

                    <button
                        onClick={() => navigate('/settings?tab=security')}
                        className="w-full px-6 py-3 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <Settings className="h-4 w-4" />
                        Manage Preferences Instead
                    </button>

                    <button
                        onClick={() => navigate('/')}
                        className="w-full px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
