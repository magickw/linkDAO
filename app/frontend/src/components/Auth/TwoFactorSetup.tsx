/**
 * 2FA Setup Component
 * Provides UI for setting up and managing TOTP-based 2FA
 */

import React, { useState, useEffect } from 'react';
import { Shield, Smartphone, Copy, CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { totpService } from '@/services/totpService';
import { useToast } from '@/context/ToastContext';

interface TwoFactorSetupProps {
  userId: string;
  onComplete?: () => void;
  onCancel?: () => void;
  className?: string;
}

type SetupStep = 'intro' | 'scan' | 'verify' | 'backup' | 'complete';

export const TwoFactorSetup: React.FC<TwoFactorSetupProps> = ({
  userId,
  onComplete,
  onCancel,
  className = ''
}) => {
  const { addToast } = useToast();
  const [step, setStep] = useState<SetupStep>('intro');
  const [secret, setSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState<Set<number>>(new Set());
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [userStatus, setUserStatus] = useState<any>(null);

  useEffect(() => {
    // Check current 2FA status
    const status = totpService.getUserStatus(userId);
    setUserStatus(status);

    if (status.enabled && status.verified) {
      setStep('complete');
    }
  }, [userId]);

  const handleSetup = async () => {
    try {
      const result = await totpService.generateSecret(userId);
      setSecret(result.secret);
      setQrCodeUrl(result.qrCodeUrl);
      setBackupCodes(result.backupCodes);
      setStep('scan');
    } catch (error: any) {
      addToast(`Failed to generate 2FA secret: ${error.message}`, 'error');
    }
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    setVerificationError(null);

    try {
      const result = await totpService.verifyCode(userId, verificationCode);
      
      if (result.success) {
        addToast('2FA verified successfully', 'success');
        setStep('backup');
      } else {
        setVerificationError(result.error || 'Invalid code');
        
        if (result.remainingAttempts !== undefined) {
          addToast(`Invalid code. ${result.remainingAttempts} attempts remaining.`, 'error');
        }
      }
    } catch (error: any) {
      setVerificationError(error.message || 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
    addToast('Secret copied to clipboard', 'info');
  };

  const handleCopyBackupCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCodes(new Set([...copiedCodes, index]));
    setTimeout(() => {
      setCopiedCodes(prev => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
    }, 2000);
    addToast('Backup code copied to clipboard', 'info');
  };

  const handleRegenerateBackupCodes = async () => {
    try {
      const newCodes = await totpService.regenerateBackupCodes(userId);
      setBackupCodes(newCodes);
      addToast('Backup codes regenerated', 'success');
    } catch (error: any) {
      addToast(`Failed to regenerate backup codes: ${error.message}`, 'error');
    }
  };

  const handleDisable2FA = async () => {
    if (!confirm('Are you sure you want to disable 2FA? This will reduce your account security.')) {
      return;
    }

    try {
      const result = await totpService.disable2FA(userId, 'password');
      if (result.success) {
        addToast('2FA disabled', 'info');
        setStep('intro');
        setUserStatus(null);
      } else {
        addToast(result.error || 'Failed to disable 2FA', 'error');
      }
    } catch (error: any) {
      addToast(`Failed to disable 2FA: ${error.message}`, 'error');
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          Two-Factor Authentication
        </h3>
        {userStatus?.enabled && userStatus?.verified && (
          <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Enabled</span>
          </div>
        )}
      </div>

      {step === 'intro' && (
        <div className="space-y-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Add an extra layer of security to your wallet by enabling two-factor authentication (2FA).
            You'll need to enter a code from your authenticator app when signing in.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Smartphone className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-3" />
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Authenticator App
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Use Google Authenticator, Authy, or any TOTP-compatible app
              </p>
            </div>

            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <Shield className="w-8 h-8 text-green-600 dark:text-green-400 mb-3" />
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Enhanced Security
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Protect your wallet even if your password is compromised
              </p>
            </div>
          </div>

          <button
            onClick={handleSetup}
            className="w-full px-4 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors font-medium"
          >
            Enable 2FA
          </button>
        </div>
      )}

      {step === 'scan' && (
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Scan this QR code with your authenticator app
            </p>
            {/* QR Code Placeholder - In production, use a QR code library */}
            <div className="inline-block p-4 bg-white border-2 border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="w-48 h-48 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  QR Code
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Secret Key (backup)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={secret}
                readOnly
                className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white font-mono"
              />
              <button
                onClick={handleCopySecret}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {copiedSecret ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Save this secret key in a safe place. You'll need it if you lose access to your authenticator app.
            </p>
          </div>

          <button
            onClick={() => setStep('verify')}
            className="w-full px-4 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors font-medium"
          >
            Continue
          </button>

          <button
            onClick={onCancel}
            className="w-full px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-sm"
          >
            Cancel
          </button>
        </div>
      )}

      {step === 'verify' && (
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Authentication Code
            </label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="123456"
              maxLength={6}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-center text-2xl text-gray-900 dark:text-white tracking-widest"
            />
            {verificationError && (
              <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{verificationError}</span>
              </div>
            )}
          </div>

          <button
            onClick={handleVerify}
            disabled={isVerifying || verificationCode.length !== 6}
            className="w-full px-4 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify'
            )}
          </button>

          <button
            onClick={() => setStep('scan')}
            className="w-full px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-sm"
          >
            Back
          </button>
        </div>
      )}

      {step === 'backup' && (
        <div className="space-y-6">
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Save Your Backup Codes
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  These one-time backup codes can be used if you lose access to your authenticator app. Keep them safe!
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Backup Codes ({backupCodes.length} remaining)
              </label>
              <button
                onClick={handleRegenerateBackupCodes}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm flex items-center gap-1"
              >
                <RefreshCw className="w-4 h-4" />
                Regenerate
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((code, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={code}
                    readOnly
                    className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white font-mono text-center"
                  />
                  <button
                    onClick={() => handleCopyBackupCode(code, index)}
                    className="px-2 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    {copiedCodes.has(index) ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => {
              setStep('complete');
              onComplete?.();
            }}
            className="w-full px-4 py-3 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors font-medium"
          >
            Complete Setup
          </button>
        </div>
      )}

      {step === 'complete' && (
        <div className="space-y-6">
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              2FA Enabled Successfully
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your wallet is now protected with two-factor authentication
            </p>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <strong>Next time you sign in:</strong>
            </p>
            <ol className="list-decimal list-inside text-sm text-gray-600 dark:text-gray-400 mt-2 space-y-1">
              <li>Enter your password</li>
              <li>Enter the 6-digit code from your authenticator app</li>
            </ol>
          </div>

          <button
            onClick={handleDisable2FA}
            className="w-full px-4 py-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors text-sm"
          >
            Disable 2FA
          </button>
        </div>
      )}
    </div>
  );
};