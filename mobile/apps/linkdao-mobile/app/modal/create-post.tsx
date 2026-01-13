/**
 * Create Post Modal
 * Create new posts with text and media attachments
 */

import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function CreatePostModal() {
  const [content, setContent] = useState('');

  const handlePost = () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Please enter some content');
      return;
    }
    // TODO: Implement post creation logic
    Alert.alert('Success', 'Post created successfully');
    router.back();
  };

  const handleAttachImage = () => {
    // TODO: Implement image picker
    Alert.alert('Info', 'Image picker coming soon');
  };

  const handleClose = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Post</Text>
          <TouchableOpacity style={styles.postButton} onPress={handlePost}>
            <Text style={styles.postButtonText}>Post</Text>
          </TouchableOpacity>
        </View>

        {/* Post Content */}
        <ScrollView style={styles.content}>
          <View style={styles.userInfo}>
            <View style={styles.avatar} />
            <View style={styles.userDetails}>
              <Text style={styles.userName}>Alex Johnson</Text>
              <Text style={styles.userHandle}>@alexjohnson</Text>
            </View>
          </View>

          <TextInput
            style={styles.contentInput}
            placeholder="What's on your mind?"
            placeholderTextColor="#9ca3af"
            value={content}
            onChangeText={setContent}
            multiline
            autoFocus
          />

          {/* Attachment Options */}
          <View style={styles.attachments}>
            <TouchableOpacity style={styles.attachmentButton} onPress={handleAttachImage}>
              <Ionicons name="image-outline" size={24} color="#3b82f6" />
              <Text style={styles.attachmentText}>Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachmentButton}>
              <Ionicons name="videocam-outline" size={24} color="#8b5cf6" />
              <Text style={styles.attachmentText}>Video</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachmentButton}>
              <Ionicons name="link-outline" size={24} color="#10b981" />
              <Text style={styles.attachmentText}>Link</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Privacy Settings */}
        <View style={styles.footer}>
          <View style={styles.privacyOption}>
            <Ionicons name="globe-outline" size={20} color="#6b7280" />
            <Text style={styles.privacyText}>Public</Text>
            <Ionicons name="chevron-down" size={20} color="#9ca3af" />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  postButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  postButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  userHandle: {
    fontSize: 14,
    color: '#6b7280',
  },
  contentInput: {
    fontSize: 18,
    color: '#1f2937',
    lineHeight: 26,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  attachments: {
    flexDirection: 'row',
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  attachmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f9fafb',
    marginRight: 12,
  },
  attachmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 6,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
  },
  privacyText: {
    flex: 1,
    fontSize: 14,
    color: '#1f2937',
    marginLeft: 8,
  },
});