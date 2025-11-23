/**
 * Dynamic Sitemap Generator for LinkDAO
 * Generates XML sitemap for search engine crawling
 */

import { GetServerSideProps } from 'next';

// Define your site's pages with their priorities and change frequencies
const STATIC_PAGES = [
  { url: '/', changefreq: 'daily', priority: 1.0 },
  { url: '/marketplace', changefreq: 'daily', priority: 0.9 },
  { url: '/governance', changefreq: 'weekly', priority: 0.8 },
  { url: '/communities', changefreq: 'daily', priority: 0.8 },
  { url: '/dashboard', changefreq: 'daily', priority: 0.7 },
  { url: '/docs', changefreq: 'weekly', priority: 0.7 },
  { url: '/docs/getting-started', changefreq: 'weekly', priority: 0.7 },
  { url: '/docs/wallet-security', changefreq: 'weekly', priority: 0.7 },
  { url: '/docs/troubleshooting', changefreq: 'weekly', priority: 0.7 },
  { url: '/docs/ldao-token-guide', changefreq: 'weekly', priority: 0.7 },
  { url: '/docs/marketplace-guide', changefreq: 'weekly', priority: 0.7 },
  { url: '/docs/governance-guide', changefreq: 'weekly', priority: 0.7 },
  { url: '/support', changefreq: 'weekly', priority: 0.6 },
  { url: '/support/faq', changefreq: 'weekly', priority: 0.6 },
  { url: '/support/contact', changefreq: 'monthly', priority: 0.5 },
  { url: '/support/guides', changefreq: 'weekly', priority: 0.6 },
  { url: '/support/documents', changefreq: 'weekly', priority: 0.5 },
  { url: '/blog', changefreq: 'daily', priority: 0.7 },
  { url: '/trending', changefreq: 'hourly', priority: 0.8 },
  { url: '/search', changefreq: 'daily', priority: 0.6 },
  { url: '/terms', changefreq: 'monthly', priority: 0.3 },
  { url: '/privacy', changefreq: 'monthly', priority: 0.3 },
  { url: '/token', changefreq: 'weekly', priority: 0.7 },
  { url: '/charity-dashboard', changefreq: 'weekly', priority: 0.6 },
];

function generateSiteMap(): string {
  const baseUrl = 'https://linkdao.io';

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  ${STATIC_PAGES
    .map(({ url, changefreq, priority }) => {
      return `
  <url>
    <loc>${baseUrl}${url}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
    })
    .join('')}
</urlset>`;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  // Generate the XML sitemap
  const sitemap = generateSiteMap();

  res.setHeader('Content-Type', 'text/xml');
  // Cache for 1 hour
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate');
  res.write(sitemap);
  res.end();

  return {
    props: {},
  };
};

// Default export to prevent Next.js error
export default function Sitemap() {
  return null;
}
