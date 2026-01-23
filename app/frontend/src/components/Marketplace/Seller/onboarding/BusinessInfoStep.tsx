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
    const [subStep, setSubStep] = useState(0); // 0: Basics, 1: Address, 2: Presence
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

    const validateSubStep = (step: number) => {
        const newErrors: Record<string, string> = {};

        if (step === 0) {
            if (!formData.legalBusinessName.trim()) {
                newErrors.legalBusinessName = formData.businessType === 'individual'
                    ? 'Full legal name is required'
                    : 'Registered business name is required';
            }
            if (formData.businessType === 'business' && !formData.taxId.trim()) {
                newErrors.taxId = 'Tax ID/EIN is required for businesses';
            }
        } else if (step === 1) {
            if (!formData.registeredAddressStreet.trim()) newErrors.registeredAddressStreet = 'Street address is required';
            if (!formData.registeredAddressCity.trim()) newErrors.registeredAddressCity = 'City is required';
            if (!formData.registeredAddressState.trim()) newErrors.registeredAddressState = 'State is required';
            if (!formData.registeredAddressPostalCode.trim()) newErrors.registeredAddressPostalCode = 'Postal code is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validateSubStep(subStep)) {
            setSubStep(prev => prev + 1);
            window.scrollTo(0, 0);
        }
    };

    const handleBack = () => {
        setSubStep(prev => prev - 1);
        window.scrollTo(0, 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateSubStep(subStep)) {
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
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
    };

    const subStepTitles = ['Business Basics', 'Registered Address', 'Online Presence'];

    return (
        <div className="space-y-6">
            {/* Sub-step indicator */}
            <div className="flex items-center justify-between mb-8 px-2">
                {subStepTitles.map((title, idx) => (
                    <div key={idx} className="flex flex-col items-center flex-1 relative">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 ${
                            subStep === idx ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.5)]' : 
                            subStep > idx ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-400'
                        }`}>
                            {subStep > idx ? '✓' : idx + 1}
                        </div>
                        <span className={`text-[10px] mt-2 font-medium uppercase tracking-tighter ${subStep === idx ? 'text-purple-400' : 'text-gray-500'}`}>
                            {title.split(' ')[1]}
                        </span>
                        {idx < subStepTitles.length - 1 && (
                            <div className={`absolute top-4 left-[50%] w-full h-[2px] -z-0 ${subStep > idx ? 'bg-green-500' : 'bg-gray-700'}`} />
                        )}
                    </div>
                ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {subStep === 0 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                            <span className="w-8 h-8 bg-purple-600/20 text-purple-400 rounded-lg flex items-center justify-center mr-3 text-sm">01</span>
                            Business Basics
                        </h3>
                        {/* Business Type Selection */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-300 mb-3">
                                How will you be selling? <span className="text-red-500">*</span>
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => handleInputChange('businessType', 'individual')}
                                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${formData.businessType === 'individual'
                                            ? 'border-purple-500 bg-purple-500/10 shadow-[0_0_20px_rgba(168,85,247,0.15)]'
                                            : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                                        }`}
                                >
                                    <div className="text-center">
                                        <div className="text-2xl mb-2">👤</div>
                                        <div className="font-semibold text-white text-sm">Individual</div>
                                        <div className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">Freelancer / Person</div>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleInputChange('businessType', 'business')}
                                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${formData.businessType === 'business'
                                            ? 'border-purple-500 bg-purple-500/10 shadow-[0_0_20px_rgba(168,85,247,0.15)]'
                                            : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                                        }`}
                                >
                                    <div className="text-center">
                                        <div className="text-2xl mb-2">🏢</div>
                                        <div className="font-semibold text-white text-sm">Registered Business</div>
                                        <div className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">Company / LLC</div>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Legal Name */}
                        <div className="mb-6">
                            <label htmlFor="legalBusinessName" className="block text-sm font-medium text-gray-300 mb-2">
                                {formData.businessType === 'individual' ? 'Full Legal Name' : 'Registered Business Name'}{' '}
                                <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                id="legalBusinessName"
                                value={formData.legalBusinessName}
                                onChange={(e) => handleInputChange('legalBusinessName', e.target.value)}
                                className={`w-full px-4 py-3 bg-gray-800/50 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${errors.legalBusinessName ? 'border-red-500' : 'border-gray-700'}`}
                                placeholder={formData.businessType === 'individual' ? 'Legal name as on ID' : 'Company name as registered'}
                            />
                            {errors.legalBusinessName && <p className="mt-1.5 text-xs text-red-400">{errors.legalBusinessName}</p>}
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
                                    className={`w-full px-4 py-3 bg-gray-800/50 border rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.taxId ? 'border-red-500' : 'border-gray-700'}`}
                                    placeholder="XX-XXXXXXX"
                                />
                                {errors.taxId && <p className="mt-1.5 text-xs text-red-400">{errors.taxId}</p>}
                            </div>
                            <div>
                                <label htmlFor="taxIdType" className="block text-sm font-medium text-gray-300 mb-2">Type</label>
                                <select
                                    id="taxIdType"
                                    value={formData.taxIdType}
                                    onChange={(e) => handleInputChange('taxIdType', e.target.value as any)}
                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="ssn">SSN</option>
                                    <option value="ein">EIN</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {subStep === 1 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                            <span className="w-8 h-8 bg-purple-600/20 text-purple-400 rounded-lg flex items-center justify-center mr-3 text-sm">02</span>
                            Registered Address
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Street Address *</label>
                                <input
                                    type="text"
                                    value={formData.registeredAddressStreet}
                                    onChange={(e) => handleInputChange('registeredAddressStreet', e.target.value)}
                                    className={`w-full px-4 py-3 bg-gray-800/50 border rounded-xl text-white focus:ring-2 focus:ring-purple-500 ${errors.registeredAddressStreet ? 'border-red-500' : 'border-gray-700'}`}
                                    placeholder="123 Web3 Lane"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">City *</label>
                                    <input
                                        type="text"
                                        value={formData.registeredAddressCity}
                                        onChange={(e) => handleInputChange('registeredAddressCity', e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">State *</label>
                                    <input
                                        type="text"
                                        value={formData.registeredAddressState}
                                        onChange={(e) => handleInputChange('registeredAddressState', e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Postal Code *</label>
                                    <input
                                        type="text"
                                        value={formData.registeredAddressPostalCode}
                                        onChange={(e) => handleInputChange('registeredAddressPostalCode', e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Country *</label>
                                    <select
                                        value={formData.registeredAddressCountry}
                                        onChange={(e) => handleInputChange('registeredAddressCountry', e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-purple-500"
                                    >
                                        {countries.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {subStep === 2 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                            <span className="w-8 h-8 bg-purple-600/20 text-purple-400 rounded-lg flex items-center justify-center mr-3 text-sm">03</span>
                            Online Presence
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Store Website (Optional)</label>
                                <input
                                    type="url"
                                    value={formData.websiteUrl}
                                    onChange={(e) => handleInputChange('websiteUrl', e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-purple-500"
                                    placeholder="https://mystore.com"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2 text-xs">Twitter</label>
                                    <input
                                        type="text"
                                        value={formData.twitterHandle}
                                        onChange={(e) => handleInputChange('twitterHandle', e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white text-sm"
                                        placeholder="@handle"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2 text-xs">Discord</label>
                                    <input
                                        type="text"
                                        value={formData.discordHandle}
                                        onChange={(e) => handleInputChange('discordHandle', e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white text-sm"
                                        placeholder="user#1234"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">ENS Domain</label>
                                <input
                                    type="text"
                                    value={formData.ensHandle}
                                    onChange={(e) => handleInputChange('ensHandle', e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white font-mono text-sm"
                                    placeholder="vitalik.eth"
                                />
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-between items-center pt-8 mt-8 border-t border-gray-800">
                    <div>
                        {subStep > 0 && (
                            <Button type="button" onClick={handleBack} variant="outline">
                                Back
                            </Button>
                        )}
                    </div>
                    <div className="flex space-x-3">
                        <button 
                            type="button" 
                            onClick={() => onComplete(formData)}
                            className="text-gray-500 hover:text-white text-sm font-medium transition-colors px-4"
                        >
                            Skip Section
                        </button>
                        {subStep < 2 ? (
                            <Button type="button" onClick={handleNext} variant="primary" className="min-w-[120px]">
                                Next Step
                            </Button>
                        ) : (
                            <Button type="submit" variant="primary" loading={isSubmitting} className="min-w-[120px]">
                                Finish Section
                            </Button>
                        )}
                    </div>
                </div>
            </form>
        </div>
    );
}
    );
}
