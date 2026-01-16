/**
 * Seller Onboarding Screen
 * Guide users through creating their seller profile
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface FormData {
  storeName: string;
  bio: string;
  storeDescription: string;
  location: string;
  websiteUrl: string;
  legalBusinessName: string;
  businessType: 'individual' | 'company';
}

export default function SellerOnboardingScreen() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    storeName: '',
    bio: '',
    storeDescription: '',
    location: '',
    websiteUrl: '',
    legalBusinessName: '',
    businessType: 'individual',
  });

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1:
        return formData.storeName.trim().length > 0;
      case 2:
        return formData.bio.trim().length > 0;
      case 3:
        return true; // Optional fields
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!validateStep(step)) {
      Alert.alert('Required Field', 'Please fill in all required fields');
      return;
    }
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      router.back();
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      // Get auth token from storage
      const token = await getAuthToken();
      if (!token) {
        Alert.alert('Authentication Required', 'Please connect your wallet first');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/sellers/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          storeName: formData.storeName,
          bio: formData.bio,
          storeDescription: formData.storeDescription,
          location: formData.location,
          websiteUrl: formData.websiteUrl,
          legalBusinessName: formData.legalBusinessName,
          businessType: formData.businessType,
        }),
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert(
          'Success!',
          'Your seller profile has been created. Welcome to LinkDAO Marketplace!',
          [
            { text: 'Go to Dashboard', onPress: () => router.push('/marketplace/seller/dashboard') },
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

  const getAuthToken = async (): Promise<string | null> => {
    // TODO: Implement proper token retrieval from secure storage
    // For now, return null - this should be integrated with your auth system
    return null;
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Tell us about your store</Text>
            <Text style={styles.stepDescription}>What should we call your marketplace store?</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Store Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="My Awesome Store"
                placeholderTextColor="#9ca3af"
                value={formData.storeName}
                onChangeText={(value) => updateFormData('storeName', value)}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Business Type</Text>
              <View style={styles.businessTypeContainer}>
                <TouchableOpacity
                  style={[
                    styles.businessTypeButton,
                    formData.businessType === 'individual' && styles.businessTypeButtonActive,
                  ]}
                  onPress={() => updateFormData('businessType', 'individual')}
                >
                  <Ionicons
                    name="person-outline"
                    size={24}
                    color={formData.businessType === 'individual' ? '#ffffff' : '#6b7280'}
                  />
                  <Text
                    style={[
                      styles.businessTypeText,
                      formData.businessType === 'individual' && styles.businessTypeTextActive,
                    ]}
                  >
                    Individual
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.businessTypeButton,
                    formData.businessType === 'company' && styles.businessTypeButtonActive,
                  ]}
                  onPress={() => updateFormData('businessType', 'company')}
                >
                  <Ionicons
                    name="business-outline"
                    size={24}
                    color={formData.businessType === 'company' ? '#ffffff' : '#6b7280'}
                  />
                  <Text
                    style={[
                      styles.businessTypeText,
                      formData.businessType === 'company' && styles.businessTypeTextActive,
                    ]}
                  >
                    Company
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {formData.businessType === 'company' && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Legal Business Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Company Inc."
                  placeholderTextColor="#9ca3af"
                  value={formData.legalBusinessName}
                  onChangeText={(value) => updateFormData('legalBusinessName', value)}
                />
              </View>
            )}
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Describe your store</Text>
            <Text style={styles.stepDescription}>Help buyers understand what you offer</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Bio *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Tell buyers about yourself and your expertise..."
                placeholderTextColor="#9ca3af"
                value={formData.bio}
                onChangeText={(value) => updateFormData('bio', value)}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{formData.bio.length}/500</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Store Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe what products or services you offer..."
                placeholderTextColor="#9ca3af"
                value={formData.storeDescription}
                onChangeText={(value) => updateFormData('storeDescription', value)}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Additional Information</Text>
            <Text style={styles.stepDescription}>Optional details to help buyers find you</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                placeholder="City, Country"
                placeholderTextColor="#9ca3af"
                value={formData.location}
                onChangeText={(value) => updateFormData('location', value)}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Website URL</Text>
              <TextInput
                style={styles.input}
                placeholder="https://yourwebsite.com"
                placeholderTextColor="#9ca3af"
                value={formData.websiteUrl}
                onChangeText={(value) => updateFormData('websiteUrl', value)}
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={24} color="#3b82f6" />
              <View style={styles.infoBoxContent}>
                <Text style={styles.infoBoxTitle}>What's Next?</Text>
                <Text style={styles.infoBoxText}>
                  After creating your profile, you'll be able to:
                </Text>
                <View style={styles.infoBoxList}>
                  <Text style={styles.infoBoxItem}>• List products for sale</Text>
                  <Text style={styles.infoBoxItem}>• Manage orders and shipments</Text>
                  <Text style={styles.infoBoxItem}>• View analytics and earnings</Text>
                  <Text style={styles.infoBoxItem}>• Set up payment methods</Text>
                </View>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
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
          <View style={[styles.progressFill, { width: `${(step / 3) * 100}%` }]} />
        </View>
        <Text style={styles.stepIndicator}>Step {step} of 3</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderStep()}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, styles.backButton]}
          onPress={handleBack}
          disabled={step === 1}
        >
          <Text style={[styles.buttonText, styles.backButtonText]}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.nextButton, loading && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>{step === 3 ? 'Create Profile' : 'Next'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
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
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  stepContainer: {
    paddingBottom: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
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
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  charCount: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
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
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
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
    marginBottom: 8,
  },
  infoBoxList: {
    gap: 4,
  },
  infoBoxItem: {
    fontSize: 14,
    color: '#1e40af',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    backgroundColor: '#f3f4f6',
  },
  backButtonText: {
    color: '#6b7280',
  },
  nextButton: {
    backgroundColor: '#3b82f6',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});