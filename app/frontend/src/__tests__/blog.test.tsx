import React from 'react';
import { render, screen } from '@testing-library/react';
import BlogPage from '../pages/blog/index';
import BlogPostPage from '../pages/blog/[slug]';
import BlogCategoryPage from '../pages/blog/category/[category]';

// Mock data for testing
const mockPosts = [
  {
    id: '1',
    title: 'Test Blog Post',
    excerpt: 'This is a test blog post.',
    content: 'This is the full content of the test blog post.',
    date: '2024-01-15',
    author: 'Test Author',
    tags: ['test', 'blog'],
    slug: 'test-blog-post'
  }
];

describe('Blog Pages', () => {
  test('renders blog index page', () => {
    render(<BlogPage posts={mockPosts} />);
    
    // Check if the page title is rendered
    expect(screen.getByText('LinkDAO Blog')).toBeInTheDocument();
    
    // Check if blog posts are rendered
    expect(screen.getByText('Test Blog Post')).toBeInTheDocument();
    expect(screen.getByText('This is a test blog post.')).toBeInTheDocument();
  });

  test('renders blog post page', () => {
    render(
      <BlogPostPage 
        post={mockPosts[0]} 
        relatedPosts={[]} 
      />
    );
    
    // Check if the post title is rendered
    expect(screen.getByText('Test Blog Post')).toBeInTheDocument();
    
    // Check if the post content is rendered
    expect(screen.getByText('This is the full content of the test blog post.')).toBeInTheDocument();
  });

  test('renders blog category page', () => {
    render(
      <BlogCategoryPage 
        category="test"
        categoryName="Test Category"
        posts={mockPosts}
      />
    );
    
    // Check if the category title is rendered
    expect(screen.getByText('Test Category')).toBeInTheDocument();
    
    // Check if blog posts are rendered
    expect(screen.getByText('Test Blog Post')).toBeInTheDocument();
  });
});