import axios from 'axios';

const CHARITY_NAVIGATOR_API_URL = process.env.NEXT_PUBLIC_CHARITY_NAVIGATOR_API_URL || 'https://api.charitynavigator.org/v1/graphql';
const CHARITY_NAVIGATOR_API_KEY = process.env.NEXT_PUBLIC_CHARITY_NAVIGATOR_API_KEY;

export interface CharitySearchResult {
    ein: string;
    charityName: string;
    mission: string;
    websiteURL?: string;
    mailingAddress?: {
        streetAddress1?: string;
        city?: string;
        stateOrProvince?: string;
        postalCode?: string;
    };
    overallRating?: number;
    overallScore?: number;
    alertLevel?: string;
    category?: {
        categoryName?: string;
    };
}

export interface CharityDetails extends CharitySearchResult {
    financialData?: {
        totalRevenue?: number;
        totalExpenses?: number;
        programExpenses?: number;
    };
    beaconRatings?: {
        impactAndResults?: number;
        leadership?: number;
        cultureAndCommunity?: number;
        finance?: number;
    };
}

export interface CharityVerificationResult {
    isVerified: boolean;
    rating?: number;
    alertLevel?: string;
    source: 'charity_navigator' | 'manual';
    verifiedAt: Date;
    details?: CharityDetails;
}

class CharityVerificationService {
    private cache = new Map<string, { data: any; timestamp: number }>();
    private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour
    private requestCount = 0;
    private readonly MAX_REQUESTS_PER_DAY = 1000;

    /**
     * Check if API key is configured
     */
    private isConfigured(): boolean {
        return !!CHARITY_NAVIGATOR_API_KEY;
    }

    /**
     * Check rate limit
     */
    private checkRateLimit(): void {
        if (this.requestCount >= this.MAX_REQUESTS_PER_DAY) {
            throw new Error('Daily API request limit reached (1,000 requests/day)');
        }
    }

    /**
     * Get cached data if available and not expired
     */
    private getFromCache<T>(key: string): T | null {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return cached.data as T;
        }
        return null;
    }

    /**
     * Store data in cache
     */
    private setCache(key: string, data: any): void {
        this.cache.set(key, { data, timestamp: Date.now() });
    }

    /**
     * Execute GraphQL query
     */
    private async executeQuery<T>(query: string, variables: Record<string, any> = {}): Promise<T> {
        if (!this.isConfigured()) {
            throw new Error('Charity Navigator API key not configured');
        }

        this.checkRateLimit();

        try {
            const response = await axios.post(
                CHARITY_NAVIGATOR_API_URL,
                { query, variables },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Ocp-Apim-Subscription-Key': CHARITY_NAVIGATOR_API_KEY,
                    },
                }
            );

            this.requestCount++;

            if (response.data.errors) {
                throw new Error(response.data.errors[0].message);
            }

            return response.data.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 429) {
                    throw new Error('Rate limit exceeded. Please try again later.');
                }
                throw new Error(`API request failed: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * Search charities by name
     */
    async searchCharity(query: string, limit: number = 10): Promise<CharitySearchResult[]> {
        if (!query || query.trim().length < 2) {
            return [];
        }

        const cacheKey = `search:${query}:${limit}`;
        const cached = this.getFromCache<CharitySearchResult[]>(cacheKey);
        if (cached) {
            return cached;
        }

        const graphqlQuery = `
      query SearchCharities($query: String!, $limit: Int!) {
        publicSearchFaceted(
          searchTerm: $query
          pageSize: $limit
        ) {
          organizations {
            ein
            charityName
            mission
            websiteURL
            mailingAddress {
              streetAddress1
              city
              stateOrProvince
              postalCode
            }
            overallRating
            overallScore
            alertLevel
            category {
              categoryName
            }
          }
        }
      }
    `;

        try {
            const result = await this.executeQuery<{ publicSearchFaceted: { organizations: CharitySearchResult[] } }>(
                graphqlQuery,
                { query, limit }
            );

            const charities = result.publicSearchFaceted?.organizations || [];
            this.setCache(cacheKey, charities);
            return charities;
        } catch (error) {
            console.error('Charity search failed:', error);
            return [];
        }
    }

    /**
     * Get charity details by EIN
     */
    async getCharityByEIN(ein: string): Promise<CharityDetails | null> {
        if (!ein || !/^\d{9}$/.test(ein.replace(/-/g, ''))) {
            throw new Error('Invalid EIN format. EIN should be 9 digits.');
        }

        const normalizedEIN = ein.replace(/-/g, '');
        const cacheKey = `ein:${normalizedEIN}`;
        const cached = this.getFromCache<CharityDetails>(cacheKey);
        if (cached) {
            return cached;
        }

        const graphqlQuery = `
      query GetCharityByEIN($ein: String!) {
        organization(ein: $ein) {
          ein
          charityName
          mission
          websiteURL
          mailingAddress {
            streetAddress1
            city
            stateOrProvince
            postalCode
          }
          overallRating
          overallScore
          alertLevel
          category {
            categoryName
          }
          financialData {
            totalRevenue
            totalExpenses
            programExpenses
          }
          beaconRatings {
            impactAndResults
            leadership
            cultureAndCommunity
            finance
          }
        }
      }
    `;

        try {
            const result = await this.executeQuery<{ organization: CharityDetails }>(
                graphqlQuery,
                { ein: normalizedEIN }
            );

            const charity = result.organization;
            if (charity) {
                this.setCache(cacheKey, charity);
            }
            return charity;
        } catch (error) {
            console.error('Failed to fetch charity by EIN:', error);
            return null;
        }
    }

    /**
     * Verify charity and get verification result
     */
    async verifyCharity(ein: string): Promise<CharityVerificationResult | null> {
        const charity = await this.getCharityByEIN(ein);

        if (!charity) {
            return null;
        }

        return {
            isVerified: true,
            rating: charity.overallRating,
            alertLevel: charity.alertLevel,
            source: 'charity_navigator',
            verifiedAt: new Date(),
            details: charity,
        };
    }

    /**
     * Get charity details for display
     */
    async getCharityDetails(ein: string): Promise<CharityDetails | null> {
        return this.getCharityByEIN(ein);
    }

    /**
     * Clear cache
     */
    clearCache(): void {
        this.cache.clear();
    }

    /**
     * Get current request count
     */
    getRequestCount(): number {
        return this.requestCount;
    }

    /**
     * Reset request count (should be called daily)
     */
    resetRequestCount(): void {
        this.requestCount = 0;
    }
}

export const charityVerificationService = new CharityVerificationService();
