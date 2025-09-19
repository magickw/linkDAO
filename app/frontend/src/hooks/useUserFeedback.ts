import { useState, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';

interface FeedbackState {
  isLoading: boolean;
  progress: number;
  message: string;
  error: string | null;
  success: boolean;
}

interface UploadProgress {
  [fileId: string]: {
    name: string;
    progress: number;
    status: 'uploading' | 'processing' | 'complete' | 'error';
    error?: string;
  };
}

interface TransactionStep {
  label: string;
  status: 'pending' | 'active' | 'complete' | 'error';
  description?: string;
}

export const useUserFeedback = () => {
  const [feedbackState, setFeedbackState] = useState<FeedbackState>({
    isLoading: false,
    progress: 0,
    message: '',
    error: null,
    success: false
  });

  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({});
  const [transactionSteps, setTransactionSteps] = useState<TransactionStep[]>([]);
  const [showGuidance, setShowGuidance] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const toastRef = useRef<string | null>(null);

  // Generic feedback methods
  const startLoading = useCallback((message: string = 'Loading...') => {
    setFeedbackState({
      isLoading: true,
      progress: 0,
      message,
      error: null,
      success: false
    });

    toastRef.current = toast.loading(message);
  }, []);

  const updateProgress = useCallback((progress: number, message?: string) => {
    setFeedbackState(prev => ({
      ...prev,
      progress,
      message: message || prev.message
    }));

    if (toastRef.current && message) {
      toast.loading(message, { id: toastRef.current });
    }
  }, []);

  const showError = useCallback((error: string, details?: any) => {
    setFeedbackState(prev => ({
      ...prev,
      isLoading: false,
      error,
      success: false
    }));

    if (toastRef.current) {
      toast.error(error, { id: toastRef.current });
      toastRef.current = null;
    } else {
      toast.error(error);
    }

    console.error('User feedback error:', error, details);
  }, []);

  const showSuccessMessage = useCallback((message: string, autoHide: boolean = true) => {
    setFeedbackState(prev => ({
      ...prev,
      isLoading: false,
      error: null,
      success: true,
      message
    }));

    if (toastRef.current) {
      toast.success(message, { id: toastRef.current });
      toastRef.current = null;
    } else {
      toast.success(message);
    }

    if (autoHide) {
      setTimeout(() => {
        setShowSuccess(false);
      }, 5000);
    }
  }, []);

  const clearFeedback = useCallback(() => {
    setFeedbackState({
      isLoading: false,
      progress: 0,
      message: '',
      error: null,
      success: false
    });

    if (toastRef.current) {
      toast.dismiss(toastRef.current);
      toastRef.current = null;
    }
  }, []);

  // Upload-specific methods
  const startUpload = useCallback((fileId: string, fileName: string) => {
    setUploadProgress(prev => ({
      ...prev,
      [fileId]: {
        name: fileName,
        progress: 0,
        status: 'uploading'
      }
    }));
  }, []);

  const updateUploadProgress = useCallback((
    fileId: string, 
    progress: number, 
    status?: 'uploading' | 'processing' | 'complete' | 'error',
    error?: string
  ) => {
    setUploadProgress(prev => ({
      ...prev,
      [fileId]: {
        ...prev[fileId],
        progress,
        status: status || prev[fileId]?.status || 'uploading',
        error
      }
    }));
  }, []);

  const completeUpload = useCallback((fileId: string) => {
    setUploadProgress(prev => ({
      ...prev,
      [fileId]: {
        ...prev[fileId],
        progress: 100,
        status: 'complete'
      }
    }));
  }, []);

  const failUpload = useCallback((fileId: string, error: string) => {
    setUploadProgress(prev => ({
      ...prev,
      [fileId]: {
        ...prev[fileId],
        status: 'error',
        error
      }
    }));
  }, []);

  const clearUploads = useCallback(() => {
    setUploadProgress({});
  }, []);

  // Transaction-specific methods
  const initializeTransaction = useCallback((steps: Omit<TransactionStep, 'status'>[]) => {
    const initialSteps = steps.map(step => ({ ...step, status: 'pending' as const }));
    setTransactionSteps(initialSteps);
  }, []);

  const updateTransactionStep = useCallback((
    stepIndex: number, 
    status: 'pending' | 'active' | 'complete' | 'error',
    description?: string
  ) => {
    setTransactionSteps(prev => prev.map((step, index) => 
      index === stepIndex 
        ? { ...step, status, description: description || step.description }
        : step
    ));
  }, []);

  const completeTransaction = useCallback(() => {
    setTransactionSteps(prev => prev.map(step => ({ ...step, status: 'complete' as const })));
  }, []);

  const failTransaction = useCallback((stepIndex: number, error: string) => {
    setTransactionSteps(prev => prev.map((step, index) => 
      index === stepIndex 
        ? { ...step, status: 'error' as const, description: error }
        : step
    ));
  }, []);

  // Guidance methods
  const startGuidance = useCallback(() => {
    setShowGuidance(true);
  }, []);

  const completeGuidance = useCallback(() => {
    setShowGuidance(false);
    toast.success('Tutorial completed! You\'re ready to go.');
  }, []);

  const skipGuidance = useCallback(() => {
    setShowGuidance(false);
    toast('Tutorial skipped. You can restart it anytime from settings.');
  }, []);

  // Success confirmation methods
  const showSuccessConfirmation = useCallback((show: boolean = true) => {
    setShowSuccess(show);
  }, []);

  // Specific workflow methods
  const handleENSValidation = useCallback(async (ensHandle: string) => {
    startLoading('Validating ENS handle...');
    
    try {
      updateProgress(25, 'Checking ENS format...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      updateProgress(50, 'Resolving ENS address...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      updateProgress(75, 'Verifying ownership...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      updateProgress(100, 'ENS validation complete');
      showSuccessMessage(`ENS handle "${ensHandle}" verified successfully!`);
      
      return true;
    } catch (error: any) {
      showError('ENS validation failed. Please check your ENS handle and try again.');
      return false;
    }
  }, [startLoading, updateProgress, showSuccessMessage, showError]);

  const handleImageUpload = useCallback(async (files: File[]) => {
    const fileIds = files.map((_, index) => `file_${index}_${Date.now()}`);
    
    // Initialize upload progress for all files
    files.forEach((file, index) => {
      startUpload(fileIds[index], file.name);
    });

    try {
      // Simulate upload process for each file
      for (let i = 0; i < files.length; i++) {
        const fileId = fileIds[i];
        
        // Upload phase
        for (let progress = 0; progress <= 70; progress += 10) {
          updateUploadProgress(fileId, progress, 'uploading');
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Processing phase
        updateUploadProgress(fileId, 80, 'processing');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        updateUploadProgress(fileId, 90, 'processing');
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Complete
        completeUpload(fileId);
      }

      showSuccessMessage(`${files.length} image${files.length > 1 ? 's' : ''} uploaded successfully!`);
      return true;
    } catch (error: any) {
      files.forEach((_, index) => {
        failUpload(fileIds[index], 'Upload failed');
      });
      showError('Image upload failed. Please try again.');
      return false;
    }
  }, [startUpload, updateUploadProgress, completeUpload, failUpload, showSuccessMessage, showError]);

  const handlePaymentProcess = useCallback(async (paymentMethod: string, amount: string) => {
    const steps = [
      { label: 'Validating payment method', description: 'Checking payment details...' },
      { label: 'Processing payment', description: 'Contacting payment provider...' },
      { label: 'Confirming transaction', description: 'Waiting for confirmation...' },
      { label: 'Creating order', description: 'Setting up your order...' }
    ];

    initializeTransaction(steps);

    try {
      // Step 1: Validation
      updateTransactionStep(0, 'active');
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateTransactionStep(0, 'complete');

      // Step 2: Processing
      updateTransactionStep(1, 'active');
      await new Promise(resolve => setTimeout(resolve, 2000));
      updateTransactionStep(1, 'complete');

      // Step 3: Confirmation
      updateTransactionStep(2, 'active');
      await new Promise(resolve => setTimeout(resolve, 1500));
      updateTransactionStep(2, 'complete');

      // Step 4: Order creation
      updateTransactionStep(3, 'active');
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateTransactionStep(3, 'complete');

      completeTransaction();
      showSuccessMessage(`Payment of ${amount} processed successfully via ${paymentMethod}!`);
      
      return true;
    } catch (error: any) {
      failTransaction(1, 'Payment processing failed');
      showError('Payment failed. Please try again or use a different payment method.');
      return false;
    }
  }, [initializeTransaction, updateTransactionStep, completeTransaction, failTransaction, showSuccessMessage, showError]);

  return {
    // State
    feedbackState,
    uploadProgress: Object.values(uploadProgress),
    transactionSteps,
    showGuidance,
    showSuccess,

    // Generic methods
    startLoading,
    updateProgress,
    showError,
    showSuccessMessage,
    clearFeedback,

    // Upload methods
    startUpload,
    updateUploadProgress,
    completeUpload,
    failUpload,
    clearUploads,

    // Transaction methods
    initializeTransaction,
    updateTransactionStep,
    completeTransaction,
    failTransaction,

    // Guidance methods
    startGuidance,
    completeGuidance,
    skipGuidance,

    // Success confirmation methods
    showSuccessConfirmation,

    // Workflow methods
    handleENSValidation,
    handleImageUpload,
    handlePaymentProcess
  };
};