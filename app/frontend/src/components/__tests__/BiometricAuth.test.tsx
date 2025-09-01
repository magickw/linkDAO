import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BiometricAuth from '../BiometricAuth';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>
  },
  AnimatePresence: ({ children }: any) => <>{children}</>
}));

// Mock Heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  FingerprintIcon: () => <div data-testid="fingerprint-icon" />,
  FaceSmileIcon: () => <div data-testid="face-icon" />,
  DevicePhoneMobileIcon: () => <div data-testid="device-icon" />,
  ExclamationTriangleIcon: () => <div data-testid="warning-icon" />,
  CheckCircleIcon: () => <div data-testid="check-icon" />,
  XCircleIcon: () => <div data-testid="x-icon" />
}));

const defaultProps = {
  onSuccess: jest.fn(),
  onError: jest.fn(),
  onCancel: jest.fn()
};

// Mock WebAuthn API
const mockCredential = {
  id: 'test-credential-id',
  type: 'public-key',
  rawId: new ArrayBuffer(8),
  response: {
    clientDataJSON: new ArrayBuffer(8),
    authenticatorData: new ArrayBuffer(8),
    signature: new ArrayBuffer(8)
  }
};

describe('BiometricAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock PublicKeyCredential
    Object.defineProperty(window, 'PublicKeyCredential', {
      value: {
        isUserVerifyingPlatformAuthenticatorAvailable: jest.fn().mockResolvedValue(true)
      },
      writable: true
    });
    
    // Mock navigator.credentials
    Object.defineProperty(navigator, 'credentials', {
      value: {
        get: jest.fn().mockResolvedValue(mockCredential)
      },
      writable: true
    });
    
    // Mock navigator.vibrate
    Object.defineProperty(navigator, 'vibrate', {
      value: jest.fn(),
      writable: true
    });
    
    // Mock user agent
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
      writable: true
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders biometric authentication interface', async () => {
    render(<BiometricAuth {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Biometric Authentication')).toBeInTheDocument();
      expect(screen.getByText('Use your biometric to authenticate')).toBeInTheDocument();
    });
  });

  it('shows custom title and subtitle', async () => {
    render(
      <BiometricAuth 
        {...defaultProps} 
        title="Secure Login"
        subtitle="Authenticate with your fingerprint"
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Secure Login')).toBeInTheDocument();
      expect(screen.getByText('Authenticate with your fingerprint')).toBeInTheDocument();
    });
  });

  it('detects and shows appropriate biometric type', async () => {
    render(<BiometricAuth {...defaultProps} />);
    
    await waitFor(() => {
      // Should show Face ID for iPhone
      expect(screen.getByText('Use Face ID')).toBeInTheDocument();
    });
  });

  it('shows fingerprint for Android devices', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 10; SM-G975F)',
      writable: true
    });
    
    render(<BiometricAuth {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Use Touch ID')).toBeInTheDocument();
    });
  });

  it('handles successful authentication', async () => {
    const mockOnSuccess = jest.fn();
    render(<BiometricAuth {...defaultProps} onSuccess={mockOnSuccess} />);
    
    await waitFor(() => {
      const authButton = screen.getByText('Use Face ID');
      fireEvent.click(authButton);
    });
    
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith(mockCredential);
    });
  });

  it('handles authentication failure', async () => {
    const mockOnError = jest.fn();
    const mockError = new Error('Authentication failed');
    mockError.name = 'NotAllowedError';
    
    (navigator.credentials.get as jest.Mock).mockRejectedValue(mockError);
    
    render(<BiometricAuth {...defaultProps} onError={mockOnError} />);
    
    await waitFor(() => {
      const authButton = screen.getByText('Use Face ID');
      fireEvent.click(authButton);
    });
    
    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith('Authentication was cancelled or not allowed');
    });
  });

  it('shows unavailable state when biometrics not supported', async () => {
    Object.defineProperty(window, 'PublicKeyCredential', {
      value: undefined,
      writable: true
    });
    
    render(<BiometricAuth {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Biometric Authentication Unavailable')).toBeInTheDocument();
      expect(screen.getByText('Your device does not support biometric authentication')).toBeInTheDocument();
    });
  });

  it('shows fallback to password when biometrics unavailable', async () => {
    Object.defineProperty(window, 'PublicKeyCredential', {
      value: undefined,
      writable: true
    });
    
    render(<BiometricAuth {...defaultProps} fallbackToPassword={true} />);
    
    await waitFor(() => {
      expect(screen.getByText('Use Password Instead')).toBeInTheDocument();
    });
  });

  it('switches to password fallback', async () => {
    render(<BiometricAuth {...defaultProps} fallbackToPassword={true} />);
    
    await waitFor(() => {
      const fallbackButton = screen.getByText('Use Password');
      fireEvent.click(fallbackButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Enter Password')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
    });
  });

  it('handles cancel action', async () => {
    const mockOnCancel = jest.fn();
    render(<BiometricAuth {...defaultProps} onCancel={mockOnCancel} />);
    
    await waitFor(() => {
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
    });
    
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('shows authenticating state', async () => {
    // Mock a delayed response
    (navigator.credentials.get as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockCredential), 1000))
    );
    
    render(<BiometricAuth {...defaultProps} />);
    
    await waitFor(() => {
      const authButton = screen.getByText('Use Face ID');
      fireEvent.click(authButton);
    });
    
    expect(screen.getByText('Authenticating with Face ID...')).toBeInTheDocument();
  });

  it('shows success state', async () => {
    const mockOnSuccess = jest.fn();
    render(<BiometricAuth {...defaultProps} onSuccess={mockOnSuccess} />);
    
    await waitFor(() => {
      const authButton = screen.getByText('Use Face ID');
      fireEvent.click(authButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Authentication successful!')).toBeInTheDocument();
    });
  });

  it('shows error state with retry option', async () => {
    const mockError = new Error('Authentication failed');
    (navigator.credentials.get as jest.Mock).mockRejectedValue(mockError);
    
    render(<BiometricAuth {...defaultProps} />);
    
    await waitFor(() => {
      const authButton = screen.getByText('Use Face ID');
      fireEvent.click(authButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  it('handles different error types correctly', async () => {
    const testCases = [
      { name: 'NotAllowedError', expectedMessage: 'Authentication was cancelled or not allowed' },
      { name: 'InvalidStateError', expectedMessage: 'Authenticator is already in use' },
      { name: 'NotSupportedError', expectedMessage: 'Biometric authentication not supported' },
      { name: 'SecurityError', expectedMessage: 'Security error occurred' }
    ];
    
    for (const testCase of testCases) {
      const mockOnError = jest.fn();
      const mockError = new Error('Test error');
      mockError.name = testCase.name;
      
      (navigator.credentials.get as jest.Mock).mockRejectedValue(mockError);
      
      const { unmount } = render(<BiometricAuth {...defaultProps} onError={mockOnError} />);
      
      await waitFor(() => {
        const authButton = screen.getByText('Use Face ID');
        fireEvent.click(authButton);
      });
      
      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(testCase.expectedMessage);
      });
      
      unmount();
    }
  });

  it('provides haptic feedback on success', async () => {
    const mockVibrate = jest.fn();
    Object.defineProperty(navigator, 'vibrate', {
      value: mockVibrate,
      writable: true
    });
    
    render(<BiometricAuth {...defaultProps} />);
    
    await waitFor(() => {
      const authButton = screen.getByText('Use Face ID');
      fireEvent.click(authButton);
    });
    
    await waitFor(() => {
      expect(mockVibrate).toHaveBeenCalledWith([100, 50, 100]);
    });
  });

  it('applies custom className', async () => {
    render(<BiometricAuth {...defaultProps} className="custom-auth" />);
    
    const container = document.querySelector('.custom-auth');
    expect(container).toBeInTheDocument();
  });

  it('handles platform authenticator unavailable', async () => {
    (window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable as jest.Mock)
      .mockResolvedValue(false);
    
    render(<BiometricAuth {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Biometric Authentication Unavailable')).toBeInTheDocument();
    });
  });

  it('shows correct icon for authentication state', async () => {
    render(<BiometricAuth {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('face-icon')).toBeInTheDocument();
    });
    
    // Test success state
    const authButton = screen.getByText('Use Face ID');
    fireEvent.click(authButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('check-icon')).toBeInTheDocument();
    });
  });

  it('handles back to biometric from password fallback', async () => {
    render(<BiometricAuth {...defaultProps} fallbackToPassword={true} />);
    
    await waitFor(() => {
      const fallbackButton = screen.getByText('Use Password');
      fireEvent.click(fallbackButton);
    });
    
    await waitFor(() => {
      const backButton = screen.getByText('Back to Biometric');
      fireEvent.click(backButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Use Face ID')).toBeInTheDocument();
    });
  });

  it('disables authentication button during authentication', async () => {
    // Mock a delayed response
    (navigator.credentials.get as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockCredential), 1000))
    );
    
    render(<BiometricAuth {...defaultProps} />);
    
    await waitFor(() => {
      const authButton = screen.getByText('Use Face ID');
      fireEvent.click(authButton);
      
      expect(authButton).toBeDisabled();
    });
  });
});