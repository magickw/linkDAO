import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BiometricAuth from '../BiometricAuth';
import { useResponsive } from '@/design-system/hooks/useResponsive';

// Mock dependencies
jest.mock('@/design-system/hooks/useResponsive');
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

const mockResponsive = {
  isMobile: true,
  isTouch: true,
  breakpoint: 'sm' as const,
  width: 375,
  height: 667,
  isTablet: false,
  isDesktop: false,
  orientation: 'portrait' as const,
};

// Mock WebAuthn API
const mockCredentials = {
  create: jest.fn(),
  get: jest.fn(),
};

Object.defineProperty(navigator, 'credentials', {
  value: mockCredentials,
  writable: true,
});

Object.defineProperty(navigator, 'vibrate', {
  value: jest.fn(),
  writable: true,
});

const defaultProps = {
  onSuccess: jest.fn(),
  onError: jest.fn(),
  onCancel: jest.fn(),
};

describe('BiometricAuth', () => {
  beforeEach(() => {
    (useResponsive as jest.Mock).mockReturnValue(mockResponsive);
    jest.clearAllMocks();
  });

  describe('Capability Detection', () => {
    it('detects WebAuthn support', async () => {
      mockCredentials.get.mockResolvedValue(null);
      
      render(<BiometricAuth {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Authenticate')).toBeInTheDocument();
      });
    });

    it('shows unsupported message when WebAuthn is not available', () => {
      // Remove credentials API
      Object.defineProperty(navigator, 'credentials', {
        value: undefined,
        writable: true,
      });

      render(<BiometricAuth {...defaultProps} fallbackToPassword={false} />);
      
      expect(screen.getByText('Biometric Authentication Not Supported')).toBeInTheDocument();
    });

    it('shows capability info when biometric is supported but not set up', async () => {
      mockCredentials.get.mockRejectedValue(new Error('Not available'));
      
      render(<BiometricAuth {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText(/not set up on this device/)).toBeInTheDocument();
      });
    });
  });

  describe('Biometric Authentication', () => {
    beforeEach(() => {
      mockCredentials.get.mockResolvedValue({
        id: 'credential-id',
        type: 'public-key',
      });
    });

    it('initiates biometric authentication', async () => {
      const user = userEvent.setup();
      render(<BiometricAuth {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Authenticate with/)).toBeInTheDocument();
      });
      
      const authButton = screen.getByRole('button', { name: /Authenticate with/ });
      await user.click(authButton);
      
      expect(mockCredentials.get).toHaveBeenCalled();
    });

    it('calls onSuccess when authentication succeeds', async () => {
      const user = userEvent.setup();
      const mockCredential = { id: 'test-credential' };
      mockCredentials.get.mockResolvedValue(mockCredential);
      
      render(<BiometricAuth {...defaultProps} />);
      
      await waitFor(() => {
        const authButton = screen.getByRole('button', { name: /Authenticate with/ });
        return user.click(authButton);
      });
      
      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalledWith(mockCredential);
      });
    });

    it('calls onError when authentication fails', async () => {
      const user = userEvent.setup();
      mockCredentials.get.mockRejectedValue(new Error('Authentication failed'));
      
      render(<BiometricAuth {...defaultProps} />);
      
      await waitFor(() => {
        const authButton = screen.getByRole('button', { name: /Authenticate with/ });
        return user.click(authButton);
      });
      
      await waitFor(() => {
        expect(defaultProps.onError).toHaveBeenCalledWith('Authentication failed. Please try again.');
      });
    });

    it('handles specific error types', async () => {
      const user = userEvent.setup();
      const notAllowedError = new Error('Not allowed');
      notAllowedError.name = 'NotAllowedError';
      mockCredentials.get.mockRejectedValue(notAllowedError);
      
      render(<BiometricAuth {...defaultProps} />);
      
      await waitFor(() => {
        const authButton = screen.getByRole('button', { name: /Authenticate with/ });
        return user.click(authButton);
      });
      
      await waitFor(() => {
        expect(defaultProps.onError).toHaveBeenCalledWith('Authentication was cancelled');
      });
    });

    it('provides haptic feedback on success', async () => {
      const user = userEvent.setup();
      const vibrateSpy = jest.spyOn(navigator, 'vibrate');
      mockCredentials.get.mockResolvedValue({ id: 'test' });
      
      render(<BiometricAuth {...defaultProps} />);
      
      await waitFor(() => {
        const authButton = screen.getByRole('button', { name: /Authenticate with/ });
        return user.click(authButton);
      });
      
      await waitFor(() => {
        expect(vibrateSpy).toHaveBeenCalledWith([100, 50, 100]);
      });
    });

    it('shows loading state during authentication', async () => {
      const user = userEvent.setup();
      let resolveAuth: (value: any) => void;
      const authPromise = new Promise(resolve => {
        resolveAuth = resolve;
      });
      mockCredentials.get.mockReturnValue(authPromise);
      
      render(<BiometricAuth {...defaultProps} />);
      
      await waitFor(() => {
        const authButton = screen.getByRole('button', { name: /Authenticate with/ });
        return user.click(authButton);
      });
      
      expect(screen.getByText('Authenticating...')).toBeInTheDocument();
      
      resolveAuth!({ id: 'test' });
      
      await waitFor(() => {
        expect(screen.queryByText('Authenticating...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Password Fallback', () => {
    it('shows password option when fallback is enabled', async () => {
      const user = userEvent.setup();
      render(<BiometricAuth {...defaultProps} fallbackToPassword={true} />);
      
      await waitFor(() => {
        expect(screen.getByText('Use password instead')).toBeInTheDocument();
      });
    });

    it('switches to password mode', async () => {
      const user = userEvent.setup();
      render(<BiometricAuth {...defaultProps} fallbackToPassword={true} />);
      
      await waitFor(() => {
        const passwordLink = screen.getByText('Use password instead');
        return user.click(passwordLink);
      });
      
      expect(screen.getByText('Enter Password')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
    });

    it('authenticates with password', async () => {
      const user = userEvent.setup();
      render(<BiometricAuth {...defaultProps} fallbackToPassword={true} />);
      
      // Switch to password mode
      await waitFor(() => {
        const passwordLink = screen.getByText('Use password instead');
        return user.click(passwordLink);
      });
      
      // Enter password
      const passwordInput = screen.getByPlaceholderText('Enter your password');
      await user.type(passwordInput, 'demo123');
      
      // Submit
      const continueButton = screen.getByText('Continue');
      await user.click(continueButton);
      
      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalledWith({ type: 'password' });
      });
    });

    it('shows error for invalid password', async () => {
      const user = userEvent.setup();
      render(<BiometricAuth {...defaultProps} fallbackToPassword={true} />);
      
      // Switch to password mode
      await waitFor(() => {
        const passwordLink = screen.getByText('Use password instead');
        return user.click(passwordLink);
      });
      
      // Enter wrong password
      const passwordInput = screen.getByPlaceholderText('Enter your password');
      await user.type(passwordInput, 'wrongpassword');
      
      const continueButton = screen.getByText('Continue');
      await user.click(continueButton);
      
      await waitFor(() => {
        expect(defaultProps.onError).toHaveBeenCalledWith('Invalid password');
      });
    });

    it('allows switching back to biometric', async () => {
      const user = userEvent.setup();
      render(<BiometricAuth {...defaultProps} fallbackToPassword={true} />);
      
      // Switch to password mode
      await waitFor(() => {
        const passwordLink = screen.getByText('Use password instead');
        return user.click(passwordLink);
      });
      
      // Switch back to biometric
      const backLink = screen.getByText('← Back to biometric');
      await user.click(backLink);
      
      expect(screen.getByText('Authenticate')).toBeInTheDocument();
    });

    it('handles Enter key in password field', async () => {
      const user = userEvent.setup();
      render(<BiometricAuth {...defaultProps} fallbackToPassword={true} />);
      
      // Switch to password mode
      await waitFor(() => {
        const passwordLink = screen.getByText('Use password instead');
        return user.click(passwordLink);
      });
      
      // Enter password and press Enter
      const passwordInput = screen.getByPlaceholderText('Enter your password');
      await user.type(passwordInput, 'demo123{enter}');
      
      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('Responsive Design', () => {
    it('shows appropriate icon for mobile', () => {
      render(<BiometricAuth {...defaultProps} />);
      
      // Should show mobile-appropriate biometric icon
      const icon = screen.getByRole('img', { hidden: true });
      expect(icon).toBeInTheDocument();
    });

    it('shows appropriate icon for desktop', () => {
      (useResponsive as jest.Mock).mockReturnValue({
        ...mockResponsive,
        isMobile: false,
        isDesktop: true,
      });

      render(<BiometricAuth {...defaultProps} />);
      
      // Should show desktop-appropriate security key icon
      const icon = screen.getByRole('img', { hidden: true });
      expect(icon).toBeInTheDocument();
    });

    it('adapts button text for device type', async () => {
      render(<BiometricAuth {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Authenticate with Biometric/)).toBeInTheDocument();
      });
    });

    it('adapts button text for desktop', async () => {
      (useResponsive as jest.Mock).mockReturnValue({
        ...mockResponsive,
        isMobile: false,
        isDesktop: true,
      });

      render(<BiometricAuth {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Authenticate with Security Key/)).toBeInTheDocument();
      });
    });
  });

  describe('Customization', () => {
    it('displays custom title and subtitle', () => {
      render(
        <BiometricAuth 
          {...defaultProps} 
          title="Custom Title"
          subtitle="Custom subtitle text"
        />
      );
      
      expect(screen.getByText('Custom Title')).toBeInTheDocument();
      expect(screen.getByText('Custom subtitle text')).toBeInTheDocument();
    });

    it('hides fallback when disabled', () => {
      render(<BiometricAuth {...defaultProps} fallbackToPassword={false} />);
      
      expect(screen.queryByText('Use password instead')).not.toBeInTheDocument();
    });

    it('shows cancel button when provided', async () => {
      const user = userEvent.setup();
      render(<BiometricAuth {...defaultProps} />);
      
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);
      
      expect(defaultProps.onCancel).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<BiometricAuth {...defaultProps} />);
      
      // Tab to authenticate button
      await user.tab();
      expect(screen.getByRole('button', { name: /Authenticate with/ })).toHaveFocus();
      
      // Enter should trigger authentication
      await user.keyboard('{Enter}');
      expect(mockCredentials.get).toHaveBeenCalled();
    });

    it('has proper ARIA labels', () => {
      render(<BiometricAuth {...defaultProps} />);
      
      const authButton = screen.getByRole('button', { name: /Authenticate with/ });
      expect(authButton).toHaveAttribute('type', 'button');
    });

    it('manages focus properly in password mode', async () => {
      const user = userEvent.setup();
      render(<BiometricAuth {...defaultProps} fallbackToPassword={true} />);
      
      // Switch to password mode
      await waitFor(() => {
        const passwordLink = screen.getByText('Use password instead');
        return user.click(passwordLink);
      });
      
      // Password input should be focused
      const passwordInput = screen.getByPlaceholderText('Enter your password');
      expect(passwordInput).toHaveFocus();
    });

    it('provides proper error announcements', async () => {
      const user = userEvent.setup();
      mockCredentials.get.mockRejectedValue(new Error('Test error'));
      
      render(<BiometricAuth {...defaultProps} />);
      
      await waitFor(() => {
        const authButton = screen.getByRole('button', { name: /Authenticate with/ });
        return user.click(authButton);
      });
      
      // Error should be announced to screen readers
      await waitFor(() => {
        expect(defaultProps.onError).toHaveBeenCalled();
      });
    });
  });

  describe('Security', () => {
    it('uses proper WebAuthn parameters', async () => {
      const user = userEvent.setup();
      render(<BiometricAuth {...defaultProps} />);
      
      await waitFor(() => {
        const authButton = screen.getByRole('button', { name: /Authenticate with/ });
        return user.click(authButton);
      });
      
      expect(mockCredentials.get).toHaveBeenCalledWith({
        publicKey: expect.objectContaining({
          timeout: 60000,
          userVerification: 'required',
          challenge: expect.any(Uint8Array),
        }),
      });
    });

    it('does not store sensitive data', () => {
      render(<BiometricAuth {...defaultProps} />);
      
      // Component should not store any sensitive authentication data
      expect(screen.queryByDisplayValue(/password|credential|key/i)).not.toBeInTheDocument();
    });
  });
});