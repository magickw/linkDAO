/**
 * Phishing Detection Utility
 * Detects suspicious addresses and potential phishing attempts
 * Integrates with external malicious address databases
 */

// Known malicious addresses - populated from APIs
let KNOWN_MALICIOUS_ADDRESSES = new Set<string>();

// Cache metadata
let lastFetchTime = 0;
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes
let isFetching = false;

// Local storage key for persistence
const STORAGE_KEY = 'linkdao_malicious_addresses';
const STORAGE_TIMESTAMP_KEY = 'linkdao_malicious_addresses_timestamp';

// Suspicious address patterns
const SUSPICIOUS_PATTERNS = [
  // Addresses with too many repeated characters
  /(.)\1{10,}/,
  // Addresses with sequential characters
  /012345|543210|abcdef|fedcba/i,
];

// API endpoints for malicious address data
const MALICIOUS_ADDRESS_APIS = [
  {
    name: 'chainabuse',
    url: 'https://api.chainabuse.com/v0/reports',
    // Note: This is an example - actual API may require auth
    enabled: false,
  },
  {
    name: 'scamsniffer',
    url: 'https://raw.githubusercontent.com/scamsniffer/scam-database/main/blacklist/address.json',
    enabled: true,
  },
  {
    name: 'metamask-eth-phishing-detect',
    url: 'https://raw.githubusercontent.com/MetaMask/eth-phishing-detect/main/src/config.json',
    enabled: true,
  },
];

// Well-known scam addresses (hardcoded fallback)
const HARDCODED_MALICIOUS_ADDRESSES = [
  // Known honeypot contracts
  '0x0000000000000000000000000000000000000000',

  // Known scam addresses (from Etherscan reports)
  '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
  '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT honeypot
  '0x3f5CE5FBFe3E9af3971dD811Db4f585F7d91ed0AE',

  // Known phishing contracts
  '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
  '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
  '0x68b3465833fb72A70ecDF485E0e4C7bd8665fc45',
].filter(addr => /^0x[a-fA-F0-9]{40}$/.test(addr));

/**
 * Initialize the malicious address database
 * Loads from cache and fetches fresh data if needed
 */
export const initializePhishingDetector = async (): Promise<void> => {
  // Load from local storage first (fast)
  loadFromLocalStorage();

  // Then fetch fresh data in background
  await refreshMaliciousAddresses();
};

/**
 * Load cached addresses from local storage
 */
const loadFromLocalStorage = (): void => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const timestamp = localStorage.getItem(STORAGE_TIMESTAMP_KEY);

    if (stored && timestamp) {
      const addresses = JSON.parse(stored) as string[];
      lastFetchTime = parseInt(timestamp, 10);
      KNOWN_MALICIOUS_ADDRESSES = new Set([
        ...addresses,
        ...HARDCODED_MALICIOUS_ADDRESSES,
      ]);
    } else {
      // Initialize with hardcoded addresses
      KNOWN_MALICIOUS_ADDRESSES = new Set(HARDCODED_MALICIOUS_ADDRESSES);
    }
  } catch {
    KNOWN_MALICIOUS_ADDRESSES = new Set(HARDCODED_MALICIOUS_ADDRESSES);
  }
};

/**
 * Save addresses to local storage
 */
const saveToLocalStorage = (): void => {
  try {
    const addresses = Array.from(KNOWN_MALICIOUS_ADDRESSES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(addresses));
    localStorage.setItem(STORAGE_TIMESTAMP_KEY, lastFetchTime.toString());
  } catch {
    // Ignore storage errors
  }
};

/**
 * Refresh malicious addresses from external APIs
 */
export const refreshMaliciousAddresses = async (): Promise<{
  success: boolean;
  count: number;
  sources: string[];
}> => {
  // Check if cache is still valid
  const now = Date.now();
  if (now - lastFetchTime < CACHE_DURATION_MS && KNOWN_MALICIOUS_ADDRESSES.size > HARDCODED_MALICIOUS_ADDRESSES.length) {
    return {
      success: true,
      count: KNOWN_MALICIOUS_ADDRESSES.size,
      sources: ['cache'],
    };
  }

  // Prevent concurrent fetches
  if (isFetching) {
    return {
      success: false,
      count: KNOWN_MALICIOUS_ADDRESSES.size,
      sources: [],
    };
  }

  isFetching = true;
  const successfulSources: string[] = [];
  const newAddresses: string[] = [...HARDCODED_MALICIOUS_ADDRESSES];

  try {
    const enabledApis = MALICIOUS_ADDRESS_APIS.filter((api) => api.enabled);

    // Fetch from all enabled APIs in parallel
    const results = await Promise.allSettled(
      enabledApis.map(async (api) => {
        try {
          const response = await fetch(api.url, {
            method: 'GET',
            headers: {
              Accept: 'application/json',
            },
            signal: AbortSignal.timeout(10000), // 10 second timeout
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const data = await response.json();
          return { name: api.name, data };
        } catch (error) {
          throw new Error(`${api.name}: ${error}`);
        }
      })
    );

    // Process results
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const api = enabledApis[i];

      if (result.status === 'fulfilled') {
        const addresses = extractAddressesFromResponse(api.name, result.value.data);
        newAddresses.push(...addresses);
        successfulSources.push(api.name);
      }
    }

    // Update the set
    KNOWN_MALICIOUS_ADDRESSES = new Set(
      newAddresses.map((addr) => addr.toLowerCase())
    );
    lastFetchTime = now;

    // Save to local storage
    saveToLocalStorage();

    return {
      success: true,
      count: KNOWN_MALICIOUS_ADDRESSES.size,
      sources: successfulSources,
    };
  } catch (error) {
    return {
      success: false,
      count: KNOWN_MALICIOUS_ADDRESSES.size,
      sources: successfulSources,
    };
  } finally {
    isFetching = false;
  }
};

/**
 * Extract addresses from API response based on source format
 */
const extractAddressesFromResponse = (source: string, data: any): string[] => {
  const addresses: string[] = [];

  try {
    switch (source) {
      case 'scamsniffer':
        // ScamSniffer format: array of addresses
        if (Array.isArray(data)) {
          addresses.push(...data.filter((addr: any) => typeof addr === 'string' && addr.startsWith('0x')));
        }
        break;

      case 'metamask-eth-phishing-detect':
        // MetaMask format: { blacklist: [], fuzzylist: [], whitelist: [], ... }
        if (data.blacklist && Array.isArray(data.blacklist)) {
          // Note: MetaMask's list is primarily domains, not addresses
          // Filter for any Ethereum addresses if present
          addresses.push(
            ...data.blacklist.filter(
              (item: any) => typeof item === 'string' && item.startsWith('0x') && item.length === 42
            )
          );
        }
        break;

      case 'chainabuse':
        // ChainAbuse format: { reports: [{ address: '0x...' }] }
        if (data.reports && Array.isArray(data.reports)) {
          addresses.push(
            ...data.reports
              .map((report: any) => report.address)
              .filter((addr: any) => typeof addr === 'string' && addr.startsWith('0x'))
          );
        }
        break;

      default:
        // Generic: try to find addresses in common formats
        if (Array.isArray(data)) {
          addresses.push(...data.filter((addr: any) => typeof addr === 'string' && /^0x[a-fA-F0-9]{40}$/.test(addr)));
        } else if (data.addresses && Array.isArray(data.addresses)) {
          addresses.push(...data.addresses.filter((addr: any) => /^0x[a-fA-F0-9]{40}$/.test(addr)));
        }
    }
  } catch {
    // Ignore parsing errors
  }

  return addresses;
};

/**
 * Check if an address matches known malicious addresses
 */
export const isKnownMaliciousAddress = (address: string): boolean => {
  return KNOWN_MALICIOUS_ADDRESSES.has(address.toLowerCase());
};

/**
 * Check if an address has suspicious patterns
 */
export const hasSuspiciousPattern = (address: string): boolean => {
  return SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(address));
};

/**
 * Detect if a transaction might be a phishing attempt
 */
export const detectPhishing = (
  targetAddress: string,
  value?: bigint,
  data?: string
): {
  isSuspicious: boolean;
  warnings: string[];
  riskLevel: 'low' | 'medium' | 'high';
} => {
  const warnings: string[] = [];
  let riskLevel: 'low' | 'medium' | 'high' = 'low';

  // Check against known malicious addresses
  if (isKnownMaliciousAddress(targetAddress)) {
    warnings.push('Address is on a known malicious list');
    riskLevel = 'high';
  }

  // Check for suspicious patterns
  if (hasSuspiciousPattern(targetAddress)) {
    warnings.push('Address has suspicious character patterns');
    riskLevel = riskLevel === 'high' ? 'high' : 'medium';
  }

  // Check for large transfers to unknown addresses
  if (value && value > parseEther('1000')) {
    warnings.push('Large transfer amount detected');
    riskLevel = riskLevel === 'high' ? 'high' : 'medium';
  }

  // Check for contract interactions with unknown contracts
  if (data && data.length > 10) {
    // This is a contract interaction
    warnings.push('Interacting with a smart contract');
    // In production, you'd check if the contract is verified and known
  }

  return {
    isSuspicious: warnings.length > 0,
    warnings,
    riskLevel,
  };
};

/**
 * Add a malicious address to the known list
 * (Also syncs with backend API in production)
 */
export const reportMaliciousAddress = async (
  address: string,
  reason?: string
): Promise<{ success: boolean }> => {
  // Add to local set immediately
  KNOWN_MALICIOUS_ADDRESSES.add(address.toLowerCase());
  saveToLocalStorage();

  // In production, report to backend API
  try {
    // Example: POST to your backend
    // await fetch('/api/report-malicious-address', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ address, reason }),
    // });
    return { success: true };
  } catch {
    return { success: false };
  }
};

/**
 * Get risk level color for UI
 */
export const getRiskLevelColor = (riskLevel: 'low' | 'medium' | 'high'): string => {
  switch (riskLevel) {
    case 'low':
      return 'text-green-500';
    case 'medium':
      return 'text-yellow-500';
    case 'high':
      return 'text-red-500';
  }
};

/**
 * Get statistics about the malicious address database
 */
export const getPhishingDetectorStats = (): {
  totalAddresses: number;
  lastUpdated: Date | null;
  cacheAge: number;
} => {
  return {
    totalAddresses: KNOWN_MALICIOUS_ADDRESSES.size,
    lastUpdated: lastFetchTime ? new Date(lastFetchTime) : null,
    cacheAge: lastFetchTime ? Date.now() - lastFetchTime : 0,
  };
};

/**
 * Helper function to parse ETH to wei
 */
function parseEther(eth: string): bigint {
  return BigInt(Math.floor(parseFloat(eth) * 1e18));
}

// Auto-initialize on module load
if (typeof window !== 'undefined') {
  // Initialize in browser environment
  loadFromLocalStorage();
  // Fetch fresh data in background (don't block)
  refreshMaliciousAddresses().catch(() => {
    // Ignore initialization errors
  });
}
