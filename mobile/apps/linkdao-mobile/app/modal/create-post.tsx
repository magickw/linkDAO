/**
 * Create Post Modal
 * Uses the enhanced post composer for full-featured post creation
 */

import { router } from 'expo-router';
import { usePostsStore } from '../../src/store';
import { postsService } from '../../src/services';
import EnhancedPostComposer from '../../src/components/EnhancedPostComposer';

export default function CreatePostModal() {
  const addPost = usePostsStore((state) => state.addPost);

  const handleSubmit = async (postData: any) => {
    try {
      const newPost = await postsService.createPost(postData);

      if (newPost) {
        addPost(newPost);
        router.back();
      }
    } catch (error) {
      console.error('Failed to create post:', error);
      throw error;
    }
  };

  const handleClose = () => {
    router.back();
  };

  return (
    <EnhancedPostComposer
      visible={true}
      onClose={handleClose}
      onSubmit={handleSubmit}
    />
  );
}