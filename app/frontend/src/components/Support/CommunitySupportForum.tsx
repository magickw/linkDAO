import React, { useState } from 'react';
import { 
  Users, 
  MessageSquare, 
  ThumbsUp, 
  ThumbsDown, 
  Share2, 
  Bookmark, 
  MoreHorizontal,
  Search,
  Filter,
  TrendingUp,
  Clock,
  Award,
  Check
} from 'lucide-react';

interface ForumPost {
  id: string;
  title: string;
  content: string;
  author: {
    name: string;
    avatar: string;
    reputation: number;
  };
  createdAt: Date;
  category: string;
  replies: number;
  views: number;
  upvotes: number;
  isResolved: boolean;
  tags: string[];
}

interface ForumCategory {
  id: string;
  name: string;
  description: string;
  postCount: number;
  color: string;
}

const CommunitySupportForum: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [bookmarkedPosts, setBookmarkedPosts] = useState<string[]>([]);

  // Mock data - in a real implementation, this would come from an API
  const categories: ForumCategory[] = [
    { id: 'all', name: 'All Topics', description: 'All community discussions', postCount: 1248, color: 'blue' },
    { id: 'tokens', name: 'LDAO Tokens', description: 'Questions about tokens and staking', postCount: 342, color: 'green' },
    { id: 'wallet', name: 'Wallet Issues', description: 'Wallet connection and setup help', postCount: 287, color: 'purple' },
    { id: 'marketplace', name: 'Marketplace', description: 'Buying, selling, and listings', postCount: 198, color: 'orange' },
    { id: 'governance', name: 'Governance', description: 'DAO proposals and voting', postCount: 156, color: 'red' },
    { id: 'technical', name: 'Technical', description: 'Smart contracts and development', postCount: 265, color: 'gray' }
  ];

  const posts: ForumPost[] = [
    {
      id: '1',
      title: 'Having trouble with MetaMask connection',
      content: 'I keep getting an error when trying to connect my MetaMask wallet to LinkDAO. Has anyone else experienced this?',
      author: {
        name: 'Alex Johnson',
        avatar: '',
        reputation: 124
      },
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      category: 'wallet',
      replies: 5,
      views: 42,
      upvotes: 8,
      isResolved: false,
      tags: ['metamask', 'connection', 'error']
    },
    {
      id: '2',
      title: 'Best practices for staking LDAO tokens',
      content: 'I\'m new to staking and want to make sure I\'m doing it correctly. What are the best practices everyone recommends?',
      author: {
        name: 'Maria Garcia',
        avatar: '',
        reputation: 876
      },
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
      category: 'tokens',
      replies: 12,
      views: 124,
      upvotes: 24,
      isResolved: true,
      tags: ['staking', 'best-practices', 'security']
    },
    {
      id: '3',
      title: 'How to list an NFT on the marketplace?',
      content: 'I\'m trying to list my NFT collection but can\'t find the option. Can someone guide me through the process?',
      author: {
        name: 'James Wilson',
        avatar: '',
        reputation: 45
      },
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      category: 'marketplace',
      replies: 3,
      views: 78,
      upvotes: 5,
      isResolved: false,
      tags: ['nft', 'listing', 'marketplace']
    },
    {
      id: '4',
      title: 'Understanding the new governance proposal',
      content: 'Can someone explain the implications of the latest governance proposal? I want to make an informed vote.',
      author: {
        name: 'Sarah Chen',
        avatar: '',
        reputation: 512
      },
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      category: 'governance',
      replies: 18,
      views: 256,
      upvotes: 42,
      isResolved: false,
      tags: ['governance', 'proposal', 'voting']
    }
  ];

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    if (sortBy === 'recent') {
      return b.createdAt.getTime() - a.createdAt.getTime();
    } else if (sortBy === 'popular') {
      return b.upvotes - a.upvotes;
    } else if (sortBy === 'replies') {
      return b.replies - a.replies;
    }
    return 0;
  });

  const toggleBookmark = (postId: string) => {
    setBookmarkedPosts(prev => {
      if (prev.includes(postId)) {
        return prev.filter(id => id !== postId);
      } else {
        return [...prev, postId];
      }
    });
  };

  const getCategoryColor = (category: string) => {
    const cat = categories.find(c => c.id === category);
    return cat ? cat.color : 'gray';
  };

  const getCategoryBadgeClass = (color: string) => {
    switch (color) {
      case 'blue': return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-2 bg-blue-100 text-blue-800';
      case 'green': return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-2 bg-green-100 text-green-800';
      case 'purple': return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-2 bg-purple-100 text-purple-800';
      case 'orange': return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-2 bg-orange-100 text-orange-800';
      case 'red': return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-2 bg-red-100 text-red-800';
      default: return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-2 bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Users className="w-6 h-6 mr-2 text-blue-600" />
              Community Support Forum
            </h2>
            <p className="text-gray-600 mt-1">Connect with other users and get help from the community</p>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
            New Post
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              id="community-search"
              type="text"
              placeholder="Search community discussions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Search community discussions"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              id="category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Select category"
            >
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name} ({category.postCount})
                </option>
              ))}
            </select>
            
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Sort posts"
            >
              <option value="recent">Most Recent</option>
              <option value="popular">Most Popular</option>
              <option value="replies">Most Replies</option>
            </select>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-wrap gap-3">
          {categories.filter(cat => cat.id !== 'all').map(category => {
            const isSelected = selectedCategory === category.id;
            const getCategoryClasses = (color: string, selected: boolean) => {
              if (selected) {
                switch (color) {
                  case 'blue': return 'flex items-center px-4 py-2 rounded-full text-sm font-medium transition-colors bg-blue-100 text-blue-800 border border-blue-200';
                  case 'green': return 'flex items-center px-4 py-2 rounded-full text-sm font-medium transition-colors bg-green-100 text-green-800 border border-green-200';
                  case 'purple': return 'flex items-center px-4 py-2 rounded-full text-sm font-medium transition-colors bg-purple-100 text-purple-800 border border-purple-200';
                  case 'orange': return 'flex items-center px-4 py-2 rounded-full text-sm font-medium transition-colors bg-orange-100 text-orange-800 border border-orange-200';
                  case 'red': return 'flex items-center px-4 py-2 rounded-full text-sm font-medium transition-colors bg-red-100 text-red-800 border border-red-200';
                  default: return 'flex items-center px-4 py-2 rounded-full text-sm font-medium transition-colors bg-gray-100 text-gray-800 border border-gray-200';
                }
              }
              return 'flex items-center px-4 py-2 rounded-full text-sm font-medium transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200';
            };

            const getDotClass = (color: string) => {
              switch (color) {
                case 'blue': return 'w-2 h-2 rounded-full bg-blue-500 mr-2';
                case 'green': return 'w-2 h-2 rounded-full bg-green-500 mr-2';
                case 'purple': return 'w-2 h-2 rounded-full bg-purple-500 mr-2';
                case 'orange': return 'w-2 h-2 rounded-full bg-orange-500 mr-2';
                case 'red': return 'w-2 h-2 rounded-full bg-red-500 mr-2';
                default: return 'w-2 h-2 rounded-full bg-gray-500 mr-2';
              }
            };

            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={getCategoryClasses(category.color, isSelected)}
                aria-pressed={isSelected}
                aria-label={`Select ${category.name} category`}
              >
                <span className={getDotClass(category.color)}></span>
                {category.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Posts List */}
      <div className="divide-y divide-gray-200">
        {filteredPosts.length > 0 ? (
          filteredPosts.map(post => (
            <div key={post.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex">
                {/* Vote Section */}
                <div className="flex flex-col items-center mr-4">
                  <button 
                    className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                    aria-label={`Upvote ${post.title}`}
                    title="Upvote this post"
                  >
                    <ThumbsUp className="w-5 h-5" />
                  </button>
                  <span className="text-sm font-medium text-gray-900 my-1">{post.upvotes}</span>
                  <span className="sr-only">{post.upvotes} upvotes</span>
                  <button 
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    aria-label={`Downvote ${post.title}`}
                    title="Downvote this post"
                  >
                    <ThumbsDown className="w-5 h-5" />
                  </button>
                </div>

                {/* Post Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center mb-2">
                        <span className={getCategoryBadgeClass(getCategoryColor(post.category))}>
                          {categories.find(c => c.id === post.category)?.name}
                        </span>
                        {post.isResolved && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-2">
                            <Check className="w-3 h-3 mr-1" />
                            Resolved
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-blue-600 cursor-pointer">
                        {post.title}
                      </h3>
                      <p className="text-gray-600 mb-3 line-clamp-2">{post.content}</p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {post.tags.map(tag => (
                          <span key={tag} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleBookmark(post.id)}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      {bookmarkedPosts.includes(post.id) ? (
                        <Bookmark className="w-5 h-5 text-blue-600 fill-current" />
                      ) : (
                        <Bookmark className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  {/* Post Meta */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-700 mr-2">
                        {post.author.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{post.author.name}</div>
                        <div className="flex items-center text-xs text-gray-500">
                          <span>{post.author.reputation} rep</span>
                          <span className="mx-2">•</span>
                          <span>{formatDate(post.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <MessageSquare className="w-4 h-4 mr-1" />
                        {post.replies} replies
                      </div>
                      <div className="flex items-center">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        {post.views} views
                      </div>
                      <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No discussions found</h3>
            <p className="text-gray-600 mb-4">Try adjusting your search or filter criteria</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Forum Stats */}
      <div className="p-6 bg-gray-50 border-t border-gray-200 rounded-b-xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg mr-3">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Active Members</p>
              <p className="text-lg font-semibold text-gray-900">2,487</p>
            </div>
          </div>
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg mr-3">
              <MessageSquare className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Posts</p>
              <p className="text-lg font-semibold text-gray-900">5,124</p>
            </div>
          </div>
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg mr-3">
              <Award className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Helpful Votes</p>
              <p className="text-lg font-semibold text-gray-900">18,742</p>
            </div>
          </div>
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg mr-3">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. Response</p>
              <p className="text-lg font-semibold text-gray-900">1.8h</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunitySupportForum;