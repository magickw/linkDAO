import { useState, useEffect, useCallback } from 'react';
import { PostService } from '../services/postService';
import { Post, CreatePostInput } from '../models/Post';

/**
 * Custom hook to fetch user feed
 * @param forUser - User address to get feed for (optional)
 * @returns Object containing feed data, loading state, and error
 */
export const useFeed = (forUser?: string) => {
  const [feed, setFeed] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeed = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedFeed = await PostService.getFeed(forUser);
        setFeed(fetchedFeed);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch feed');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeed();
  }, [forUser]);

  return { feed, isLoading, error };
};

/**
 * Custom hook to create a new post
 * @returns Object containing create function, loading state, and error
 */
export const useCreatePost = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const createPost = useCallback(async (data: CreatePostInput) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      const post = await PostService.createPost(data);
      setSuccess(true);
      return post;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { createPost, isLoading, error, success };
};

/**
 * Custom hook to fetch posts by author
 * @param author - Author address
 * @returns Object containing posts data, loading state, and error
 */
export const usePostsByAuthor = (author: string) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!author) {
      setPosts([]);
      return;
    }

    const fetchPosts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedPosts = await PostService.getPostsByAuthor(author);
        setPosts(fetchedPosts);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch posts');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, [author]);

  return { posts, isLoading, error };
};