import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import CommunityHeader from '../CommunityHeader';

// Mock the Button component
jest.mock('../../ui/Button', () => ({
  Button: ({ children, onClick, disabled, variant, size, className, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn ${variant} ${size} ${className}`}
      {...props}
    >
      {children}
    </button>
  ),
}));

// Mock Heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  UserGroupIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="user-group-icon">
      <title>UserGroup</title>
    </svg>
  ),
  EyeIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="eye-icon">
      <title>Eye</title>
    </svg>
  ),
  PhotoIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="photo-icon">
      <title>Photo</title>
    </svg>
  ),
  CheckIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="check-icon">
      <title>Check</title>
    </svg>
  ),
  XMarkIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="x-mark-icon">
      <title>XMark</title>
    </svg>
  ),
}));

const mockCommunity = {
  id: 'test-community',
  name: 'testcommunity',
  displayName: 'Test Community',
  description: 'This is a test community for unit testing',
  bannerImage: undefined,
  avatarImage: undefined,
  memberCount: 1250,
  onlineCount: 45,
  createdAt: new Date('2023-01-01'),
  isJoined: false,
  canModerate: false,
};

const defaultProps = {
  community: mockCommunity,
  isJoined: false,
  onJoinToggle: jest.fn(),
  canModerate: false,
  loading: false,
};

describe('CommunityHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders community header with basic information', () => {
      render(<CommunityHeader {...defaultProps} />);
      
      expect(screen.getByText('Test Community')).toBeInTheDocument();
      expect(screen.getByText('r/testcommunity')).toBeInTheDocument();
      expect(screen.getByText('1.3K members')).toBeInTheDocument();
      expect(screen.getByText('45 online')).toBeInTheDocument();
      expect(screen.getByText('This is a test community for unit testing')).toBeInTheDocument();
    });

    it('renders join button when not joined', () => {
      render(<CommunityHeader {...defaultProps} />);
      
      const joinButton = screen.getByRole('button', { name: /join/i });
      expect(joinButton).toBeInTheDocument();
      expect(joinButton).not.toBeDisabled();
    });

    it('renders joined button when already joined', () => {
      render(<CommunityHeader {...defaultProps} isJoined={true} />);
      
      const joinedButton = screen.getByRole('button', { name: /joined/i });
      expect(joinedButton).toBeInTheDocument();
      expect(screen.getByTestId('check-icon')).toBeInTheDocument();
    });

    it('displays loading state correctly', () => {
      render(<CommunityHeader {...defaultProps} loading={true} />);
      
      const loadingButton = screen.getByRole('button', { name: /loading/i });
      expect(loadingButton).toBeInTheDocument();
      expect(loadingButton).toBeDisabled();
    });
  });

  describe('Banner Functionality', () => {
    it('displays gradient background when no banner image', () => {
      render(<CommunityHeader {...defaultProps} />);
      
      // Check that no banner image is rendered
      expect(screen.queryByAltText('Test Community banner')).not.toBeInTheDocument();
      
      // The gradient should be applied via inline styles
      const bannerDiv = screen.getByRole('img', { hidden: true })?.parentElement || 
                       document.querySelector('[style*="linear-gradient"]');
      expect(bannerDiv).toBeInTheDocument();
    });

    it('displays banner image when provided', () => {
      const communityWithBanner = {
        ...mockCommunity,
        bannerImage: 'https://example.com/banner.jpg',
      };
      
      render(<CommunityHeader {...defaultProps} community={communityWithBanner} />);
      
      const bannerImage = screen.getByAltText('Test Community banner');
      expect(bannerImage).toBeInTheDocument();
      expect(bannerImage).toHaveAttribute('src', 'https://example.com/banner.jpg');
    });

    it('shows banner upload button for moderators', () => {
      render(<CommunityHeader {...defaultProps} canModerate={true} onBannerUpload={jest.fn()} />);
      
      const uploadButton = screen.getByRole('button', { name: /change banner/i });
      expect(uploadButton).toBeInTheDocument();
      expect(screen.getByTestId('photo-icon')).toBeInTheDocument();
    });

    it('does not show banner upload button for non-moderators', () => {
      render(<CommunityHeader {...defaultProps} canModerate={false} />);
      
      expect(screen.queryByRole('button', { name: /change banner/i })).not.toBeInTheDocument();
    });

    it('does not show banner upload button when onBannerUpload is not provided', () => {
      render(<CommunityHeader {...defaultProps} canModerate={true} />);
      
      expect(screen.queryByRole('button', { name: /change banner/i })).not.toBeInTheDocument();
    });
  });

  describe('Avatar Functionality', () => {
    it('displays placeholder when no avatar image', () => {
      render(<CommunityHeader {...defaultProps} />);
      
      expect(screen.queryByAltText('Test Community avatar')).not.toBeInTheDocument();
      expect(screen.getByTestId('user-group-icon')).toBeInTheDocument();
    });

    it('displays avatar image when provided', () => {
      const communityWithAvatar = {
        ...mockCommunity,
        avatarImage: 'https://example.com/avatar.jpg',
      };
      
      render(<CommunityHeader {...defaultProps} community={communityWithAvatar} />);
      
      const avatarImage = screen.getByAltText('Test Community avatar');
      expect(avatarImage).toBeInTheDocument();
      expect(avatarImage).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });
  });

  describe('Member Count Formatting', () => {
    it('formats large member counts correctly', () => {
      const communityWithLargeCount = {
        ...mockCommunity,
        memberCount: 1500000,
        onlineCount: 2500,
      };
      
      render(<CommunityHeader {...defaultProps} community={communityWithLargeCount} />);
      
      expect(screen.getByText('1.5M members')).toBeInTheDocument();
      expect(screen.getByText('2.5K online')).toBeInTheDocument();
    });

    it('displays small counts without formatting', () => {
      const communityWithSmallCount = {
        ...mockCommunity,
        memberCount: 500,
        onlineCount: 25,
      };
      
      render(<CommunityHeader {...defaultProps} community={communityWithSmallCount} />);
      
      expect(screen.getByText('500 members')).toBeInTheDocument();
      expect(screen.getByText('25 online')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onJoinToggle when join button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnJoinToggle = jest.fn();
      
      render(<CommunityHeader {...defaultProps} onJoinToggle={mockOnJoinToggle} />);
      
      const joinButton = screen.getByRole('button', { name: /join/i });
      await user.click(joinButton);
      
      expect(mockOnJoinToggle).toHaveBeenCalledTimes(1);
    });

    it('calls onJoinToggle when joined button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnJoinToggle = jest.fn();
      
      render(<CommunityHeader {...defaultProps} isJoined={true} onJoinToggle={mockOnJoinToggle} />);
      
      const joinedButton = screen.getByRole('button', { name: /joined/i });
      await user.click(joinedButton);
      
      expect(mockOnJoinToggle).toHaveBeenCalledTimes(1);
    });

    it('does not call onJoinToggle when button is disabled', async () => {
      const user = userEvent.setup();
      const mockOnJoinToggle = jest.fn();
      
      render(<CommunityHeader {...defaultProps} loading={true} onJoinToggle={mockOnJoinToggle} />);
      
      const loadingButton = screen.getByRole('button', { name: /loading/i });
      await user.click(loadingButton);
      
      expect(mockOnJoinToggle).not.toHaveBeenCalled();
    });
  });

  describe('Banner Upload Functionality', () => {
    it('triggers file input when upload button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnBannerUpload = jest.fn();
      
      render(<CommunityHeader {...defaultProps} canModerate={true} onBannerUpload={mockOnBannerUpload} />);
      
      const uploadButton = screen.getByRole('button', { name: /change banner/i });
      await user.click(uploadButton);
      
      // File input should be present (though hidden)
      const fileInput = screen.getByRole('button', { hidden: true }) || 
                       document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
    });

    it('validates file type on upload', async () => {
      const user = userEvent.setup();
      const mockOnBannerUpload = jest.fn();
      
      // Mock alert
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      
      render(<CommunityHeader {...defaultProps} canModerate={true} onBannerUpload={mockOnBannerUpload} />);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();
      
      // Create a non-image file
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      
      await user.upload(fileInput, file);
      
      expect(alertSpy).toHaveBeenCalledWith('Please select an image file');
      expect(mockOnBannerUpload).not.toHaveBeenCalled();
      
      alertSpy.mockRestore();
    });

    it('validates file size on upload', async () => {
      const user = userEvent.setup();
      const mockOnBannerUpload = jest.fn();
      
      // Mock alert
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      
      render(<CommunityHeader {...defaultProps} canModerate={true} onBannerUpload={mockOnBannerUpload} />);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      // Create a large image file (6MB)
      const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
      
      await user.upload(fileInput, largeFile);
      
      expect(alertSpy).toHaveBeenCalledWith('Image must be smaller than 5MB');
      expect(mockOnBannerUpload).not.toHaveBeenCalled();
      
      alertSpy.mockRestore();
    });

    it('calls onBannerUpload with valid file', async () => {
      const user = userEvent.setup();
      const mockOnBannerUpload = jest.fn().mockResolvedValue(undefined);
      
      render(<CommunityHeader {...defaultProps} canModerate={true} onBannerUpload={mockOnBannerUpload} />);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      // Create a valid image file
      const validFile = new File(['image data'], 'banner.jpg', { type: 'image/jpeg' });
      
      await user.upload(fileInput, validFile);
      
      await waitFor(() => {
        expect(mockOnBannerUpload).toHaveBeenCalledWith(validFile);
      });
    });

    it('handles upload errors gracefully', async () => {
      const user = userEvent.setup();
      const mockOnBannerUpload = jest.fn().mockRejectedValue(new Error('Upload failed'));
      
      // Mock alert and console.error
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<CommunityHeader {...defaultProps} canModerate={true} onBannerUpload={mockOnBannerUpload} />);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const validFile = new File(['image data'], 'banner.jpg', { type: 'image/jpeg' });
      
      await user.upload(fileInput, validFile);
      
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to upload banner. Please try again.');
        expect(consoleSpy).toHaveBeenCalledWith('Banner upload failed:', expect.any(Error));
      });
      
      alertSpy.mockRestore();
      consoleSpy.mockRestore();
    });

    it('shows uploading state during upload', async () => {
      const user = userEvent.setup();
      let resolveUpload: (value: unknown) => void;
      const uploadPromise = new Promise((resolve) => {
        resolveUpload = resolve;
      });
      const mockOnBannerUpload = jest.fn().mockReturnValue(uploadPromise);
      
      render(<CommunityHeader {...defaultProps} canModerate={true} onBannerUpload={mockOnBannerUpload} />);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const validFile = new File(['image data'], 'banner.jpg', { type: 'image/jpeg' });
      
      await user.upload(fileInput, validFile);
      
      // Check uploading state
      expect(screen.getByText('Uploading...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /uploading/i })).toBeDisabled();
      
      // Resolve upload
      resolveUpload!(undefined);
      
      await waitFor(() => {
        expect(screen.getByText('Change Banner')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /change banner/i })).not.toBeDisabled();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper alt text for images', () => {
      const communityWithImages = {
        ...mockCommunity,
        bannerImage: 'https://example.com/banner.jpg',
        avatarImage: 'https://example.com/avatar.jpg',
      };
      
      render(<CommunityHeader {...defaultProps} community={communityWithImages} />);
      
      expect(screen.getByAltText('Test Community banner')).toBeInTheDocument();
      expect(screen.getByAltText('Test Community avatar')).toBeInTheDocument();
    });

    it('has proper button labels', () => {
      render(<CommunityHeader {...defaultProps} canModerate={true} onBannerUpload={jest.fn()} />);
      
      expect(screen.getByRole('button', { name: /join/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /change banner/i })).toBeInTheDocument();
    });

    it('has proper file input attributes', () => {
      render(<CommunityHeader {...defaultProps} canModerate={true} onBannerUpload={jest.fn()} />);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toHaveAttribute('accept', 'image/*');
    });
  });

  describe('Responsive Design', () => {
    it('applies responsive classes correctly', () => {
      render(<CommunityHeader {...defaultProps} />);
      
      // Check that responsive classes are applied
      const header = screen.getByText('Test Community').closest('div');
      expect(header).toHaveClass('text-xl', 'sm:text-2xl', 'md:text-3xl');
    });
  });

  describe('Edge Cases', () => {
    it('handles missing description gracefully', () => {
      const communityWithoutDescription = {
        ...mockCommunity,
        description: '',
      };
      
      render(<CommunityHeader {...defaultProps} community={communityWithoutDescription} />);
      
      expect(screen.queryByText('This is a test community for unit testing')).not.toBeInTheDocument();
    });

    it('handles zero member counts', () => {
      const communityWithZeroMembers = {
        ...mockCommunity,
        memberCount: 0,
        onlineCount: 0,
      };
      
      render(<CommunityHeader {...defaultProps} community={communityWithZeroMembers} />);
      
      expect(screen.getByText('0 members')).toBeInTheDocument();
      expect(screen.getByText('0 online')).toBeInTheDocument();
    });

    it('handles very long community names', () => {
      const communityWithLongName = {
        ...mockCommunity,
        displayName: 'This is a very long community name that should be truncated properly',
      };
      
      render(<CommunityHeader {...defaultProps} community={communityWithLongName} />);
      
      const nameElement = screen.getByText('This is a very long community name that should be truncated properly');
      expect(nameElement).toBeInTheDocument();
      expect(nameElement).toHaveClass('truncate');
    });
  });
});