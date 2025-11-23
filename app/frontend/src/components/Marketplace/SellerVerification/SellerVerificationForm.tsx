import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
// Import from the correct paths in the LinkDAO project
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TextArea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/animations/LoadingSkeletons';

// Zod schema for form validation
const verificationSchema = z.object({
  legalName: z.string().min(2, 'Legal name must be at least 2 characters'),
  ein: z.string().regex(/^\d{2}-\d{7}$/, 'EIN must be in format ##-#######').optional().or(z.literal('')),
  businessAddress: z.string().min(10, 'Please provide a complete business address'),
});

type VerificationFormInputs = z.infer<typeof verificationSchema>;

interface SellerVerificationFormProps {
  sellerId: string;
  onSubmitSuccess?: () => void;
}

export const SellerVerificationForm: React.FC<SellerVerificationFormProps> = ({ 
  sellerId, 
  onSubmitSuccess 
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<VerificationFormInputs>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      legalName: '',
      ein: '',
      businessAddress: ''
    }
  });

  const onSubmit = async (data: VerificationFormInputs) => {
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      const response = await fetch(`/api/marketplace/sellers/${sellerId}/verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          legalName: data.legalName,
          ein: data.ein || undefined,
          businessAddress: data.businessAddress
        }),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        setSubmitSuccess(true);
        reset();
        if (onSubmitSuccess) {
          onSubmitSuccess();
        }
      } else {
        setSubmitError(result.message || 'Failed to submit verification request');
      }
    } catch (error) {
      console.error('Error submitting verification:', error);
      setSubmitError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <Card className="max-w-2xl mx-auto">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Verification Request Submitted
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Your verification request has been submitted successfully. 
            We'll review your information and notify you of the status within 2-3 business days.
          </p>
          <Button onClick={() => setSubmitSuccess(false)} variant="default">
            Submit Another Request
          </Button>

        </div>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Seller Verification
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Verify your business identity to build trust with buyers and access premium marketplace features.
          </p>
        </div>

        {submitError && (
          <Alert variant="destructive" className="mb-6">
            {submitError}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label htmlFor="legalName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Legal Business Name *
            </label>
            <Controller
              name="legalName"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="legalName"
                  placeholder="Acme Corporation LLC"
                />
              )}
            />
            {errors.legalName?.message && (
              <p className="mt-1 text-sm text-red-600">{errors.legalName?.message}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              The official legal name of your business as registered with the government
            </p>
          </div>

          <div>
            <label htmlFor="ein" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              EIN (Employer Identification Number)
            </label>
            <Controller
              name="ein"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="ein"
                  placeholder="12-3456789"
                />
              )}
            />
            {errors.ein?.message && (
              <p className="mt-1 text-sm text-red-600">{errors.ein?.message}</p>
            )}

            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Optional for individuals. Format: ##-#######
            </p>
          </div>

          <div>
            <label htmlFor="businessAddress" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Business Address *
            </label>
            <Controller
              name="businessAddress"
              control={control}
              render={({ field }) => (
                <TextArea
                  {...field}
                  id="businessAddress"
                  rows={3}
                  placeholder="123 Business Street, Suite 100, City, State ZIP"
                />
              )}
            />
            {errors.businessAddress?.message && (
              <p className="mt-1 text-sm text-red-600">{errors.businessAddress?.message}</p>
            )}

            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Complete business address including street, city, state, and ZIP code
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Privacy Notice
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Your information is encrypted and stored securely. 
                  We only use it for verification purposes and will never share it with third parties.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="default"
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Submitting...
                </>
              ) : (
                'Submit Verification Request'
              )}
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
};