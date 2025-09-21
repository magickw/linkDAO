// Preview Sandbox Worker
// This worker provides a sandboxed environment for processing preview data

self.onmessage = function(e) {
  const { type, data, id } = e.data;
  
  try {
    switch (type) {
      case 'PROCESS_HTML':
        processHTML(data, id);
        break;
      case 'EXTRACT_METADATA':
        extractMetadata(data, id);
        break;
      case 'VALIDATE_URL':
        validateUrl(data, id);
        break;
      default:
        postMessage({
          id,
          error: 'Unknown operation type'
        });
    }
  } catch (error) {
    postMessage({
      id,
      error: error.message
    });
  }
};

function processHTML(htmlContent, id) {
  try {
    // Create a temporary DOM parser (limited functionality in worker)
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    // Extract basic metadata safely
    const metadata = {
      title: extractTitle(doc),
      description: extractDescription(doc),
      image: extractImage(doc),
      siteName: extractSiteName(doc),
      favicon: extractFavicon(doc)
    };
    
    postMessage({
      id,
      result: metadata
    });
  } catch (error) {
    postMessage({
      id,
      error: 'HTML processing failed: ' + error.message
    });
  }
}

function extractTitle(doc) {
  // Try Open Graph title first
  let title = getMetaContent(doc, 'property', 'og:title');
  
  // Try Twitter title
  if (!title) {
    title = getMetaContent(doc, 'name', 'twitter:title');
  }
  
  // Try regular title tag
  if (!title) {
    const titleEl = doc.querySelector('title');
    title = titleEl ? titleEl.textContent : null;
  }
  
  return title ? title.trim() : 'No Title';
}

function extractDescription(doc) {
  // Try Open Graph description
  let description = getMetaContent(doc, 'property', 'og:description');
  
  // Try Twitter description
  if (!description) {
    description = getMetaContent(doc, 'name', 'twitter:description');
  }
  
  // Try meta description
  if (!description) {
    description = getMetaContent(doc, 'name', 'description');
  }
  
  return description ? description.trim() : '';
}

function extractImage(doc) {
  // Try Open Graph image
  let image = getMetaContent(doc, 'property', 'og:image');
  
  // Try Twitter image
  if (!image) {
    image = getMetaContent(doc, 'name', 'twitter:image');
  }
  
  return image || '';
}

function extractSiteName(doc) {
  // Try Open Graph site name
  let siteName = getMetaContent(doc, 'property', 'og:site_name');
  
  // Try application name
  if (!siteName) {
    siteName = getMetaContent(doc, 'name', 'application-name');
  }
  
  return siteName || '';
}

function extractFavicon(doc) {
  const faviconSelectors = [
    'link[rel="icon"]',
    'link[rel="shortcut icon"]',
    'link[rel="apple-touch-icon"]'
  ];
  
  for (const selector of faviconSelectors) {
    const link = doc.querySelector(selector);
    if (link && link.href) {
      return link.href;
    }
  }
  
  return '';
}

function getMetaContent(doc, attribute, value) {
  const meta = doc.querySelector(`meta[${attribute}="${value}"]`);
  return meta ? meta.getAttribute('content') : null;
}

function extractMetadata(content, id) {
  try {
    // Extract structured data and other metadata
    const metadata = {};
    
    // Try to parse JSON-LD
    const jsonLdMatches = content.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis);
    if (jsonLdMatches) {
      try {
        metadata.jsonLd = JSON.parse(jsonLdMatches[0].replace(/<script[^>]*>|<\/script>/gi, ''));
      } catch (e) {
        // Ignore invalid JSON-LD
      }
    }
    
    // Extract other useful metadata
    metadata.hasVideo = content.includes('<video') || content.includes('og:video');
    metadata.hasAudio = content.includes('<audio') || content.includes('og:audio');
    metadata.wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).length;
    
    postMessage({
      id,
      result: metadata
    });
  } catch (error) {
    postMessage({
      id,
      error: 'Metadata extraction failed: ' + error.message
    });
  }
}

function validateUrl(url, id) {
  try {
    const urlObj = new URL(url);
    
    const validation = {
      isValid: true,
      protocol: urlObj.protocol,
      hostname: urlObj.hostname,
      isSecure: urlObj.protocol === 'https:',
      isLocalhost: urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1',
      isIP: /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(urlObj.hostname),
      hasPort: urlObj.port !== '',
      port: urlObj.port
    };
    
    postMessage({
      id,
      result: validation
    });
  } catch (error) {
    postMessage({
      id,
      result: {
        isValid: false,
        error: error.message
      }
    });
  }
}

// Security: Prevent access to sensitive APIs
delete self.fetch;
delete self.XMLHttpRequest;
delete self.WebSocket;
delete self.indexedDB;
delete self.localStorage;
delete self.sessionStorage;

// Log that the worker is ready
console.log('Preview sandbox worker initialized');