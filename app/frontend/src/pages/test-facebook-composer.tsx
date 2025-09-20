import React from 'react';
import FacebookStylePostComposer from '@/components/FacebookStylePostComposer';
import { CreatePostInput } from '@/models/Post';

export default function TestFacebookComposer() {
  const handleSubmit = async (postData: CreatePostInput) => {
    console.log('Post submitted:', postData);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    alert(`Post created successfully!\n\nContent: ${postData.content}\nTags: ${postData.tags?.join(', ') || 'None'}\nMedia: ${postData.media?.length || 0} files`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
          Enhanced Facebook-Style Post Composer
        </h1>
        
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Features Implemented:
            </h2>
            <ul className="space-y-2 text-gray-600 dark:text-gray-300">
              <li>✅ Removed separate tags input field and Tag button</li>
              <li>✅ Hashtag creation with # in text input (e.g., #web3 #blockchain)</li>
              <li>✅ Functional Video button (uploads video files)</li>
              <li>✅ Functional Link button (adds link input field)</li>
              <li>✅ Functional Feeling button (adds feeling input field)</li>
              <li>✅ Functional Location button (adds location input field)</li>
              <li>✅ Working Cancel button (clears all inputs)</li>
              <li>✅ Working Post button (submits with hashtags extracted)</li>
              <li>✅ Visual hashtag preview when typing</li>
              <li>✅ Support for both images and videos</li>
            </ul>
          </div>

          <FacebookStylePostComposer
            onSubmit={handleSubmit}
            isLoading={false}
            userName="Test User"
            className="shadow-lg"
          />

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              How to test:
            </h3>
            <ol className="list-decimal list-inside space-y-1 text-blue-800 dark:text-blue-200 text-sm">
              <li>Click in the text area to expand the composer</li>
              <li>Type some text with hashtags like: "Hello #web3 world! #blockchain is amazing"</li>
              <li>Click Video to upload video files</li>
              <li>Click Link to add a URL</li>
              <li>Click Feeling to add how you're feeling</li>
              <li>Click Location to add where you are</li>
              <li>See hashtags appear as badges below the text</li>
              <li>Click Post to submit (check console for output)</li>
              <li>Click Cancel to clear everything</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}