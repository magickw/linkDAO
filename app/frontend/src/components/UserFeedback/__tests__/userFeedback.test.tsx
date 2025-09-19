import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import '@testing-library/jest-dom';

import { 
  TooltipGuide, 
  ENSSetupGuide, 
  PaymentMethodGuide,
  ProgressIndicator,
  UploadProgress,
  TransactionProgress,
  SuccessConfirmation,
  ProfileUpdateSuccess,
  GuidanceSystem,
  SellerProfileGuidance
} from '../index';
import { useUserFeedback } from '../../../hooks/useUserFeedback';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: {
    loading: jest.fn().mockReturnValue('toast-id'),
    success: jest.fn(),
    error: jest.fn(),
    dismiss: jest.fn(),
  },
}));

describe('User Feedback Components', () => {
  describe('TooltipGuide', () => {
    it('should render tooltip on hover', async () => {
      render(
        <TooltipGuide content="Test tooltip content" trigger="hover">
          <button>Hover me</button>
        </TooltipGuide>
      );

      const button = screen.getByText('Hover me');
      fireEvent.mouseEnter(button);

      await waitFor(() => {
        expect(screen.getByText('Test tooltip content')).toBeInTheDocument();
      });
    });

    it('should hide tooltip on mouse leave', async () => {
      render(
        <TooltipGuide content="Test tooltip content" trigger="hover">
          <button>Hover me</button>
        </TooltipGuide>
      );

      const button = screen.getByText('Hover me');
      fireEvent.mouseEnter(button);
      
      await waitFor(() => {
        expect(screen.getByText('Test tooltip content')).toBeInTheDocument();
      });

      fireEvent.mouseLeave(button);

      await waitFor(() => {
        expect(screen.queryByText('Test tooltip content')).not.toBeInTheDocument();
      });
    });

    it('should not show tooltip when disabled', async () => {
      render(
        <TooltipGuide content="Test tooltip content" trigger="hover" disabled>
          <button>Hover me</button>
        </TooltipGuide>
      );

      const button = screen.getByText('Hover me');
      fireEvent.mouseEnter(button);

      await waitFor(() => {
        expect(screen.queryByText('Test tooltip content')).not.toBeInTheDocument();
      });
    });
  });

  describe('ENSSetupGuide', () => {
    it('should render ENS setup guide with correct content', async () => {
      render(<ENSSetupGuide />);

      const guide = screen.getByText('?');
      fireEvent.mouseEnter(guide);

      await waitFor(() => {
        expect(screen.getByText('ENS Handle Setup')).toBeInTheDocument();
        expect(screen.getByText(/ENS handles are optional/)).toBeInTheDocument();
        expect(screen.getByText(/Format: yourname.eth/)).toBeInTheDocument();
      });
    });
  });

  describe('PaymentMethodGuide', () => {
    it('should render payment method guide with correct content', async () => {
      render(<PaymentMethodGuide />);

      const guide = screen.getByText('?');
      fireEvent.mouseEnter(guide);

      await waitFor(() => {
        expect(screen.getByText('Payment Methods')).toBeInTheDocument();
        expect(screen.getByText(/Crypto:/)).toBeInTheDocument();
        expect(screen.getByText(/Fiat:/)).toBeInTheDocument();
        expect(screen.getByText(/Escrow:/)).toBeInTheDocument();
      });
    });
  });

  describe('ProgressIndicator', () => {
    it('should render linear progress indicator', () => {
      render(
        <ProgressIndicator
          progress={50}
          status="loading"
          message="Loading..."
          variant="linear"
        />
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should render circular progress indicator', () => {
      render(
        <ProgressIndicator
          progress={75}
          status="success"
          message="Complete"
          variant="circular"
        />
      );

      expect(screen.getByText('Complete')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('should hide percentage when showPercentage is false', () => {
      render(
        <ProgressIndicator
          progress={50}
          status="loading"
          message="Loading..."
          showPercentage={false}
        />
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText('50%')).not.toBeInTheDocument();
    });
  });

  describe('UploadProgress', () => {
    it('should render upload progress for multiple files', () => {
      const files = [
        { name: 'image1.jpg', progress: 50, status: 'uploading' as const },
        { name: 'image2.png', progress: 100, status: 'complete' as const },
        { name: 'image3.gif', progress: 25, status: 'error' as const, error: 'Upload failed' }
      ];

      render(<UploadProgress files={files} />);

      expect(screen.getByText('image1.jpg')).toBeInTheDocument();
      expect(screen.getByText('image2.png')).toBeInTheDocument();
      expect(screen.getByText('image3.gif')).toBeInTheDocument();
      expect(screen.getByText('Uploading...')).toBeInTheDocument();
      expect(screen.getByText('Upload complete')).toBeInTheDocument();
      expect(screen.getByText('Upload failed')).toBeInTheDocument();
    });
  });

  describe('TransactionProgress', () => {
    it('should render transaction steps with correct status', () => {
      const steps = [
        { label: 'Validate payment', status: 'complete' as const, description: 'Payment validated' },
        { label: 'Process payment', status: 'active' as const, description: 'Processing...' },
        { label: 'Create order', status: 'pending' as const }
      ];

      render(<TransactionProgress steps={steps} />);

      expect(screen.getByText('Validate payment')).toBeInTheDocument();
      expect(screen.getByText('Process payment')).toBeInTheDocument();
      expect(screen.getByText('Create order')).toBeInTheDocument();
      expect(screen.getByText('Payment validated')).toBeInTheDocument();
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });
  });

  describe('SuccessConfirmation', () => {
    it('should render success confirmation with next steps', () => {
      const nextSteps = [
        { label: 'View Profile', action: jest.fn(), primary: true },
        { label: 'Create Listing', action: jest.fn() }
      ];

      render(
        <SuccessConfirmation
          isVisible={true}
          title="Success!"
          message="Operation completed successfully"
          nextSteps={nextSteps}
          onClose={jest.fn()}
        />
      );

      expect(screen.getByText('Success!')).toBeInTheDocument();
      expect(screen.getByText('Operation completed successfully')).toBeInTheDocument();
      expect(screen.getByText("What's next?")).toBeInTheDocument();
      expect(screen.getByText('View Profile')).toBeInTheDocument();
      expect(screen.getByText('Create Listing')).toBeInTheDocument();
    });

    it('should call next step actions when clicked', () => {
      const mockAction = jest.fn();
      const nextSteps = [
        { label: 'Test Action', action: mockAction }
      ];

      render(
        <SuccessConfirmation
          isVisible={true}
          title="Success!"
          message="Test message"
          nextSteps={nextSteps}
          onClose={jest.fn()}
        />
      );

      fireEvent.click(screen.getByText('Test Action'));
      expect(mockAction).toHaveBeenCalled();
    });

    it('should not render when not visible', () => {
      render(
        <SuccessConfirmation
          isVisible={false}
          title="Success!"
          message="Test message"
          onClose={jest.fn()}
        />
      );

      expect(screen.queryByText('Success!')).not.toBeInTheDocument();
    });
  });

  describe('ProfileUpdateSuccess', () => {
    it('should render profile update success with correct actions', () => {
      const mockViewProfile = jest.fn();
      const mockCreateListing = jest.fn();
      const mockClose = jest.fn();

      render(
        <ProfileUpdateSuccess
          isVisible={true}
          onClose={mockClose}
          onViewProfile={mockViewProfile}
          onCreateListing={mockCreateListing}
        />
      );

      expect(screen.getByText('Profile Updated Successfully!')).toBeInTheDocument();
      expect(screen.getByText('View My Store')).toBeInTheDocument();
      expect(screen.getByText('Create First Listing')).toBeInTheDocument();

      fireEvent.click(screen.getByText('View My Store'));
      expect(mockViewProfile).toHaveBeenCalled();

      fireEvent.click(screen.getByText('Create First Listing'));
      expect(mockCreateListing).toHaveBeenCalled();
    });
  });

  describe('GuidanceSystem', () => {
    it('should render guidance system with steps', () => {
      const steps = [
        { id: 'step1', title: 'Step 1', content: 'First step content' },
        { id: 'step2', title: 'Step 2', content: 'Second step content' }
      ];

      render(
        <GuidanceSystem
          steps={steps}
          isActive={true}
          onComplete={jest.fn()}
          onSkip={jest.fn()}
        />
      );

      expect(screen.getByText('Step 1')).toBeInTheDocument();
      expect(screen.getByText('First step content')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    it('should navigate through steps', () => {
      const steps = [
        { id: 'step1', title: 'Step 1', content: 'First step content' },
        { id: 'step2', title: 'Step 2', content: 'Second step content' }
      ];

      render(
        <GuidanceSystem
          steps={steps}
          isActive={true}
          onComplete={jest.fn()}
          onSkip={jest.fn()}
        />
      );

      expect(screen.getByText('Step 1')).toBeInTheDocument();
      
      fireEvent.click(screen.getByText('Next'));
      
      expect(screen.getByText('Step 2')).toBeInTheDocument();
      expect(screen.getByText('Second step content')).toBeInTheDocument();
    });

    it('should call onComplete when finishing last step', () => {
      const mockComplete = jest.fn();
      const steps = [
        { id: 'step1', title: 'Step 1', content: 'First step content' }
      ];

      render(
        <GuidanceSystem
          steps={steps}
          isActive={true}
          onComplete={mockComplete}
          onSkip={jest.fn()}
        />
      );

      fireEvent.click(screen.getByText('Finish'));
      expect(mockComplete).toHaveBeenCalled();
    });

    it('should call onSkip when skip button is clicked', () => {
      const mockSkip = jest.fn();
      const steps = [
        { id: 'step1', title: 'Step 1', content: 'First step content' }
      ];

      render(
        <GuidanceSystem
          steps={steps}
          isActive={true}
          onComplete={jest.fn()}
          onSkip={mockSkip}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /close/i }));
      expect(mockSkip).toHaveBeenCalled();
    });
  });
});

describe('useUserFeedback Hook', () => {
  it('should initialize with default state', () => {
    const { result } = renderHook(() => useUserFeedback());

    expect(result.current.feedbackState.isLoading).toBe(false);
    expect(result.current.feedbackState.progress).toBe(0);
    expect(result.current.feedbackState.error).toBe(null);
    expect(result.current.feedbackState.success).toBe(false);
    expect(result.current.uploadProgress).toEqual([]);
    expect(result.current.transactionSteps).toEqual([]);
  });

  it('should start loading state', () => {
    const { result } = renderHook(() => useUserFeedback());

    act(() => {
      result.current.startLoading('Loading test...');
    });

    expect(result.current.feedbackState.isLoading).toBe(true);
    expect(result.current.feedbackState.message).toBe('Loading test...');
  });

  it('should update progress', () => {
    const { result } = renderHook(() => useUserFeedback());

    act(() => {
      result.current.startLoading('Loading...');
    });

    act(() => {
      result.current.updateProgress(50, 'Half way there...');
    });

    expect(result.current.feedbackState.progress).toBe(50);
    expect(result.current.feedbackState.message).toBe('Half way there...');
  });

  it('should show error', () => {
    const { result } = renderHook(() => useUserFeedback());

    act(() => {
      result.current.showError('Test error message');
    });

    expect(result.current.feedbackState.error).toBe('Test error message');
    expect(result.current.feedbackState.isLoading).toBe(false);
    expect(result.current.feedbackState.success).toBe(false);
  });

  it('should show success message', () => {
    const { result } = renderHook(() => useUserFeedback());

    act(() => {
      result.current.showSuccessMessage('Success!');
    });

    expect(result.current.feedbackState.success).toBe(true);
    expect(result.current.feedbackState.message).toBe('Success!');
    expect(result.current.feedbackState.isLoading).toBe(false);
    expect(result.current.feedbackState.error).toBe(null);
  });

  it('should handle upload progress', () => {
    const { result } = renderHook(() => useUserFeedback());

    act(() => {
      result.current.startUpload('file1', 'test.jpg');
    });

    expect(result.current.uploadProgress).toHaveLength(1);
    expect(result.current.uploadProgress[0].name).toBe('test.jpg');
    expect(result.current.uploadProgress[0].progress).toBe(0);
    expect(result.current.uploadProgress[0].status).toBe('uploading');

    act(() => {
      result.current.updateUploadProgress('file1', 50, 'processing');
    });

    expect(result.current.uploadProgress[0].progress).toBe(50);
    expect(result.current.uploadProgress[0].status).toBe('processing');

    act(() => {
      result.current.completeUpload('file1');
    });

    expect(result.current.uploadProgress[0].progress).toBe(100);
    expect(result.current.uploadProgress[0].status).toBe('complete');
  });

  it('should handle transaction steps', () => {
    const { result } = renderHook(() => useUserFeedback());

    const steps = [
      { label: 'Step 1', description: 'First step' },
      { label: 'Step 2', description: 'Second step' }
    ];

    act(() => {
      result.current.initializeTransaction(steps);
    });

    expect(result.current.transactionSteps).toHaveLength(2);
    expect(result.current.transactionSteps[0].status).toBe('pending');
    expect(result.current.transactionSteps[1].status).toBe('pending');

    act(() => {
      result.current.updateTransactionStep(0, 'active');
    });

    expect(result.current.transactionSteps[0].status).toBe('active');

    act(() => {
      result.current.updateTransactionStep(0, 'complete');
    });

    expect(result.current.transactionSteps[0].status).toBe('complete');
  });

  it('should clear feedback state', () => {
    const { result } = renderHook(() => useUserFeedback());

    act(() => {
      result.current.startLoading('Loading...');
      result.current.showError('Error occurred');
    });

    act(() => {
      result.current.clearFeedback();
    });

    expect(result.current.feedbackState.isLoading).toBe(false);
    expect(result.current.feedbackState.progress).toBe(0);
    expect(result.current.feedbackState.message).toBe('');
    expect(result.current.feedbackState.error).toBe(null);
    expect(result.current.feedbackState.success).toBe(false);
  });
});