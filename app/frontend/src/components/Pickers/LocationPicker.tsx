import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, X, Search, Loader2 } from 'lucide-react';

interface Location {
    name: string;
    lat?: number;
    lng?: number;
}

interface LocationPickerProps {
    onSelect: (location: Location) => void;
    onClose: () => void;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({ onSelect, onClose }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState<Location[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Debounced search for locations using Nominatim (OpenStreetMap)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.length > 2) {
                searchLocations(searchQuery);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const searchLocations = async (query: string) => {
        setLoading(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
            const data = await res.json();
            const mappedResults = data.map((item: any) => ({
                name: item.display_name.split(',')[0], // Simplify name
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon)
            }));
            setResults(mappedResults);
        } catch (err) {
            console.error("Location search failed", err);
        } finally {
            setLoading(false);
        }
    };

    const handleGetCurrentLocation = () => {
        setLoading(true);
        setError(null);
        if (!navigator.geolocation) {
            setError("Geolocation is not supported by your browser");
            setLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                const { latitude, longitude } = position.coords;
                // Reverse geocoding
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                const data = await res.json();
                const city = data.address.city || data.address.town || data.address.village || "Unknown Location";

                onSelect({
                    name: city,
                    lat: latitude,
                    lng: longitude
                });
                onClose();
            } catch (err) {
                setError("Failed to fetch location name");
                // Still allow selecting coordinates even if name fails?
                onSelect({ name: "Current Location", lat: position.coords.latitude, lng: position.coords.longitude });
                onClose();
            } finally {
                setLoading(false);
            }
        }, (err) => {
            setError("Location permission denied or unavailable");
            setLoading(false);
        });
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 w-80 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search locations..."
                    className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                />
                {loading && <Loader2 className="w-4 h-4 animate-spin text-primary-500" />}
            </div>

            <div className="max-h-64 overflow-y-auto">
                {!searchQuery && (
                    <button
                        onClick={handleGetCurrentLocation}
                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-primary-600 transition-colors text-left"
                    >
                        <div className="w-8 h-8 rounded-full bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
                            <Navigation className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium">Use my current location</span>
                    </button>
                )}

                {error && (
                    <div className="p-3 text-sm text-red-500 text-center">
                        {error}
                    </div>
                )}

                {results.map((loc, idx) => (
                    <button
                        key={idx}
                        onClick={() => { onSelect(loc); onClose(); }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left border-b border-gray-50 dark:border-gray-700/50 last:border-0"
                    >
                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500">
                            <MapPin className="w-4 h-4" />
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-200">{loc.name}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};
