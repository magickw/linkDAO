# Google Search Console - 404 and Redirect Issues

## Current Status

According to Google Search Console:

| Issue | Source | Status | Count |
|-------|--------|--------|-------|
| **Not found (404)** | Website | Failed | 5 pages |
| **Page with redirect** | Website | Failed | 1 page |
| **Alternate page with proper canonical tag** | Website | Started | 1 page ✅ |
| **Duplicate without user-selected canonical** | Google systems | N/A | 0 ✅ |
| **Crawled - currently not indexed** | Google systems | N/A | 0 ✅ |

## Good News

1. ✅ **No more "Crawled - currently not indexed"** - The sitemap and SEO improvements worked!
2. ✅ **No duplicate content issues** - Canonical tags are working correctly
3. ✅ **1 page started indexing** - Progress is being made

## Issues to Fix

### Priority 1: Fix 5 Pages Returning 404 Errors

**What This Means:**
Google is trying to crawl URLs that return "404 Not Found" errors. This could be:
- Old pages that were removed
- Broken links in the sitemap
- URLs that were never created
- Dynamic routes that aren't properly handled

**How to Identify the 404 Pages:**

1. **In Google Search Console:**
   - Go to **Coverage** → **Excluded** → **Not found (404)**
   - Click to see the exact URLs that are 404ing
   - Export the list

2. **Check Your Sitemap:**
   - Visit `https://linkdao.io/sitemap.xml`
   - Verify all URLs in the sitemap actually exist
   - Remove any URLs that return 404

**Common Causes:**

1. **Dead Links in Sitemap** - Sitemap lists pages that don't exist
2. **Old Internal Links** - Links from other pages pointing to deleted content
3. **URL Structure Changes** - Routes were renamed but old URLs aren't redirected
4. **Dynamic Routes Not Rendering** - Pages like `/blog/[slug]` need actual content

**Solutions:**

#### Option 1: Create Missing Pages

If the URLs should exist:
```bash
# Create the missing pages
# Example: If /blog/post-1 is 404ing, create it
```

#### Option 2: Remove from Sitemap

If the URLs are outdated:
```typescript
// Remove the dead URLs from src/pages/sitemap.xml.tsx
const STATIC_PAGES = [
  // Remove entries like:
  // { url: '/old-page', changefreq: 'monthly', priority: 0.5 }, ❌
];
```

#### Option 3: Add 301 Redirects

If URLs changed, redirect old to new:
```javascript
// In next.config.js
async redirects() {
  return [
    {
      source: '/old-url',
      destination: '/new-url',
      permanent: true, // 301 redirect
    },
  ];
}
```

### Priority 2: Fix Page with Redirect

**What This Means:**
One page is redirecting to another URL. Google prefers direct links rather than redirect chains.

**How to Fix:**

1. **Identify the redirecting page** in Google Search Console
2. **Update the sitemap** to use the final destination URL instead
3. **Update internal links** to point directly to the final URL

**Example:**

❌ **Before:**
- Sitemap has: `https://linkdao.io/blog` → redirects to → `https://linkdao.io/blog/latest`

✅ **After:**
- Sitemap has: `https://linkdao.io/blog/latest` (direct link)

## Action Plan

### Step 1: Identify the 404 Pages ⏳

1. Open Google Search Console
2. Navigate to: **Coverage** → **Excluded** → **Not found (404)**
3. Export the list of 5 URLs
4. Analyze each URL:
   - Should this page exist?
   - Is it in the sitemap?
   - Is it linked from anywhere?

### Step 2: Fix Each 404 Page ⏳

For each of the 5 URLs:

**Option A: Create the page** (if it should exist)
**Option B: Remove from sitemap** (if it's outdated)
**Option C: Add 301 redirect** (if URL changed)

### Step 3: Fix the Redirect Issue ⏳

1. Identify which page is redirecting
2. Update sitemap to use final destination URL
3. Update any internal links
4. Test that the final URL works without redirects

### Step 4: Verify Sitemap Accuracy ⏳

Check that every URL in sitemap actually exists:

```bash
# Test each URL in the sitemap
curl -I https://linkdao.io/
curl -I https://linkdao.io/marketplace
curl -I https://linkdao.io/governance
curl -I https://linkdao.io/communities
curl -I https://linkdao.io/dashboard
curl -I https://linkdao.io/docs
curl -I https://linkdao.io/docs/getting-started
curl -I https://linkdao.io/docs/wallet-security
curl -I https://linkdao.io/docs/troubleshooting
curl -I https://linkdao.io/docs/ldao-token-guide
curl -I https://linkdao.io/docs/marketplace-guide
curl -I https://linkdao.io/docs/governance-guide
curl -I https://linkdao.io/support
curl -I https://linkdao.io/support/faq
curl -I https://linkdao.io/support/contact
curl -I https://linkdao.io/support/guides
curl -I https://linkdao.io/support/documents
curl -I https://linkdao.io/blog
curl -I https://linkdao.io/trending
curl -I https://linkdao.io/search
curl -I https://linkdao.io/terms
curl -I https://linkdao.io/privacy
curl -I https://linkdao.io/token
curl -I https://linkdao.io/charity-dashboard
```

**Expected:** All should return `HTTP/1.1 200 OK` or `HTTP/2 200`
**Problem:** Any returning `404 Not Found` should be fixed

### Step 5: Check for Broken Internal Links ⏳

Search your codebase for links to the 404ing pages:

```bash
# Example: If /old-page is 404ing
grep -r "href=\"/old-page\"" src/
grep -r "href='/old-page'" src/
```

Remove or update these links.

### Step 6: Request Re-Indexing ⏳

After fixes:
1. Submit updated sitemap to Google Search Console
2. Use **URL Inspection Tool** for each fixed page
3. Click **Request Indexing**

## Common 404 Scenarios

### Scenario 1: Dynamic Blog Posts Without Content

**Problem:**
```typescript
// Sitemap lists: /blog/getting-started
// But no blog post with that slug exists in database
```

**Solution:**
- Only add dynamic routes to sitemap if content exists
- Fetch actual blog posts and generate sitemap dynamically

### Scenario 2: Removed Pages Still in Sitemap

**Problem:**
```typescript
// Sitemap has: /wallet
// But that page was removed or renamed to /token
```

**Solution:**
```typescript
// Remove from sitemap
{ url: '/wallet', changefreq: 'weekly', priority: 0.7 }, // ❌ Remove

// Or add redirect
async redirects() {
  return [
    {
      source: '/wallet',
      destination: '/token',
      permanent: true,
    },
  ];
}
```

### Scenario 3: Case Sensitivity Issues

**Problem:**
```typescript
// Sitemap has: /Marketplace
// But Next.js route is: /marketplace
```

**Solution:**
- Ensure consistent lowercase URLs
- Add redirects for case variations if needed

### Scenario 4: Trailing Slash Inconsistency

**Problem:**
```typescript
// Sitemap has: /marketplace/
// Site redirects to: /marketplace (without trailing slash)
```

**Solution:**
```javascript
// In next.config.js
trailingSlash: false, // Consistent - no trailing slashes
```

## Next.js Specific Fixes

### Update next.config.js for Better SEO

```javascript
module.exports = {
  // Ensure consistent URLs
  trailingSlash: false,

  // Add redirects for old URLs
  async redirects() {
    return [
      {
        source: '/old-marketplace',
        destination: '/marketplace',
        permanent: true, // 301
      },
    ];
  },

  // Custom 404 page
  async rewrites() {
    return {
      fallback: [
        {
          source: '/:path*',
          destination: '/404',
        },
      ],
    };
  },
};
```

### Create Custom 404 Page

```typescript
// src/pages/404.tsx
import Link from 'next/link';
import Layout from '@/components/Layout';

export default function Custom404() {
  return (
    <Layout title="Page Not Found">
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-gray-900 dark:text-white">404</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mt-4">
            This page doesn't exist
          </p>
          <Link href="/">
            <a className="mt-6 inline-block px-6 py-3 bg-primary-600 text-white rounded-lg">
              Go Home
            </a>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
```

## Expected Timeline

- **Immediate:** Identify the 5 URLs and analyze
- **Today:** Fix all 404 errors and redirect issues
- **Tomorrow:** Submit fixes to Google Search Console
- **Week 1:** Google re-crawls fixed pages
- **Week 2-3:** Pages start getting indexed
- **Month 1:** All pages successfully indexed

## Monitoring

After fixes, track in Google Search Console:

1. **Coverage Report:**
   - ✅ "Not found (404)" should drop to 0
   - ✅ "Page with redirect" should drop to 0
   - ✅ "Valid" pages should increase

2. **URL Inspection:**
   - Test each previously-404 URL
   - Verify returns 200 OK
   - Request indexing

3. **Performance:**
   - Monitor impressions increasing
   - Check click-through rate
   - Track average position

---

## Instructions for Next Steps

Please provide:

1. **The exact URLs that are returning 404**
   - From Google Search Console → Coverage → Not found (404)
   - Export as CSV or list them

2. **The URL that has a redirect**
   - From Google Search Console → Coverage → Page with redirect
   - What is the source URL and destination URL?

With this information, I can:
- Fix the specific pages
- Add necessary redirects
- Update the sitemap
- Ensure all URLs work correctly

---

**Date**: 2025-11-23
**Status**: ⚠️ Awaiting URL list from Google Search Console
**Priority**: 🔴 High - Blocking indexing
**Impact**: 📈 Fixing these will improve search visibility significantly
