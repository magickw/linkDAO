import { GetServerSideProps } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://linkdao.io';

function generateSiteMap() {
  const staticPages = [
    { url: '', priority: '1.0', changefreq: 'daily' },
    { url: '/dao', priority: '0.9', changefreq: 'daily' },
    { url: '/marketplace', priority: '0.9', changefreq: 'daily' },
    { url: '/governance', priority: '0.8', changefreq: 'weekly' },
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

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${staticPages
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
  const sitemap = generateSiteMap();

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