import React, { useState } from 'react';
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
    content: `# Welcome to LinkDAO Blog

Welcome to our new blog! This is where we'll be sharing updates, tutorials, and insights about the LinkDAO ecosystem.

## What is LinkDAO?

LinkDAO is a decentralized community platform that empowers users to connect, collaborate, and create value together. Our platform combines the power of blockchain technology with user-friendly interfaces to create a seamless experience for everyone.

## What You'll Find Here

On this blog, you'll find:
- Product announcements and updates
- Tutorials and how-to guides
- Community spotlights
- Technical deep-dives
- Industry insights and analysis

## Stay Connected

Make sure to bookmark this page and check back regularly for new content. You can also subscribe to our newsletter to get blog posts delivered directly to your inbox.

Thank you for being part of the LinkDAO community!`,
    date: '2024-01-15',
    author: 'LinkDAO Team',
    tags: ['announcement', 'community'],
    slug: 'welcome-to-linkdao-blog'
  },
  {
    id: '2',
    title: 'How to Get Started with LinkDAO',
    excerpt: 'A step-by-step guide for new users to join our decentralized community.',
    content: `# How to Get Started with LinkDAO

Getting started with LinkDAO is easy! Follow this step-by-step guide to join our decentralized community.

## Step 1: Set Up Your Wallet

Before you can join LinkDAO, you'll need a cryptocurrency wallet. We recommend using MetaMask, which is compatible with most browsers.

1. Download the MetaMask extension for your browser
2. Create a new wallet or import an existing one
3. Make sure to securely store your recovery phrase

## Step 2: Connect to LinkDAO

1. Visit [linkdao.io](https://linkdao.io)
2. Click on the "Connect Wallet" button in the top right corner
3. Select MetaMask from the options
4. Confirm the connection in your wallet

## Step 3: Create Your Profile

1. Click on your wallet address in the top right corner
2. Select "Profile" from the dropdown menu
3. Fill in your profile information
4. Add a profile picture and bio

## Step 4: Explore Communities

1. Visit the Communities page
2. Browse existing communities or create your own
3. Join communities that interest you
4. Start participating in discussions

## Need Help?

If you run into any issues, check out our [Help Center](/support) or reach out to our community moderators for assistance.`,
    date: '2024-01-10',
    author: 'Community Team',
    tags: ['tutorial', 'getting-started'],
    slug: 'how-to-get-started-with-linkdao'
  },
  {
    id: '3',
    title: 'Understanding LDAO Token Economics',
    excerpt: 'Deep dive into the tokenomics and utility of the LDAO token.',
    content: `# Understanding LDAO Token Economics

The LDAO token is at the heart of the LinkDAO ecosystem. In this post, we'll explore how the token works and its various use cases.

## Token Utility

The LDAO token serves multiple purposes within our ecosystem:

1. **Governance**: Token holders can participate in platform governance decisions
2. **Staking**: Users can stake tokens to earn rewards
3. **Access**: Certain premium features require LDAO tokens
4. **Rewards**: Active community members are rewarded with LDAO tokens

## Supply and Distribution

- Total Supply: 1,000,000,000 LDAO
- Circulating Supply: 450,000,000 LDAO
- Token Standard: ERC-20

## Emission Schedule

New LDAO tokens are minted according to our emission schedule:

- Year 1: 100,000,000 tokens
- Year 2: 80,000,000 tokens
- Year 3: 60,000,000 tokens
- Year 4+: 40,000,000 tokens annually

## Staking Rewards

Users can stake their LDAO tokens to earn additional rewards:

- Annual Percentage Rate (APR): Up to 12%
- Rewards distributed weekly
- Flexible staking - unstake at any time

## Governance Participation

Token holders can participate in governance by:

1. Creating proposals
2. Voting on existing proposals
3. Delegating voting power to trusted community members

Each LDAO token represents one vote in governance decisions.`,
    date: '2024-01-05',
    author: 'Economics Team',
    tags: ['token', 'economics'],
    slug: 'understanding-ldao-token-economics'
  }
];

// Add getStaticPaths for static generation
export async function getStaticPaths() {
  const paths = mockPosts.map((post) => ({
    params: { slug: post.slug },
  }));

  return { paths, fallback: true };
}

// Add getStaticProps for static generation
export async function getStaticProps({ params }: { params: { slug: string } }) {
  const post = mockPosts.find((p) => p.slug === params.slug) || null;
  
  // Set related posts (excluding current post)
  const relatedPosts = post 
    ? mockPosts.filter((p) => p.slug !== params.slug).slice(0, 2)
    : [];

  return {
    props: {
      post,
      relatedPosts,
    },
    revalidate: 60, // Revalidate at most once per minute
  };
}

const BlogPostPage: React.FC<{ post: BlogPost | null; relatedPosts: BlogPost[] }> = ({ post, relatedPosts }) => {
  // Handle loading state for when router is not ready
  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Post Not Found</h1>
          <p className="text-gray-600 mb-6">The blog post you're looking for doesn't exist.</p>
          <Link 
            href="/blog" 
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{post.title} | LinkDAO Blog</title>
        <meta name="description" content={post.excerpt} />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Breadcrumb */}
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-3">
            <nav className="text-sm">
              <Link href="/" className="text-gray-500 hover:text-gray-700">Home</Link>
              <span className="text-gray-400 mx-2">/</span>
              <Link href="/blog" className="text-gray-500 hover:text-gray-700">Blog</Link>
              <span className="text-gray-400 mx-2">/</span>
              <span className="text-gray-900">{post.title}</span>
            </nav>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="md:col-span-2">
              <article className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-6 md:p-8">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {post.tags.map((tag) => (
                      <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                  
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{post.title}</h1>
                  
                  <div className="flex items-center mb-8">
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center mr-3">
                      <span className="text-gray-700 font-medium">
                        {post.author.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{post.author}</p>
                      <p className="text-gray-500">
                        {format(new Date(post.date), 'MMMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="prose max-w-none">
                    {post.content.split('\n\n').map((paragraph, index) => {
                      if (paragraph.startsWith('# ')) {
                        return <h2 key={index} className="text-2xl font-bold text-gray-900 mt-8 mb-4">{paragraph.substring(2)}</h2>;
                      } else if (paragraph.startsWith('## ')) {
                        return <h3 key={index} className="text-xl font-bold text-gray-900 mt-6 mb-3">{paragraph.substring(3)}</h3>;
                      } else if (paragraph.startsWith('### ')) {
                        return <h4 key={index} className="text-lg font-bold text-gray-900 mt-4 mb-2">{paragraph.substring(4)}</h4>;
                      } else if (paragraph.startsWith('- ')) {
                        return (
                          <ul key={index} className="list-disc pl-5 mb-4">
                            {paragraph.split('\n').map((item, i) => (
                              <li key={i} className="mb-1">{item.substring(2)}</li>
                            ))}
                          </ul>
                        );
                      } else {
                        return <p key={index} className="text-gray-700 mb-4">{paragraph}</p>;
                      }
                    })}
                  </div>
                </div>
              </article>
              
              {/* Related Posts */}
              {relatedPosts.length > 0 && (
                <div className="mt-12">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Posts</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {relatedPosts.map((relatedPost) => (
                      <article key={relatedPost.id} className="bg-white rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow">
                        <div className="p-6">
                          <div className="flex flex-wrap gap-2 mb-3">
                            {relatedPost.tags.map((tag) => (
                              <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                          
                          <h3 className="text-lg font-bold text-gray-900 mb-2">
                            <Link href={`/blog/${relatedPost.slug}`} className="hover:text-blue-600 transition-colors">
                              {relatedPost.title}
                            </Link>
                          </h3>
                          
                          <p className="text-gray-600 text-sm mb-4">{relatedPost.excerpt}</p>
                          
                          <Link 
                            href={`/blog/${relatedPost.slug}`} 
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                          >
                            Read more
                          </Link>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Sidebar */}
            <div className="md:col-span-1">
              <div className="bg-white rounded-lg shadow p-6 mb-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4">About the Author</h3>
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center mr-4">
                    <span className="text-gray-700 font-medium">
                      {post.author.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{post.author}</p>
                    <p className="text-sm text-gray-500">LinkDAO Team Member</p>
                  </div>
                </div>
                <p className="mt-4 text-gray-600 text-sm">
                  The {post.author} is dedicated to creating valuable content for the LinkDAO community.
                </p>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Share this Post</h3>
                <div className="flex space-x-4">
                  <a href="#" className="text-gray-400 hover:text-blue-600 transition-colors">
                    <span className="sr-only">Share on Twitter</span>
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                    </svg>
                  </a>
                  <a href="#" className="text-gray-400 hover:text-blue-800 transition-colors">
                    <span className="sr-only">Share on Facebook</span>
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                    </svg>
                  </a>
                  <a href="#" className="text-gray-400 hover:text-red-600 transition-colors">
                    <span className="sr-only">Share on Reddit</span>
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BlogPostPage;