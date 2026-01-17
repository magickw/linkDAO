/**
 * Privacy Policy Screen
 * Mobile-optimized Privacy Policy page
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Effective Date</Text>
          <Text style={styles.sectionText}>
            This Privacy Policy explains how LinkDAO collects, uses, and protects your personal information.
            By using our services, you agree to the collection and use of information in accordance with this policy.
          </Text>
          <Text style={styles.effectiveDate}>Last Updated: January 1, 2024</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Information We Collect</Text>
          <Text style={styles.sectionText}>
            We collect several types of information to provide and improve our services:
          </Text>
          
          <Text style={styles.subsectionTitle}>Personal Information</Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Name and display name</Text>
            <Text style={styles.listItem}>• Email address</Text>
            <Text style={styles.listItem}>• Wallet address (for Web3 functionality)</Text>
            <Text style={styles.listItem}>• Profile picture and bio</Text>
          </View>

          <Text style={styles.subsectionTitle}>Transaction Information</Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Purchase history</Text>
            <Text style={styles.listItem}>• Payment information (processed securely)</Text>
            <Text style={styles.listItem}>• Shipping and billing addresses</Text>
          </View>

          <Text style={styles.subsectionTitle}>Usage Data</Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• App usage patterns and preferences</Text>
            <Text style={styles.listItem}>• Device information and IP address</Text>
            <Text style={styles.listItem}>• Cookies and similar technologies</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
          <Text style={styles.sectionText}>
            We use your information to:
          </Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Provide, maintain, and improve our services</Text>
            <Text style={styles.listItem}>• Process transactions and send order confirmations</Text>
            <Text style={styles.listItem}>• Send technical notices and support messages</Text>
            <Text style={styles.listItem}>• Respond to comments and questions</Text>
            <Text style={styles.listItem}>• Monitor and analyze usage patterns</Text>
            <Text style={styles.listItem}>• Detect, prevent, and address technical issues</Text>
            <Text style={styles.listItem}>• Comply with legal obligations</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Information Sharing</Text>
          <Text style={styles.sectionText}>
            We do not sell your personal information. We may share your information only in the following circumstances:
          </Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• With service providers who perform services on our behalf</Text>
            <Text style={styles.listItem}>• With other users for transaction purposes (e.g., seller information)</Text>
            <Text style={styles.listItem}>• With your consent for specific purposes</Text>
            <Text style={styles.listItem}>• To comply with legal obligations or protect our rights</Text>
            <Text style={styles.listItem}>• In connection with a business transfer or merger</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Data Security</Text>
          <Text style={styles.sectionText}>
            We implement appropriate security measures to protect your personal information:
          </Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Encryption of sensitive data in transit and at rest</Text>
            <Text style={styles.listItem}>• Secure payment processing through PCI-compliant providers</Text>
            <Text style={styles.listItem}>• Regular security audits and updates</Text>
            <Text style={styles.listItem}>• Access controls and authentication systems</Text>
          </View>
          <Text style={styles.sectionText}>
            However, no method of transmission over the internet is 100% secure. While we strive to protect your
            personal information, we cannot guarantee absolute security.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Your Rights (GDPR)</Text>
          <Text style={styles.sectionText}>
            Under GDPR, you have the right to:
          </Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Access your personal data</Text>
            <Text style={styles.listItem}>• Request correction of inaccurate data</Text>
            <Text style={styles.listItem}>• Request deletion of your personal data</Text>
            <Text style={styles.listItem}>• Object to processing of your data</Text>
            <Text style={styles.listItem}>• Request data portability</Text>
            <Text style={styles.listItem}>• Withdraw consent at any time</Text>
          </View>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.push('/settings/data-deletion')}
          >
            <Text style={styles.linkButtonText}>Request Data Deletion</Text>
            <Ionicons name="arrow-forward" size={16} color="#3b82f6" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Web3 and Blockchain Data</Text>
          <Text style={styles.sectionText}>
            As a Web3 platform, LinkDAO interacts with blockchain networks. Please note:
          </Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Wallet addresses and transaction data are public on the blockchain</Text>
            <Text style={styles.listItem}>• We do not control or have access to your private keys</Text>
            <Text style={styles.listItem}>• Smart contract interactions are immutable and transparent</Text>
            <Text style={styles.listItem}>• Token holdings and governance votes are publicly verifiable</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Cookies and Tracking</Text>
          <Text style={styles.sectionText}>
            We use cookies and similar technologies to:
          </Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Remember your preferences and settings</Text>
            <Text style={styles.listItem}>• Analyze app usage and performance</Text>
            <Text style={styles.listItem}>• Provide personalized content and recommendations</Text>
          </View>
          <Text style={styles.sectionText}>
            You can manage cookie preferences through your device settings.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Data Retention</Text>
          <Text style={styles.sectionText}>
            We retain your personal information for as long as necessary to provide our services and comply
            with legal obligations. You may request deletion of your data at any time through your account settings.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Children's Privacy</Text>
          <Text style={styles.sectionText}>
            LinkDAO is not intended for children under 13 years of age. We do not knowingly collect personal
            information from children under 13. If we become aware of such collection, we will take steps to
            delete the information.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. International Data Transfers</Text>
          <Text style={styles.sectionText}>
            Your information may be transferred to and processed in countries other than your own. We ensure
            appropriate safeguards are in place to protect your data in accordance with this Privacy Policy.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Changes to This Policy</Text>
          <Text style={styles.sectionText}>
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting
            the new Privacy Policy on this page and updating the "Last Updated" date.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. Contact Us</Text>
          <Text style={styles.sectionText}>
            If you have questions about this Privacy Policy or your personal data, please contact us at:
          </Text>
          <View style={styles.contactInfo}>
            <Text style={styles.contactText}>Email: privacy@linkdao.io</Text>
            <Text style={styles.contactText}>Website: https://linkdao.io</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Your privacy is important to us. We are committed to protecting your personal information
            and being transparent about our data practices.
          </Text>
        </View>
      </ScrollView>
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
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 12,
    marginBottom: 6,
  },
  sectionText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 8,
  },
  effectiveDate: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  list: {
    marginLeft: 8,
    marginBottom: 8,
  },
  listItem: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 4,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  linkButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
  },
  contactInfo: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  footer: {
    padding: 20,
    backgroundColor: '#f9fafb',
  },
  footerText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 18,
  },
});