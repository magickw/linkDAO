import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AIAssistedPostComposer from '../AIAssistedPostComposer';

// Mock the useCommunityInteractions hook
jest.mock('../../../hooks/useCommunityInteractions', () => ({
  useCommunityInteractions: () => ({
    createPost: jest.fn().mockResolvedValue(true),
    loading: false,
    error: null,
    clearError: jest.fn()
  })
}));

// Mock the useAIAssistedPostCreation hook
jest.mock('../../../hooks/useAIAssistedPostCreation', () => ({
  useAIAssistedPostCreation: () => ({
    loading: false,
    error: null,
    suggestions: [],
    generatePostTitle: jest.fn().mockResolvedValue('Generated Title'),
    generatePostContent: jest.fn().mockResolvedValue('Generated Content'),
    generatePostTags: jest.fn().mockResolvedValue(['tag1', 'tag2']),
    improvePostContent: jest.fn().mockResolvedValue('Improved Content'),
    clearError: jest.fn()
  })
}));

// Mock wagmi useAccount hook
jest.mock('wagmi', () => ({
  useAccount: () => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true
  })
}));

// Mock useMobileOptimization hook
jest.mock('../../../hooks/useMobileOptimization', () => ({
  useMobileOptimization: () => ({
    isMobile: false,
    touchTargetClasses: 'min-w-[44px] min-h-[44px] flex items-center justify-center',
    shouldUseCompactLayout: () => false
  })
}));

// Mock analyticsService
jest.mock('../../../services/analyticsService', () => ({
  analyticsService: {
    trackUserEvent: jest.fn()
  }
}));

// Mock performanceOptimizations
jest.mock('../../../utils/performanceOptimizations', () => ({
  debounce: (fn: any) => fn
}));

// Mock accessibility
jest.mock('../../../utils/accessibility', () => ({
  KEYBOARD_KEYS: {
    ENTER: 'Enter',
    SPACE: ' '
  }
}));

describe('AIAssistedPostComposer', () => {
  const defaultProps = {
    communityId: 'test-community',
    communityName: 'Test Community',
    onPostCreated: jest.fn(),
    onCancel: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the component with default props', () => {
    render(<AIAssistedPostComposer {...defaultProps} />);
    
    expect(screen.getByText('Create Post in Test Community')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter a title for your post')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('What would you like to share with the community?')).toBeInTheDocument();
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
  });

  it('should toggle the AI assistant panel', () => {
    render(<AIAssistedPostComposer {...defaultProps} />);
    
    const aiToggle = screen.getByText('AI Assistant');
    fireEvent.click(aiToggle);
    
    expect(screen.getByText('AI Post Assistant')).toBeInTheDocument();
    
    fireEvent.click(aiToggle);
    expect(screen.queryByText('AI Post Assistant')).not.toBeInTheDocument();
  });

  it('should call generatePostTitle when Generate Title button is clicked', async () => {
    const mockGeneratePostTitle = jest.fn().mockResolvedValue('AI Generated Title');
    
    // Mock the hook with our custom implementation
    jest.mock('../../../hooks/useAIAssistedPostCreation', () => ({
      useAIAssistedPostCreation: () => ({
        loading: false,
        error: null,
        suggestions: [],
        generatePostTitle: mockGeneratePostTitle,
        generatePostContent: jest.fn().mockResolvedValue('Generated Content'),
        generatePostTags: jest.fn().mockResolvedValue(['tag1', 'tag2']),
        improvePostContent: jest.fn().mockResolvedValue('Improved Content'),
        clearError: jest.fn()
      })
    }));

    // Reset modules and re-require the component to get updated mock
    jest.resetModules();
    const AIAssistedPostComposer = require('../AIAssistedPostComposer').default;
    
    render(<AIAssistedPostComposer {...defaultProps} />);
    
    // Open AI panel
    fireEvent.click(screen.getByText('AI Assistant'));
    
    // Fill in some content
    const contentTextarea = screen.getByPlaceholderText('What would you like to share with the community?');
    fireEvent.change(contentTextarea, { target: { value: 'This is test content' } });
    
    // Click Generate Title button
    const generateTitleButton = screen.getByText('Generate Title');
    fireEvent.click(generateTitleButton);
    
    await waitFor(() => {
      expect(mockGeneratePostTitle).toHaveBeenCalledWith(
        'This is test content',
        'test-community',
        'Test Community'
      );
    });
  });

  it('should call generatePostContent when Generate Content button is clicked', async () => {
    const mockGeneratePostContent = jest.fn().mockResolvedValue('AI Generated Content');
    
    // Mock the hook with our custom implementation
    jest.mock('../../../hooks/useAIAssistedPostCreation', () => ({
      useAIAssistedPostCreation: () => ({
        loading: false,
        error: null,
        suggestions: [],
        generatePostTitle: jest.fn().mockResolvedValue('Generated Title'),
        generatePostContent: mockGeneratePostContent,
        generatePostTags: jest.fn().mockResolvedValue(['tag1', 'tag2']),
        improvePostContent: jest.fn().mockResolvedValue('Improved Content'),
        clearError: jest.fn()
      })
    }));

    // Reset modules and re-require the component to get updated mock
    jest.resetModules();
    const AIAssistedPostComposer = require('../AIAssistedPostComposer').default;
    
    render(<AIAssistedPostComposer {...defaultProps} />);
    
    // Open AI panel
    fireEvent.click(screen.getByText('AI Assistant'));
    
    // Fill in a title
    const titleInput = screen.getByPlaceholderText('Enter a title for your post');
    fireEvent.change(titleInput, { target: { value: 'Test Title' } });
    
    // Click Generate Content button
    const generateContentButton = screen.getByText('Generate Content');
    fireEvent.click(generateContentButton);
    
    await waitFor(() => {
      expect(mockGeneratePostContent).toHaveBeenCalledWith(
        'Test Title',
        'test-community',
        'Test Community'
      );
    });
  });

  it('should call generatePostTags when Suggest Tags button is clicked', async () => {
    const mockGeneratePostTags = jest.fn().mockResolvedValue(['ai', 'tags']);
    
    // Mock the hook with our custom implementation
    jest.mock('../../../hooks/useAIAssistedPostCreation', () => ({
      useAIAssistedPostCreation: () => ({
        loading: false,
        error: null,
        suggestions: ['ai', 'tags'],
        generatePostTitle: jest.fn().mockResolvedValue('Generated Title'),
        generatePostContent: jest.fn().mockResolvedValue('Generated Content'),
        generatePostTags: mockGeneratePostTags,
        improvePostContent: jest.fn().mockResolvedValue('Improved Content'),
        clearError: jest.fn()
      })
    }));

    // Reset modules and re-require the component to get updated mock
    jest.resetModules();
    const AIAssistedPostComposer = require('../AIAssistedPostComposer').default;
    
    render(<AIAssistedPostComposer {...defaultProps} />);
    
    // Open AI panel
    fireEvent.click(screen.getByText('AI Assistant'));
    
    // Fill in some content
    const contentTextarea = screen.getByPlaceholderText('What would you like to share with the community?');
    fireEvent.change(contentTextarea, { target: { value: 'This is test content' } });
    
    // Click Suggest Tags button
    const suggestTagsButton = screen.getByText('Suggest Tags');
    fireEvent.click(suggestTagsButton);
    
    await waitFor(() => {
      expect(mockGeneratePostTags).toHaveBeenCalledWith(
        'This is test content',
        'test-community',
        'Test Community'
      );
    });
    
    // Check that tags were added
    await waitFor(() => {
      expect(screen.getByText('ai')).toBeInTheDocument();
      expect(screen.getByText('tags')).toBeInTheDocument();
    });
  });

  it('should call improvePostContent when Improve Content button is clicked', async () => {
    const mockImprovePostContent = jest.fn().mockResolvedValue('Improved Content');
    
    // Mock the hook with our custom implementation
    jest.mock('../../../hooks/useAIAssistedPostCreation', () => ({
      useAIAssistedPostCreation: () => ({
        loading: false,
        error: null,
        suggestions: [],
        generatePostTitle: jest.fn().mockResolvedValue('Generated Title'),
        generatePostContent: jest.fn().mockResolvedValue('Generated Content'),
        generatePostTags: jest.fn().mockResolvedValue(['tag1', 'tag2']),
        improvePostContent: mockImprovePostContent,
        clearError: jest.fn()
      })
    }));

    // Reset modules and re-require the component to get updated mock
    jest.resetModules();
    const AIAssistedPostComposer = require('../AIAssistedPostComposer').default;
    
    render(<AIAssistedPostComposer {...defaultProps} />);
    
    // Open AI panel
    fireEvent.click(screen.getByText('AI Assistant'));
    
    // Fill in some content
    const contentTextarea = screen.getByPlaceholderText('What would you like to share with the community?');
    fireEvent.change(contentTextarea, { target: { value: 'This is test content to improve' } });
    
    // Click Improve Content button
    const improveContentButton = screen.getByText('Improve Content');
    fireEvent.click(improveContentButton);
    
    await waitFor(() => {
      expect(mockImprovePostContent).toHaveBeenCalledWith(
        'This is test content to improve',
        'test-community',
        'Test Community'
      );
    });
  });

  it('should display error messages when they occur', () => {
    // Mock the hook with an error
    jest.mock('../../../hooks/useAIAssistedPostCreation', () => ({
      useAIAssistedPostCreation: () => ({
        loading: false,
        error: 'Test error message',
        suggestions: [],
        generatePostTitle: jest.fn(),
        generatePostContent: jest.fn(),
        generatePostTags: jest.fn(),
        improvePostContent: jest.fn(),
        clearError: jest.fn()
      })
    }));

    // Reset modules and re-require the component to get updated mock
    jest.resetModules();
    const AIAssistedPostComposer = require('../AIAssistedPostComposer').default;
    
    render(<AIAssistedPostComposer {...defaultProps} />);
    
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('should call onPostCreated when a post is successfully submitted', async () => {
    const mockOnPostCreated = jest.fn();
    const mockCreatePost = jest.fn().mockResolvedValue(true);
    
    // Mock the hook with our custom implementation
    jest.mock('../../../hooks/useCommunityInteractions', () => ({
      useCommunityInteractions: () => ({
        createPost: mockCreatePost,
        loading: false,
        error: null,
        clearError: jest.fn()
      })
    }));

    // Reset modules and re-require the component to get updated mock
    jest.resetModules();
    const AIAssistedPostComposer = require('../AIAssistedPostComposer').default;
    
    render(<AIAssistedPostComposer {...defaultProps} onPostCreated={mockOnPostCreated} />);
    
    // Fill in title and content
    const titleInput = screen.getByPlaceholderText('Enter a title for your post');
    fireEvent.change(titleInput, { target: { value: 'Test Title' } });
    
    const contentTextarea = screen.getByPlaceholderText('What would you like to share with the community?');
    fireEvent.change(contentTextarea, { target: { value: 'Test Content' } });
    
    // Submit the form
    const submitButton = screen.getByText('Post to Community');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockCreatePost).toHaveBeenCalledWith({
        communityId: 'test-community',
        title: 'Test Title',
        content: 'Test Content',
        tags: [],
        mediaUrls: [],
        postType: 'discussion'
      });
      
      expect(mockOnPostCreated).toHaveBeenCalledWith({
        title: 'Test Title',
        content: 'Test Content',
        tags: [],
        mediaUrls: [],
        postType: 'discussion',
        communityId: 'test-community'
      });
    });
  });
});