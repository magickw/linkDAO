import React, { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';

// Using env variable for Tenor API key, falling back to demo key if not present.
const TENOR_API_KEY = process.env.NEXT_PUBLIC_TENOR_API_KEY || "LIVDSRZULELA";

interface Gif {
    id: string;
    url: string; // The specific media url (e.g. tinygif)
    preview: string;
    dims: number[];
}

interface GifPickerProps {
    onSelect: (gifUrl: string) => void;
    onClose: () => void;
}

export const GifPicker: React.FC<GifPickerProps> = ({ onSelect, onClose }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState<Gif[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Initial load: trending
        fetchGifs();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchGifs(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const fetchGifs = async (query?: string) => {
        setLoading(true);
        try {
            const endpoint = query
                ? `https://g.tenor.com/v1/search?q=${encodeURIComponent(query)}&key=${TENOR_API_KEY}&limit=20`
                : `https://g.tenor.com/v1/trending?key=${TENOR_API_KEY}&limit=20`;

            const res = await fetch(endpoint);
            const data = await res.json();

            if (data.results) {
                const mapped = data.results.map((item: any) => ({
                    id: item.id,
                    url: item.media[0].gif.url,
                    preview: item.media[0].tinygif.url,
                    dims: item.media[0].tinygif.dims
                }));
                setResults(mapped);
            }
        } catch (err) {
            console.error("Failed to fetch GIFs", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 w-80 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 h-96">
            <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search GIFs..."
                    className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                />
                {loading && <Loader2 className="w-4 h-4 animate-spin text-primary-500" />}
            </div>

            <div className="flex-1 overflow-y-auto p-2">
                <div className="grid grid-cols-2 gap-2">
                    {results.map(gif => (
                        <button
                            key={gif.id}
                            onClick={() => { onSelect(gif.url); onClose(); }}
                            className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 hover:opacity-90 transition-opacity"
                        >
                            <img
                                src={gif.preview}
                                alt="GIF"
                                className="w-full h-full object-cover"
                                loading="lazy"
                            />
                        </button>
                    ))}
                </div>
                {!loading && results.length === 0 && (
                    <div className="text-center p-8 text-gray-500 text-sm">
                        No GIFs found
                    </div>
                )}
            </div>
        </div>
    );
};
