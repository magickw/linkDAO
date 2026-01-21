/**
 * NFT Minting Interface Component
 * Allows users to create and mint new NFTs
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { nftService } from '../services/nftService';

interface NFTMintingInterfaceProps {
  onSuccess?: (nftId: string) => void;
  onCancel?: () => void;
}

export const NFTMintingInterface: React.FC<NFTMintingInterfaceProps> = ({
  onSuccess,
  onCancel,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [price, setPrice] = useState('');
  const [collectionId, setCollectionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!image) {
      newErrors.image = 'Image is required';
    }

    if (price && isNaN(parseFloat(price))) {
      newErrors.price = 'Price must be a valid number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, description, image, price]);

  const pickImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0].uri);
        setErrors((prev) => ({ ...prev, image: '' }));
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  }, []);

  const takePhoto = useCallback(async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0].uri);
        setErrors((prev) => ({ ...prev, image: '' }));
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  }, []);

  const handleMint = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const result = await nftService.createNFT({
        name: name.trim(),
        description: description.trim(),
        image: image!,
        collectionId: collectionId || undefined,
        price: price ? parseFloat(price) : undefined,
      });

      if (result.success) {
        Alert.alert(
          'Success',
          'NFT created successfully!',
          [
            {
              text: 'OK',
              onPress: () => onSuccess?.(result.nftId || ''),
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to create NFT');
      }
    } catch (error) {
      console.error('Error minting NFT:', error);
      Alert.alert('Error', 'Failed to create NFT');
    } finally {
      setLoading(false);
    }
  }, [name, description, image, price, collectionId, validateForm, onSuccess]);

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        <Text style={styles.title}>Create New NFT</Text>
        <Text style={styles.subtitle}>Fill in the details to mint your NFT</Text>

        {/* Image Upload */}
        <View style={styles.imageSection}>
          <Text style={styles.label}>NFT Image *</Text>
          {image ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: image }} style={styles.imagePreview} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => setImage(null)}
              >
                <Text style={styles.removeImageText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.imageUploadContainer}>
              <TouchableOpacity style={styles.imageUploadButton} onPress={pickImage}>
                <Text style={styles.imageUploadText}>📷 Choose from Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.imageUploadButton} onPress={takePhoto}>
                <Text style={styles.imageUploadText}>📸 Take Photo</Text>
              </TouchableOpacity>
            </View>
          )}
          {errors.image && <Text style={styles.errorText}>{errors.image}</Text>}
        </View>

        {/* Name */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            placeholder="Enter NFT name"
            placeholderTextColor="#a0a0a0"
            value={name}
            onChangeText={(text) => {
              setName(text);
              setErrors((prev) => ({ ...prev, name: '' }));
            }}
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
        </View>

        {/* Description */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.textarea, errors.description && styles.inputError]}
            placeholder="Describe your NFT"
            placeholderTextColor="#a0a0a0"
            value={description}
            onChangeText={(text) => {
              setDescription(text);
              setErrors((prev) => ({ ...prev, description: '' }));
            }}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
        </View>

        {/* Price (Optional) */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Price (ETH) - Optional</Text>
          <TextInput
            style={[styles.input, errors.price && styles.inputError]}
            placeholder="Enter listing price"
            placeholderTextColor="#a0a0a0"
            value={price}
            onChangeText={(text) => {
              setPrice(text);
              setErrors((prev) => ({ ...prev, price: '' }));
            }}
            keyboardType="decimal-pad"
          />
          {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
          <Text style={styles.hintText}>
            Leave empty if you don't want to list it for sale immediately
          </Text>
        </View>

        {/* Collection ID (Optional) */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Collection ID - Optional</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter collection ID"
            placeholderTextColor="#a0a0a0"
            value={collectionId}
            onChangeText={setCollectionId}
          />
          <Text style={styles.hintText}>
            Add to an existing collection or leave empty for standalone NFT
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onCancel}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.mintButton, loading && styles.buttonDisabled]}
            onPress={handleMint}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#0f0f23" />
            ) : (
              <Text style={styles.mintButtonText}>Mint NFT</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>💡 Minting Info</Text>
          <Text style={styles.infoText}>
            • Your NFT will be created on the blockchain
          </Text>
          <Text style={styles.infoText}>
            • Gas fees will be charged for minting
          </Text>
          <Text style={styles.infoText}>
            • You can list it for sale immediately or later
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#a0a0a0',
    marginBottom: 24,
  },
  imageSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  imageUploadContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  imageUploadButton: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#16213e',
    borderStyle: 'dashed',
  },
  imageUploadText: {
    fontSize: 14,
    color: '#4ecca3',
    fontWeight: '500',
  },
  imagePreviewContainer: {
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#ff4757',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  removeImageText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  inputSection: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#16213e',
  },
  inputError: {
    borderColor: '#ff4757',
  },
  textarea: {
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#16213e',
    minHeight: 120,
  },
  errorText: {
    fontSize: 12,
    color: '#ff4757',
    marginTop: 4,
  },
  hintText: {
    fontSize: 12,
    color: '#a0a0a0',
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 24,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#16213e',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  mintButton: {
    backgroundColor: '#4ecca3',
  },
  mintButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f0f23',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  infoSection: {
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4ecca3',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#a0a0a0',
    marginBottom: 4,
  },
});

export default NFTMintingInterface;