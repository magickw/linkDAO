import { charityVerificationService } from '@/services/charityVerificationService';

// Mock axios
jest.mock('axios');
const axios = require('axios');

describe('charityVerificationService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        charityVerificationService.clearCache();
        charityVerificationService.resetRequestCount();
    });

    describe('searchCharity', () => {
        it('should search charities by name', async () => {
            const mockResponse = {
                data: {
                    data: {
                        publicSearchFaceted: {
                            organizations: [
                                {
                                    ein: '123456789',
                                    charityName: 'Test Charity',
                                    mission: 'Help people',
                                    websiteURL: 'https://testcharity.org',
                                    overallRating: 4,
                                    category: { categoryName: 'Health' }
                                }
                            ]
                        }
                    }
                }
            };

            axios.post.mockResolvedValue(mockResponse);

            const results = await charityVerificationService.searchCharity('Test Charity');

            expect(results).toHaveLength(1);
            expect(results[0].charityName).toBe('Test Charity');
            expect(results[0].ein).toBe('123456789');
            expect(axios.post).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    variables: { query: 'Test Charity', limit: 10 }
                }),
                expect.any(Object)
            );
        });

        it('should return empty array for short queries', async () => {
            const results = await charityVerificationService.searchCharity('a');
            expect(results).toEqual([]);
            expect(axios.post).not.toHaveBeenCalled();
        });

        it('should cache search results', async () => {
            const mockResponse = {
                data: {
                    data: {
                        publicSearchFaceted: {
                            organizations: [{ ein: '123456789', charityName: 'Test' }]
                        }
                    }
                }
            };

            axios.post.mockResolvedValue(mockResponse);

            // First call
            await charityVerificationService.searchCharity('Test');
            expect(axios.post).toHaveBeenCalledTimes(1);

            // Second call should use cache
            await charityVerificationService.searchCharity('Test');
            expect(axios.post).toHaveBeenCalledTimes(1);
        });

        it('should handle API errors gracefully', async () => {
            axios.post.mockRejectedValue(new Error('API Error'));

            const results = await charityVerificationService.searchCharity('Test');
            expect(results).toEqual([]);
        });
    });

    describe('getCharityByEIN', () => {
        it('should fetch charity by valid EIN', async () => {
            const mockResponse = {
                data: {
                    data: {
                        organization: {
                            ein: '123456789',
                            charityName: 'Test Charity',
                            mission: 'Help people',
                            overallRating: 4
                        }
                    }
                }
            };

            axios.post.mockResolvedValue(mockResponse);

            const charity = await charityVerificationService.getCharityByEIN('12-3456789');

            expect(charity).toBeTruthy();
            expect(charity?.ein).toBe('123456789');
            expect(axios.post).toHaveBeenCalled();
        });

        it('should normalize EIN before lookup', async () => {
            const mockResponse = {
                data: { data: { organization: { ein: '123456789' } } }
            };

            axios.post.mockResolvedValue(mockResponse);

            await charityVerificationService.getCharityByEIN('12-3456789');

            expect(axios.post).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    variables: { ein: '123456789' }
                }),
                expect.any(Object)
            );
        });

        it('should reject invalid EIN format', async () => {
            await expect(
                charityVerificationService.getCharityByEIN('invalid')
            ).rejects.toThrow('Invalid EIN format');
        });

        it('should cache EIN lookups', async () => {
            const mockResponse = {
                data: { data: { organization: { ein: '123456789' } } }
            };

            axios.post.mockResolvedValue(mockResponse);

            await charityVerificationService.getCharityByEIN('123456789');
            await charityVerificationService.getCharityByEIN('123456789');

            expect(axios.post).toHaveBeenCalledTimes(1);
        });
    });

    describe('verifyCharity', () => {
        it('should return verification result for valid charity', async () => {
            const mockCharity = {
                ein: '123456789',
                charityName: 'Test Charity',
                overallRating: 4,
                alertLevel: 'NONE'
            };

            const mockResponse = {
                data: { data: { organization: mockCharity } }
            };

            axios.post.mockResolvedValue(mockResponse);

            const result = await charityVerificationService.verifyCharity('123456789');

            expect(result).toBeTruthy();
            expect(result?.isVerified).toBe(true);
            expect(result?.rating).toBe(4);
            expect(result?.source).toBe('charity_navigator');
        });

        it('should return null for non-existent charity', async () => {
            const mockResponse = {
                data: { data: { organization: null } }
            };

            axios.post.mockResolvedValue(mockResponse);

            const result = await charityVerificationService.verifyCharity('999999999');
            expect(result).toBeNull();
        });
    });

    describe('rate limiting', () => {
        it('should track request count', async () => {
            const mockResponse = {
                data: { data: { publicSearchFaceted: { organizations: [] } } }
            };

            axios.post.mockResolvedValue(mockResponse);

            expect(charityVerificationService.getRequestCount()).toBe(0);

            await charityVerificationService.searchCharity('Test');
            expect(charityVerificationService.getRequestCount()).toBe(1);

            await charityVerificationService.searchCharity('Another');
            expect(charityVerificationService.getRequestCount()).toBe(2);
        });

        it('should throw error when rate limit exceeded', async () => {
            // Set request count to max
            for (let i = 0; i < 1000; i++) {
                (charityVerificationService as any).requestCount++;
            }

            await expect(
                charityVerificationService.searchCharity('Test')
            ).rejects.toThrow('Daily API request limit reached');
        });

        it('should reset request count', () => {
            (charityVerificationService as any).requestCount = 100;
            charityVerificationService.resetRequestCount();
            expect(charityVerificationService.getRequestCount()).toBe(0);
        });
    });

    describe('caching', () => {
        it('should clear all cache', async () => {
            const mockResponse = {
                data: { data: { publicSearchFaceted: { organizations: [] } } }
            };

            axios.post.mockResolvedValue(mockResponse);

            await charityVerificationService.searchCharity('Test');
            expect(axios.post).toHaveBeenCalledTimes(1);

            charityVerificationService.clearCache();

            await charityVerificationService.searchCharity('Test');
            expect(axios.post).toHaveBeenCalledTimes(2);
        });
    });
});
