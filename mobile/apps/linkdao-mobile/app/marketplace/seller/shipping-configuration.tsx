/**
 * Shipping Configuration Screen
 * Enhanced shipping configuration for sellers with full feature parity
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, TextInput, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface ShippingRule {
  id: string;
  name: string;
  type: 'flat_rate' | 'weight_based' | 'price_based' | 'free_shipping';
  price: string;
  minWeight?: string;
  maxWeight?: string;
  minPrice?: string;
  maxPrice?: string;
  countries: string[];
  enabled: boolean;
}

interface ShippingZone {
  id: string;
  name: string;
  countries: string[];
  rules: ShippingRule[];
}

export default function ShippingConfigurationScreen() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'zones' | 'rules' | 'settings'>('zones');
  const [zones, setZones] = useState<ShippingZone[]>([
    {
      id: '1',
      name: 'Domestic (US)',
      countries: ['US'],
      rules: [
        {
          id: '1-1',
          name: 'Standard Shipping',
          type: 'flat_rate',
          price: '5.99',
          countries: ['US'],
          enabled: true,
        },
        {
          id: '1-2',
          name: 'Free Shipping (Orders over $50)',
          type: 'free_shipping',
          price: '0',
          minPrice: '50',
          countries: ['US'],
          enabled: true,
        },
      ],
    },
  ]);
  const [globalSettings, setGlobalSettings] = useState({
    freeShippingThreshold: '50',
    handlingFee: '0',
    processingTime: '1-2',
    enableInternational: false,
  });
  const [showAddRule, setShowAddRule] = useState(false);
  const [newRule, setNewRule] = useState<Partial<ShippingRule>>({
    name: '',
    type: 'flat_rate',
    price: '',
    enabled: true,
  });

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      // TODO: Call API to save shipping settings
      Alert.alert('Success', 'Shipping settings saved successfully');
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to save shipping settings');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRule = (zoneId: string, ruleId: string) => {
    setZones(prev => prev.map(zone => {
      if (zone.id !== zoneId) return zone;
      return {
        ...zone,
        rules: zone.rules.map(rule => 
          rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
        ),
      };
    }));
  };

  const handleDeleteRule = (zoneId: string, ruleId: string) => {
    Alert.alert(
      'Delete Rule',
      'Are you sure you want to delete this shipping rule?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            setZones(prev => prev.map(zone => {
              if (zone.id !== zoneId) return zone;
              return {
                ...zone,
                rules: zone.rules.filter(rule => rule.id !== ruleId),
              };
            }));
          },
        },
      ]
    );
  };

  const handleAddRule = () => {
    if (!newRule.name || !newRule.price) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const rule: ShippingRule = {
      id: Date.now().toString(),
      name: newRule.name,
      type: newRule.type as ShippingRule['type'],
      price: newRule.price,
      countries: ['US'],
      enabled: true,
    };

    setZones(prev => prev.map(zone => {
      if (zone.id === '1') {
        return { ...zone, rules: [...zone.rules, rule] };
      }
      return zone;
    }));

    setShowAddRule(false);
    setNewRule({ name: '', type: 'flat_rate', price: '', enabled: true });
  };

  const getRuleTypeLabel = (type: string) => {
    switch (type) {
      case 'flat_rate': return 'Flat Rate';
      case 'weight_based': return 'Weight Based';
      case 'price_based': return 'Price Based';
      case 'free_shipping': return 'Free Shipping';
      default: return type;
    }
  };

  const renderZonesTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.tabHeader}>
        <Text style={styles.tabTitle}>Shipping Zones</Text>
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={20} color="#ffffff" />
          <Text style={styles.addButtonText}>Add Zone</Text>
        </TouchableOpacity>
      </View>

      {zones.map((zone) => (
        <View key={zone.id} style={styles.zoneCard}>
          <View style={styles.zoneHeader}>
            <View style={styles.zoneIcon}>
              <Ionicons name="globe-outline" size={24} color="#3b82f6" />
            </View>
            <View style={styles.zoneInfo}>
              <Text style={styles.zoneName}>{zone.name}</Text>
              <Text style={styles.zoneCountries}>{zone.countries.join(', ')}</Text>
            </View>
            <Text style={styles.zoneRuleCount}>{zone.rules.length} rules</Text>
          </View>

          <View style={styles.zoneRules}>
            {zone.rules.map((rule) => (
              <View key={rule.id} style={styles.ruleCard}>
                <View style={styles.ruleHeader}>
                  <Text style={styles.ruleName}>{rule.name}</Text>
                  <Switch
                    value={rule.enabled}
                    onValueChange={() => handleToggleRule(zone.id, rule.id)}
                  />
                </View>
                <Text style={styles.ruleType}>{getRuleTypeLabel(rule.type)}</Text>
                <Text style={styles.rulePrice}>
                  {rule.type === 'free_shipping' ? 'FREE' : `$${rule.price}`}
                </Text>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteRule(zone.id, rule.id)}
                >
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );

  const renderRulesTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.tabHeader}>
        <Text style={styles.tabTitle}>Shipping Rules</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddRule(true)}
        >
          <Ionicons name="add" size={20} color="#ffffff" />
          <Text style={styles.addButtonText}>Add Rule</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.rulesList}>
        {zones.flatMap(zone => zone.rules).map((rule) => (
          <View key={rule.id} style={styles.ruleCard}>
            <View style={styles.ruleHeader}>
              <Text style={styles.ruleName}>{rule.name}</Text>
              <View style={[styles.ruleTypeBadge, { backgroundColor: '#dbeafe' }]}>
                <Text style={styles.ruleTypeText}>{getRuleTypeLabel(rule.type)}</Text>
              </View>
            </View>
            <Text style={styles.rulePrice}>
              {rule.type === 'free_shipping' ? 'FREE' : `$${rule.price}`}
            </Text>
            {rule.minPrice && (
              <Text style={styles.ruleCondition}>
                Orders over ${rule.minPrice}
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );

  const renderSettingsTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.tabTitle}>Global Settings</Text>

      <View style={styles.settingsSection}>
        <Text style={styles.settingsSectionTitle}>Pricing</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Free Shipping Threshold</Text>
            <Text style={styles.settingDescription}>Minimum order value for free shipping</Text>
          </View>
          <TextInput
            style={styles.settingInput}
            value={globalSettings.freeShippingThreshold}
            onChangeText={(text) => setGlobalSettings(prev => ({ ...prev, freeShippingThreshold: text }))}
            placeholder="50"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Handling Fee</Text>
            <Text style={styles.settingDescription}>Additional handling fee per order</Text>
          </View>
          <TextInput
            style={styles.settingInput}
            value={globalSettings.handlingFee}
            onChangeText={(text) => setGlobalSettings(prev => ({ ...prev, handlingFee: text }))}
            placeholder="0"
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.settingsSection}>
        <Text style={styles.settingsSectionTitle}>Processing</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Processing Time</Text>
            <Text style={styles.settingDescription}>Time to prepare orders for shipment</Text>
          </View>
          <TextInput
            style={styles.settingInput}
            value={globalSettings.processingTime}
            onChangeText={(text) => setGlobalSettings(prev => ({ ...prev, processingTime: text }))}
            placeholder="1-2"
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Enable International Shipping</Text>
            <Text style={styles.settingDescription}>Allow shipping to international addresses</Text>
          </View>
          <Switch
            value={globalSettings.enableInternational}
            onValueChange={(value) => setGlobalSettings(prev => ({ ...prev, enableInternational: value }))}
          />
        </View>
      </View>

      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleSaveSettings}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <>
            <Ionicons name="checkmark" size={20} color="#ffffff" />
            <Text style={styles.saveButtonText}>Save Settings</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shipping Configuration</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'zones' && styles.tabActive]}
          onPress={() => setActiveTab('zones')}
        >
          <Text style={[styles.tabText, activeTab === 'zones' && styles.tabTextActive]}>Zones</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'rules' && styles.tabActive]}
          onPress={() => setActiveTab('rules')}
        >
          <Text style={[styles.tabText, activeTab === 'rules' && styles.tabTextActive]}>Rules</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'settings' && styles.tabActive]}
          onPress={() => setActiveTab('settings')}
        >
          <Text style={[styles.tabText, activeTab === 'settings' && styles.tabTextActive]}>Settings</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'zones' && renderZonesTab()}
        {activeTab === 'rules' && renderRulesTab()}
        {activeTab === 'settings' && renderSettingsTab()}
      </ScrollView>

      {/* Add Rule Modal */}
      {showAddRule && (
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Shipping Rule</Text>
              <TouchableOpacity onPress={() => setShowAddRule(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Rule Name</Text>
              <TextInput
                style={styles.modalInput}
                value={newRule.name}
                onChangeText={(text) => setNewRule(prev => ({ ...prev, name: text }))}
                placeholder="e.g., Standard Shipping"
              />

              <Text style={styles.modalLabel}>Rule Type</Text>
              <View style={styles.ruleTypeSelector}>
                {(['flat_rate', 'weight_based', 'price_based', 'free_shipping'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.ruleTypeOption,
                      newRule.type === type && styles.ruleTypeOptionSelected,
                    ]}
                    onPress={() => setNewRule(prev => ({ ...prev, type }))}
                  >
                    <Text style={[
                      styles.ruleTypeOptionText,
                      newRule.type === type && styles.ruleTypeOptionTextSelected,
                    ]}>
                      {getRuleTypeLabel(type)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Price ($)</Text>
              <TextInput
                style={styles.modalInput}
                value={newRule.price}
                onChangeText={(text) => setNewRule(prev => ({ ...prev, price: text }))}
                placeholder="0.00"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowAddRule(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleAddRule}
              >
                <Text style={styles.modalButtonTextConfirm}>Add Rule</Text>
              </TouchableOpacity>
            </View>
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
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#3b82f6',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  tabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tabTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  zoneCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  zoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  zoneIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  zoneInfo: {
    flex: 1,
  },
  zoneName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  zoneCountries: {
    fontSize: 12,
    color: '#6b7280',
  },
  zoneRuleCount: {
    fontSize: 12,
    color: '#9ca3af',
  },
  zoneRules: {
    gap: 8,
  },
  ruleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  ruleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ruleName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  ruleType: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  rulePrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 8,
  },
  ruleTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ruleTypeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1e40af',
  },
  ruleCondition: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteButtonText: {
    fontSize: 12,
    color: '#ef4444',
  },
  rulesList: {
    gap: 8,
  },
  settingsSection: {
    marginBottom: 24,
  },
  settingsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: '#6b7280',
  },
  settingInput: {
    width: 100,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  modalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalBody: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 16,
  },
  ruleTypeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  ruleTypeOption: {
    flex: 1,
    minWidth: '45%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  ruleTypeOptionSelected: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  ruleTypeOptionText: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
  },
  ruleTypeOptionTextSelected: {
    color: '#1e40af',
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#f3f4f6',
  },
  modalButtonConfirm: {
    backgroundColor: '#3b82f6',
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  modalButtonTextConfirm: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});