/**
 * Utility functions for video URL parsing and embedding
 * Supports YouTube, Vimeo, Twitch, TikTok, Instagram, and other popular video platforms
 */

export interface VideoInfo {
  id: string;
  platform: string;
  url: string;
  embedUrl: string;
  title?: string;
  thumbnail?: string;
}

/**
 * Extract video information from various video platform URLs
 * @param url - Video URL to extract information from
 * @returns VideoInfo object if found, null otherwise
 */
export function extractVideoInfo(url: string): VideoInfo | null {
  // Remove any leading/trailing whitespace
  url = url.trim();
  
  // YouTube patterns
  const youtubePatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
    /youtube\.com\/attribution_link\?.*v=([^&\n?#]+)/,
  ];

  for (const pattern of youtubePatterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return {
        id: match[1],
        platform: 'youtube',
        url: url,
        embedUrl: `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1`,
        thumbnail: `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`
      };
    }
  }

  // Vimeo patterns
  const vimeoPatterns = [
    /vimeo\.com\/(\d+)/,
    /vimeo\.com\/.*\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/,
  ];

  for (const pattern of vimeoPatterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return {
        id: match[1],
        platform: 'vimeo',
        url: url,
        embedUrl: `https://player.vimeo.com/video/${match[1]}`,
        thumbnail: `https://vumbnail.com/vimeo/${match[1]}.jpg`
      };
    }
  }

  // Twitch patterns
  const twitchPatterns = [
    /twitch\.tv\/videos\/(\d+)/,
    /twitch\.tv\/.*\/video\/(\d+)/,
    /twitch\.tv\/(\w+)\/clip\/([^&\n?#]+)/,
  ];

  for (const pattern of twitchPatterns) {
    const match = url.match(pattern);
    if (match) {
      if (match[2]) { // Clip
        return {
          id: match[2],
          platform: 'twitch-clip',
          url: url,
          embedUrl: `https://clips.twitch.tv/embed?clip=${match[2]}&parent=localhost&autoplay=false`
        };
      } else { // Video
        return {
          id: match[1],
          platform: 'twitch',
          url: url,
          embedUrl: `https://player.twitch.tv/?video=v${match[1]}&parent=localhost&autoplay=false`
        };
      }
    }
  }

  // TikTok patterns
  const tiktokPatterns = [
    /tiktok\.com\/@[\w.-]+\/video\/(\d+)/,
    /tiktok\.com\/v\/(\d+)/,
    /vm\.tiktok\.com\/(\d+)/,
  ];

  for (const pattern of tiktokPatterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return {
        id: match[1],
        platform: 'tiktok',
        url: url,
        embedUrl: `https://www.tiktok.com/embed/v2/${match[1]}`,
        thumbnail: `https://p16-sign-va.tiktokcdn.com/tos-maliva-avt-0068/${match[1]}~c5_100x100.jpeg`
      };
    }
  }

  // Instagram patterns
  const instagramPatterns = [
    /instagram\.com\/p\/([^&\n?#]+)/,
    /instagram\.com\/tv\/([^&\n?#]+)/,
    /instagram\.com\/reel\/([^&\n?#]+)/,
  ];

  for (const pattern of instagramPatterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return {
        id: match[1],
        platform: 'instagram',
        url: url,
        embedUrl: `https://www.instagram.com/p/${match[1]}/embed/`
      };
    }
  }

  // Twitter/X patterns
  const twitterPatterns = [
    /twitter\.com\/.*\/status\/(\d+)/,
    /x\.com\/.*\/status\/(\d+)/,
  ];

  for (const pattern of twitterPatterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return {
        id: match[1],
        platform: 'twitter',
        url: url,
        embedUrl: `https://twitter.com/i/videos/tweet/${match[1]}`
      };
    }
  }

  // Facebook video patterns
  const facebookPatterns = [
    /facebook\.com\/.*\/videos\/(\d+)/,
    /fb\.watch\/(\d+)/,
  ];

  for (const pattern of facebookPatterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return {
        id: match[1],
        platform: 'facebook',
        url: url,
        embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&width=560`
      };
    }
  }

  return null;
}

/**
 * Validate if a URL is a valid video URL from supported platforms
 * @param url - URL to validate
 * @returns true if it's a valid video URL, false otherwise
 */
export function isValidVideoUrl(url: string): boolean {
  return extractVideoInfo(url) !== null;
}

/**
 * Extract all video URLs from a text string
 * @param text - Text to search for video URLs
 * @returns Array of VideoInfo objects found
 */
export function extractVideoUrls(text: string): VideoInfo[] {
  // Combined regex pattern for all supported video platforms
  const videoUrlRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|attribution_link\?.*v=)|youtu\.be\/|vimeo\.com\/(?:\d+|.*\/\d+)|twitch\.tv\/(?:videos\/\d+|.*\/video\/\d+|\w+\/clip\/[^&\n?#]+)|tiktok\.com\/(?:@[\w.-]+\/video\/\d+|v\/\d+)|vm\.tiktok\.com\/\d+|instagram\.com\/(?:p\/|tv\/|reel\/)[^&\n?#]+|twitter\.com\/.*\/status\/\d+|x\.com\/.*\/status\/\d+|facebook\.com\/.*\/videos\/\d+|fb\.watch\/\d+)[\w-?&=%.\/#]*/gi;
  
  const matches = text.match(videoUrlRegex) || [];
  const videoInfos: VideoInfo[] = [];
  
  matches.forEach(url => {
    const videoInfo = extractVideoInfo(url);
    if (videoInfo) {
      videoInfos.push(videoInfo);
    }
  });
  
  return videoInfos;
}

/**
 * Get platform-specific embed HTML code
 * @param videoInfo - VideoInfo object
 * @param width - Embed width (default: 560)
 * @param height - Embed height (default: 315)
 * @returns HTML string for embedding the video
 */
export function getVideoEmbedHtml(videoInfo: VideoInfo, width: number = 560, height: number = 315): string {
  const { platform, embedUrl, id } = videoInfo;
  
  switch (platform) {
    case 'youtube':
      return `<div class="video-embed-container">
                <iframe 
                  width="${width}" 
                  height="${height}" 
                  src="${embedUrl}" 
                  title="YouTube video player" 
                  frameborder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowfullscreen
                ></iframe>
              </div>`;
    
    case 'vimeo':
      return `<div class="video-embed-container">
                <iframe 
                  src="${embedUrl}" 
                  width="${width}" 
                  height="${height}" 
                  frameborder="0" 
                  allow="autoplay; fullscreen; picture-in-picture" 
                  allowfullscreen
                ></iframe>
              </div>`;
    
    case 'twitch':
      return `<div class="video-embed-container">
                <iframe 
                  src="${embedUrl}" 
                  width="${width}" 
                  height="${height}" 
                  frameborder="0" 
                  allowfullscreen
                ></iframe>
              </div>`;
    
    case 'tiktok':
      return `<div class="video-embed-container">
                <blockquote 
                  class="tiktok-embed" 
                  cite="${videoInfo.url}" 
                  data-video-id="${id}"
                  style="max-width: 605px; min-width: 325px;">
                  <section>
                    <a target="_blank" href="${videoInfo.url}">@${videoInfo.url.split('/')[3]}</a>
                  </section>
                </blockquote>
                <script async src="https://www.tiktok.com/embed.js"></script>
              </div>`;
    
    case 'instagram':
      return `<div class="video-embed-container">
                <blockquote 
                  class="instagram-media" 
                  data-instgrm-permalink="${videoInfo.url}"
                  data-instgrm-version="14"
                  style=" background: #FFF; border: 0; border-radius: 3px; box-shadow: 0 0 1px 0 rgba(0,0,0,0.1), 0 1px 10px 0 rgba(0,0,0,0.1); margin: 1px; max-width: 540px; min-width: 326px; padding: 0; width: calc(100% - 2px);">
                </blockquote>
                <script async src="//www.instagram.com/embed.js"></script>
              </div>`;
    
    case 'twitter':
      return `<div class="video-embed-container">
                <blockquote 
                  class="twitter-tweet" 
                  data-width="${width}">
                  <a href="${videoInfo.url}"></a>
                </blockquote>
                <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
              </div>`;
    
    case 'facebook':
      return `<div class="video-embed-container">
                <div 
                  id="fb-root"></div>
                <script async defer crossorigin="anonymous" src="https://connect.facebook.net/en_US/sdk.js"></script>
                <div 
                  class="fb-video" 
                  data-href="${videoInfo.url}" 
                  data-width="${width}" 
                  data-show-text="false">
                </div>
              </div>`;
    
    default:
      return `<div class="video-embed-container">
                <a href="${videoInfo.url}" target="_blank" rel="noopener noreferrer">
                  <div class="bg-gray-100 border border-gray-300 rounded-lg p-4 text-center">
                    <p class="text-gray-600">Video from ${platform}</p>
                    <p class="text-sm text-gray-500 mt-1">Click to view</p>
                  </div>
                </a>
              </div>`;
  }
}