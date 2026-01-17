/**
 * Terms of Service Screen
 * Mobile-optimized Terms of Service page
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function TermsOfServiceScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Effective Date</Text>
          <Text style={styles.sectionText}>
            These Terms of Service ("Terms") govern your use of the LinkDAO mobile application and services.
            By accessing or using LinkDAO, you agree to be bound by these Terms.
          </Text>
          <Text style={styles.effectiveDate}>Last Updated: January 1, 2024</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.sectionText}>
            By downloading, installing, or using the LinkDAO mobile application, you acknowledge that you have read,
            understood, and agree to be bound by these Terms. If you do not agree to these Terms, please do not use
            our services.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Description of Service</Text>
          <Text style={styles.sectionText}>
            LinkDAO is a decentralized marketplace and community platform that enables users to:
          </Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Buy and sell products and services</Text>
            <Text style={styles.listItem}>• Participate in governance through LDAO token voting</Text>
            <Text style={styles.listItem}>• Support charitable initiatives</Text>
            <Text style={styles.listItem}>• Connect with other community members</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. User Responsibilities</Text>
          <Text style={styles.sectionText}>
            As a user of LinkDAO, you agree to:
          </Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Provide accurate and complete information</Text>
            <Text style={styles.listItem}>• Maintain the security of your account credentials</Text>
            <Text style={styles.listItem}>• Comply with all applicable laws and regulations</Text>
            <Text style={styles.listItem}>• Respect the rights of other users</Text>
            <Text style={styles.listItem}>• Not engage in fraudulent or deceptive practices</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Marketplace Transactions</Text>
          <Text style={styles.sectionText}>
            When buying or selling on LinkDAO:
          </Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Sellers are responsible for accurate product descriptions</Text>
            <Text style={styles.listItem}>• Buyers must complete payment for all purchases</Text>
            <Text style={styles.listItem}>• All transactions are subject to our dispute resolution process</Text>
            <Text style={styles.listItem}>• LinkDAO acts as a platform and is not a party to transactions</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. LDAO Token and Governance</Text>
          <Text style={styles.sectionText}>
            The LDAO token is a utility token that provides:
          </Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Voting rights in governance proposals</Text>
            <Text style={styles.listItem}>• Access to premium features</Text>
            <Text style={styles.listItem}>• Rewards for community participation</Text>
          </View>
          <Text style={styles.sectionText}>
            Token holders acknowledge that the LDAO token is not an investment product and does not represent
            ownership in LinkDAO.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Intellectual Property</Text>
          <Text style={styles.sectionText}>
            All content, trademarks, and intellectual property on LinkDAO are owned by LinkDAO or its licensors.
            You may not use, reproduce, or distribute any content without prior written permission.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Privacy and Data</Text>
          <Text style={styles.sectionText}>
            Your privacy is important to us. Please review our Privacy Policy to understand how we collect,
            use, and protect your personal information.
          </Text>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.push('/legal/privacy-policy')}
          >
            <Text style={styles.linkButtonText}>View Privacy Policy</Text>
            <Ionicons name="arrow-forward" size={16} color="#3b82f6" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Dispute Resolution</Text>
          <Text style={styles.sectionText}>
            Any disputes arising from your use of LinkDAO shall be resolved through our internal dispute
            resolution process. If a resolution cannot be reached, disputes may be submitted to binding
            arbitration in accordance with the rules of the American Arbitration Association.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Limitation of Liability</Text>
          <Text style={styles.sectionText}>
            LinkDAO shall not be liable for any indirect, incidental, special, or consequential damages
            arising from your use of the service. Our total liability shall not exceed the amount you paid
            for the service in the twelve months preceding the claim.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Termination</Text>
          <Text style={styles.sectionText}>
            LinkDAO reserves the right to suspend or terminate your account at any time for violation of
            these Terms or for any other reason at our sole discretion.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Modifications to Terms</Text>
          <Text style={styles.sectionText}>
            LinkDAO may modify these Terms at any time. Continued use of the service after modifications
            constitutes acceptance of the updated Terms.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. Contact Information</Text>
          <Text style={styles.sectionText}>
            If you have questions about these Terms, please contact us at:
          </Text>
          <View style={styles.contactInfo}>
            <Text style={styles.contactText}>Email: legal@linkdao.io</Text>
            <Text style={styles.contactText}>Website: https://linkdao.io</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By using LinkDAO, you acknowledge that you have read, understood, and agree to these Terms of Service.
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
  sectionText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 12,
  },
  effectiveDate: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  list: {
    marginLeft: 8,
    marginBottom: 12,
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