/**
 * Create Support Ticket Page
 * Form for creating new support tickets
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
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supportService } from '../../src/services/supportService';
import { useAuthStore } from '../../src/store/authStore';
import { THEME } from '../../src/constants/theme';

type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
type TicketCategory = 'general' | 'technical' | 'account' | 'payment' | 'marketplace' | 'other';

export default function CreateTicketPage() {
  const { user } = useAuthStore();

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory>('general');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [submitting, setSubmitting] = useState(false);

  const categories: { value: TicketCategory; label: string; icon: string }[] = [
    { value: 'general', label: 'General', icon: 'help-circle-outline' },
    { value: 'technical', label: 'Technical', icon: 'construct-outline' },
    { value: 'account', label: 'Account', icon: 'person-outline' },
    { value: 'payment', label: 'Payment', icon: 'card-outline' },
    { value: 'marketplace', label: 'Marketplace', icon: 'storefront-outline' },
    { value: 'other', label: 'Other', icon: 'ellipsis-horizontal-circle-outline' },
  ];

  const priorities: { value: TicketPriority; label: string; color: string }[] = [
    { value: 'low', label: 'Low', color: THEME.colors.gray },
    { value: 'medium', label: 'Medium', color: THEME.colors.info },
    { value: 'high', label: 'High', color: THEME.colors.warning },
    { value: 'urgent', label: 'Urgent', color: THEME.colors.error },
  ];

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Error', 'Please login to create a support ticket');
      return;
    }

    if (!subject.trim()) {
      Alert.alert('Error', 'Please enter a subject');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    if (description.length < 50) {
      Alert.alert('Error', 'Description must be at least 50 characters');
      return;
    }

    Alert.alert(
      'Submit Ticket',
      'Are you sure you want to submit this support ticket?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          style: 'default',
          onPress: async () => {
            try {
              setSubmitting(true);
              const result = await supportService.createTicket({
                subject: subject.trim(),
                description: description.trim(),
                category,
                priority,
              });

              if (result) {
                Alert.alert('Success', 'Support ticket created successfully', [
                  {
                    text: 'OK',
                    onPress: () => router.back(),
                  },
                ]);
              } else {
                Alert.alert('Error', 'Failed to create ticket');
              }
            } catch (error) {
              console.error('Error creating ticket:', error);
              Alert.alert('Error', 'Failed to create ticket');
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
        <Text style={styles.headerTitle}>Create Support Ticket</Text>
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
        {/* Subject Input */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Subject *</Text>
          <TextInput
            style={styles.input}
            placeholder="Brief summary of your issue"
            value={subject}
            onChangeText={setSubject}
            maxLength={100}
          />
          <Text style={styles.charCount}>{subject.length}/100</Text>
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

        {/* Priority Selection */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Priority *</Text>
          <View style={styles.priorityContainer}>
            {priorities.map((prio) => (
              <TouchableOpacity
                key={prio.value}
                style={[
                  styles.priorityCard,
                  priority === prio.value && { borderColor: prio.color, backgroundColor: prio.color + '10' },
                ]}
                onPress={() => setPriority(prio.value)}
              >
                <View style={[styles.priorityDot, { backgroundColor: prio.color }]} />
                <Text style={styles.priorityLabel}>{prio.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Description Input */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Please describe your issue in detail. Include any relevant information such as error messages, steps to reproduce, and what you were trying to do."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
            maxLength={5000}
          />
          <Text style={styles.charCount}>{description.length}/5000 (min 50)</Text>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={20} color={THEME.colors.primary} />
            <Text style={styles.infoTitle}>Ticket Guidelines</Text>
          </View>
          <Text style={styles.infoText}>
            • Provide a clear, descriptive subject line
          </Text>
          <Text style={styles.infoText}>
            • Include detailed information about your issue
          </Text>
          <Text style={styles.infoText}>
            • Attach screenshots if applicable (feature coming soon)
          </Text>
          <Text style={styles.infoText}>
            • Response time varies by priority (Urgent: 1-2 hours, High: 4-6 hours, Medium: 12-24 hours, Low: 24-48 hours)
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
  priorityContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  priorityCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: THEME.colors.white,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  priorityLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.text.primary,
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