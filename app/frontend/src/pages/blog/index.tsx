import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { format } from 'date-fns';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  author: string;
  tags: string[];
  slug: string;
}

// Move mock data outside component to ensure it's available during SSR
const mockPosts: BlogPost[] = [
  {
    id: '1',
    title: 'Welcome to LinkDAO Blog',
    excerpt: 'Learn about the latest updates and features in the LinkDAO ecosystem.',
    content: '',
    date: '2024-01-15',
    author: 'LinkDAO Team',
    tags: ['announcement', 'community'],
    slug: 'welcome-to-linkdao-blog'
  },
  {
    id: '2',
    title: 'How to Get Started with LinkDAO',
    excerpt: 'A step-by-step guide for new users to join our decentralized community.',
    content: '',
    date: '2024-01-10',
    author: 'Community Team',
    tags: ['tutorial', 'getting-started'],
    slug: 'how-to-get-started-with-linkdao'
  },
  {
    id: '3',
    title: 'Understanding LDAO Token Economics',
    excerpt: 'Deep dive into the tokenomics and utility of the LDAO token.',
    content: '',
    date: '2024-01-05',
    author: 'Economics Team',
    tags: ['token', 'economics'],
    slug: 'understanding-ldao-token-economics'
  }
];

// Add getStaticProps for static generation
export async function getStaticProps() {
  return {
    props: {
      posts: mockPosts,
    },
    revalidate: 60, // Revalidate at most once per minute
  };
}

const BlogPage: React.FC<{ posts: BlogPost[] }> = ({ posts }) => {
  return (
    <>
      <Head>
        <title>Blog | LinkDAO</title>
        <meta name="description" content="Stay updated with the latest news, tutorials, and insights from LinkDAO." />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-16">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">LinkDAO Blog</h1>
            <p className="text-xl md:text-2xl max-w-3xl">
              Stay updated with the latest news, tutorials, and insights from the LinkDAO ecosystem.
            </p>
          </div>
        </div>

        {/* Blog Content */}
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="md:col-span-2">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Latest Posts</h2>
                
                {posts.length === 0 ? (
                  <div className="bg-white rounded-lg shadow p-6 text-center">
                    <p className="text-gray-500">No blog posts available at the moment. Check back soon!</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {posts.map((post) => (
                      <article key={post.id} className="bg-white rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow">
                        <div className="p-6">
                          <div className="flex flex-wrap gap-2 mb-4">
                            {post.tags.map((tag) => (
                              <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                          
                          <h3 className="text-xl font-bold text-gray-900 mb-2">
                            <Link href={`/blog/${post.slug}`} className="hover:text-blue-600 transition-colors">
                              {post.title}
                            </Link>
                          </h3>
                          
                          <p className="text-gray-600 mb-4">{post.excerpt}</p>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center mr-3">
                                <span className="text-gray-700 font-medium">
                                  {post.author.charAt(0)}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{post.author}</p>
                                <p className="text-sm text-gray-500">
                                  {format(new Date(post.date), 'MMMM d, yyyy')}
                                </p>
                              </div>
                            </div>
                            
                            <Link 
                              href={`/blog/${post.slug}`} 
                              className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center"
                            >
                              Read more
                              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </Link>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Sidebar */}
            <div className="md:col-span-1">
              <div className="bg-white rounded-lg shadow p-6 mb-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Categories</h3>
                <ul className="space-y-2">
                  <li>
                    <Link href="/blog/category/announcements" className="text-gray-600 hover:text-blue-600 transition-colors">
                      Announcements
                    </Link>
                  </li>
                  <li>
                    <Link href="/blog/category/tutorials" className="text-gray-600 hover:text-blue-600 transition-colors">
                      Tutorials
                    </Link>
                  </li>
                  <li>
                    <Link href="/blog/category/community" className="text-gray-600 hover:text-blue-600 transition-colors">
                      Community
                    </Link>
                  </li>
                  <li>
                    <Link href="/blog/category/development" className="text-gray-600 hover:text-blue-600 transition-colors">
                      Development
                    </Link>
                  </li>
                  <li>
                    <Link href="/blog/category/economics" className="text-gray-600 hover:text-blue-600 transition-colors">
                      Token Economics
                    </Link>
                  </li>
                </ul>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Posts</h3>
                <ul className="space-y-4">
                  {posts.slice(0, 3).map((post) => (
                    <li key={post.id}>
                      <Link href={`/blog/${post.slug}`} className="block hover:text-blue-600 transition-colors">
                        <p className="font-medium text-gray-900">{post.title}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {format(new Date(post.date), 'MMMM d, yyyy')}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BlogPage;