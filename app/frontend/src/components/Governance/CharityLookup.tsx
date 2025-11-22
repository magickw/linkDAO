import React, { useState, useCallback, useEffect } from 'react';
import { charityVerificationService, CharitySearchResult } from '@/services/charityVerificationService';
import { validateEIN, formatEIN } from '@/utils/linkValidator';

interface CharityLookupProps {
    onCharitySelect: (charity: CharitySearchResult) => void;
    disabled?: boolean;
}

export const CharityLookup: React.FC<CharityLookupProps> = ({
    onCharitySelect,
    disabled = false,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<CharitySearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [selectedCharity, setSelectedCharity] = useState<CharitySearchResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Debounced search
    useEffect(() => {
        if (searchQuery.length < 2) {
            setSearchResults([]);
            setShowResults(false);
            return;
        }

        const timer = setTimeout(async () => {
            await performSearch(searchQuery);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const performSearch = async (query: string) => {
        setIsSearching(true);
        setError(null);

        try {
            // Check if query is an EIN
            if (validateEIN(query)) {
                const charity = await charityVerificationService.getCharityByEIN(query);
                if (charity) {
                    setSearchResults([charity]);
                    setShowResults(true);
                } else {
                    setSearchResults([]);
                    setError('No charity found with this EIN');
                }
            } else {
                // Search by name
                const results = await charityVerificationService.searchCharity(query);
                setSearchResults(results);
                setShowResults(true);

                if (results.length === 0) {
                    setError('No charities found matching your search');
                }
            }
        } catch (err) {
            console.error('Search failed:', err);
            setError(err instanceof Error ? err.message : 'Search failed');
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectCharity = (charity: CharitySearchResult) => {
        setSelectedCharity(charity);
        setSearchQuery(charity.charityName);
        setShowResults(false);
        onCharitySelect(charity);
    };

    const handleClearSelection = () => {
        setSelectedCharity(null);
        setSearchQuery('');
        setSearchResults([]);
        setShowResults(false);
    };

    const getRatingStars = (rating?: number) => {
        if (!rating) return null;

        const stars = [];
        const fullStars = Math.floor(rating);

        for (let i = 0; i < 4; i++) {
            if (i < fullStars) {
                stars.push(
                    <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                );
            } else {
                stars.push(
                    <svg key={i} className="w-4 h-4 text-gray-300 fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                );
            }
        }

        return <div className="flex items-center">{stars}</div>;
    };

    return (
        <div className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search Charity (Charity Navigator)
            </label>

            <div className="relative">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => searchResults.length > 0 && setShowResults(true)}
                    disabled={disabled}
                    placeholder="Search by name or EIN..."
                    className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />

                {isSearching && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <svg className="animate-spin h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                )}

                {selectedCharity && !showResults && (
                    <button
                        onClick={handleClearSelection}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Search Results Dropdown */}
            {showResults && searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-96 overflow-y-auto">
                    {searchResults.map((charity) => (
                        <button
                            key={charity.ein}
                            onClick={() => handleSelectCharity(charity)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 last:border-b-0 transition-colors"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2 mb-1">
                                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                            {charity.charityName}
                                        </h4>
                                        {charity.overallRating && getRatingStars(charity.overallRating)}
                                    </div>

                                    {charity.mission && (
                                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-1">
                                            {charity.mission}
                                        </p>
                                    )}

                                    <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
                                        <span className="font-mono">EIN: {formatEIN(charity.ein)}</span>
                                        {charity.category?.categoryName && (
                                            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                                                {charity.category.categoryName}
                                            </span>
                                        )}
                                    </div>

                                    {charity.alertLevel && charity.alertLevel !== 'NONE' && (
                                        <div className="mt-1 flex items-center text-xs text-orange-600 dark:text-orange-400">
                                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                            Alert: {charity.alertLevel}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Error Message */}
            {error && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            {/* Selected Charity Display */}
            {selectedCharity && !showResults && (
                <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                            <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <div>
                                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                                    Verified charity selected
                                </p>
                                <p className="text-xs text-green-700 dark:text-green-300">
                                    {selectedCharity.charityName} (EIN: {formatEIN(selectedCharity.ein)})
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Search verified charities from Charity Navigator database
            </p>
        </div>
    );
};
