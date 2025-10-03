/**
 * Placeholder Image Service
 * Replaces external placeholder services with local/reliable alternatives
 */

// Generate a deterministic color based on text
function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 50%)`;
}

// Generate SVG placeholder
function generateSVGPlaceholder(
  width: number, 
  height: number, 
  text?: string,
  backgroundColor?: string
): string {
  const bgColor = backgroundColor || stringToColor(text || `${width}x${height}`);
  const textColor = '#ffffff';
  const displayText = text || `${width}×${height}`;
  
  const fontSize = Math.min(width, height) * 0.2;
  
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${bgColor}"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${fontSize}" 
            fill="${textColor}" text-anchor="middle" dominant-baseline="middle">
        ${displayText}
      </text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

// Parse placehold.co URL and generate local equivalent
function parsePlaceholderUrl(url: string): {
  width: number;
  height: number;
  text?: string;
  backgroundColor?: string;
} {
  // Handle placehold.co URLs like:
  // https://placehold.co/40
  // https://placehold.co/300x200
  // https://placehold.co/400x400/6366f1/ffffff?text=NFT+123
  
  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split('/').filter(Boolean);
  
  if (pathParts.length < 1) {
    return { width: 40, height: 40 };
  }
  
  const dimensions = pathParts[0];
  let width = 40;
  let height = 40;
  
  if (dimensions.includes('x')) {
    const [w, h] = dimensions.split('x').map(Number);
    width = w || 40;
    height = h || 40;
  } else {
    width = height = Number(dimensions) || 40;
  }
  
  // Extract background color if present
  let backgroundColor;
  if (pathParts.length > 1) {
    backgroundColor = `#${pathParts[1]}`;
  }
  
  // Extract text from query params
  const text = urlObj.searchParams.get('text')?.replace(/\+/g, ' ');
  
  return { width, height, text, backgroundColor };
}

/**
 * Replace placehold.co URLs with local SVG placeholders
 */
export function getPlaceholderImage(url: string): string {
  if (!url.includes('placehold.co')) {
    return url;
  }
  
  try {
    const { width, height, text, backgroundColor } = parsePlaceholderUrl(url);
    return generateSVGPlaceholder(width, height, text, backgroundColor);
  } catch (error) {
    console.warn('Failed to parse placeholder URL:', url, error);
    // Return a default 40x40 placeholder
    return generateSVGPlaceholder(40, 40, '?');
  }
}

/**
 * Generate avatar placeholder with initials
 */
export function generateAvatarPlaceholder(
  name: string, 
  size: number = 40
): string {
  const initials = name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
    
  return generateSVGPlaceholder(size, size, initials);
}

/**
 * Generate banner placeholder
 */
export function generateBannerPlaceholder(
  width: number = 800,
  height: number = 200,
  text?: string
): string {
  return generateSVGPlaceholder(width, height, text);
}

/**
 * Common placeholder sizes
 */
export const PLACEHOLDER_SIZES = {
  AVATAR_SMALL: 20,
  AVATAR_MEDIUM: 40,
  AVATAR_LARGE: 48,
  THUMBNAIL: 300,
  BANNER_SMALL: { width: 400, height: 200 },
  BANNER_LARGE: { width: 800, height: 200 },
} as const;

/**
 * Pre-generated common placeholders to avoid repeated generation
 */
export const COMMON_PLACEHOLDERS = {
  AVATAR_40: generateSVGPlaceholder(40, 40, 'U'),
  AVATAR_48: generateSVGPlaceholder(48, 48, 'U'),
  THUMBNAIL_300: generateSVGPlaceholder(300, 300, 'IMG'),
  BANNER_800x200: generateSVGPlaceholder(800, 200, 'BANNER'),
} as const;