// @ts-ignore
import React, { useState } from 'react';
// @ts-ignore
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, Picker, Modal } from 'react-native';

interface SimplifiedProposalCreationProps {
  onSubmit: (proposal: {
    title: string;
    description: string;
    type: string;
    amount?: number;
    recipient?: string;
    duration?: number;
  }) => void;
  onCancel: () => void;
}

export default function SimplifiedProposalCreation({ 
  onSubmit, 
  onCancel 
}: SimplifiedProposalCreationProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('spending');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [duration, setDuration] = useState('30');
  const [showHelp, setShowHelp] = useState(false);

  const handleSubmit = () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Validate type-specific fields
    if (type === 'spending') {
      if (!amount || parseFloat(amount) <= 0) {
        Alert.alert('Error', 'Please enter a valid amount');
        return;
      }
      if (!recipient.trim()) {
        Alert.alert('Error', 'Please enter a recipient address');
        return;
      }
    }

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      type,
      amount: type === 'spending' ? parseFloat(amount) : undefined,
      recipient: type === 'spending' ? recipient.trim() : undefined,
      duration: type === 'grant' ? parseInt(duration) : undefined,
    });
  };

  const getHelpContent = () => {
    switch (type) {
      case 'spending':
        return 'Spending proposals request funds from the treasury for specific purposes. You need to specify the amount and recipient wallet address.';
      case 'parameter':
        return 'Parameter change proposals modify DAO settings and configurations. Describe which parameter to change and the new value.';
      case 'grant':
        return 'Grant proposals request funding for projects or initiatives. Specify the duration and describe how funds will be used.';
      case 'membership':
        return 'Membership proposals add or remove members from the DAO. Provide justification for the membership change.';
      case 'custom':
        return 'Custom proposals for any other governance action. Provide detailed description of the proposed change.';
      default:
        return '';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Create New Proposal</Text>
        <TouchableOpacity onPress={() => setShowHelp(true)} style={styles.helpButton}>
          <Text style={styles.helpButtonText}>?</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.formContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter proposal title"
            maxLength={100}
          />
          <Text style={styles.characterCount}>{title.length}/100</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Proposal Type *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={type}
              style={styles.picker}
              onValueChange={(itemValue) => setType(itemValue)}
            >
              <Picker.Item label="💰 Spending" value="spending" />
              <Picker.Item label="⚙️ Parameter Change" value="parameter" />
              <Picker.Item label="🎁 Grant" value="grant" />
              <Picker.Item label="👥 Membership" value="membership" />
              <Picker.Item label="📝 Custom" value="custom" />
            </Picker>
          </View>
        </View>

        {type === 'spending' && (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Amount (USDC) *</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Recipient Address *</Text>
              <TextInput
                style={styles.input}
                value={recipient}
                onChangeText={setRecipient}
                placeholder="0x..."
                autoCapitalize="none"
                maxLength={42}
              />
              <Text style={styles.hintText}>Enter the wallet address to receive funds</Text>
            </View>
          </>
        )}

        {type === 'grant' && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Duration (Days)</Text>
            <View style={styles.durationSelector}>
              {['30', '60', '90', '180', '365'].map((days) => (
                <TouchableOpacity
                  key={days}
                  style={[
                    styles.durationButton,
                    duration === days && styles.selectedDuration,
                  ]}
                  onPress={() => setDuration(days)}
                >
                  <Text
                    style={[
                      styles.durationButtonText,
                      duration === days && styles.selectedDurationText,
                    ]}
                  >
                    {days}d
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your proposal in detail..."
            multiline
            numberOfLines={6}
            maxLength={1000}
          />
          <Text style={styles.characterCount}>{description.length}/1000</Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>💡 Proposal Tips</Text>
          <Text style={styles.infoText}>
            • Be specific and clear in your description{'\n'}
            • Provide justification for your proposal{'\n'}
            • Include any relevant data or evidence{'\n'}
            • Consider the impact on the community
          </Text>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.cancelButton]}
          onPress={onCancel}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.submitButton]}
          onPress={handleSubmit}
        >
          <Text style={styles.submitButtonText}>Create Proposal</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showHelp}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHelp(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>About {type.charAt(0).toUpperCase() + type.slice(1)} Proposals</Text>
            <Text style={styles.modalText}>{getHelpContent()}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowHelp(false)}
            >
              <Text style={styles.modalButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  helpButton: {
    position: 'absolute',
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  formContainer: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 5,
  },
  hintText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    fontStyle: 'italic',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
  },
  durationSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationButton: {
    flex: 1,
    minWidth: 70,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  selectedDuration: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  durationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  selectedDurationText: {
    color: 'white',
  },
  infoBox: {
    backgroundColor: '#f0f9ff',
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0369a1',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#0284c7',
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
  },
  button: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f1f3f5',
  },
  cancelButtonText: {
    color: '#495057',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    maxWidth: 400,
    width: '100%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  modalText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});