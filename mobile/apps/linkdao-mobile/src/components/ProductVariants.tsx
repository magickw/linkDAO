/**
 * Product Variants Component
 * Manages product variants (size, color, etc.) for listings
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface VariantOption {
  id: string;
  value: string;
  priceModifier?: string;
  stock: string;
}

interface VariantType {
  id: string;
  name: string;
  options: VariantOption[];
}

interface ProductVariantsProps {
  variants: VariantType[];
  onVariantsChange: (variants: VariantType[]) => void;
}

export default function ProductVariants({ variants, onVariantsChange }: ProductVariantsProps) {
  const [showAddVariantType, setShowAddVariantType] = useState(false);
  const [newVariantName, setNewVariantName] = useState('');

  const handleAddVariantType = () => {
    if (!newVariantName.trim()) {
      Alert.alert('Error', 'Please enter a variant name');
      return;
    }

    const newVariant: VariantType = {
      id: Date.now().toString(),
      name: newVariantName,
      options: [
        {
          id: `${Date.now()}-1`,
          value: '',
          priceModifier: '0',
          stock: '10',
        },
      ],
    };

    onVariantsChange([...variants, newVariant]);
    setNewVariantName('');
    setShowAddVariantType(false);
  };

  const handleRemoveVariantType = (variantId: string) => {
    onVariantsChange(variants.filter(v => v.id !== variantId));
  };

  const handleAddOption = (variantId: string) => {
    onVariantsChange(variants.map(v => {
      if (v.id !== variantId) return v;
      return {
        ...v,
        options: [
          ...v.options,
          {
            id: `${Date.now()}`,
            value: '',
            priceModifier: '0',
            stock: '10',
          },
        ],
      };
    }));
  };

  const handleRemoveOption = (variantId: string, optionId: string) => {
    onVariantsChange(variants.map(v => {
      if (v.id !== variantId) return v;
      return {
        ...v,
        options: v.options.filter(o => o.id !== optionId),
      };
    }));
  };

  const handleUpdateOption = (
    variantId: string,
    optionId: string,
    field: 'value' | 'priceModifier' | 'stock',
    value: string
  ) => {
    onVariantsChange(variants.map(v => {
      if (v.id !== variantId) return v;
      return {
        ...v,
        options: v.options.map(o => {
          if (o.id !== optionId) return o;
          return { ...o, [field]: value };
        }),
      };
    }));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Product Variants</Text>
        <Text style={styles.subtitle}>
          Add different options like size, color, or material
        </Text>
      </View>

      {variants.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="options-outline" size={48} color="#9ca3af" />
          <Text style={styles.emptyTitle}>No variants added</Text>
          <Text style={styles.emptySubtitle}>
            Add variants to offer different options for your product
          </Text>
        </View>
      ) : (
        <View style={styles.variantsList}>
          {variants.map((variant) => (
            <View key={variant.id} style={styles.variantCard}>
              <View style={styles.variantHeader}>
                <Text style={styles.variantName}>{variant.name}</Text>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveVariantType(variant.id)}
                >
                  <Ionicons name="close-circle" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>

              <View style={styles.optionsList}>
                {variant.options.map((option, index) => (
                  <View key={option.id} style={styles.optionCard}>
                    <View style={styles.optionHeader}>
                      <Text style={styles.optionLabel}>Option {index + 1}</Text>
                      {variant.options.length > 1 && (
                        <TouchableOpacity
                          onPress={() => handleRemoveOption(variant.id, option.id)}
                        >
                          <Ionicons name="trash-outline" size={16} color="#ef4444" />
                        </TouchableOpacity>
                      )}
                    </View>

                    <View style={styles.optionFields}>
                      <View style={styles.field}>
                        <Text style={styles.fieldLabel}>Value</Text>
                        <TextInput
                          style={styles.fieldInput}
                          value={option.value}
                          onChangeText={(text) => handleUpdateOption(variant.id, option.id, 'value', text)}
                          placeholder="e.g., Red, Large, Cotton"
                          placeholderTextColor="#9ca3af"
                        />
                      </View>

                      <View style={styles.fieldRow}>
                        <View style={[styles.field, styles.fieldHalf]}>
                          <Text style={styles.fieldLabel}>Price Modifier ($)</Text>
                          <TextInput
                            style={styles.fieldInput}
                            value={option.priceModifier}
                            onChangeText={(text) => handleUpdateOption(variant.id, option.id, 'priceModifier', text)}
                            placeholder="0.00"
                            placeholderTextColor="#9ca3af"
                            keyboardType="decimal-pad"
                          />
                        </View>

                        <View style={[styles.field, styles.fieldHalf]}>
                          <Text style={styles.fieldLabel}>Stock</Text>
                          <TextInput
                            style={styles.fieldInput}
                            value={option.stock}
                            onChangeText={(text) => handleUpdateOption(variant.id, option.id, 'stock', text)}
                            placeholder="10"
                            placeholderTextColor="#9ca3af"
                            keyboardType="number-pad"
                          />
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={styles.addOptionButton}
                onPress={() => handleAddOption(variant.id)}
              >
                <Ionicons name="add" size={18} color="#3b82f6" />
                <Text style={styles.addOptionButtonText}>Add Option</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Add Variant Type */}
      {showAddVariantType ? (
        <View style={styles.addVariantForm}>
          <TextInput
            style={styles.variantNameInput}
            value={newVariantName}
            onChangeText={setNewVariantName}
            placeholder="Variant name (e.g., Size, Color)"
            placeholderTextColor="#9ca3af"
            autoFocus
          />
          <View style={styles.addVariantButtons}>
            <TouchableOpacity
              style={[styles.addVariantButton, styles.addVariantButtonCancel]}
              onPress={() => {
                setShowAddVariantType(false);
                setNewVariantName('');
              }}
            >
              <Text style={styles.addVariantButtonTextCancel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addVariantButton, styles.addVariantButtonConfirm]}
              onPress={handleAddVariantType}
            >
              <Text style={styles.addVariantButtonTextConfirm}>Add Variant</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.addVariantButton}
          onPress={() => setShowAddVariantType(true)}
        >
          <Ionicons name="add-circle-outline" size={20} color="#3b82f6" />
          <Text style={styles.addVariantButtonText}>Add Variant Type</Text>
        </TouchableOpacity>
      )}

      {/* Variant Combinations Info */}
      {variants.length > 0 && (
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#3b82f6" />
          <Text style={styles.infoText}>
            Total combinations: {variants.reduce((acc, v) => acc * v.options.length, 1)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
  },
  variantsList: {
    gap: 16,
    marginBottom: 16,
  },
  variantCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  variantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  variantName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  removeButton: {
    padding: 4,
  },
  optionsList: {
    gap: 12,
    marginBottom: 12,
  },
  optionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
  },
  optionFields: {
    gap: 12,
  },
  field: {
    marginBottom: 8,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldHalf: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 4,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1f2937',
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  addOptionButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3b82f6',
  },
  addVariantForm: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  variantNameInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 12,
  },
  addVariantButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  addVariantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  addVariantButtonCancel: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  addVariantButtonConfirm: {
    flex: 1,
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  addVariantButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
  },
  addVariantButtonTextCancel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  addVariantButtonTextConfirm: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#1e40af',
    flex: 1,
  },
});