/**
 * Profile Edit Screen
 * Allow users to update their profile information including handle, display name, ENS, bio, avatar, banner, social media links
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Image, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../src/store';
import { profileService } from '../../src/services';

interface SocialLink {
  platform: string;
  url: string;
  username: string;
}

interface ProfileData {
  handle: string;
  displayName: string;
  ens: string;
  bio: string;
  avatar: string;
  banner: string;
  website: string;
  socialLinks: SocialLink[];
}

const SOCIAL_PLATFORMS = [
  { id: 'twitter', name: 'Twitter', icon: 'logo-twitter', color: '#1da1f2' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'logo-linkedin', color: '#0077b5' },
  { id: 'github', name: 'GitHub', icon: 'logo-github', color: '#333333' },
  { id: 'discord', name: 'Discord', icon: 'logo-discord', color: '#5865f2' },
  { id: 'telegram', name: 'Telegram', icon: 'logo-telegram', color: '#0088cc' },
];

export default function ProfileEditScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [profile, setProfile] = useState<ProfileData>({
    handle: '',
    displayName: '',
    ens: '',
    bio: '',
    avatar: '',
    banner: '',
    website: '',
    socialLinks: [],
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSocialPicker, setShowSocialPicker] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const userProfile = await profileService.getProfile(user?.id);
      if (userProfile) {
        setProfile({
          handle: userProfile.handle || '',
          displayName: userProfile.displayName || '',
          ens: userProfile.ens || '',
          bio: userProfile.bio || '',
          avatar: userProfile.avatar || '',
          banner: userProfile.banner || '',
          website: userProfile.website || '',
          socialLinks: userProfile.socialLinks || [],
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (profile.handle && !/^[a-zA-Z0-9_]{3,20}$/.test(profile.handle)) {
      newErrors.handle = 'Handle must be 3-20 characters and contain only letters, numbers, and underscores';
    }

    if (profile.displayName && profile.displayName.length > 50) {
      newErrors.displayName = 'Display name must be less than 50 characters';
    }

    if (profile.website && !isValidUrl(profile.website)) {
      newErrors.website = 'Please enter a valid website URL';
    }

    profile.socialLinks.forEach((link, index) => {
      if (link.url && !isValidUrl(link.url)) {
        newErrors[`social_${index}`] = 'Please enter a valid URL';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors before saving');
      return;
    }

    setSaving(true);
    try {
      await profileService.updateProfile(user?.id, profile);
      Alert.alert('Success', 'Profile updated successfully!');
      router.back();
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setUploadingAvatar(true);
        // In production, upload to IPFS/CDN
        setProfile(prev => ({ ...prev, avatar: result.assets[0].uri }));
        setUploadingAvatar(false);
      }
    } catch (error) {
      console.error('Error picking avatar:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handlePickBanner = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled) {
        setUploadingBanner(true);
        // In production, upload to IPFS/CDN
        setProfile(prev => ({ ...prev, banner: result.assets[0].uri }));
        setUploadingBanner(false);
      }
    } catch (error) {
      console.error('Error picking banner:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleAddSocialLink = () => {
    setShowSocialPicker(true);
  };

  const handleSocialLinkSelect = (platform: typeof SOCIAL_PLATFORMS[0]) => {
    setProfile(prev => ({
      ...prev,
      socialLinks: [...prev.socialLinks, { platform: platform.id, url: '', username: '' }],
    }));
    setShowSocialPicker(false);
  };

  const handleSocialLinkChange = (index: number, field: keyof SocialLink, value: string) => {
    setProfile(prev => ({
      ...prev,
      socialLinks: prev.socialLinks.map((link, i) =>
        i === index ? { ...link, [field]: value } : link
      ),
    }));
  };

  const handleRemoveSocialLink = (index: number) => {
    setProfile(prev => ({
      ...prev,
      socialLinks: prev.socialLinks.filter((_, i) => i !== index),
    }));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Banner */}
        <TouchableOpacity style={styles.bannerContainer} onPress={handlePickBanner} disabled={uploadingBanner}>
          {profile.banner ? (
            <Image source={{ uri: profile.banner }} style={styles.bannerImage} />
          ) : (
            <View style={styles.bannerPlaceholder}>
              <Ionicons name="image-outline" size={40} color="#9ca3af" />
              <Text style={styles.bannerPlaceholderText}>Add Banner</Text>
            </View>
          )}
          {uploadingBanner && (
            <View style={styles.uploadOverlay}>
              <ActivityIndicator size="large" color="#ffffff" />
            </View>
          )}
        </TouchableOpacity>

        {/* Avatar */}
        <TouchableOpacity style={styles.avatarContainer} onPress={handlePickAvatar} disabled={uploadingAvatar}>
          {profile.avatar ? (
            <Image source={{ uri: profile.avatar }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: '#3b82f6' }]}>
              <Ionicons name="person" size={32} color="#ffffff" />
            </View>
          )}
          <TouchableOpacity style={styles.avatarEditButton} onPress={handlePickAvatar}>
            <Ionicons name="camera" size={16} color="#ffffff" />
          </TouchableOpacity>
          {uploadingAvatar && (
            <View style={styles.uploadOverlay}>
              <ActivityIndicator size="small" color="#ffffff" />
            </View>
          )}
        </TouchableOpacity>

        {/* Form Fields */}
        <View style={styles.form}>
          {/* Handle */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Handle *</Text>
            <View style={[styles.inputContainer, errors.handle && styles.inputContainerError]}>
              <Text style={styles.inputPrefix}>@</Text>
              <TextInput
                style={styles.input}
                placeholder="yourhandle"
                placeholderTextColor="#9ca3af"
                value={profile.handle}
                onChangeText={(value) => setProfile(prev => ({ ...prev, handle: value }))}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {errors.handle && <Text style={styles.errorText}>{errors.handle}</Text>}
          </View>

          {/* Display Name */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Display Name</Text>
            <TextInput
              style={[styles.input, errors.displayName && styles.inputError]}
              placeholder="Your Name"
              placeholderTextColor="#9ca3af"
              value={profile.displayName}
              onChangeText={(value) => setProfile(prev => ({ ...prev, displayName: value }))}
              maxLength={50}
            />
            {errors.displayName && <Text style={styles.errorText}>{errors.displayName}</Text>}
          </View>

          {/* ENS Name */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>ENS Name</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputPrefix}>.eth</Text>
              <TextInput
                style={styles.input}
                placeholder="yourens"
                placeholderTextColor="#9ca3af"
                value={profile.ens}
                onChangeText={(value) => setProfile(prev => ({ ...prev, ens: value }))}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Bio */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tell us about yourself..."
              placeholderTextColor="#9ca3af"
              value={profile.bio}
              onChangeText={(value) => setProfile(prev => ({ ...prev, bio: value }))}
              multiline
              numberOfLines={4}
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{profile.bio.length}/500</Text>
          </View>

          {/* Website */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Website</Text>
            <TextInput
              style={[styles.input, errors.website && styles.inputError]}
              placeholder="https://yourwebsite.com"
              placeholderTextColor="#9ca3af"
              value={profile.website}
              onChangeText={(value) => setProfile(prev => ({ ...prev, website: value }))}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {errors.website && <Text style={styles.errorText}>{errors.website}</Text>}
          </View>

          {/* Social Links */}
          <View style={styles.formGroup}>
            <View style={styles.formGroupHeader}>
              <Text style={styles.label}>Social Links</Text>
              <TouchableOpacity style={styles.addButton} onPress={handleAddSocialLink}>
                <Ionicons name="add" size={20} color="#3b82f6" />
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>

            {profile.socialLinks.map((link, index) => (
              <View key={index} style={styles.socialLinkCard}>
                <View style={styles.socialLinkHeader}>
                  <Ionicons
                    name={SOCIAL_PLATFORMS.find(p => p.id === link.platform)?.icon as any || 'link-outline'}
                    size={24}
                    color={SOCIAL_PLATFORMS.find(p => p.id === link.platform)?.color || '#6b7280'}
                  />
                  <Text style={styles.socialLinkPlatform}>
                    {SOCIAL_PLATFORMS.find(p => p.id === link.platform)?.name || link.platform}
                  </Text>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveSocialLink(index)}
                  >
                    <Ionicons name="close-circle" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[styles.input, errors[`social_${index}`] && styles.inputError]}
                  placeholder={`https://${link.platform}.com/username`}
                  placeholderTextColor="#9ca3af"
                  value={link.url}
                  onChangeText={(value) => handleSocialLinkChange(index, 'url', value)}
                  keyboardType="url"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {errors[`social_${index}`] && <Text style={styles.errorText}>{errors[`social_${index}`]}</Text>}
              </View>
            ))}

            {profile.socialLinks.length === 0 && (
              <View style={styles.emptySocialLinks}>
                <Ionicons name="link-outline" size={32} color="#9ca3af" />
                <Text style={styles.emptySocialText}>No social links added</Text>
                <Text style={styles.emptySocialSubtext}>Add your social media profiles</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Social Platform Picker Modal */}
      {showSocialPicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Platform</Text>
              <TouchableOpacity onPress={() => setShowSocialPicker(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {SOCIAL_PLATFORMS.map((platform) => (
                <TouchableOpacity
                  key={platform.id}
                  style={styles.platformItem}
                  onPress={() => handleSocialLinkSelect(platform)}
                >
                  <Ionicons name={platform.icon as any} size={24} color={platform.color} />
                  <Text style={styles.platformName}>{platform.name}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  centerContainer: {
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
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  bannerContainer: {
    height: 180,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerPlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#9ca3af',
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarContainer: {
    alignSelf: 'center',
    marginTop: -60,
    position: 'relative',
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#ffffff',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEditButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  form: {
    padding: 16,
    marginTop: 8,
  },
  formGroup: {
    marginBottom: 20,
  },
  formGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
  },
  inputContainerError: {
    borderColor: '#ef4444',
  },
  inputPrefix: {
    fontSize: 15,
    color: '#6b7280',
    marginRight: 4,
  },
  input: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1f2937',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  charCount: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
    marginTop: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
  },
  socialLinkCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  socialLinkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  socialLinkPlatform: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  removeButton: {
    padding: 4,
  },
  emptySocialLinks: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
  },
  emptySocialText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  emptySocialSubtext: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  bottomSpacer: {
    height: 100,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalList: {
    paddingVertical: 8,
  },
  platformItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  platformName: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
});