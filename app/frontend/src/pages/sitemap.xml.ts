import { GetServerSideProps } from 'next';
import { marketplaceService } from '@/services/marketplaceService';
import { CommunityService } from '@/services/communityService';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://linkdao.io';

async function generateSiteMap() {
  // Static pages
  const staticPages = [
    { url: '', priority: '1.0', changefreq: 'daily' },
    { url: '/marketplace', priority: '0.9', changefreq: 'daily' },
    { url: '/marketplace/cart', priority: '0.6', changefreq: 'weekly' },
    { url: '/marketplace/checkout', priority: '0.6', changefreq: 'weekly' },
    { url: '/marketplace/wishlist', priority: '0.5', changefreq: 'weekly' },
    { url: '/marketplace/orders', priority: '0.6', changefreq: 'weekly' },
    { url: '/marketplace/disputes', priority: '0.5', changefreq: 'weekly' },
    { url: '/marketplace/seller/dashboard', priority: '0.7', changefreq: 'weekly' },
    { url: '/marketplace/seller/onboarding', priority: '0.6', changefreq: 'monthly' },
    { url: '/marketplace/seller/listings/create', priority: '0.6', changefreq: 'monthly' },
    { url: '/marketplace/seller/orders', priority: '0.6', changefreq: 'weekly' },
    { url: '/marketplace/seller/returns', priority: '0.5', changefreq: 'weekly' },
    { url: '/marketplace/seller/upgrade', priority: '0.5', changefreq: 'monthly' },
    { url: '/governance', priority: '0.8', changefreq: 'weekly' },
    { url: '/charity-dashboard', priority: '0.8', changefreq: 'weekly' },
    { url: '/communities', priority: '0.8', changefreq: 'daily' },
    { url: '/hashtags', priority: '0.6', changefreq: 'daily' },
    { url: '/blog', priority: '0.7', changefreq: 'weekly' },
    { url: '/docs', priority: '0.7', changefreq: 'weekly' },
    { url: '/docs/getting-started', priority: '0.7', changefreq: 'monthly' },
    { url: '/docs/wallet-security', priority: '0.6', changefreq: 'monthly' },
    { url: '/docs/ldao-token-guide', priority: '0.7', changefreq: 'monthly' },
    { url: '/docs/marketplace-guide', priority: '0.6', changefreq: 'monthly' },
    { url: '/docs/governance-guide', priority: '0.6', changefreq: 'monthly' },
    { url: '/docs/troubleshooting', priority: '0.5', changefreq: 'monthly' },
    { url: '/support', priority: '0.7', changefreq: 'weekly' },
    { url: '/support/faq', priority: '0.6', changefreq: 'weekly' },
    { url: '/support/guides', priority: '0.6', changefreq: 'weekly' },
    { url: '/support/guides/ldao-complete-guide', priority: '0.6', changefreq: 'monthly' },
    { url: '/support/tutorials', priority: '0.6', changefreq: 'weekly' },
    { url: '/support/tutorials/first-ldao-purchase', priority: '0.5', changefreq: 'monthly' },
    { url: '/support/contact', priority: '0.5', changefreq: 'monthly' },
    { url: '/support/tickets', priority: '0.5', changefreq: 'weekly' },
    { url: '/support/tickets/new', priority: '0.4', changefreq: 'monthly' },
    { url: '/support/disputes', priority: '0.5', changefreq: 'weekly' },
    { url: '/support/disputes/new', priority: '0.4', changefreq: 'monthly' },
    { url: '/support/dashboard', priority: '0.5', changefreq: 'weekly' },
    { url: '/support/documents', priority: '0.4', changefreq: 'monthly' },
    { url: '/support/live-chat', priority: '0.5', changefreq: 'weekly' },
    { url: '/wallet', priority: '0.7', changefreq: 'weekly' },
    { url: '/wallet/transactions', priority: '0.6', changefreq: 'weekly' },
    { url: '/ldao-dashboard', priority: '0.7', changefreq: 'daily' },
    { url: '/analytics', priority: '0.6', changefreq: 'weekly' },
    { url: '/search', priority: '0.6', changefreq: 'daily' },
    { url: '/recommendations', priority: '0.6', changefreq: 'daily' },
    { url: '/terms', priority: '0.3', changefreq: 'yearly' },
    { url: '/privacy', priority: '0.3', changefreq: 'yearly' },
  ];

  // Dynamic pages - these would be fetched from your API/database
  const dynamicPages: Array<{ url: string; priority: string; changefreq: string }> = [];
  
  // Skip dynamic content for now to ensure sitemap always works
  // Dynamic content can be added later when API is stable
  /*
  try {
    // Fetch marketplace listings for sitemap with timeout (limited to 50 items)
    const listingsPromise = marketplaceService.getMarketplaceListings({ limit: 50 });
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 3000)
    );
    
    const listings = await Promise.race([listingsPromise, timeoutPromise]);
    if (Array.isArray(listings)) {
      dynamicPages.push(...listings.map(listing => ({
        url: `/marketplace/listing/${listing.id}`,
        priority: '0.7',
        changefreq: 'weekly'
      })));
    }
  } catch (error) {
    console.error('Error fetching marketplace listings for sitemap:', error);
  }

  try {
    // Fetch communities for sitemap with timeout (limited to 50 items)
    const communitiesPromise = CommunityService.getAllCommunities({ limit: 50 });
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 3000)
    );
    
    const communities = await Promise.race([communitiesPromise, timeoutPromise]);
    if (Array.isArray(communities)) {
      dynamicPages.push(...communities.map(community => ({
        url: `/communities/${encodeURIComponent(community.slug ?? community.id ?? '')}`,
        priority: '0.6',
        changefreq: 'weekly'
      })));
    }
  } catch (error) {
    console.error('Error fetching communities for sitemap:', error);
  }
  */

  // Combine static and dynamic pages
  const allPages = [...staticPages, ...dynamicPages];

  const timestamp = new Date().toISOString();
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${allPages
    .map(({ url, priority, changefreq }) => {
      return `
    <url>
      <loc>${SITE_URL}${url}</loc>
      <lastmod>${timestamp}</lastmod>
      <changefreq>${changefreq}</changefreq>
      <priority>${priority}</priority>
    </url>
  `;
    })
    .join('')}
</urlset>
  `;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  let sitemap: string;
  
  try {
    sitemap = await generateSiteMap();
  } catch (error) {
    console.error('Error generating sitemap:', error);
    
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://linkdao.io';
    const timestamp = new Date().toISOString();
    
    sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}</loc>
    <lastmod>${timestamp}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${siteUrl}/marketplace</loc>
    <lastmod>${timestamp}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${siteUrl}/communities</loc>
    <lastmod>${timestamp}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${siteUrl}/governance</loc>
    <lastmod>${timestamp}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${siteUrl}/blog</loc>
    <lastmod>${timestamp}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>`;
  }

  try {
    res.setHeader('Content-Type', 'text/xml');
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate');
    res.write(sitemap);
    res.end();
  } catch (responseError) {
    console.error('Error writing sitemap response:', responseError);
  }

  return {
    props: {},
  };
};

export default function SiteMap() {
  return null;
}