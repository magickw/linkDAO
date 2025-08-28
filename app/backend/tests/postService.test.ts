import { PostService } from '../src/services/postService';
import { CreatePostInput, UpdatePostInput } from '../src/models/Post';

// Mock the MetadataService
jest.mock('../src/services/metadataService', () => {
  return {
    MetadataService: jest.fn().mockImplementation(() => ({
      uploadToIPFS: jest.fn().mockImplementation((content) => {
        return Promise.resolve(`Qm${content.replace(/\s+/g, '').substring(0, 10)}`);
      }),
      uploadToArweave: jest.fn().mockResolvedValue('ArweaveTxId'),
      getFromIPFS: jest.fn().mockImplementation((cid) => {
        return Promise.resolve(`Content for ${cid}`);
      }),
      getFromArweave: jest.fn().mockImplementation((txId) => {
        return Promise.resolve(`Content for ${txId}`);
      }),
      pinToIPFS: jest.fn().mockResolvedValue(undefined),
      mirrorToArweave: jest.fn().mockResolvedValue('ArweaveTxId')
    }))
  };
});

describe('PostService', () => {
  let postService: PostService;

  beforeEach(() => {
    // Reset the Jest module registry to force re-import of modules
    jest.resetModules();
    
    // Re-import the module after reset
    const { PostService } = require('../src/services/postService');
    postService = new PostService();
  });

  describe('createPost', () => {
    it('should create a new post successfully', async () => {
      const input: CreatePostInput = {
        author: '0x1234567890123456789012345678901234567890',
        content: 'This is a test post',
        media: ['image1.jpg', 'image2.jpg'],
        tags: ['test', 'post'],
        onchainRef: '0xPostRef123'
      };

      const post = await postService.createPost(input);

      expect(post).toBeDefined();
      expect(post.id).toBeDefined();
      expect(post.author).toBe(input.author);
      expect(post.parentId).toBeNull();
      expect(post.contentCid).toBe('QmThisisates'); // "Thisisatest" truncated to 10 chars
      expect(post.mediaCids).toHaveLength(2);
      expect(post.mediaCids[0]).toBe('Qmimage1.jpg'); // "image1.jpg" truncated to 10 chars
      expect(post.mediaCids[1]).toBe('Qmimage2.jpg'); // "image2.jpg" truncated to 10 chars
      expect(post.tags).toEqual(input.tags);
      expect(post.createdAt).toBeInstanceOf(Date);
      expect(post.onchainRef).toBe(input.onchainRef);
    });

    it('should create a new post with a parent ID', async () => {
      const input: CreatePostInput = {
        author: '0x1234567890123456789012345678901234567890',
        parentId: 'post_1',
        content: 'This is a reply',
        tags: ['reply']
      };

      const post = await postService.createPost(input);

      expect(post.parentId).toBe(input.parentId);
    });
  });

  describe('getPostById', () => {
    it('should return a post when given a valid ID', async () => {
      const input: CreatePostInput = {
        author: '0x1234567890123456789012345678901234567890',
        content: 'This is a test post'
      };

      const createdPost = await postService.createPost(input);
      const retrievedPost = await postService.getPostById(createdPost.id);

      expect(retrievedPost).toBeDefined();
      expect(retrievedPost).toEqual(createdPost);
    });

    it('should return undefined when given an invalid ID', async () => {
      const post = await postService.getPostById('invalid-id');
      expect(post).toBeUndefined();
    });
  });

  describe('getPostsByAuthor', () => {
    it('should return all posts by a specific author', async () => {
      // Reset modules and re-import
      jest.resetModules();
      const { PostService } = require('../src/services/postService');
      postService = new PostService();
      
      const author1 = '0x1234567890123456789012345678901234567890';
      const author2 = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

      const input1: CreatePostInput = {
        author: author1,
        content: 'Post by author 1'
      };

      const input2: CreatePostInput = {
        author: author2,
        content: 'Post by author 2'
      };

      const input3: CreatePostInput = {
        author: author1,
        content: 'Another post by author 1'
      };

      await postService.createPost(input1);
      await postService.createPost(input2);
      await postService.createPost(input3);

      const postsResult = await postService.getPostsByAuthor(author1);

      expect(postsResult).toHaveLength(2);
      expect(postsResult.every(post => post.author === author1)).toBe(true);
    });

    it('should return an empty array when an author has no posts', async () => {
      // Reset modules and re-import
      jest.resetModules();
      const { PostService } = require('../src/services/postService');
      postService = new PostService();
      
      const author = '0x1234567890123456789012345678901234567890';
      const postsResult = await postService.getPostsByAuthor(author);
      expect(postsResult).toHaveLength(0);
    });
  });

  describe('getPostsByTag', () => {
    it('should return all posts with a specific tag', async () => {
      // Reset modules and re-import
      jest.resetModules();
      const { PostService } = require('../src/services/postService');
      postService = new PostService();
      
      const input1: CreatePostInput = {
        author: '0x1234567890123456789012345678901234567890',
        content: 'Post with tag1',
        tags: ['tag1']
      };

      const input2: CreatePostInput = {
        author: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        content: 'Post with tag2',
        tags: ['tag2']
      };

      const input3: CreatePostInput = {
        author: '0x1111111111111111111111111111111111111111',
        content: 'Post with both tags',
        tags: ['tag1', 'tag2']
      };

      await postService.createPost(input1);
      await postService.createPost(input2);
      await postService.createPost(input3);

      const posts = await postService.getPostsByTag('tag1');

      expect(posts).toHaveLength(2);
      expect(posts.some(post => post.tags.includes('tag1'))).toBe(true);
    });

    it('should return an empty array when no posts have the specified tag', async () => {
      // Reset modules and re-import
      jest.resetModules();
      const { PostService } = require('../src/services/postService');
      postService = new PostService();
      
      const postsResult = await postService.getPostsByTag('nonexistent-tag');
      expect(postsResult).toHaveLength(0);
    });
  });

  describe('updatePost', () => {
    it('should update a post successfully', async () => {
      const input: CreatePostInput = {
        author: '0x1234567890123456789012345678901234567890',
        content: 'Original content',
        media: ['original.jpg'],
        tags: ['original']
      };

      const createdPost = await postService.createPost(input);
      
      const updateInput: UpdatePostInput = {
        content: 'Updated content',
        media: ['updated.jpg'],
        tags: ['updated']
      };

      const updatedPost = await postService.updatePost(createdPost.id, updateInput);

      expect(updatedPost).toBeDefined();
      expect(updatedPost?.id).toBe(createdPost.id);
      expect(updatedPost?.author).toBe(createdPost.author);
      expect(updatedPost?.contentCid).toBe('QmUpdatedcon'); // "Updatedcon" truncated to 10 chars
      expect(updatedPost?.mediaCids).toHaveLength(1);
      expect(updatedPost?.mediaCids[0]).toBe('Qmupdated.jp'); // "updated.jpg" truncated to 10 chars
      expect(updatedPost?.tags).toEqual(updateInput.tags);
      expect(updatedPost?.createdAt).toEqual(createdPost.createdAt);
    });

    it('should return undefined when trying to update a non-existent post', async () => {
      const updateInput: UpdatePostInput = {
        content: 'Updated content'
      };

      const updatedPost = await postService.updatePost('invalid-id', updateInput);
      expect(updatedPost).toBeUndefined();
    });
  });

  describe('deletePost', () => {
    it('should delete a post successfully', async () => {
      const input: CreatePostInput = {
        author: '0x1234567890123456789012345678901234567890',
        content: 'Post to delete'
      };

      const createdPost = await postService.createPost(input);
      const deleted = await postService.deletePost(createdPost.id);

      expect(deleted).toBe(true);

      // Verify the post is deleted
      const retrievedPost = await postService.getPostById(createdPost.id);
      expect(retrievedPost).toBeUndefined();
    });

    it('should return false when trying to delete a non-existent post', async () => {
      const deleted = await postService.deletePost('invalid-id');
      expect(deleted).toBe(false);
    });
  });

  describe('getAllPosts', () => {
    it('should return all posts', async () => {
      // Reset modules and re-import
      jest.resetModules();
      const { PostService } = require('../src/services/postService');
      postService = new PostService();
      
      const input1: CreatePostInput = {
        author: '0x1234567890123456789012345678901234567890',
        content: 'First post'
      };

      const input2: CreatePostInput = {
        author: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        content: 'Second post'
      };

      await postService.createPost(input1);
      await postService.createPost(input2);

      const postsResult = await postService.getAllPosts();

      expect(postsResult).toHaveLength(2);
      expect(postsResult[0].contentCid).toBe('QmFirstpost'); // "Firstpost" truncated to 10 chars
      expect(postsResult[1].contentCid).toBe('QmSecondpost'); // "Secondpost" truncated to 10 chars
    });

    it('should return an empty array when there are no posts', async () => {
      // Reset modules and re-import
      jest.resetModules();
      const { PostService } = require('../src/services/postService');
      postService = new PostService();
      
      const postsResult = await postService.getAllPosts();
      expect(postsResult).toHaveLength(0);
    });
  });

  describe('getFeed', () => {
    it('should return all posts sorted by creation time (newest first)', async () => {
      // Reset modules and re-import
      jest.resetModules();
      const { PostService } = require('../src/services/postService');
      postService = new PostService();
      
      const input1: CreatePostInput = {
        author: '0x1234567890123456789012345678901234567890',
        content: 'First post'
      };

      const input2: CreatePostInput = {
        author: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        content: 'Second post'
      };

      // Create posts with a delay to ensure different creation times
      const post1 = await postService.createPost(input1);
      await new Promise(resolve => setTimeout(resolve, 10));
      const post2 = await postService.createPost(input2);

      const feed = await postService.getFeed();

      expect(feed).toHaveLength(2);
      expect(feed[0].id).toBe(post2.id); // Newest post first
      expect(feed[1].id).toBe(post1.id); // Older post second
    });

    it('should return an empty array when there are no posts', async () => {
      // Reset modules and re-import
      jest.resetModules();
      const { PostService } = require('../src/services/postService');
      postService = new PostService();
      
      const feed = await postService.getFeed();
      expect(feed).toHaveLength(0);
    });
  });
});