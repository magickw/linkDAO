import { PostService } from './postService';

// Mock fetch globally
global.fetch = jest.fn();

describe('PostService', () => {
  const mockPost = {
    id: '1',
    author: '0x1234567890123456789012345678901234567890',
    content: 'This is a test post',
    tags: ['test', 'post'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockPosts = [mockPost];

  const mockPostInput = {
    author: '0x1234567890123456789012345678901234567890',
    content: 'This is a test post',
    tags: ['test', 'post'],
  };

  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  describe('createPost', () => {
    it('should create a post successfully', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockPost),
      });

      const result = await PostService.createPost(mockPostInput);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3002/api/posts',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(mockPostInput),
        }
      );
      expect(result).toEqual(mockPost);
    });

    it('should throw an error when post creation fails', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({ error: 'Failed to create post' }),
      });

      await expect(PostService.createPost(mockPostInput)).rejects.toThrow(
        'Failed to create post'
      );
    });
  });

  describe('getPostById', () => {
    it('should get a post by ID successfully', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockPost),
      });

      const result = await PostService.getPostById('1');

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3002/api/posts/1',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      expect(result).toEqual(mockPost);
    });

    it('should return null when post is not found', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        json: jest.fn().mockResolvedValue({ error: 'Post not found' }),
      });

      const result = await PostService.getPostById('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw an error when getting post fails', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue({ error: 'Internal server error' }),
      });

      await expect(PostService.getPostById('1')).rejects.toThrow(
        'Internal server error'
      );
    });
  });

  describe('getPostsByAuthor', () => {
    it('should get posts by author successfully', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockPosts),
      });

      const result = await PostService.getPostsByAuthor(
        '0x1234567890123456789012345678901234567890'
      );

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3002/api/posts/author/0x1234567890123456789012345678901234567890',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      expect(result).toEqual(mockPosts);
    });

    it('should throw an error when getting posts by author fails', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({ error: 'Failed to fetch posts' }),
      });

      await expect(
        PostService.getPostsByAuthor(
          '0x1234567890123456789012345678901234567890'
        )
      ).rejects.toThrow('Failed to fetch posts');
    });
  });

  describe('getPostsByTag', () => {
    it('should get posts by tag successfully', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockPosts),
      });

      const result = await PostService.getPostsByTag('test');

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3002/api/posts/tag/test',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      expect(result).toEqual(mockPosts);
    });

    it('should throw an error when getting posts by tag fails', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({ error: 'Failed to fetch posts' }),
      });

      await expect(PostService.getPostsByTag('test')).rejects.toThrow(
        'Failed to fetch posts'
      );
    });
  });

  describe('updatePost', () => {
    it('should update a post successfully', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockPost),
      });

      const updateData = {
        content: 'This is an updated test post',
        tags: ['test', 'updated'],
      };

      const result = await PostService.updatePost('1', updateData);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3002/api/posts/1',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        }
      );
      expect(result).toEqual(mockPost);
    });

    it('should throw an error when post update fails', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({ error: 'Failed to update post' }),
      });

      const updateData = {
        content: 'This is an updated test post',
        tags: ['test', 'updated'],
      };

      await expect(PostService.updatePost('1', updateData)).rejects.toThrow(
        'Failed to update post'
      );
    });
  });

  describe('deletePost', () => {
    it('should delete a post successfully', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(true),
      });

      const result = await PostService.deletePost('1');

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3002/api/posts/1',
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      expect(result).toBe(true);
    });

    it('should throw an error when post deletion fails', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({ error: 'Failed to delete post' }),
      });

      await expect(PostService.deletePost('1')).rejects.toThrow(
        'Failed to delete post'
      );
    });
  });

  describe('getAllPosts', () => {
    it('should get all posts successfully', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockPosts),
      });

      const result = await PostService.getAllPosts();

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3002/api/posts',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      expect(result).toEqual(mockPosts);
    });

    it('should throw an error when getting all posts fails', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({ error: 'Failed to fetch posts' }),
      });

      await expect(PostService.getAllPosts()).rejects.toThrow(
        'Failed to fetch posts'
      );
    });
  });

  describe('getFeed', () => {
    it('should get user feed successfully', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockPosts),
      });

      const result = await PostService.getFeed(
        '0x1234567890123456789012345678901234567890'
      );

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3002/api/posts/feed?forUser=0x1234567890123456789012345678901234567890',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      expect(result).toEqual(mockPosts);
    });

    it('should get general feed when no user specified', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockPosts),
      });

      const result = await PostService.getFeed();

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3002/api/posts/feed',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      expect(result).toEqual(mockPosts);
    });

    it('should throw an error when getting feed fails', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({ error: 'Failed to fetch feed' }),
      });

      await expect(
        PostService.getFeed(
          '0x1234567890123456789012345678901234567890'
        )
      ).rejects.toThrow('Failed to fetch feed');
    });
  });
});