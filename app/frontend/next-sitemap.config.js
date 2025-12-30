/** @type {import('next-sitemap').IConfig} */
module.exports = {
    siteUrl: process.env.SITE_URL || 'https://linkdao.io',
    generateRobotsTxt: true,
    exclude: ['/server-sitemap.xml', '/dashboard/*', '/admin/*'],
    robotsTxtOptions: {
        additionalSitemaps: [
            'https://linkdao.io/server-sitemap.xml', // For dynamic server-side sitemaps if needed later
        ],
    },
}
