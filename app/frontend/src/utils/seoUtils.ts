/**
 * SEO Utility Functions
 * 
 * This module provides utility functions for generating SEO metadata,
 * structured data, and optimizing content for search engines.
 */

// Default SEO configuration
export const SEO_CONFIG = {
  DEFAULT_TITLE: 'LinkDAO - The Web3 Social Network',
  DEFAULT_DESCRIPTION: 'Join the future of social networking. Own your data, earn from your content, and shape the platform through decentralized governance.',
  DEFAULT_IMAGE: '/images/linkdao-social-preview.png',
  DEFAULT_URL: 'https://linkdao.io',
  DEFAULT_KEYWORDS: 'Web3, social network, decentralized, blockchain, DAO, cryptocurrency, NFT, DeFi',
  MAX_TITLE_LENGTH: 60,
  MAX_DESCRIPTION_LENGTH: 160,
  MAX_KEYWORDS_LENGTH: 255
};

// Truncate text to specified length
export const truncateText = (text: string, maxLength: number): string => {
  if (!text) return '';
  return text.length > maxLength ? `${text.substring(0, maxLength - 3)}...` : text;
};

// Generate canonical URL
export const generateCanonicalUrl = (path: string): string => {
  const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || SEO_CONFIG.DEFAULT_URL;
  return `${baseUrl}${path}`;
};

// Generate Open Graph image URL
export const generateOGImageUrl = (title: string, type: string = 'default'): string => {
  // In a real implementation, this would generate a dynamic image
  // For now, we'll return a static image with query parameters
  const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || SEO_CONFIG.DEFAULT_URL;
  return `${baseUrl}/api/og?title=${encodeURIComponent(title)}&type=${type}`;
};

// Generate structured data for organization
export const generateOrganizationStructuredData = () => {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    'name': 'LinkDAO',
    'url': SEO_CONFIG.DEFAULT_URL,
    'logo': `${SEO_CONFIG.DEFAULT_URL}/images/logo.png`,
    'sameAs': [
      'https://twitter.com/linkdao',
      'https://github.com/magickw',
      'https://discord.gg/linkdao'
    ],
    'description': SEO_CONFIG.DEFAULT_DESCRIPTION
  };
};

// Generate structured data for a Web3 social post
export const generatePostStructuredData = (postData: any) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'SocialMediaPosting',
    'headline': truncateText(postData.title || postData.content, SEO_CONFIG.MAX_TITLE_LENGTH),
    'datePublished': postData.createdAt || new Date().toISOString(),
    'dateModified': postData.updatedAt || postData.createdAt || new Date().toISOString(),
    'author': {
      '@type': 'Person',
      'name': postData.author?.displayName || postData.author?.handle || 'Anonymous User',
      'url': postData.author?.profileUrl ? `${SEO_CONFIG.DEFAULT_URL}${postData.author.profileUrl}` : undefined
    },
    'publisher': {
      '@type': 'Organization',
      'name': 'LinkDAO',
      'logo': {
        '@type': 'ImageObject',
        'url': `${SEO_CONFIG.DEFAULT_URL}/images/logo.png`
      }
    },
    'description': truncateText(postData.content, SEO_CONFIG.MAX_DESCRIPTION_LENGTH),
    'articleBody': postData.content,
    'image': postData.mediaCids?.[0] ? `${SEO_CONFIG.DEFAULT_URL}${postData.mediaCids[0]}` : undefined,
    'keywords': postData.tags?.join(', ')
  };
};

// Generate structured data for a user profile
export const generateProfileStructuredData = (profileData: any) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    'mainEntity': {
      '@type': 'Person',
      'name': profileData.displayName || profileData.handle || 'LinkDAO User',
      'description': truncateText(profileData.bio, SEO_CONFIG.MAX_DESCRIPTION_LENGTH),
      'url': profileData.profileUrl ? `${SEO_CONFIG.DEFAULT_URL}${profileData.profileUrl}` : undefined,
      'image': profileData.avatar ? `${SEO_CONFIG.DEFAULT_URL}${profileData.avatar}` : undefined,
      'sameAs': [
        profileData.twitter ? `https://twitter.com/${profileData.twitter}` : undefined,
        profileData.github ? `https://github.com/${profileData.github}` : undefined
      ].filter(Boolean)
    }
  };
};

// Generate structured data for a community
export const generateCommunityStructuredData = (communityData: any) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    'name': communityData.displayName || communityData.name,
    'description': truncateText(communityData.description, SEO_CONFIG.MAX_DESCRIPTION_LENGTH),
    'url': communityData.url ? `${SEO_CONFIG.DEFAULT_URL}${communityData.url}` : undefined,
    'logo': communityData.avatar ? `${SEO_CONFIG.DEFAULT_URL}${communityData.avatar}` : undefined,
    'member': {
      '@type': 'OrganizationRole',
      'roleName': 'Member'
    },
    'interactionStatistic': {
      '@type': 'InteractionCounter',
      'interactionType': 'https://schema.org/JoinAction',
      'userInteractionCount': communityData.memberCount || 0
    }
  };
};

// Generate breadcrumbs structured data
export const generateBreadcrumbsStructuredData = (breadcrumbs: Array<{ name: string; url: string }>) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': breadcrumbs.map((breadcrumb, index) => ({
      '@type': 'ListItem',
      'position': index + 1,
      'name': breadcrumb.name,
      'item': `${SEO_CONFIG.DEFAULT_URL}${breadcrumb.url}`
    }))
  };
};

// Generate SEO metadata for different page types
export const generateSEOMetadata = (pageType: string, data: any = {}) => {
  switch (pageType) {
    case 'home':
      return {
        title: SEO_CONFIG.DEFAULT_TITLE,
        description: SEO_CONFIG.DEFAULT_DESCRIPTION,
        keywords: SEO_CONFIG.DEFAULT_KEYWORDS,
        structuredData: generateOrganizationStructuredData()
      };
    
    case 'post':
      return {
        title: truncateText(data.title || data.content, SEO_CONFIG.MAX_TITLE_LENGTH),
        description: truncateText(data.content, SEO_CONFIG.MAX_DESCRIPTION_LENGTH),
        keywords: data.tags?.join(', ') || SEO_CONFIG.DEFAULT_KEYWORDS,
        image: data.mediaCids?.[0] || SEO_CONFIG.DEFAULT_IMAGE,
        publishedTime: data.createdAt,
        modifiedTime: data.updatedAt,
        structuredData: generatePostStructuredData(data)
      };
    
    case 'profile':
      return {
        title: `${data.displayName || data.handle} - LinkDAO Profile`,
        description: truncateText(data.bio, SEO_CONFIG.MAX_DESCRIPTION_LENGTH),
        keywords: `Web3, profile, ${data.displayName || data.handle}`,
        image: data.avatar || SEO_CONFIG.DEFAULT_IMAGE,
        structuredData: generateProfileStructuredData(data)
      };
    
    case 'community':
      return {
        title: `${data.displayName || data.name} - LinkDAO Community`,
        description: truncateText(data.description, SEO_CONFIG.MAX_DESCRIPTION_LENGTH),
        keywords: `Web3, community, DAO, ${data.displayName || data.name}`,
        image: data.avatar || SEO_CONFIG.DEFAULT_IMAGE,
        structuredData: generateCommunityStructuredData(data)
      };
    
    case 'marketplace':
      return {
        title: 'Marketplace - LinkDAO',
        description: 'Discover and buy digital and physical goods on the decentralized LinkDAO marketplace',
        keywords: 'Web3, marketplace, NFT, cryptocurrency, digital goods, physical goods',
        image: SEO_CONFIG.DEFAULT_IMAGE,
        structuredData: {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          'name': 'LinkDAO Marketplace',
          'url': SEO_CONFIG.DEFAULT_URL,
          'description': 'Decentralized marketplace for digital and physical goods'
        }
      };
    
    case 'governance':
      return {
        title: 'Governance - LinkDAO',
        description: 'Participate in decentralized governance and shape the future of the platform',
        keywords: 'Web3, governance, DAO, voting, proposals, decentralized',
        image: SEO_CONFIG.DEFAULT_IMAGE,
        structuredData: {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          'name': 'LinkDAO Governance',
          'url': SEO_CONFIG.DEFAULT_URL,
          'description': 'Decentralized governance platform'
        }
      };
    
    default:
      return {
        title: SEO_CONFIG.DEFAULT_TITLE,
        description: SEO_CONFIG.DEFAULT_DESCRIPTION,
        keywords: SEO_CONFIG.DEFAULT_KEYWORDS
      };
  }
};

// SEO optimization recommendations
export const getSEORecommendations = (metadata: any) => {
  const recommendations: Array<{ issue: string; recommendation: string; priority: 'high' | 'medium' | 'low' }> = [];
  
  // Title length check
  if (!metadata.title || metadata.title.length < 10) {
    recommendations.push({
      issue: 'Missing or too short title',
      recommendation: 'Add a descriptive title with 10-60 characters',
      priority: 'high'
    });
  } else if (metadata.title.length > SEO_CONFIG.MAX_TITLE_LENGTH) {
    recommendations.push({
      issue: 'Title too long',
      recommendation: `Keep title under ${SEO_CONFIG.MAX_TITLE_LENGTH} characters`,
      priority: 'medium'
    });
  }
  
  // Description length check
  if (!metadata.description || metadata.description.length < 50) {
    recommendations.push({
      issue: 'Missing or too short description',
      recommendation: 'Add a descriptive meta description with 50-160 characters',
      priority: 'high'
    });
  } else if (metadata.description.length > SEO_CONFIG.MAX_DESCRIPTION_LENGTH) {
    recommendations.push({
      issue: 'Description too long',
      recommendation: `Keep description under ${SEO_CONFIG.MAX_DESCRIPTION_LENGTH} characters`,
      priority: 'medium'
    });
  }
  
  // Keywords check
  if (!metadata.keywords || metadata.keywords.length < 5) {
    recommendations.push({
      issue: 'Missing or insufficient keywords',
      recommendation: 'Add relevant keywords to improve search visibility',
      priority: 'medium'
    });
  }
  
  // Image check
  if (!metadata.image) {
    recommendations.push({
      issue: 'Missing social media image',
      recommendation: 'Add an image for better social sharing',
      priority: 'medium'
    });
  }
  
  return recommendations;
};

// Dynamic SEO optimization for content
export const optimizeContentForSEO = (content: string, maxLength: number = SEO_CONFIG.MAX_DESCRIPTION_LENGTH): string => {
  // Remove HTML tags
  const cleanContent = content.replace(/<[^>]*>/g, '');
  
  // Remove extra whitespace
  const trimmedContent = cleanContent.replace(/\s+/g, ' ').trim();
  
  // Truncate to appropriate length
  return truncateText(trimmedContent, maxLength);
};

// Generate dynamic keywords from content
export const generateKeywordsFromContent = (content: string, tags: string[] = []): string => {
  // Extract words from content
  const words = content.toLowerCase().match(/\b(\w{4,})\b/g) || [];
  
  // Count word frequency
  const wordCount: Record<string, number> = {};
  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });
  
  // Get top keywords (excluding common words)
  const commonWords = new Set([
    'this', 'that', 'with', 'from', 'have', 'will', 'been', 'were', 'been', 'they', 'them', 'than', 'then', 
    'when', 'what', 'where', 'which', 'while', 'would', 'could', 'should', 'might', 'must', 'shall', 'does', 
    'done', 'make', 'made', 'take', 'took', 'give', 'gave', 'find', 'found', 'come', 'came', 'know', 'knew', 
    'think', 'thought', 'want', 'wanted', 'need', 'needed', 'like', 'liked', 'look', 'looked', 'seem', 'seemed', 
    'feel', 'felt', 'become', 'became', 'leave', 'left', 'keep', 'kept', 'turn', 'turned', 'start', 'started', 
    'stop', 'stopped', 'begin', 'began', 'end', 'ended', 'open', 'opened', 'close', 'closed', 'buy', 'bought', 
    'sell', 'sold', 'pay', 'paid', 'cost', 'costs', 'get', 'got', 'use', 'used', 'try', 'tried', 'work', 'worked', 
    'play', 'played', 'read', 'read', 'write', 'wrote', 'call', 'called', 'ask', 'asked', 'tell', 'told', 'show', 
    'showed', 'move', 'moved', 'live', 'lived', 'believe', 'believed', 'happen', 'happened', 'change', 'changed', 
    'help', 'helped', 'follow', 'followed', 'understand', 'understood', 'explain', 'explained', 'include', 'included', 
    'provide', 'provided', 'require', 'required', 'allow', 'allowed', 'enable', 'enabled', 'support', 'supported', 
    'create', 'created', 'build', 'built', 'develop', 'developed', 'design', 'designed', 'implement', 'implemented', 
    'improve', 'improved', 'increase', 'increased', 'decrease', 'decreased', 'reduce', 'reduced', 'enhance', 'enhanced', 
    'optimize', 'optimized', 'simplify', 'simplified', 'complicate', 'complicated', 'solve', 'solved', 'fix', 'fixed', 
    'repair', 'repaired', 'maintain', 'maintained', 'manage', 'managed', 'organize', 'organized', 'plan', 'planned', 
    'schedule', 'scheduled', 'prepare', 'prepared', 'arrange', 'arranged', 'coordinate', 'coordinated', 'communicate', 
    'communicated', 'discuss', 'discussed', 'debate', 'debated', 'argue', 'argued', 'agree', 'agreed', 'disagree', 
    'disagreed', 'decide', 'decided', 'choose', 'chose', 'select', 'selected', 'prefer', 'preferred', 'recommend', 
    'recommended', 'suggest', 'suggested', 'advise', 'advised', 'warn', 'warned', 'inform', 'informed', 'notify', 
    'notified', 'remind', 'reminded', 'remember', 'remembered', 'forget', 'forgot', 'learn', 'learned', 'study', 
    'studied', 'teach', 'taught', 'train', 'trained', 'educate', 'educated', 'guide', 'guided', 'lead', 'led', 
    'direct', 'directed', 'control', 'controlled', 'influence', 'influenced', 'affect', 'affected', 'impact', 'impacted', 
    'cause', 'caused', 'result', 'resulted', 'contribute', 'contributed', 'participate', 'participated', 'involve', 
    'involved', 'engage', 'engaged', 'interact', 'interacted', 'connect', 'connected', 'relate', 'related', 'associate', 
    'associated', 'link', 'linked', 'attach', 'attached', 'bind', 'bound', 'tie', 'tied', 'join', 'joined', 'combine', 
    'combined', 'merge', 'merged', 'unite', 'united', 'separate', 'separated', 'divide', 'divided', 'split', 'split', 
    'break', 'broke', 'crack', 'cracked', 'damage', 'damaged', 'destroy', 'destroyed', 'ruin', 'ruined', 'wreck', 
    'wrecked', 'hurt', 'hurt', 'injure', 'injured', 'wound', 'wounded', 'heal', 'healed', 'cure', 'cured', 'treat', 
    'treated', 'care', 'cared', 'protect', 'protected', 'defend', 'defended', 'guard', 'guarded', 'secure', 'secured', 
    'safeguard', 'safeguarded', 'shield', 'shielded', 'cover', 'covered', 'hide', 'hid', 'conceal', 'concealed', 
    'reveal', 'revealed', 'expose', 'exposed', 'disclose', 'disclosed', 'announce', 'announced', 'declare', 'declared', 
    'proclaim', 'proclaimed', 'publish', 'published', 'release', 'released', 'distribute', 'distributed', 'spread', 
    'spread', 'disseminate', 'disseminated', 'share', 'shared', 'allocate', 'allocated', 'assign', 'assigned', 
    'appoint', 'appointed', 'designate', 'designated', 'nominate', 'nominated', 'elect', 'elected', 'vote', 'voted', 
    'pick', 'picked', 'determine', 'determined', 'establish', 'established', 'define', 'defined', 'describe', 'described', 
    'clarify', 'clarified', 'illustrate', 'illustrated', 'demonstrate', 'demonstrated', 'prove', 'proved', 'verify', 
    'verified', 'confirm', 'confirmed', 'validate', 'validated', 'check', 'checked', 'test', 'tested', 'examine', 
    'examined', 'inspect', 'inspected', 'review', 'reviewed', 'evaluate', 'evaluated', 'assess', 'assessed', 'analyze', 
    'analyzed', 'investigate', 'investigated', 'research', 'researched', 'explore', 'explored', 'discover', 'discovered', 
    'locate', 'located', 'detect', 'detected', 'identify', 'identified', 'recognize', 'recognized', 'distinguish', 
    'distinguished', 'differentiate', 'differentiated', 'compare', 'compared', 'contrast', 'contrasted', 'match', 
    'matched', 'correspond', 'corresponded', 'resemble', 'resembled', 'similar', 'alike', 'equal', 'equivalent', 
    'same', 'identical', 'comparable', 'parallel', 'analogous', 'related', 'associated', 'connected', 'linked', 
    'bound', 'tied', 'joined', 'united', 'combined', 'merged', 'integrated', 'incorporated', 'included', 'contained', 
    'held', 'possessed', 'owned', 'belonged', 'had', 'got', 'received', 'obtained', 'acquired', 'gained', 'earned', 
    'won', 'achieved', 'accomplished', 'completed', 'finished', 'ended', 'concluded', 'terminated', 'ceased', 'stopped', 
    'halted', 'paused', 'delayed', 'postponed', 'deferred', 'rescheduled', 'cancelled', 'abandoned', 'quit', 'resigned', 
    'retired', 'retreated', 'withdrew', 'escaped', 'fled', 'ran', 'avoided', 'prevented', 'blocked', 'prohibited', 
    'forbade', 'banned', 'restricted', 'limited', 'constrained', 'confined', 'enclosed', 'surrounded', 'circled', 
    'encircled', 'embraced', 'hugged', 'kissed', 'touched', 'felt', 'sensed', 'perceived', 'noticed', 'observed', 
    'watched', 'saw', 'looked', 'glanced', 'stared', 'gazed', 'peered', 'squinted', 'blinked', 'winked', 'nodded', 
    'shook', 'waved', 'gestured', 'signaled', 'indicated', 'pointed', 'displayed', 'presented', 'exhibited', 'performed', 
    'acted', 'played', 'sang', 'danced', 'spoke', 'talked', 'conversed', 'chatted', 'whispered', 'shouted', 'yelled', 
    'cried', 'laughed', 'smiled', 'grinned', 'frowned', 'scowled', 'glared', 'peeked', 'spied', 'spotted', 'sighted', 
    'realized', 'understood', 'comprehended', 'grasped', 'apprehended', 'experienced', 'enjoyed', 'liked', 'loved', 
    'adored', 'cherished', 'valued', 'appreciated', 'treasured', 'respected', 'honored', 'admired', 'envied', 'desired', 
    'wished', 'hoped', 'expected', 'anticipated', 'predicted', 'forecast', 'guessed', 'speculated', 'supposed', 
    'assumed', 'presumed', 'inferred', 'deduced', 'concluded', 'judged', 'evaluated', 'rated', 'scored', 'graded', 
    'marked', 'ranked', 'classified', 'categorized', 'grouped', 'sorted', 'organized', 'arranged', 'ordered', 'sequenced', 
    'structured', 'systematized', 'methodized', 'rationalized', 'logicalized', 'simplified', 'streamlined', 'improved', 
    'enhanced', 'upgraded', 'modernized', 'updated', 'renewed', 'refreshed', 'revitalized', 'reinvigorated', 'energized', 
    'stimulated', 'excited', 'thrilled', 'delighted', 'pleased', 'satisfied', 'contented', 'fulfilled', 'succeeded', 
    'triumphed', 'prevailed', 'conquered', 'overcame', 'surmounted', 'overpowered', 'dominated', 'controlled', 'mastered', 
    'excelled', 'outperformed', 'surpassed', 'exceeded', 'transcended', 'outshone', 'outdid', 'beat', 'defeated', 
    'vanquished', 'subdued', 'overwhelmed', 'crushed', 'demolished', 'destroyed', 'annihilated', 'eliminated', 'eradicated', 
    'abolished'
  ]);
  
  // Filter out common words and get top 10 words by frequency
  const filteredWords = Object.entries(wordCount)
    .filter(([word]) => !commonWords.has(word))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
  
  // Combine with existing tags and remove duplicates
  const allKeywords = Array.from(new Set([...filteredWords, ...tags]));
  
  // Return as comma-separated string
  return allKeywords.join(', ');
};