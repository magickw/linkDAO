import React, { useState, useCallback } from 'react';
import { Button } from '../../../../design-system';
import { useToast } from '../../../../context/ToastContext';
import { countries } from '../../../../utils/countries';

interface BusinessInfoStepProps {
    onComplete: (data: any) => void;
    data?: any;
}

interface BusinessInfoFormData {
    // Business Type
    businessType: 'individual' | 'business';

    // Legal Information
    legalBusinessName: string;
    taxId: string;
    taxIdType: 'ssn' | 'ein' | 'other';

    // Registered Address
    registeredAddressStreet: string;
    registeredAddressCity: string;
    registeredAddressState: string;
    registeredAddressPostalCode: string;
    registeredAddressCountry: string;

    // Contact Information
    websiteUrl: string;
    location: string;

    // Social Links
    twitterHandle: string;
    linkedinHandle: string;
    facebookHandle: string;
    discordHandle: string;
    telegramHandle: string;

    // ENS
    ensHandle: string;
}

export function BusinessInfoStep({ onComplete, data }: BusinessInfoStepProps) {
    const [formData, setFormData] = useState<BusinessInfoFormData>({
        businessType: data?.businessType || 'individual',
        legalBusinessName: data?.legalBusinessName || '',
        taxId: data?.taxId || '',
        taxIdType: data?.taxIdType || 'ssn',
        registeredAddressStreet: data?.registeredAddressStreet || '',
        registeredAddressCity: data?.registeredAddressCity || '',
        registeredAddressState: data?.registeredAddressState || '',
        registeredAddressPostalCode: data?.registeredAddressPostalCode || '',
        registeredAddressCountry: data?.registeredAddressCountry || 'United States',
        websiteUrl: data?.websiteUrl || '',
        location: data?.location || '',
        twitterHandle: data?.twitterHandle || '',
        linkedinHandle: data?.linkedinHandle || '',
        facebookHandle: data?.facebookHandle || '',
        discordHandle: data?.discordHandle || '',
        telegramHandle: data?.telegramHandle || '',
        ensHandle: data?.ensHandle || '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { addToast } = useToast();

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        // Business Type
        if (!formData.businessType) {
            newErrors.businessType = 'Please select a business type';
        }

        // Legal Business Name
        if (!formData.legalBusinessName.trim()) {
            newErrors.legalBusinessName = formData.businessType === 'individual'
                ? 'Full legal name is required'
                : 'Registered business name is required';
        } else if (formData.legalBusinessName.length < 2) {
            newErrors.legalBusinessName = 'Name must be at least 2 characters';
        } else if (formData.legalBusinessName.length > 255) {
            newErrors.legalBusinessName = 'Name must be less than 255 characters';
        }

        // Tax ID - Required for businesses, optional for individuals
        if (formData.businessType === 'business' && !formData.taxId.trim()) {
            newErrors.taxId = 'Tax ID/EIN is required for businesses';
        }

        // Address validation
        if (!formData.registeredAddressStreet.trim()) {
            newErrors.registeredAddressStreet = 'Street address is required';
        }
        if (!formData.registeredAddressCity.trim()) {
            newErrors.registeredAddressCity = 'City is required';
        }
        if (!formData.registeredAddressState.trim()) {
            newErrors.registeredAddressState = 'State/Province is required';
        }
        if (!formData.registeredAddressPostalCode.trim()) {
            newErrors.registeredAddressPostalCode = 'Postal code is required';
        }
        if (!formData.registeredAddressCountry.trim()) {
            newErrors.registeredAddressCountry = 'Country is required';
        }

        // URL validation
        if (formData.websiteUrl && !isValidUrl(formData.websiteUrl)) {
            newErrors.websiteUrl = 'Please enter a valid URL';
        }

        // ENS validation
        if (formData.ensHandle && !isValidENS(formData.ensHandle)) {
            newErrors.ensHandle = 'Please enter a valid ENS name (e.g., yourname.eth)';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const isValidUrl = (string: string) => {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    };

    const isValidENS = (ens: string) => {
        return ens.endsWith('.eth') && ens.length > 4;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            addToast('Please fix the errors before continuing', 'error');
            return;
        }

        setIsSubmitting(true);

        try {
            await onComplete(formData);
            addToast('Business information saved successfully!', 'success');
        } catch (error) {
            console.error('Failed to save business information:', error);
            addToast('Failed to save business information. Please try again.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleInputChange = (field: keyof BusinessInfoFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const handleSkip = () => {
        // Pass minimal required data
        onComplete({
            businessType: 'individual',
            legalBusinessName: '',
            registeredAddressStreet: '',
            registeredAddressCity: '',
            registeredAddressState: '',
            registeredAddressPostalCode: '',
            registeredAddressCountry: 'United States',
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Business Type Selection */}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                    Business Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-4">
                    <button
                        type="button"
                        onClick={() => handleInputChange('businessType', 'individual')}
                        className={`p-4 rounded-lg border-2 transition-all ${formData.businessType === 'individual'
                                ? 'border-purple-500 bg-purple-500/20'
                                : 'border-gray-600 bg-gray-800 hover:border-gray-500'
                            }`}
                    >
                        <div className="text-center">
                            <div className="text-2xl mb-2">👤</div>
                            <div className="font-medium text-white">Individual</div>
                            <div className="text-xs text-gray-400 mt-1">Selling as a person</div>
                        </div>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleInputChange('businessType', 'business')}
                        className={`p-4 rounded-lg border-2 transition-all ${formData.businessType === 'business'
                                ? 'border-purple-500 bg-purple-500/20'
                                : 'border-gray-600 bg-gray-800 hover:border-gray-500'
                            }`}
                    >
                        <div className="text-center">
                            <div className="text-2xl mb-2">🏢</div>
                            <div className="font-medium text-white">Business</div>
                            <div className="text-xs text-gray-400 mt-1">Registered company</div>
                        </div>
                    </button>
                </div>
                {errors.businessType && (
                    <p className="mt-1 text-sm text-red-400">{errors.businessType}</p>
                )}
            </div>

            {/* Legal Name */}
            <div>
                <label htmlFor="legalBusinessName" className="block text-sm font-medium text-gray-300 mb-2">
                    {formData.businessType === 'individual' ? 'Full Legal Name' : 'Registered Business Name'}{' '}
                    <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    id="legalBusinessName"
                    value={formData.legalBusinessName}
                    onChange={(e) => handleInputChange('legalBusinessName', e.target.value)}
                    className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.legalBusinessName ? 'border-red-500' : 'border-gray-600'
                        }`}
                    placeholder={formData.businessType === 'individual' ? 'John Doe' : 'Acme Corporation Inc.'}
                    maxLength={255}
                />
                {errors.legalBusinessName && (
                    <p className="mt-1 text-sm text-red-400">{errors.legalBusinessName}</p>
                )}
                <p className="mt-1 text-xs text-gray-400">
                    {formData.businessType === 'individual'
                        ? 'Your full legal name as it appears on government-issued ID'
                        : 'Your business name as registered with government authorities'}
                </p>
            </div>

            {/* Tax ID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                    <label htmlFor="taxId" className="block text-sm font-medium text-gray-300 mb-2">
                        Tax ID / EIN {formData.businessType === 'business' && <span className="text-red-500">*</span>}
                    </label>
                    <input
                        type="text"
                        id="taxId"
                        value={formData.taxId}
                        onChange={(e) => handleInputChange('taxId', e.target.value)}
                        className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.taxId ? 'border-red-500' : 'border-gray-600'
                            }`}
                        placeholder={formData.businessType === 'individual' ? 'XXX-XX-XXXX (Optional)' : 'XX-XXXXXXX'}
                    />
                    {errors.taxId && (
                        <p className="mt-1 text-sm text-red-400">{errors.taxId}</p>
                    )}
                </div>
                <div>
                    <label htmlFor="taxIdType" className="block text-sm font-medium text-gray-300 mb-2">
                        Type
                    </label>
                    <select
                        id="taxIdType"
                        value={formData.taxIdType}
                        onChange={(e) => handleInputChange('taxIdType', e.target.value as 'ssn' | 'ein' | 'other')}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        <option value="ssn">SSN</option>
                        <option value="ein">EIN</option>
                        <option value="other">Other</option>
                    </select>
                </div>
            </div>
            <p className="text-xs text-gray-400 -mt-4">
                {formData.businessType === 'individual'
                    ? 'Optional for individuals. Your tax information is encrypted and secure.'
                    : 'Required for businesses. Your tax information is encrypted and secure.'}
            </p>

            {/* Registered Address Section */}
            <div className="border-t border-gray-700 pt-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                    Registered Business Address <span className="text-red-500">*</span>
                </h3>

                {/* Street Address */}
                <div className="mb-4">
                    <label htmlFor="registeredAddressStreet" className="block text-sm font-medium text-gray-300 mb-2">
                        Street Address <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        id="registeredAddressStreet"
                        value={formData.registeredAddressStreet}
                        onChange={(e) => handleInputChange('registeredAddressStreet', e.target.value)}
                        className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.registeredAddressStreet ? 'border-red-500' : 'border-gray-600'
                            }`}
                        placeholder="123 Main Street, Apt 4B"
                        maxLength={500}
                    />
                    {errors.registeredAddressStreet && (
                        <p className="mt-1 text-sm text-red-400">{errors.registeredAddressStreet}</p>
                    )}
                </div>

                {/* City and State */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label htmlFor="registeredAddressCity" className="block text-sm font-medium text-gray-300 mb-2">
                            City <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="registeredAddressCity"
                            value={formData.registeredAddressCity}
                            onChange={(e) => handleInputChange('registeredAddressCity', e.target.value)}
                            className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.registeredAddressCity ? 'border-red-500' : 'border-gray-600'
                                }`}
                            placeholder="New York"
                            maxLength={100}
                        />
                        {errors.registeredAddressCity && (
                            <p className="mt-1 text-sm text-red-400">{errors.registeredAddressCity}</p>
                        )}
                    </div>
                    <div>
                        <label htmlFor="registeredAddressState" className="block text-sm font-medium text-gray-300 mb-2">
                            State / Province <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="registeredAddressState"
                            value={formData.registeredAddressState}
                            onChange={(e) => handleInputChange('registeredAddressState', e.target.value)}
                            className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.registeredAddressState ? 'border-red-500' : 'border-gray-600'
                                }`}
                            placeholder="NY"
                            maxLength={100}
                        />
                        {errors.registeredAddressState && (
                            <p className="mt-1 text-sm text-red-400">{errors.registeredAddressState}</p>
                        )}
                    </div>
                </div>

                {/* Postal Code and Country */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="registeredAddressPostalCode" className="block text-sm font-medium text-gray-300 mb-2">
                            Postal Code <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="registeredAddressPostalCode"
                            value={formData.registeredAddressPostalCode}
                            onChange={(e) => handleInputChange('registeredAddressPostalCode', e.target.value)}
                            className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.registeredAddressPostalCode ? 'border-red-500' : 'border-gray-600'
                                }`}
                            placeholder="10001"
                            maxLength={20}
                        />
                        {errors.registeredAddressPostalCode && (
                            <p className="mt-1 text-sm text-red-400">{errors.registeredAddressPostalCode}</p>
                        )}
                    </div>
                    <div>
                        <label htmlFor="registeredAddressCountry" className="block text-sm font-medium text-gray-300 mb-2">
                            Country <span className="text-red-500">*</span>
                        </label>
                        <select
                            id="registeredAddressCountry"
                            value={formData.registeredAddressCountry}
                            onChange={(e) => handleInputChange('registeredAddressCountry', e.target.value)}
                            className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.registeredAddressCountry ? 'border-red-500' : 'border-gray-600'
                                }`}
                        >
                            {countries.map((country) => (
                                <option key={country.code} value={country.name}>
                                    {country.name}
                                </option>
                            ))}
                        </select>
                        {errors.registeredAddressCountry && (
                            <p className="mt-1 text-sm text-red-400">{errors.registeredAddressCountry}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Optional Information Section */}
            <div className="border-t border-gray-700 pt-6">
                <h3 className="text-lg font-semibold text-white mb-4">Optional Information</h3>

                {/* Website URL */}
                <div className="mb-4">
                    <label htmlFor="websiteUrl" className="block text-sm font-medium text-gray-300 mb-2">
                        Website URL
                    </label>
                    <input
                        type="url"
                        id="websiteUrl"
                        value={formData.websiteUrl}
                        onChange={(e) => handleInputChange('websiteUrl', e.target.value)}
                        className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.websiteUrl ? 'border-red-500' : 'border-gray-600'
                            }`}
                        placeholder="https://yourwebsite.com"
                    />
                    {errors.websiteUrl && (
                        <p className="mt-1 text-sm text-red-400">{errors.websiteUrl}</p>
                    )}
                </div>

                {/* Display Location */}
                <div className="mb-4">
                    <label htmlFor="location" className="block text-sm font-medium text-gray-300 mb-2">
                        Display Location
                    </label>
                    <input
                        type="text"
                        id="location"
                        value={formData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="New York, USA"
                        maxLength={255}
                    />
                    <p className="mt-1 text-xs text-gray-400">
                        This will be shown publicly on your seller profile
                    </p>
                </div>

                {/* Social Media Links */}
                <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-300">Social Media Links</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Twitter */}
                        <div>
                            <label htmlFor="twitterHandle" className="block text-xs text-gray-400 mb-1">
                                Twitter
                            </label>
                            <div className="flex">
                                <span className="inline-flex items-center px-3 bg-gray-700 border border-r-0 border-gray-600 rounded-l-lg text-gray-400 text-sm">
                                    @
                                </span>
                                <input
                                    type="text"
                                    id="twitterHandle"
                                    value={formData.twitterHandle}
                                    onChange={(e) => handleInputChange('twitterHandle', e.target.value)}
                                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-r-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="username"
                                    maxLength={100}
                                />
                            </div>
                        </div>

                        {/* LinkedIn */}
                        <div>
                            <label htmlFor="linkedinHandle" className="block text-xs text-gray-400 mb-1">
                                LinkedIn
                            </label>
                            <div className="flex">
                                <span className="inline-flex items-center px-3 bg-gray-700 border border-r-0 border-gray-600 rounded-l-lg text-gray-400 text-sm">
                                    in/
                                </span>
                                <input
                                    type="text"
                                    id="linkedinHandle"
                                    value={formData.linkedinHandle}
                                    onChange={(e) => handleInputChange('linkedinHandle', e.target.value)}
                                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-r-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="username"
                                    maxLength={100}
                                />
                            </div>
                        </div>

                        {/* Discord */}
                        <div>
                            <label htmlFor="discordHandle" className="block text-xs text-gray-400 mb-1">
                                Discord
                            </label>
                            <input
                                type="text"
                                id="discordHandle"
                                value={formData.discordHandle}
                                onChange={(e) => handleInputChange('discordHandle', e.target.value)}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="username#1234"
                                maxLength={100}
                            />
                        </div>

                        {/* Telegram */}
                        <div>
                            <label htmlFor="telegramHandle" className="block text-xs text-gray-400 mb-1">
                                Telegram
                            </label>
                            <div className="flex">
                                <span className="inline-flex items-center px-3 bg-gray-700 border border-r-0 border-gray-600 rounded-l-lg text-gray-400 text-sm">
                                    @
                                </span>
                                <input
                                    type="text"
                                    id="telegramHandle"
                                    value={formData.telegramHandle}
                                    onChange={(e) => handleInputChange('telegramHandle', e.target.value)}
                                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-r-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="username"
                                    maxLength={100}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ENS Handle */}
                <div className="mt-4">
                    <label htmlFor="ensHandle" className="block text-sm font-medium text-gray-300 mb-2">
                        ENS Handle
                    </label>
                    <input
                        type="text"
                        id="ensHandle"
                        value={formData.ensHandle}
                        onChange={(e) => handleInputChange('ensHandle', e.target.value)}
                        className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.ensHandle ? 'border-red-500' : 'border-gray-600'
                            }`}
                        placeholder="yourname.eth"
                        maxLength={100}
                    />
                    {errors.ensHandle && (
                        <p className="mt-1 text-sm text-red-400">{errors.ensHandle}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-400">
                        Your Ethereum Name Service handle (if you have one)
                    </p>
                </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-900 bg-opacity-50 rounded-lg p-4">
                <h4 className="text-blue-300 font-medium text-sm mb-2">🔒 Your Information is Secure</h4>
                <ul className="text-blue-200 text-sm space-y-1">
                    <li>• Tax information is encrypted and stored securely</li>
                    <li>• Your address is used for compliance and verification only</li>
                    <li>• Social links are optional and help buyers connect with you</li>
                    <li>• You can update this information anytime in your dashboard</li>
                </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-4">
                <Button
                    type="button"
                    onClick={handleSkip}
                    variant="outline"
                    disabled={isSubmitting}
                >
                    Skip for Now
                </Button>
                <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting}
                    className="min-w-32"
                >
                    {isSubmitting ? (
                        <div className="flex items-center">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            Saving...
                        </div>
                    ) : (
                        'Continue'
                    )}
                </Button>
            </div>
        </form>
    );
}
