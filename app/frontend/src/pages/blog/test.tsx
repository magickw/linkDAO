import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

const BlogTestPage: React.FC = () => {
  return (
    <>
      <Head>
        <title>Blog Test | LinkDAO</title>
        <meta name="description" content="Test page for the LinkDAO blog implementation" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-12">
          <div className="bg-white rounded-lg shadow p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Blog Test Page</h1>
            <p className="text-gray-600 mb-8">
              This is a test page to verify the blog implementation is working correctly.
            </p>
            
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Blog Pages</h2>
                <ul className="space-y-2">
                  <li>
                    <Link href="/blog" className="text-blue-600 hover:text-blue-800 underline">
                      Blog Index Page
                    </Link>
                  </li>
                  <li>
                    <Link href="/blog/welcome-to-linkdao-blog" className="text-blue-600 hover:text-blue-800 underline">
                      Sample Blog Post
                    </Link>
                  </li>
                  <li>
                    <Link href="/blog/category/announcements" className="text-blue-600 hover:text-blue-800 underline">
                      Category Page (Announcements)
                    </Link>
                  </li>
                </ul>
              </div>
              
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Implementation Notes</h2>
                <ul className="list-disc pl-5 space-y-2 text-gray-600">
                  <li>All blog pages have been updated to handle SSR properly</li>
                  <li>Mock data is available statically for all pages</li>
                  <li>Navigation between blog pages works correctly</li>
                  <li>Blog link has been added to the main navigation</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BlogTestPage;