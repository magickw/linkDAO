/**
 * Create Proposal Modal
 * Modal interface for creating new governance proposals
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { governanceService } from '../../src/services/governanceService';
import { useAuthStore } from '../../src/store/authStore';
import { THEME } from '../../src/constants/theme';

type ProposalCategory = 'protocol' | 'treasury' | 'community' | 'charity' | 'other';

export default function CreateProposalModal() {
  const { user } = useAuthStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ProposalCategory>('protocol');
  const [votingDuration, setVotingDuration] = useState('7');
  const [submitting, setSubmitting] = useState(false);

  const categories: { value: ProposalCategory; label: string; icon: string }[] = [
    { value: 'protocol', label: 'Protocol', icon: 'settings-outline' },
    { value: 'treasury', label: 'Treasury', icon: 'wallet-outline' },
    { value: 'community', label: 'Community', icon: 'people-outline' },
    { value: 'charity', label: 'Charity', icon: 'heart-outline' },
    { value: 'other', label: 'Other', icon: 'document-text-outline' },
  ];

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Error', 'Please connect your wallet to create a proposal');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a proposal title');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a proposal description');
      return;
    }

    if (description.length < 100) {
      Alert.alert('Error', 'Description must be at least 100 characters');
      return;
    }

    const duration = parseInt(votingDuration);
    if (isNaN(duration) || duration < 1 || duration > 30) {
      Alert.alert('Error', 'Voting duration must be between 1 and 30 days');
      return;
    }

    Alert.alert(
      'Confirm Proposal',
      'Are you sure you want to submit this proposal? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          style: 'default',
          onPress: async () => {
            try {
              setSubmitting(true);
              const result = await governanceService.createProposal({
                title: title.trim(),
                description: description.trim(),
                category,
                votingDuration: duration * 24 * 60 * 60 * 1000,
              });

              if (result) {
                Alert.alert('Success', 'Proposal created successfully', [
                  {
                    text: 'OK',
                    onPress: () => router.back(),
                  },
                ]);
              } else {
                Alert.alert('Error', 'Failed to create proposal');
              }
            } catch (error) {
              console.error('Error creating proposal:', error);
              Alert.alert('Error', 'Failed to create proposal');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="close" size={24} color={THEME.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Proposal</Text>
        <TouchableOpacity
          style={[styles.headerButton, styles.submitButton]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={THEME.colors.primary} />
          ) : (
            <Text style={styles.submitButtonText}>Submit</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {/* Title Input */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Proposal Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter a clear, concise title"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
          <Text style={styles.charCount}>{title.length}/100</Text>
        </View>

        {/* Category Selection */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Category *</Text>
          <View style={styles.categoryGrid}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.categoryCard,
                  category === cat.value && styles.selectedCategory,
                ]}
                onPress={() => setCategory(cat.value)}
              >
                <Ionicons
                  name={cat.icon as any}
                  size={24}
                  color={category === cat.value ? THEME.colors.primary : THEME.colors.gray}
                />
                <Text
                  style={[
                    styles.categoryLabel,
                    category === cat.value && styles.selectedCategoryLabel,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Description Input */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe your proposal in detail. Include background, motivation, and expected impact."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
            maxLength={5000}
          />
          <Text style={styles.charCount}>{description.length}/5000 (min 100)</Text>
        </View>

        {/* Voting Duration */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Voting Duration (days) *</Text>
          <TextInput
            style={styles.input}
            placeholder="7"
            value={votingDuration}
            onChangeText={setVotingDuration}
            keyboardType="number-pad"
            maxLength={2}
          />
          <Text style={styles.hint}>Duration must be between 1 and 30 days</Text>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={20} color={THEME.colors.primary} />
            <Text style={styles.infoTitle}>Proposal Guidelines</Text>
          </View>
          <Text style={styles.infoText}>
            • Proposals require a minimum of 100 characters in the description
          </Text>
          <Text style={styles.infoText}>
            • Voting duration must be between 1 and 30 days
          </Text>
          <Text style={styles.infoText}>
            • Once submitted, proposals cannot be edited
          </Text>
          <Text style={styles.infoText}>
            • Proposals will be visible to all community members
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background.default,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: THEME.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  headerButton: {
    width: 60,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME.colors.text.primary,
  },
  submitButton: {
    backgroundColor: THEME.colors.primary + '10',
    borderRadius: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.primary,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  inputSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.text.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: THEME.colors.white,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: THEME.colors.text.primary,
  },
  textArea: {
    height: 200,
    paddingTop: 12,
  },
  charCount: {
    fontSize: 12,
    color: THEME.colors.gray,
    marginTop: 4,
    textAlign: 'right',
  },
  hint: {
    fontSize: 12,
    color: THEME.colors.gray,
    marginTop: 4,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: THEME.colors.white,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  selectedCategory: {
    backgroundColor: THEME.colors.primary + '10',
    borderColor: THEME.colors.primary,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.text.primary,
    marginTop: 6,
  },
  selectedCategoryLabel: {
    color: THEME.colors.primary,
  },
  infoCard: {
    backgroundColor: THEME.colors.primary + '5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.primary,
  },
  infoText: {
    fontSize: 13,
    color: THEME.colors.text.primary,
    lineHeight: 18,
    marginBottom: 4,
  },
});