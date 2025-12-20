import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/router';
import CommunityOnboarding from '../CommunityOnboarding';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

// Mock the hooks and modules
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/context/ToastContext', () => ({
  useToast: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('CommunityOnboarding Component', () => {
  const mockPush = jest.fn();
  const mockAddToast = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      reload: jest.fn(),
    });
    
    (useToast as jest.Mock).mockReturnValue({
      addToast: mockAddToast,
    });
    
    (useAuth as jest.Mock).mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
      isAuthenticated: true,
    });
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => 'mock-token'),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });
  });

  test('should not render when user is not authenticated', () => {
    (useAuth as jest.Mock).mockReturnValue({
      address: null,
      isAuthenticated: false,
    });

    render(<CommunityOnboarding />);
    
    expect(screen.queryByText('Welcome to LinkDAO Communities!')).not.toBeInTheDocument();
  });

  test('should check onboarding status on mount', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { needsOnboarding: true },
      }),
    });

    render(<CommunityOnboarding />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/onboarding/status'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
          }),
        })
      );
    });
  });

  test('should not show onboarding if user completed it', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { needsOnboarding: false },
      }),
    });

    render(<CommunityOnboarding />);

    await waitFor(() => {
      expect(screen.queryByText('Welcome to LinkDAO Communities!')).not.toBeInTheDocument();
    });
  });

  test('should fetch categories and tags when opened', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { needsOnboarding: true },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [
            {
              id: 'dev',
              name: 'Development',
              description: 'Software development',
              icon: '💻',
              color: 'bg-blue-500',
            },
            {
              id: 'defi',
              name: 'DeFi',
              description: 'Decentralized finance',
              icon: '💰',
              color: 'bg-green-500',
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [
            { id: 'react', name: 'react', category: 'dev' },
            { id: 'ethereum', name: 'ethereum', category: 'dev' },
            { id: 'yield', name: 'yield', category: 'defi' },
          ],
        }),
      });

    render(<CommunityOnboarding />);

    await waitFor(() => {
      expect(screen.getByText('Select your interests')).toBeInTheDocument();
      expect(screen.getByText('Development')).toBeInTheDocument();
      expect(screen.getByText('DeFi')).toBeInTheDocument();
    });
  });

  test('should allow selecting categories', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { needsOnboarding: true },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [
            {
              id: 'dev',
              name: 'Development',
              description: 'Software development',
              icon: '💻',
              color: 'bg-blue-500',
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
        }),
      });

    render(<CommunityOnboarding />);

    await waitFor(() => {
      expect(screen.getByText('Select your interests')).toBeInTheDocument();
    });

    const categoryButton = screen.getByText('Development').closest('button');
    fireEvent.click(categoryButton);

    expect(categoryButton).toHaveClass('border-blue-500');
  });

  test('should proceed to tags step after selecting categories', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { needsOnboarding: true },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [
            {
              id: 'dev',
              name: 'Development',
              description: 'Software development',
              icon: '💻',
              color: 'bg-blue-500',
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [
            { id: 'react', name: 'react', category: 'dev' },
          ],
        }),
      });

    render(<CommunityOnboarding />);

    await waitFor(() => {
      expect(screen.getByText('Select your interests')).toBeInTheDocument();
    });

    const categoryButton = screen.getByText('Development').closest('button');
    fireEvent.click(categoryButton);

    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Refine with tags')).toBeInTheDocument();
    });
  });

  test('should save preferences when submitted', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { needsOnboarding: true },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [
            {
              id: 'dev',
              name: 'Development',
              description: 'Software development',
              icon: '💻',
              color: 'bg-blue-500',
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [
            { id: 'react', name: 'react', category: 'dev' },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: '123',
            userId: 'user123',
            preferredCategories: ['dev'],
            preferredTags: ['react'],
            onboardingCompleted: true,
            skipOnboarding: false,
          },
        }),
      });

    render(<CommunityOnboarding />);

    await waitFor(() => {
      expect(screen.getByText('Select your interests')).toBeInTheDocument();
    });

    // Select category
    const categoryButton = screen.getByText('Development').closest('button');
    fireEvent.click(categoryButton);

    // Go to tags step
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Refine with tags')).toBeInTheDocument();
    });

    // Select tag
    const tagButton = screen.getByText('#react');
    fireEvent.click(tagButton);

    // Submit
    const saveButton = screen.getByText('Save Preferences');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/onboarding/preferences'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            preferredCategories: ['dev'],
            preferredTags: ['react'],
          }),
        })
      );
    });

    expect(mockAddToast).toHaveBeenCalledWith(
      'Preferences saved! Your feed will now be personalized.',
      'success'
    );
    expect(mockPush).toHaveBeenCalledWith('/communities');
  });

  test('should skip onboarding when skip is clicked', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { needsOnboarding: true },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: '123',
            userId: 'user123',
            preferredCategories: [],
            preferredTags: [],
            onboardingCompleted: false,
            skipOnboarding: true,
          },
        }),
      });

    render(<CommunityOnboarding />);

    await waitFor(() => {
      expect(screen.getByText('Skip for now')).toBeInTheDocument();
    });

    const skipButton = screen.getByText('Skip for now');
    fireEvent.click(skipButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/onboarding/skip'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
          }),
        })
      );
    });

    expect(mockAddToast).toHaveBeenCalledWith(
      'Onboarding skipped. You can update your preferences later in settings.',
      'info'
    );
  });

  test('should show error when saving preferences fails', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { needsOnboarding: true },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [
            {
              id: 'dev',
              name: 'Development',
              description: 'Software development',
              icon: '💻',
              color: 'bg-blue-500',
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
        }),
      })
      .mockRejectedValueOnce(new Error('Network error'));

    render(<CommunityOnboarding />);

    await waitFor(() => {
      expect(screen.getByText('Select your interests')).toBeInTheDocument();
    });

    const categoryButton = screen.getByText('Development').closest('button');
    fireEvent.click(categoryButton);

    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Refine with tags')).toBeInTheDocument();
    });

    const saveButton = screen.getByText('Save Preferences');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith(
        'Failed to save preferences',
        'error'
      );
    });
  });
});