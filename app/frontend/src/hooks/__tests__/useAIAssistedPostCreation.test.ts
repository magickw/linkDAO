import { renderHook, act } from '@testing-library/react-hooks';
import { useAIAssistedPostCreation } from '../useAIAssistedPostCreation';

// Mock the CommunityInteractionService
jest.mock('../../services/communityInteractionService', () => ({
  CommunityInteractionService: {
    createAIAssistedPost: jest.fn()
  }
}));

// Mock wagmi useAccount hook
jest.mock('wagmi', () => ({
  useAccount: () => ({
    address: '0x1234567890123456789012345678901234567890'
  })
}));

describe('useAIAssistedPostCreation', () => {
  const mockCreateAIAssistedPost = require('../../services/communityInteractionService').CommunityInteractionService.createAIAssistedPost;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useAIAssistedPostCreation());

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.suggestions).toEqual([]);
  });

  it('should generate a post title', async () => {
    mockCreateAIAssistedPost.mockResolvedValue({
      success: true,
      data: {
        result: 'Engaging Title About Blockchain'
      }
    });

    const { result } = renderHook(() => useAIAssistedPostCreation());

    await act(async () => {
      const title = await result.current.generatePostTitle(
        'This is content about blockchain technology',
        'test-community',
        'Test Community'
      );
      expect(title).toBe('Engaging Title About Blockchain');
    });

    expect(result.current.loading).toBe(false);
    expect(mockCreateAIAssistedPost).toHaveBeenCalledWith({
      communityId: 'test-community',
      authorAddress: '0x1234567890123456789012345678901234567890',
      content: 'This is content about blockchain technology',
      aiAction: 'generate_title'
    });
  });

  it('should generate post content', async () => {
    mockCreateAIAssistedPost.mockResolvedValue({
      success: true,
      data: {
        result: 'Here is engaging content about blockchain technology.'
      }
    });

    const { result } = renderHook(() => useAIAssistedPostCreation());

    await act(async () => {
      const content = await result.current.generatePostContent(
        'Blockchain Applications',
        'test-community',
        'Test Community'
      );
      expect(content).toBe('Here is engaging content about blockchain technology.');
    });

    expect(result.current.loading).toBe(false);
    expect(mockCreateAIAssistedPost).toHaveBeenCalledWith({
      communityId: 'test-community',
      authorAddress: '0x1234567890123456789012345678901234567890',
      title: 'Blockchain Applications',
      aiAction: 'generate_content'
    });
  });

  it('should generate post tags', async () => {
    mockCreateAIAssistedPost.mockResolvedValue({
      success: true,
      data: {
        result: 'blockchain,web3,technology'
      }
    });

    const { result } = renderHook(() => useAIAssistedPostCreation());

    await act(async () => {
      const tags = await result.current.generatePostTags(
        'This is content about blockchain technology',
        'test-community',
        'Test Community'
      );
      expect(tags).toEqual(['blockchain', 'web3', 'technology']);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.suggestions).toEqual(['blockchain', 'web3', 'technology']);
    expect(mockCreateAIAssistedPost).toHaveBeenCalledWith({
      communityId: 'test-community',
      authorAddress: '0x1234567890123456789012345678901234567890',
      content: 'This is content about blockchain technology',
      aiAction: 'generate_tags'
    });
  });

  it('should improve post content', async () => {
    mockCreateAIAssistedPost.mockResolvedValue({
      success: true,
      data: {
        result: 'Enhanced content with better structure and engagement.'
      }
    });

    const { result } = renderHook(() => useAIAssistedPostCreation());

    await act(async () => {
      const improvedContent = await result.current.improvePostContent(
        'Basic content that needs improvement',
        'test-community',
        'Test Community'
      );
      expect(improvedContent).toBe('Enhanced content with better structure and engagement.');
    });

    expect(result.current.loading).toBe(false);
    expect(mockCreateAIAssistedPost).toHaveBeenCalledWith({
      communityId: 'test-community',
      authorAddress: '0x1234567890123456789012345678901234567890',
      content: 'Basic content that needs improvement',
      aiAction: 'improve_content'
    });
  });

  it('should handle errors when generating post title', async () => {
    mockCreateAIAssistedPost.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAIAssistedPostCreation());

    await act(async () => {
      const title = await result.current.generatePostTitle(
        'This is content about blockchain technology',
        'test-community',
        'Test Community'
      );
      expect(title).toBeNull();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Network error');
  });

  it('should handle wallet not connected error', async () => {
    // Mock useAccount to return no address
    jest.mock('wagmi', () => ({
      useAccount: () => ({
        address: undefined
      })
    }));

    // Re-import the hook to get the updated mock
    const { useAIAssistedPostCreation } = require('../useAIAssistedPostCreation');
    
    const { result } = renderHook(() => useAIAssistedPostCreation());

    await act(async () => {
      const title = await result.current.generatePostTitle(
        'This is content about blockchain technology',
        'test-community',
        'Test Community'
      );
      expect(title).toBeNull();
    });

    expect(result.current.error).toBe('Wallet not connected');
  });

  it('should clear errors', async () => {
    mockCreateAIAssistedPost.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAIAssistedPostCreation());

    await act(async () => {
      await result.current.generatePostTitle(
        'This is content about blockchain technology',
        'test-community',
        'Test Community'
      );
    });

    expect(result.current.error).toBe('Network error');

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });
});