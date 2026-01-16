/**
 * Create Listing Screen
 * Mobile-optimized form for creating new marketplace listings
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface FormData {
  title: string;
  description: string;
  priceAmount: string;
  priceCurrency: string;
  categoryId: string;
  inventory: string;
  itemType: 'PHYSICAL' | 'DIGITAL' | 'NFT' | 'SERVICE';
  condition: string;
  brand: string;
  images: string[];
  tags: string;
}

export default function CreateListingScreen() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    priceAmount: '',
    priceCurrency: 'USD',
    categoryId: '',
    inventory: '1',
    itemType: 'PHYSICAL',
    condition: 'New',
    brand: '',
    images: [],
    tags: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const handleNext = () => {
    if (!validateStep(step)) {
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

  const validateStep = (currentStep: number): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (currentStep === 1) {
      if (!formData.title.trim()) newErrors.title = 'Title is required';
      if (!formData.description.trim()) newErrors.description = 'Description is required';
      if (!formData.priceAmount.trim()) newErrors.priceAmount = 'Price is required';
      if (!formData.categoryId) newErrors.categoryId = 'Category is required';
      if (!formData.inventory.trim()) newErrors.inventory = 'Inventory is required';
    }

    if (currentStep === 2) {
      if (formData.images.length === 0) newErrors.images = 'At least one image is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const token = await getAuthToken();
      if (!token) {
        Alert.alert('Authentication Required', 'Please connect your wallet first');
        return;
      }

      const payload = {
        title: formData.title,
        description: formData.description,
        priceAmount: parseFloat(formData.priceAmount),
        priceCurrency: formData.priceCurrency,
        categoryId: formData.categoryId,
        inventory: parseInt(formData.inventory),
        itemType: formData.itemType,
        metadata: {
          condition: formData.condition,
          brand: formData.brand,
        },
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
        images: formData.images,
      };

      const response = await fetch(`${API_BASE_URL}/api/sellers/listings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert(
          'Success!',
          'Your listing has been created successfully.',
          [
            { text: 'View Listings', onPress: () => router.push('/marketplace/seller/dashboard') },
          { text: 'Create Another', onPress: () => {
              setFormData({
                title: '',
                description: '',
                priceAmount: '',
                priceCurrency: 'USD',
                categoryId: '',
                inventory: '1',
                itemType: 'PHYSICAL',
                condition: 'New',
                brand: '',
                images: [],
                tags: '',
              });
              setStep(1);
            }
          },
        ]
      );
      } else {
        Alert.alert('Error', result.message || 'Failed to create listing');
      }
    } catch (error) {
      console.error('Failed to create listing:', error);
      Alert.alert('Error', 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setFormData({ ...formData, images: [...formData.images, result.uri] });
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const removeImage = (index: number) => {
    setFormData({
      ...formData,
      images: formData.images.filter((_, i) => i !== index),
    });
  };

  const getAuthToken = async (): Promise<string | null> => {
    // TODO: Implement proper token retrieval
    return null;
  };

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Basic Information</Text>
      <Text style={styles.stepDescription}>Tell buyers about your product</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={[styles.input, errors.title && styles.inputError]}
          placeholder="Product name"
          placeholderTextColor="#9ca3af"
          value={formData.title}
          onChangeText={(value) => setFormData({ ...formData, title: value })}
        />
        {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea, errors.description && styles.inputError]}
          placeholder="Describe your product..."
          placeholderTextColor="#9ca3af"
          value={formData.description}
          onChangeText={(value) => setFormData({ ...formData, description: value })}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
        {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
        <Text style={styles.charCount}>{formData.description.length}/1000</Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Price *</Text>
        <View style={styles.priceInputContainer}>
          <TextInput
            style={[styles.priceInput, errors.priceAmount && styles.inputError]}
            placeholder="0.00"
            placeholderTextColor="#9ca3af"
            value={formData.priceAmount}
            onChangeText={(value) => setFormData({ ...formData, priceAmount: value })}
            keyboardType="decimal-pad"
          />
          <Text style={styles.currencySymbol}>$</Text>
        </View>
        {errors.priceAmount && <Text style={styles.errorText}>{errors.priceAmount}</Text>}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Category *</Text>
        <TouchableOpacity
          style={[styles.input, styles.selectInput]}
          onPress={() => Alert.alert('Categories', 'Select a category for your product')}
        >
          <Text style={formData.categoryId ? styles.selectText : styles.selectPlaceholder}>
            {formData.categoryId || 'Select category'}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#6b7280" />
        </TouchableOpacity>
        {errors.categoryId && <Text style={styles.errorText}>{errors.categoryId}</Text>}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Inventory *</Text>
        <TextInput
          style={[styles.input, errors.inventory && styles.inputError]}
          placeholder="1"
          placeholderTextColor="#9ca3af"
          value={formData.inventory}
          onChangeText={(value) => setFormData({ ...formData, inventory: value })}
          keyboardType="number-pad"
        />
        {errors.inventory && <Text style={styles.errorText}>{errors.inventory}</Text>}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Item Type</Text>
        <View style={styles.itemTypeContainer}>
          {(['PHYSICAL', 'DIGITAL', 'NFT', 'SERVICE'] as const).map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.itemTypeButton,
                formData.itemType === type && styles.itemTypeButtonActive,
              ]}
              onPress={() => setFormData({ ...formData, itemType: type })}
            >
              <Text style={[
                styles.itemTypeText,
                formData.itemType === type && styles.itemTypeTextActive,
              ]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Images</Text>
      <Text style={styles.stepDescription}>Add photos of your product</Text>

      <TouchableOpacity style={styles.uploadButton} onPress={handlePickImage}>
        <Ionicons name="camera-outline" size={32} color="#3b82f6" />
        <Text style={styles.uploadButtonText}>Add Image</Text>
      </TouchableOpacity>

      {formData.images.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScroll}>
          {formData.images.map((image, index) => (
            <View key={index} style={styles.imageContainer}>
              <Image source={{ uri: image }} style={styles.imagePreview} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => removeImage(index)}
              >
                <Ionicons name="close-circle" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {errors.images && <Text style={styles.errorText}>{errors.images}</Text>}

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Condition</Text>
        <View style={styles.conditionContainer}>
          {['New', 'Like New', 'Good', 'Fair', 'Poor'].map((condition) => (
            <TouchableOpacity
              key={condition}
              style={[
                styles.conditionButton,
                formData.condition === condition && styles.conditionButtonActive,
              ]}
              onPress={() => setFormData({ ...formData, condition })}
            >
              <Text style={[
                styles.conditionText,
                formData.condition === condition && styles.conditionTextActive,
              ]}>
                {condition}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Brand (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Brand name"
          placeholderTextColor="#9ca3af"
          value={formData.brand}
          onChangeText={(value) => setFormData({ ...formData, brand: value })}
        />
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Tags</Text>
      <Text style={styles.stepDescription}>Help buyers find your product</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Tags</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="tag1, tag2, tag3"
          placeholderTextColor="#9ca3af"
          value={formData.tags}
          onChangeText={(value) => setFormData({ ...formData, tags: value })}
        />
        <Text style={styles.hintText}>Separate tags with commas</Text>
      </View>

      <View style={styles.reviewContainer}>
        <Text style={styles.reviewTitle}>Review Your Listing</Text>
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Title:</Text>
          <Text style={styles.reviewValue}>{formData.title}</Text>
        </View>
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Price:</Text>
          <Text style={styles.reviewValue}>${formData.priceAmount}</Text>
        </View>
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Type:</Text>
          <Text style={styles.reviewValue}>{formData.itemType}</Text>
        </View>
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Images:</Text>
          <Text style={styles.reviewValue}>{formData.images.length} uploaded</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Listing</Text>
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
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
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
            <Text style={styles.buttonText}>{step === 3 ? 'Create Listing' : 'Next'}</Text>
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
    padding: 16,
  },
  stepContent: {
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
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    overflow: 'hidden',
  },
  priceInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  currencySymbol: {
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#6b7280',
    borderLeftWidth: 1,
    borderLeftColor: '#d1d5db',
  },
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: {
    fontSize: 16,
    color: '#1f2937',
  },
  selectPlaceholder: {
    fontSize: 16,
    color: '#9ca3af',
  },
  itemTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  itemTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  itemTypeButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  itemTypeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  itemTypeTextActive: {
    color: '#ffffff',
  },
  uploadButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
    marginTop: 8,
  },
  imagesScroll: {
    marginBottom: 16,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 4,
  },
  conditionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  conditionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  conditionButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  conditionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  conditionTextActive: {
    color: '#ffffff',
  },
  hintText: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  reviewContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  reviewItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  reviewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    width: 120,
  },
  reviewValue: {
    flex: 1,
    fontSize: 14,
    color: '#1f2937',
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