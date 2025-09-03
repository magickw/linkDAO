import React, { useState } from 'react';
import { Button } from '../../design-system/components/Button';
import { sellerService } from '../../../services/sellerService';

interface VerificationStepProps {
  onComplete: (data: any) => void;
  data?: any;
}

export function VerificationStep({ onComplete, data }: VerificationStepProps) {
  const [formData, setFormData] = useState({
    email: data?.email || '',
    phone: data?.phone || '',
    emailVerified: data?.emailVerified || false,
    phoneVerified: data?.phoneVerified || false,
  });

  const [verificationCodes, setVerificationCodes] = useState({
    email: '',
    phone: '',
  });

  const [loading, setLoading] = useState({
    sendEmail: false,
    verifyEmail: false,
    sendPhone: false,
    verifyPhone: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<Record<string, string>>({});

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string) => {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  };

  const handleSendEmailVerification = async () => {
    if (!formData.email) {
      setErrors(prev => ({ ...prev, email: 'Email is required' }));
      return;
    }

    if (!validateEmail(formData.email)) {
      setErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }));
      return;
    }

    setLoading(prev => ({ ...prev, sendEmail: true }));
    setErrors(prev => ({ ...prev, email: '' }));

    try {
      await sellerService.sendEmailVerification(formData.email);
      setSuccess(prev => ({ ...prev, email: 'Verification email sent! Check your inbox.' }));
    } catch (error) {
      setErrors(prev => ({ ...prev, email: 'Failed to send verification email' }));
    } finally {
      setLoading(prev => ({ ...prev, sendEmail: false }));
    }
  };

  const handleVerifyEmail = async () => {
    if (!verificationCodes.email) {
      setErrors(prev => ({ ...prev, emailCode: 'Verification code is required' }));
      return;
    }

    setLoading(prev => ({ ...prev, verifyEmail: true }));
    setErrors(prev => ({ ...prev, emailCode: '' }));

    try {
      await sellerService.verifyEmail(verificationCodes.email);
      setFormData(prev => ({ ...prev, emailVerified: true }));
      setSuccess(prev => ({ ...prev, emailCode: 'Email verified successfully!' }));
    } catch (error) {
      setErrors(prev => ({ ...prev, emailCode: 'Invalid verification code' }));
    } finally {
      setLoading(prev => ({ ...prev, verifyEmail: false }));
    }
  };

  const handleSendPhoneVerification = async () => {
    if (!formData.phone) {
      setErrors(prev => ({ ...prev, phone: 'Phone number is required' }));
      return;
    }

    if (!validatePhone(formData.phone)) {
      setErrors(prev => ({ ...prev, phone: 'Please enter a valid phone number' }));
      return;
    }

    setLoading(prev => ({ ...prev, sendPhone: true }));
    setErrors(prev => ({ ...prev, phone: '' }));

    try {
      await sellerService.sendPhoneVerification(formData.phone);
      setSuccess(prev => ({ ...prev, phone: 'Verification code sent via SMS!' }));
    } catch (error) {
      setErrors(prev => ({ ...prev, phone: 'Failed to send verification code' }));
    } finally {
      setLoading(prev => ({ ...prev, sendPhone: false }));
    }
  };

  const handleVerifyPhone = async () => {
    if (!verificationCodes.phone) {
      setErrors(prev => ({ ...prev, phoneCode: 'Verification code is required' }));
      return;
    }

    setLoading(prev => ({ ...prev, verifyPhone: true }));
    setErrors(prev => ({ ...prev, phoneCode: '' }));

    try {
      await sellerService.verifyPhone(formData.phone, verificationCodes.phone);
      setFormData(prev => ({ ...prev, phoneVerified: true }));
      setSuccess(prev => ({ ...prev, phoneCode: 'Phone verified successfully!' }));
    } catch (error) {
      setErrors(prev => ({ ...prev, phoneCode: 'Invalid verification code' }));
    } finally {
      setLoading(prev => ({ ...prev, verifyPhone: false }));
    }
  };

  const handleComplete = () => {
    onComplete({
      email: formData.email,
      phone: formData.phone,
      emailVerified: formData.emailVerified,
      phoneVerified: formData.phoneVerified,
    });
  };

  const canSkip = !formData.email && !formData.phone;
  const hasVerifications = formData.emailVerified || formData.phoneVerified;

  return (
    <div className="space-y-6">
      {/* Introduction */}
      <div className="bg-blue-900 bg-opacity-50 rounded-lg p-4">
        <h4 className="text-blue-300 font-medium text-sm mb-2">🔒 Why Verify?</h4>
        <ul className="text-blue-200 text-sm space-y-1">
          <li>• Unlock higher seller tier with more benefits</li>
          <li>• Enable selling physical goods with shipping</li>
          <li>• Get priority support and dispute resolution</li>
          <li>• Build trust with buyers through verified badges</li>
        </ul>
      </div>

      {/* Email Verification */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Email Verification
          {formData.emailVerified && (
            <svg className="w-5 h-5 ml-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              disabled={formData.emailVerified}
              className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                errors.email ? 'border-red-500' : 'border-gray-600'
              } ${formData.emailVerified ? 'opacity-50' : ''}`}
              placeholder="your@email.com"
            />
            {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email}</p>}
            {success.email && <p className="mt-1 text-sm text-green-400">{success.email}</p>}
          </div>

          <div className="flex items-end">
            {!formData.emailVerified ? (
              <Button
                onClick={handleSendEmailVerification}
                disabled={loading.sendEmail || !formData.email}
                variant="outline"
                className="w-full"
              >
                {loading.sendEmail ? 'Sending...' : 'Send Code'}
              </Button>
            ) : (
              <div className="w-full p-2 bg-green-600 text-white text-center rounded-lg">
                ✓ Verified
              </div>
            )}
          </div>
        </div>

        {success.email && !formData.emailVerified && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="emailCode" className="block text-sm font-medium text-gray-300 mb-2">
                Verification Code
              </label>
              <input
                type="text"
                id="emailCode"
                value={verificationCodes.email}
                onChange={(e) => setVerificationCodes(prev => ({ ...prev, email: e.target.value }))}
                className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.emailCode ? 'border-red-500' : 'border-gray-600'
                }`}
                placeholder="Enter 6-digit code"
                maxLength={6}
              />
              {errors.emailCode && <p className="mt-1 text-sm text-red-400">{errors.emailCode}</p>}
              {success.emailCode && <p className="mt-1 text-sm text-green-400">{success.emailCode}</p>}
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleVerifyEmail}
                disabled={loading.verifyEmail || !verificationCodes.email}
                variant="primary"
                className="w-full"
              >
                {loading.verifyEmail ? 'Verifying...' : 'Verify Email'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Phone Verification */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          Phone Verification (Optional)
          {formData.phoneVerified && (
            <svg className="w-5 h-5 ml-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              disabled={formData.phoneVerified}
              className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                errors.phone ? 'border-red-500' : 'border-gray-600'
              } ${formData.phoneVerified ? 'opacity-50' : ''}`}
              placeholder="+1 (555) 123-4567"
            />
            {errors.phone && <p className="mt-1 text-sm text-red-400">{errors.phone}</p>}
            {success.phone && <p className="mt-1 text-sm text-green-400">{success.phone}</p>}
          </div>

          <div className="flex items-end">
            {!formData.phoneVerified ? (
              <Button
                onClick={handleSendPhoneVerification}
                disabled={loading.sendPhone || !formData.phone}
                variant="outline"
                className="w-full"
              >
                {loading.sendPhone ? 'Sending...' : 'Send SMS'}
              </Button>
            ) : (
              <div className="w-full p-2 bg-green-600 text-white text-center rounded-lg">
                ✓ Verified
              </div>
            )}
          </div>
        </div>

        {success.phone && !formData.phoneVerified && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="phoneCode" className="block text-sm font-medium text-gray-300 mb-2">
                SMS Code
              </label>
              <input
                type="text"
                id="phoneCode"
                value={verificationCodes.phone}
                onChange={(e) => setVerificationCodes(prev => ({ ...prev, phone: e.target.value }))}
                className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.phoneCode ? 'border-red-500' : 'border-gray-600'
                }`}
                placeholder="Enter 6-digit code"
                maxLength={6}
              />
              {errors.phoneCode && <p className="mt-1 text-sm text-red-400">{errors.phoneCode}</p>}
              {success.phoneCode && <p className="mt-1 text-sm text-green-400">{success.phoneCode}</p>}
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleVerifyPhone}
                disabled={loading.verifyPhone || !verificationCodes.phone}
                variant="primary"
                className="w-full"
              >
                {loading.verifyPhone ? 'Verifying...' : 'Verify Phone'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Benefits Preview */}
      {hasVerifications && (
        <div className="bg-green-900 bg-opacity-50 rounded-lg p-4">
          <h4 className="text-green-300 font-medium text-sm mb-2">🎉 Verification Benefits Unlocked!</h4>
          <ul className="text-green-200 text-sm space-y-1">
            {formData.emailVerified && <li>• Email notifications for orders and disputes</li>}
            {formData.phoneVerified && <li>• SMS alerts for urgent matters</li>}
            {hasVerifications && <li>• Verified seller badge on your profile</li>}
            {hasVerifications && <li>• Higher trust score with buyers</li>}
          </ul>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3">
        {canSkip && (
          <Button onClick={handleComplete} variant="outline">
            Skip for Now
          </Button>
        )}
        
        <Button
          onClick={handleComplete}
          variant="primary"
          disabled={!canSkip && !hasVerifications}
        >
          {hasVerifications ? 'Continue' : 'Complete Later'}
        </Button>
      </div>
    </div>
  );
}