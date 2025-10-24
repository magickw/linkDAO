import { NextApiRequest, NextApiResponse } from 'next';

interface ClientInfo {
  ip: string;
  country?: string;
  city?: string;
  region?: string;
  timezone?: string;
  userAgent: string;
  acceptLanguage?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ClientInfo>
) {
  try {
    // Get client IP address from various headers
    const clientIP = getClientIP(req);

    // Get geolocation data
    const geoData = await getGeolocationData(clientIP);

    // Get other client info
    const userAgent = req.headers['user-agent'] || '';
    const acceptLanguage = req.headers['accept-language'];

    const clientInfo: ClientInfo = {
      ip: clientIP,
      country: geoData.country,
      city: geoData.city,
      region: geoData.region,
      timezone: geoData.timezone,
      userAgent,
      acceptLanguage
    };

    res.status(200).json(clientInfo);
  } catch (error) {
    console.error('Error getting client info:', error);
    res.status(500).json({
      ip: 'unknown',
      userAgent: req.headers['user-agent'] || ''
    });
  }
}

function getClientIP(req: NextApiRequest): string {
  // Check various headers for the real client IP
  const forwardedFor = req.headers['x-forwarded-for'];
  const realIP = req.headers['x-real-ip'];
  const cfConnectingIP = req.headers['cf-connecting-ip']; // Cloudflare
  const xClusterClientIP = req.headers['x-cluster-client-ip'];
  const xForwardedProto = req.headers['x-forwarded-proto'];

  // Cloudflare connecting IP is most reliable if available
  if (cfConnectingIP && typeof cfConnectingIP === 'string') {
    return cfConnectingIP;
  }

  // X-Real-IP is also reliable
  if (realIP && typeof realIP === 'string') {
    return realIP;
  }

  // X-Forwarded-For can contain multiple IPs, take the first one
  if (forwardedFor) {
    const forwarded = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    const ips = forwarded.split(',').map(ip => ip.trim());
    return ips[0];
  }

  // Cluster client IP
  if (xClusterClientIP && typeof xClusterClientIP === 'string') {
    return xClusterClientIP;
  }

  // Fallback to connection remote address
  return req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         '127.0.0.1';
}

async function getGeolocationData(ip: string): Promise<{
  country?: string;
  city?: string;
  region?: string;
  timezone?: string;
}> {
  try {
    // Skip localhost and private IPs
    if (ip === '127.0.0.1' || ip === '::1' ||
        ip.startsWith('192.168.') || ip.startsWith('10.') ||
        ip.startsWith('172.')) {
      return {};
    }

    // Try IP-API first (free, no key required)
    try {
      const response = await fetch(`https://ip-api.com/json/${ip}`);
      const data = await response.json();

      if (data.status === 'success') {
        return {
          country: data.country,
          city: data.city,
          region: data.regionName,
          timezone: data.timezone
        };
      }
    } catch (error) {
      console.warn('IP-API failed:', error);
    }

    // Try IPInfo as backup (may require API key for high volume)
    try {
      const apiKey = process.env.IPINFO_API_KEY;
      const url = apiKey
        ? `https://ipinfo.io/${ip}?token=${apiKey}`
        : `https://ipinfo.io/${ip}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.country) {
        return {
          country: data.country,
          city: data.city,
          region: data.region,
          timezone: data.timezone
        };
      }
    } catch (error) {
      console.warn('IPInfo failed:', error);
    }

    return {};
  } catch (error) {
    console.error('Error getting geolocation data:', error);
    return {};
  }
}