import React, { useState } from 'react';
import Layout from '@/components/Layout';
import PostCreationModal from '@/components/PostCreationModal';
import { CreatePostInput } from '@/models/Post';

export default function TestRichTextModal() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (postData: CreatePostInput) => {
    setIsLoading(true);
    console.log('Post data submitted:', postData);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsLoading(false);
    alert('Post created successfully!');
  };

  return (
    <Layout title="Test Rich Text Modal">
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Rich Text Post Creation Modal Test
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
              Test the enhanced post creation modal with rich text editor, polls, and proposals.
            </p>
            
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Open Post Creation Modal
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Features to Test:
            </h2>
            <ul className="space-y-2 text-gray-600 dark:text-gray-300">
              <li>• <strong>Text Posts:</strong> Rich text editor with markdown support, formatting toolbar, and live preview</li>
              <li>• <strong>Poll Creation:</strong> Token-weighted voting, multiple choice options, custom voting periods</li>
              <li>• <strong>Governance Proposals:</strong> Templates for different proposal types, voting parameters</li>
              <li>• <strong>Media Posts:</strong> File upload with rich text captions</li>
              <li>• <strong>Link Posts:</strong> URL sharing with rich text descriptions</li>
              <li>• <strong>Content Validation:</strong> Real-time validation based on content type</li>
              <li>• <strong>Auto-save:</strong> Draft management and recovery</li>
            </ul>
          </div>

          <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Rich Text Editor Features:
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-300">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Formatting:</h3>
                <ul className="space-y-1">
                  <li>• Bold (Ctrl+B)</li>
                  <li>• Italic (Ctrl+I)</li>
                  <li>• Underline (Ctrl+U)</li>
                  <li>• Strikethrough</li>
                  <li>• Inline code (Ctrl+`)</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Structure:</h3>
                <ul className="space-y-1">
                  <li>• Headers (H1, H2, H3)</li>
                  <li>• Bullet lists</li>
                  <li>• Numbered lists</li>
                  <li>• Blockquotes</li>
                  <li>• Code blocks</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Media:</h3>
                <ul className="space-y-1">
                  <li>• Links (Ctrl+K)</li>
                  <li>• Images</li>
                  <li>• Live preview</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Usability:</h3>
                <ul className="space-y-1">
                  <li>• Auto-resize textarea</li>
                  <li>• Character counter</li>
                  <li>• Keyboard shortcuts</li>
                  <li>• Selection tracking</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PostCreationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </Layout>
  );
}