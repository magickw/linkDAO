/**
 * Support Center Page
 * Main support interface with FAQs, tickets, and live chat
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supportService, FAQ, SupportTicket } from '../../src/services/supportService';
import { THEME } from '../../src/constants/theme';

type SupportTab = 'tickets' | 'faq' | 'chat';

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState<SupportTab>('tickets');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [ticketsData, faqsData] = await Promise.all([
        supportService.getTickets(),
        supportService.getFAQs(),
      ]);

      setTickets(ticketsData);
      setFaqs(faqsData);
    } catch (error) {
      console.error('Error loading support data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh data
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearchFAQs = async () => {
    try {
      const results = await supportService.getFAQs(undefined, searchQuery);
      setFaqs(results);
    } catch (error) {
      console.error('Error searching FAQs:', error);
    }
  };

  const handleMarkHelpful = async (faqId: string, helpful: boolean) => {
    try {
      await supportService.markFAQHelpful(faqId, helpful);
      await loadData();
    } catch (error) {
      console.error('Error marking FAQ helpful:', error);
    }
  };

  const handleInitiateChat = async () => {
    try {
      const result = await supportService.initiateLiveChat('I need help with...');
      if (result.sessionId) {
        router.push(`/support/chat/${result.sessionId}`);
      } else {
        Alert.alert('Error', result.error || 'Failed to initiate chat');
      }
    } catch (error) {
      console.error('Error initiating chat:', error);
      Alert.alert('Error', 'Failed to initiate chat');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return THEME.colors.info;
      case 'in-progress':
        return THEME.colors.warning;
      case 'resolved':
        return THEME.colors.success;
      case 'closed':
        return THEME.colors.gray;
      default:
        return THEME.colors.gray;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return THEME.colors.error;
      case 'high':
        return THEME.colors.warning;
      case 'medium':
        return THEME.colors.info;
      case 'low':
        return THEME.colors.gray;
      default:
        return THEME.colors.gray;
    }
  };

  const renderTicketCard = (ticket: SupportTicket) => (
    <TouchableOpacity
      key={ticket.id}
      style={styles.ticketCard}
      onPress={() => router.push(`/support/ticket/${ticket.id}`)}
    >
      <View style={styles.ticketHeader}>
        <View style={styles.ticketTitleContainer}>
          <Text style={styles.ticketSubject} numberOfLines={1}>
            {ticket.subject}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(ticket.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(ticket.status) }]}>
              {ticket.status.replace('-', ' ').toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(ticket.priority) }]}>
          <Text style={styles.priorityText}>{ticket.priority.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.ticketDescription} numberOfLines={2}>
        {ticket.description}
      </Text>
      <View style={styles.ticketFooter}>
        <Text style={styles.ticketDate}>
          {new Date(ticket.createdAt).toLocaleDateString()}
        </Text>
        <Ionicons name="chevron-forward" size={20} color={THEME.colors.gray} />
      </View>
    </TouchableOpacity>
  );

  const renderFAQCard = (faq: FAQ) => (
    <TouchableOpacity
      key={faq.id}
      style={styles.faqCard}
      onPress={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
    >
      <View style={styles.faqHeader}>
        <Text style={styles.faqQuestion} numberOfLines={expandedFaq === faq.id ? undefined : 2}>
          {faq.question}
        </Text>
        <Ionicons
          name={expandedFaq === faq.id ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={THEME.colors.gray}
        />
      </View>
      {expandedFaq === faq.id && (
        <View style={styles.faqBody}>
          <Text style={styles.faqAnswer}>{faq.answer}</Text>
          <View style={styles.faqFeedback}>
            <TouchableOpacity
              style={styles.feedbackButton}
              onPress={() => handleMarkHelpful(faq.id, true)}
            >
              <Ionicons name="thumbs-up" size={16} color={THEME.colors.success} />
              <Text style={styles.feedbackText}>Helpful ({faq.helpful})</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.feedbackButton}
              onPress={() => handleMarkHelpful(faq.id, false)}
            >
              <Ionicons name="thumbs-down" size={16} color={THEME.colors.error} />
              <Text style={styles.feedbackText}>Not Helpful</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderTabButton = (tab: SupportTab, label: string, icon: string) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
      onPress={() => setActiveTab(tab)}
    >
      <Ionicons
        name={icon as any}
        size={20}
        color={activeTab === tab ? THEME.colors.primary : THEME.colors.gray}
      />
      <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Support Center</Text>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/support/create-ticket')}>
          <Ionicons name="add-circle" size={24} color={THEME.colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabsContainer}>
        {renderTabButton('tickets', 'My Tickets', 'ticket-outline')}
        {renderTabButton('faq', 'FAQ', 'help-circle-outline')}
        {renderTabButton('chat', 'Live Chat', 'chatbubble-outline')}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={THEME.colors.primary} />
            <Text style={styles.loadingText}>Loading support...</Text>
          </View>
        ) : (
          <>
            {activeTab === 'tickets' && (
              <View style={styles.ticketsContent}>
                {tickets.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="ticket-outline" size={48} color={THEME.colors.gray} />
                    <Text style={styles.emptyText}>No support tickets</Text>
                    <TouchableOpacity
                      style={styles.createButton}
                      onPress={() => router.push('/support/create-ticket')}
                    >
                      <Ionicons name="add" size={20} color={THEME.colors.white} />
                      <Text style={styles.createButtonText}>Create Ticket</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  tickets.map(renderTicketCard)
                )}
              </View>
            )}

            {activeTab === 'faq' && (
              <View style={styles.faqContent}>
                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={20} color={THEME.colors.gray} style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search FAQs..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={handleSearchFAQs}
                    returnKeyType="search"
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => { setSearchQuery(''); loadData(); }}>
                      <Ionicons name="close-circle" size={20} color={THEME.colors.gray} />
                    </TouchableOpacity>
                  )}
                </View>
                {faqs.map(renderFAQCard)}
              </View>
            )}

            {activeTab === 'chat' && (
              <View style={styles.chatContent}>
                <View style={styles.chatCard}>
                  <Ionicons name="chatbubbles" size={48} color={THEME.colors.primary} />
                  <Text style={styles.chatTitle}>Live Chat Support</Text>
                  <Text style={styles.chatDescription}>
                    Connect with our support team in real-time for immediate assistance.
                  </Text>
                  <TouchableOpacity style={styles.chatButton} onPress={handleInitiateChat}>
                    <Ionicons name="chatbubble" size={20} color={THEME.colors.white} />
                    <Text style={styles.chatButtonText}>Start Chat</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.infoCard}>
                  <View style={styles.infoHeader}>
                    <Ionicons name="information-circle" size={20} color={THEME.colors.primary} />
                    <Text style={styles.infoTitle}>Chat Hours</Text>
                  </View>
                  <Text style={styles.infoText}>Monday - Friday: 9:00 AM - 6:00 PM EST</Text>
                  <Text style={styles.infoText}>Saturday - Sunday: 10:00 AM - 4:00 PM EST</Text>
                  <Text style={styles.infoText}>Average response time: 2-5 minutes</Text>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.colors.text.primary,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.white,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  activeTabButton: {
    backgroundColor: THEME.colors.primary + '10',
  },
  tabText: {
    marginLeft: 6,
    fontSize: 12,
    color: THEME.colors.gray,
  },
  activeTabText: {
    color: THEME.colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: THEME.colors.gray,
  },
  ticketsContent: {},
  ticketCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  ticketTitleContainer: {
    flex: 1,
    marginRight: 8,
  },
  ticketSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.text.primary,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.white,
  },
  ticketDescription: {
    fontSize: 14,
    color: THEME.colors.gray,
    marginBottom: 8,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketDate: {
    fontSize: 12,
    color: THEME.colors.gray,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: THEME.colors.gray,
    marginBottom: 20,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.white,
  },
  faqContent: {},
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.white,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: THEME.colors.text.primary,
  },
  faqCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  faqQuestion: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.text.primary,
    marginRight: 8,
  },
  faqBody: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  faqAnswer: {
    fontSize: 14,
    color: THEME.colors.text.primary,
    lineHeight: 20,
    marginBottom: 12,
  },
  faqFeedback: {
    flexDirection: 'row',
    gap: 12,
  },
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: THEME.colors.gray + '10',
    borderRadius: 6,
  },
  feedbackText: {
    marginLeft: 4,
    fontSize: 12,
    color: THEME.colors.gray,
  },
  chatContent: {},
  chatCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chatTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.colors.text.primary,
    marginTop: 12,
    marginBottom: 8,
  },
  chatDescription: {
    fontSize: 14,
    color: THEME.colors.gray,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  chatButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.white,
  },
  infoCard: {
    backgroundColor: THEME.colors.primary + '5',
    borderRadius: 12,
    padding: 16,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.primary,
  },
  infoText: {
    fontSize: 14,
    color: THEME.colors.text.primary,
    marginBottom: 6,
  },
});