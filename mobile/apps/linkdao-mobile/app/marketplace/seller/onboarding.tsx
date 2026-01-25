/**
 * Seller Onboarding Screen
 * Complete multi-step onboarding flow matching web app features
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../../../src/store/authStore';
import { enhancedAuthService } from '../../../../packages/shared/services/enhancedAuthService';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3001';
const ONBOARDING_STORAGE_KEY = 'seller_onboarding_data';

// Step definitions matching web app
const ONBOARDING_STEPS = [
  { id: 'wallet-connect', title: 'Connect Wallet', description: 'Connect your Web3 wallet to get started' },
  { id: 'profile-setup', title: 'Profile Setup', description: 'Set up your seller profile and store information' },
  { id: 'business-info', title: 'Business Information', description: 'Provide your business details and address' },
  { id: 'verification', title: 'Verification', description: 'Verify your email and phone for enhanced features' },
  { id: 'payout-setup', title: 'Payout Setup', description: 'Set up how you want to receive payments' },
  { id: 'first-listing', title: 'First Listing', description: 'Create your first product listing' },
];

interface ProfileData {
  displayName: string;
  storeName: string;
  bio: string;
  storeDescription: string;
  profileImage: string;
  coverImage: string;
}

interface BusinessInfoData {
  businessType: 'individual' | 'business';
  legalBusinessName: string;
  taxId: string;
  taxIdType: 'ssn' | 'ein' | 'other';
  registeredAddressStreet: string;
  registeredAddressCity: string;
  registeredAddressState: string;
  registeredAddressPostalCode: string;
  registeredAddressCountry: string;
  websiteUrl: string;
  location: string;
  twitterHandle: string;
  linkedinHandle: string;
  discordHandle: string;
  telegramHandle: string;
  ensHandle: string;
}

interface VerificationData {
  email: string;
  emailVerified: boolean;
  phone: string;
  phoneVerified: boolean;
}

interface PayoutData {
  payoutMethod: 'crypto' | 'bank' | 'paypal';
  cryptoAddress: string;
  preferredCurrency: string;
}

interface OnboardingData {
  profile: ProfileData;
  businessInfo: BusinessInfoData;
  verification: VerificationData;
  payout: PayoutData;
  completedSteps: string[];
}

const initialOnboardingData: OnboardingData = {
  profile: {
    displayName: '',
    storeName: '',
    bio: '',
    storeDescription: '',
    profileImage: '',
    coverImage: '',
  },
  businessInfo: {
    businessType: 'individual',
    legalBusinessName: '',
    taxId: '',
    taxIdType: 'ssn',
    registeredAddressStreet: '',
    registeredAddressCity: '',
    registeredAddressState: '',
    registeredAddressPostalCode: '',
    registeredAddressCountry: 'United States',
    websiteUrl: '',
    location: '',
    twitterHandle: '',
    linkedinHandle: '',
    discordHandle: '',
    telegramHandle: '',
    ensHandle: '',
  },
  verification: {
    email: '',
    emailVerified: false,
    phone: '',
    phoneVerified: false,
  },
  payout: {
    payoutMethod: 'crypto',
    cryptoAddress: '',
    preferredCurrency: 'USDC',
  },
  completedSteps: [],
};

export default function SellerOnboardingScreen() {
  const { user, isAuthenticated } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [formData, setFormData] = useState<OnboardingData>(initialOnboardingData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load saved progress on mount
  useEffect(() => {
    loadSavedProgress();
  }, []);

  // Save progress whenever formData changes
  useEffect(() => {
    if (!initialLoading && user?.walletAddress) {
      saveProgress();
    }
  }, [formData, user?.walletAddress, initialLoading]);

  // Auto-advance from wallet step if already connected
  useEffect(() => {
    if (isAuthenticated && currentStep === 0) {
      handleStepComplete('wallet-connect');
    }
  }, [isAuthenticated, currentStep]);

  const loadSavedProgress = async () => {
    try {
      const saved = await AsyncStorage.getItem(`${ONBOARDING_STORAGE_KEY}_${user?.walletAddress}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        setFormData(parsed);
        // Find the first incomplete step
        const firstIncomplete = ONBOARDING_STEPS.findIndex(
          step => !parsed.completedSteps.includes(step.id)
        );
        setCurrentStep(firstIncomplete >= 0 ? firstIncomplete : ONBOARDING_STEPS.length - 1);
      }
    } catch (error) {
      console.error('Failed to load onboarding progress:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const saveProgress = async () => {
    try {
      await AsyncStorage.setItem(
        `${ONBOARDING_STORAGE_KEY}_${user?.walletAddress}`,
        JSON.stringify(formData)
      );
    } catch (error) {
      console.error('Failed to save onboarding progress:', error);
    }
  };

  const clearProgress = async () => {
    try {
      await AsyncStorage.removeItem(`${ONBOARDING_STORAGE_KEY}_${user?.walletAddress}`);
    } catch (error) {
      console.error('Failed to clear onboarding progress:', error);
    }
  };

  const handleStepComplete = (stepId: string) => {
    setFormData(prev => ({
      ...prev,
      completedSteps: [...new Set([...prev.completedSteps, stepId])],
    }));

    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Last step completed (optional listing)
      handleFinalSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      router.back();
    }
  };

  const handleSkip = () => {
    const stepId = ONBOARDING_STEPS[currentStep].id;
    
    // If skipping first-listing, finalize onboarding
    if (stepId === 'first-listing') {
      handleFinalSubmit();
      return;
    }

    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const updateProfileData = (field: keyof ProfileData, value: string) => {
    setFormData(prev => ({
      ...prev,
      profile: { ...prev.profile, [field]: value },
    }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const updateBusinessData = (field: keyof BusinessInfoData, value: string) => {
    setFormData(prev => ({
      ...prev,
      businessInfo: { ...prev.businessInfo, [field]: value },
    }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const updateVerificationData = (field: keyof VerificationData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      verification: { ...prev.verification, [field]: value },
    }));
  };

  const updatePayoutData = (field: keyof PayoutData, value: string) => {
    setFormData(prev => ({
      ...prev,
      payout: { ...prev.payout, [field]: value },
    }));
  };

  const pickImage = async (type: 'profile' | 'cover') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === 'profile' ? [1, 1] : [3, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      if (type === 'profile') {
        updateProfileData('profileImage', result.assets[0].uri);
      } else {
        updateProfileData('coverImage', result.assets[0].uri);
      }
    }
  };

  const validateProfileStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.profile.displayName.trim()) {
      newErrors.displayName = 'Display name is required';
    }
    if (!formData.profile.storeName.trim()) {
      newErrors.storeName = 'Store name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateBusinessStep = (): boolean => {
    const newErrors: Record<string, string> = {};
    const { businessInfo } = formData;

    if (!businessInfo.legalBusinessName.trim()) {
      newErrors.legalBusinessName = businessInfo.businessType === 'individual'
        ? 'Full legal name is required'
        : 'Business name is required';
    }

    if (businessInfo.businessType === 'business' && !businessInfo.taxId.trim()) {
      newErrors.taxId = 'Tax ID is required for businesses';
    }

    if (!businessInfo.registeredAddressStreet.trim()) {
      newErrors.registeredAddressStreet = 'Street address is required';
    }
    if (!businessInfo.registeredAddressCity.trim()) {
      newErrors.registeredAddressCity = 'City is required';
    }
    if (!businessInfo.registeredAddressState.trim()) {
      newErrors.registeredAddressState = 'State is required';
    }
    if (!businessInfo.registeredAddressPostalCode.trim()) {
      newErrors.registeredAddressPostalCode = 'Postal code is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProfileSubmit = () => {
    if (!validateProfileStep()) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }
    handleStepComplete('profile-setup');
  };

  const handleBusinessSubmit = () => {
    if (!validateBusinessStep()) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }
    handleStepComplete('business-info');
  };

  const handleFinalSubmit = async () => {
    try {
      setLoading(true);

      const token = await enhancedAuthService.getAuthToken();
      if (!token) {
        Alert.alert('Authentication Required', 'Please connect your wallet first');
        return;
      }

      // Combine all data for API submission
      const submissionData = {
        walletAddress: user?.walletAddress || '',
        displayName: formData.profile.displayName,
        storeName: formData.profile.storeName,
        bio: formData.profile.bio,
        storeDescription: formData.profile.storeDescription,
        profileImageUrl: formData.profile.profileImage,
        coverImageUrl: formData.profile.coverImage,
        businessType: formData.businessInfo.businessType,
        legalBusinessName: formData.businessInfo.legalBusinessName,
        taxId: formData.businessInfo.taxId,
        taxIdType: formData.businessInfo.taxIdType,
        registeredAddressStreet: formData.businessInfo.registeredAddressStreet,
        registeredAddressCity: formData.businessInfo.registeredAddressCity,
        registeredAddressState: formData.businessInfo.registeredAddressState,
        registeredAddressPostalCode: formData.businessInfo.registeredAddressPostalCode,
        registeredAddressCountry: formData.businessInfo.registeredAddressCountry,
        websiteUrl: formData.businessInfo.websiteUrl,
        location: formData.businessInfo.location,
        twitterHandle: formData.businessInfo.twitterHandle,
        linkedinHandle: formData.businessInfo.linkedinHandle,
        discordHandle: formData.businessInfo.discordHandle,
        telegramHandle: formData.businessInfo.telegramHandle,
        ensHandle: formData.businessInfo.ensHandle,
        email: formData.verification.email,
        phone: formData.verification.phone,
        payoutMethod: formData.payout.payoutMethod,
        cryptoAddress: formData.payout.cryptoAddress,
        preferredCurrency: formData.payout.preferredCurrency,
      };

      const response = await fetch(`${API_BASE_URL}/api/sellers/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(submissionData),
      });

      const result = await response.json();

      if (result.success) {
        await clearProgress();
        Alert.alert(
          'Welcome to LinkDAO Marketplace!',
          'Your seller profile has been created successfully.',
          [
            { text: 'Go to Dashboard', onPress: () => router.push('/marketplace/seller/dashboard') },
            { text: 'Create Listing', onPress: () => router.push('/marketplace/seller/listings/create') },
          ]
        );
      } else {
        Alert.alert('Error', result.message || 'Failed to create seller profile');
      }
    } catch (error) {
      console.error('Failed to create seller profile:', error);
      Alert.alert('Error', 'Failed to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Render step content
  const renderStepContent = () => {
    const step = ONBOARDING_STEPS[currentStep];

    switch (step.id) {
      case 'wallet-connect':
        return renderWalletConnectStep();
      case 'profile-setup':
        return renderProfileSetupStep();
      case 'business-info':
        return renderBusinessInfoStep();
      case 'verification':
        return renderVerificationStep();
      case 'payout-setup':
        return renderPayoutSetupStep();
      case 'first-listing':
        return renderFirstListingStep();
      default:
        return null;
    }
  };

  const renderWalletConnectStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.walletIconContainer}>
        <Ionicons name="wallet-outline" size={64} color="#3b82f6" />
      </View>
      <Text style={styles.stepTitle}>Connect Your Wallet</Text>
      <Text style={styles.stepDescription}>
        Connect your Web3 wallet to start your seller journey on LinkDAO Marketplace.
      </Text>

      {isAuthenticated ? (
        <View style={styles.connectedContainer}>
          <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
          <Text style={styles.connectedText}>Wallet Connected</Text>
          <Text style={styles.addressText}>
            {user?.walletAddress?.slice(0, 6)}...{user?.walletAddress?.slice(-4)}
          </Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/auth')}>
          <Text style={styles.primaryButtonText}>Connect Wallet</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderProfileSetupStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Set Up Your Profile</Text>
      <Text style={styles.stepDescription}>
        Tell buyers about yourself and your store
      </Text>

      {/* Profile Image */}
      <TouchableOpacity style={styles.imageUploadContainer} onPress={() => pickImage('profile')}>
        {formData.profile.profileImage ? (
          <Image source={{ uri: formData.profile.profileImage }} style={styles.profileImage} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="camera-outline" size={32} color="#9ca3af" />
            <Text style={styles.imagePlaceholderText}>Add Profile Photo</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Cover Image */}
      <TouchableOpacity style={styles.coverImageUploadContainer} onPress={() => pickImage('cover')}>
        {formData.profile.coverImage ? (
          <Image source={{ uri: formData.profile.coverImage }} style={styles.coverImage} />
        ) : (
          <View style={[styles.imagePlaceholder, styles.coverImagePlaceholder]}>
            <Ionicons name="image-outline" size={32} color="#9ca3af" />
            <Text style={styles.imagePlaceholderText}>Add Cover Image</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Display Name */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Display Name *</Text>
        <TextInput
          style={[styles.input, errors.displayName && styles.inputError]}
          placeholder="Your name or username"
          placeholderTextColor="#9ca3af"
          value={formData.profile.displayName}
          onChangeText={(value) => updateProfileData('displayName', value)}
          maxLength={50}
        />
        {errors.displayName && <Text style={styles.errorText}>{errors.displayName}</Text>}
      </View>

      {/* Store Name */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Store Name *</Text>
        <TextInput
          style={[styles.input, errors.storeName && styles.inputError]}
          placeholder="Your store or business name"
          placeholderTextColor="#9ca3af"
          value={formData.profile.storeName}
          onChangeText={(value) => updateProfileData('storeName', value)}
          maxLength={100}
        />
        {errors.storeName && <Text style={styles.errorText}>{errors.storeName}</Text>}
      </View>

      {/* Bio */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Tell buyers about yourself..."
          placeholderTextColor="#9ca3af"
          value={formData.profile.bio}
          onChangeText={(value) => updateProfileData('bio', value)}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          maxLength={500}
        />
        <Text style={styles.charCount}>{formData.profile.bio.length}/500</Text>
      </View>

      {/* Store Description */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Store Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe what you offer..."
          placeholderTextColor="#9ca3af"
          value={formData.profile.storeDescription}
          onChangeText={(value) => updateProfileData('storeDescription', value)}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          maxLength={1000}
        />
        <Text style={styles.charCount}>{formData.profile.storeDescription.length}/1000</Text>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={handleProfileSubmit}>
        <Text style={styles.primaryButtonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );

  const renderBusinessInfoStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Business Information</Text>
      <Text style={styles.stepDescription}>
        Provide your business details for compliance
      </Text>

      {/* Business Type */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Business Type *</Text>
        <View style={styles.businessTypeContainer}>
          <TouchableOpacity
            style={[
              styles.businessTypeButton,
              formData.businessInfo.businessType === 'individual' && styles.businessTypeButtonActive,
            ]}
            onPress={() => updateBusinessData('businessType', 'individual')}
          >
            <Ionicons
              name="person-outline"
              size={24}
              color={formData.businessInfo.businessType === 'individual' ? '#ffffff' : '#6b7280'}
            />
            <Text style={[
              styles.businessTypeText,
              formData.businessInfo.businessType === 'individual' && styles.businessTypeTextActive,
            ]}>
              Individual
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.businessTypeButton,
              formData.businessInfo.businessType === 'business' && styles.businessTypeButtonActive,
            ]}
            onPress={() => updateBusinessData('businessType', 'business')}
          >
            <Ionicons
              name="business-outline"
              size={24}
              color={formData.businessInfo.businessType === 'business' ? '#ffffff' : '#6b7280'}
            />
            <Text style={[
              styles.businessTypeText,
              formData.businessInfo.businessType === 'business' && styles.businessTypeTextActive,
            ]}>
              Business
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Legal Name */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>
          {formData.businessInfo.businessType === 'individual' ? 'Full Legal Name' : 'Business Name'} *
        </Text>
        <TextInput
          style={[styles.input, errors.legalBusinessName && styles.inputError]}
          placeholder={formData.businessInfo.businessType === 'individual' ? 'John Doe' : 'Company Inc.'}
          placeholderTextColor="#9ca3af"
          value={formData.businessInfo.legalBusinessName}
          onChangeText={(value) => updateBusinessData('legalBusinessName', value)}
        />
        {errors.legalBusinessName && <Text style={styles.errorText}>{errors.legalBusinessName}</Text>}
      </View>

      {/* Tax ID (for business) */}
      {formData.businessInfo.businessType === 'business' && (
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Tax ID / EIN *</Text>
          <TextInput
            style={[styles.input, errors.taxId && styles.inputError]}
            placeholder="XX-XXXXXXX"
            placeholderTextColor="#9ca3af"
            value={formData.businessInfo.taxId}
            onChangeText={(value) => updateBusinessData('taxId', value)}
          />
          {errors.taxId && <Text style={styles.errorText}>{errors.taxId}</Text>}
        </View>
      )}

      {/* Address */}
      <Text style={styles.sectionTitle}>Registered Address</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Street Address *</Text>
        <TextInput
          style={[styles.input, errors.registeredAddressStreet && styles.inputError]}
          placeholder="123 Main Street"
          placeholderTextColor="#9ca3af"
          value={formData.businessInfo.registeredAddressStreet}
          onChangeText={(value) => updateBusinessData('registeredAddressStreet', value)}
        />
        {errors.registeredAddressStreet && <Text style={styles.errorText}>{errors.registeredAddressStreet}</Text>}
      </View>

      <View style={styles.row}>
        <View style={[styles.inputContainer, styles.flex1]}>
          <Text style={styles.label}>City *</Text>
          <TextInput
            style={[styles.input, errors.registeredAddressCity && styles.inputError]}
            placeholder="New York"
            placeholderTextColor="#9ca3af"
            value={formData.businessInfo.registeredAddressCity}
            onChangeText={(value) => updateBusinessData('registeredAddressCity', value)}
          />
        </View>
        <View style={[styles.inputContainer, styles.flex1]}>
          <Text style={styles.label}>State *</Text>
          <TextInput
            style={[styles.input, errors.registeredAddressState && styles.inputError]}
            placeholder="NY"
            placeholderTextColor="#9ca3af"
            value={formData.businessInfo.registeredAddressState}
            onChangeText={(value) => updateBusinessData('registeredAddressState', value)}
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={[styles.inputContainer, styles.flex1]}>
          <Text style={styles.label}>Postal Code *</Text>
          <TextInput
            style={[styles.input, errors.registeredAddressPostalCode && styles.inputError]}
            placeholder="10001"
            placeholderTextColor="#9ca3af"
            value={formData.businessInfo.registeredAddressPostalCode}
            onChangeText={(value) => updateBusinessData('registeredAddressPostalCode', value)}
          />
        </View>
        <View style={[styles.inputContainer, styles.flex1]}>
          <Text style={styles.label}>Country</Text>
          <TextInput
            style={styles.input}
            placeholder="United States"
            placeholderTextColor="#9ca3af"
            value={formData.businessInfo.registeredAddressCountry}
            onChangeText={(value) => updateBusinessData('registeredAddressCountry', value)}
          />
        </View>
      </View>

      {/* Optional Fields */}
      <Text style={styles.sectionTitle}>Optional Information</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Website URL</Text>
        <TextInput
          style={styles.input}
          placeholder="https://yourwebsite.com"
          placeholderTextColor="#9ca3af"
          value={formData.businessInfo.websiteUrl}
          onChangeText={(value) => updateBusinessData('websiteUrl', value)}
          keyboardType="url"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Display Location</Text>
        <TextInput
          style={styles.input}
          placeholder="New York, USA"
          placeholderTextColor="#9ca3af"
          value={formData.businessInfo.location}
          onChangeText={(value) => updateBusinessData('location', value)}
        />
      </View>

      {/* Social Links */}
      <Text style={styles.sectionTitle}>Social Media Links</Text>

      <View style={styles.row}>
        <View style={[styles.inputContainer, styles.flex1]}>
          <Text style={styles.label}>Twitter</Text>
          <View style={styles.socialInputContainer}>
            <Text style={styles.socialPrefix}>@</Text>
            <TextInput
              style={styles.socialInput}
              placeholder="username"
              placeholderTextColor="#9ca3af"
              value={formData.businessInfo.twitterHandle}
              onChangeText={(value) => updateBusinessData('twitterHandle', value)}
              autoCapitalize="none"
            />
          </View>
        </View>
        <View style={[styles.inputContainer, styles.flex1]}>
          <Text style={styles.label}>Discord</Text>
          <TextInput
            style={styles.input}
            placeholder="user#1234"
            placeholderTextColor="#9ca3af"
            value={formData.businessInfo.discordHandle}
            onChangeText={(value) => updateBusinessData('discordHandle', value)}
            autoCapitalize="none"
          />
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>ENS Handle</Text>
        <TextInput
          style={styles.input}
          placeholder="yourname.eth"
          placeholderTextColor="#9ca3af"
          value={formData.businessInfo.ensHandle}
          onChangeText={(value) => updateBusinessData('ensHandle', value)}
          autoCapitalize="none"
        />
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleSkip}>
          <Text style={styles.secondaryButtonText}>Skip for Now</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={handleBusinessSubmit}>
          <Text style={styles.primaryButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderVerificationStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Verify Your Account</Text>
      <Text style={styles.stepDescription}>
        Verification helps build trust with buyers
      </Text>

      {/* Email */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email Address</Text>
        <TextInput
          style={styles.input}
          placeholder="your@email.com"
          placeholderTextColor="#9ca3af"
          value={formData.verification.email}
          onChangeText={(value) => updateVerificationData('email', value)}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      {/* Phone */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={styles.input}
          placeholder="+1 (555) 000-0000"
          placeholderTextColor="#9ca3af"
          value={formData.verification.phone}
          onChangeText={(value) => updateVerificationData('phone', value)}
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="shield-checkmark-outline" size={24} color="#3b82f6" />
        <View style={styles.infoBoxContent}>
          <Text style={styles.infoBoxTitle}>Why Verify?</Text>
          <Text style={styles.infoBoxText}>
            Verified sellers get increased visibility and buyer trust. You can skip this for now and verify later.
          </Text>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleSkip}>
          <Text style={styles.secondaryButtonText}>Skip for Now</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => handleStepComplete('verification')}
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPayoutSetupStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Set Up Payouts</Text>
      <Text style={styles.stepDescription}>
        Choose how you want to receive payments
      </Text>

      {/* Payout Method */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Preferred Payout Method</Text>
        <View style={styles.payoutOptionsContainer}>
          <TouchableOpacity
            style={[
              styles.payoutOption,
              formData.payout.payoutMethod === 'crypto' && styles.payoutOptionActive,
            ]}
            onPress={() => updatePayoutData('payoutMethod', 'crypto')}
          >
            <Ionicons
              name="logo-bitcoin"
              size={24}
              color={formData.payout.payoutMethod === 'crypto' ? '#ffffff' : '#6b7280'}
            />
            <Text style={[
              styles.payoutOptionText,
              formData.payout.payoutMethod === 'crypto' && styles.payoutOptionTextActive,
            ]}>
              Crypto
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.payoutOption,
              formData.payout.payoutMethod === 'bank' && styles.payoutOptionActive,
            ]}
            onPress={() => updatePayoutData('payoutMethod', 'bank')}
          >
            <Ionicons
              name="card-outline"
              size={24}
              color={formData.payout.payoutMethod === 'bank' ? '#ffffff' : '#6b7280'}
            />
            <Text style={[
              styles.payoutOptionText,
              formData.payout.payoutMethod === 'bank' && styles.payoutOptionTextActive,
            ]}>
              Bank
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {formData.payout.payoutMethod === 'crypto' && (
        <>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Crypto Wallet Address</Text>
            <TextInput
              style={styles.input}
              placeholder="0x..."
              placeholderTextColor="#9ca3af"
              value={formData.payout.cryptoAddress || user?.walletAddress || ''}
              onChangeText={(value) => updatePayoutData('cryptoAddress', value)}
              autoCapitalize="none"
            />
            <Text style={styles.helperText}>
              This is where you'll receive payments
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Preferred Currency</Text>
            <View style={styles.currencyOptions}>
              {['USDC', 'USDT', 'ETH'].map((currency) => (
                <TouchableOpacity
                  key={currency}
                  style={[
                    styles.currencyOption,
                    formData.payout.preferredCurrency === currency && styles.currencyOptionActive,
                  ]}
                  onPress={() => updatePayoutData('preferredCurrency', currency)}
                >
                  <Text style={[
                    styles.currencyOptionText,
                    formData.payout.preferredCurrency === currency && styles.currencyOptionTextActive,
                  ]}>
                    {currency}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleSkip}>
          <Text style={styles.secondaryButtonText}>Skip for Now</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => handleStepComplete('payout-setup')}
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFirstListingStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.completionIconContainer}>
        <Ionicons name="checkmark-circle" size={80} color="#22c55e" />
      </View>
      <Text style={styles.stepTitle}>You're Almost Ready!</Text>
      <Text style={styles.stepDescription}>
        Complete your onboarding by creating your first listing, or go directly to your dashboard.
      </Text>

      <View style={styles.infoBox}>
        <Ionicons name="bulb-outline" size={24} color="#f59e0b" />
        <View style={styles.infoBoxContent}>
          <Text style={styles.infoBoxTitle}>What's Next?</Text>
          <View style={styles.nextStepsList}>
            <Text style={styles.nextStepItem}>• Create product listings</Text>
            <Text style={styles.nextStepItem}>• Manage orders and shipments</Text>
            <Text style={styles.nextStepItem}>• Track your earnings</Text>
            <Text style={styles.nextStepItem}>• Build your reputation</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.buttonDisabled]}
        onPress={handleFinalSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.primaryButtonText}>Complete Setup</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => router.push('/marketplace/seller/listings/create')}
      >
        <Text style={styles.secondaryButtonText}>Create First Listing</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.secondaryButton, { marginTop: 12, backgroundColor: 'transparent' }]}
        onPress={handleSkip}
      >
        <Text style={[styles.secondaryButtonText, { color: '#3b82f6' }]}>Skip & Go to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Become a Seller</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.stepIndicator}>
            Step {currentStep + 1} of {ONBOARDING_STEPS.length}: {ONBOARDING_STEPS[currentStep].title}
          </Text>
        </View>

        {/* Step Navigation Dots */}
        <View style={styles.dotsContainer}>
          {ONBOARDING_STEPS.map((step, index) => (
            <View
              key={step.id}
              style={[
                styles.dot,
                index === currentStep && styles.dotActive,
                formData.completedSteps.includes(step.id) && styles.dotCompleted,
              ]}
            />
          ))}
        </View>

        {/* Content */}
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderStepContent()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardAvoid: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },
  stepIndicator: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e5e7eb',
  },
  dotActive: {
    backgroundColor: '#3b82f6',
    width: 24,
  },
  dotCompleted: {
    backgroundColor: '#22c55e',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  stepContainer: {
    paddingVertical: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 12,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#ffffff',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  walletIconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  connectedContainer: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    marginTop: 16,
  },
  connectedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22c55e',
    marginTop: 8,
  },
  addressText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  imageUploadContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  coverImageUploadContainer: {
    marginBottom: 16,
  },
  coverImage: {
    width: '100%',
    height: 120,
    borderRadius: 12,
  },
  imagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  coverImagePlaceholder: {
    width: '100%',
    height: 120,
    borderRadius: 12,
  },
  imagePlaceholderText: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  businessTypeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  businessTypeButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  businessTypeButtonActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#3b82f6',
  },
  businessTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 8,
  },
  businessTypeTextActive: {
    color: '#ffffff',
  },
  socialInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  socialPrefix: {
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  socialInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  payoutOptionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  payoutOption: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  payoutOptionActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#3b82f6',
  },
  payoutOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 8,
  },
  payoutOptionTextActive: {
    color: '#ffffff',
  },
  currencyOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  currencyOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 20,
    backgroundColor: '#ffffff',
  },
  currencyOptionActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  currencyOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  currencyOptionTextActive: {
    color: '#3b82f6',
  },
  completionIconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
  },
  infoBoxContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoBoxTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 4,
  },
  infoBoxText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
  nextStepsList: {
    marginTop: 8,
  },
  nextStepItem: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
