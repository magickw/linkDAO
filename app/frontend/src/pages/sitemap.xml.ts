import { GetServerSideProps } from 'next';
import { marketplaceService } from '@/services/marketplaceService';
import { CommunityService } from '@/services/communityService';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://linkdao.io';

async function generateSiteMap() {
  // Static pages
  const staticPages = [
    { url: '', priority: '1.0', changefreq: 'daily' },
    { url: '/dao', priority: '0.9', changefreq: 'daily' },
    { url: '/marketplace', priority: '0.9', changefreq: 'daily' },
    { url: '/governance', priority: '0.8', changefreq: 'weekly' },
    { url: '/charity-dashboard', priority: '0.8', changefreq: 'weekly' },
    { url: '/communities', priority: '0.8', changefreq: 'daily' },
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
    { url: '/support/contact', priority: '0.5', changefreq: 'monthly' },
    { url: '/terms', priority: '0.3', changefreq: 'yearly' },
    { url: '/privacy', priority: '0.3', changefreq: 'yearly' },
  ];

  // Dynamic pages - these would be fetched from your API/database
  let dynamicPages = [];
  
  try {
    // Fetch marketplace listings for sitemap
    const listings = await marketplaceService.getMarketplaceListings({ limit: 1000 });
    if (Array.isArray(listings)) {
      dynamicPages = [...dynamicPages, ...listings.map(listing => ({
        url: `/marketplace/listing/${listing.id}`,
        priority: '0.7',
        changefreq: 'weekly'
      }))];
    }
  } catch (error) {
    console.error('Error fetching marketplace listings for sitemap:', error);
    // Add some sample listing URLs as fallback
    for (let i = 1; i <= 10; i++) {
      dynamicPages.push({
        url: `/marketplace/listing/prod_00${i}`,
        priority: '0.7',
        changefreq: 'weekly'
      });
    }
  }

  try {
    // Fetch communities for sitemap
    const communities = await CommunityService.getAllCommunities({ limit: 1000 });
    if (Array.isArray(communities)) {
      dynamicPages = [...dynamicPages, ...communities.map(community => ({
        url: `/communities/${community.slug || community.id}`,
        priority: '0.6',
        changefreq: 'weekly'
      }))];
    }
  } catch (error) {
    console.error('Error fetching communities for sitemap:', error);
    // Add some sample community URLs as fallback
    for (let i = 1; i <= 10; i++) {
      dynamicPages.push({
        url: `/communities/community-${i}`,
        priority: '0.6',
        changefreq: 'weekly'
      });
    }
  }

  // Combine static and dynamic pages
  const allPages = [...staticPages, ...dynamicPages];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${allPages
    .map(({ url, priority, changefreq }) => {
      return `
    <url>
      <loc>${SITE_URL}${url}</loc>
      <lastmod>${new Date().toISOString()}</lastmod>
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
  const sitemap = await generateSiteMap();

  res.setHeader('Content-Type', 'text/xml');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate');
  res.write(sitemap);
  res.end();

  return {
    props: {},
  };
};

export default function SiteMap() {
  return null;
}