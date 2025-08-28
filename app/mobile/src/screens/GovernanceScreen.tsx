import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, Modal } from 'react-native';

export default function GovernanceScreen() {
  const [proposals, setProposals] = useState([
    {
      id: '1',
      title: "Increase Community Fund Allocation",
      description: "Proposal to increase the community fund allocation from 10% to 15% of treasury funds for expanded community initiatives.",
      status: "Active",
      votes: { yes: 1245, no: 321 },
      endTime: "2023-08-01"
    },
    {
      id: '2',
      title: "New Partnership with DeFi Project",
      description: "Proposal to establish a strategic partnership with a leading DeFi project to integrate their services into our platform.",
      status: "Ended",
      votes: { yes: 2156, no: 432 },
      endTime: "2023-07-20"
    }
  ]);

  const [newProposal, setNewProposal] = useState({
    title: '',
    description: ''
  });
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<any>(null);
  const [showProposalModal, setShowProposalModal] = useState(false);

  const handleCreateProposal = () => {
    // Validate input
    if (!newProposal.title || !newProposal.description) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    
    // In a real app, this would connect to the governance service
    console.log('Creating proposal:', newProposal);
    Alert.alert('Success', 'Proposal created successfully!');
    
    // Reset form and close modal
    setNewProposal({ title: '', description: '' });
    setShowCreateModal(false);
  };

  const handleVote = (proposalId: string, vote: 'yes' | 'no') => {
    // In a real app, this would connect to the governance service
    console.log('Voting:', { proposalId, vote });
    Alert.alert('Success', `Voted ${vote} on proposal!`);
  };

  const openProposalDetails = (proposal: any) => {
    setSelectedProposal(proposal);
    setShowProposalModal(true);
  };

  const closeProposalDetails = () => {
    setShowProposalModal(false);
    setSelectedProposal(null);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Governance</Text>
      
      <TouchableOpacity 
        style={styles.createButton}
        onPress={() => setShowCreateModal(true)}
      >
        <Text style={styles.createButtonText}>Create New Proposal</Text>
      </TouchableOpacity>
      
      <View style={styles.proposalsSection}>
        <Text style={styles.sectionTitle}>Active Proposals</Text>
        
        {proposals.map((proposal) => (
          <TouchableOpacity 
            key={proposal.id} 
            style={styles.proposalCard}
            onPress={() => openProposalDetails(proposal)}
          >
            <View style={styles.proposalHeader}>
              <Text style={styles.proposalTitle} numberOfLines={1}>{proposal.title}</Text>
              <Text style={[
                styles.status, 
                proposal.status === 'Active' ? styles.activeStatus : styles.endedStatus
              ]}>
                {proposal.status}
              </Text>
            </View>
            
            <Text style={styles.proposalDescription} numberOfLines={2}>{proposal.description}</Text>
            
            <View style={styles.voteInfo}>
              <View style={styles.voteCount}>
                <Text style={styles.voteLabel}>Yes Votes</Text>
                <Text style={styles.voteValue}>{proposal.votes.yes}</Text>
              </View>
              <View style={styles.voteCount}>
                <Text style={styles.voteLabel}>No Votes</Text>
                <Text style={styles.voteValue}>{proposal.votes.no}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Create Proposal Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showCreateModal}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Proposal</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Proposal Title</Text>
              <TextInput
                style={styles.input}
                value={newProposal.title}
                onChangeText={(text) => setNewProposal({...newProposal, title: text})}
                placeholder="Enter proposal title"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newProposal.description}
                onChangeText={(text) => setNewProposal({...newProposal, description: text})}
                placeholder="Describe your proposal in detail..."
                multiline
                numberOfLines={4}
              />
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleCreateProposal}
              >
                <Text style={styles.submitButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Proposal Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showProposalModal && selectedProposal}
        onRequestClose={closeProposalDetails}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {selectedProposal && (
              <>
                <Text style={styles.modalTitle}>{selectedProposal.title}</Text>
                
                <View style={styles.proposalStatus}>
                  <Text style={[
                    styles.status, 
                    selectedProposal.status === 'Active' ? styles.activeStatus : styles.endedStatus
                  ]}>
                    {selectedProposal.status}
                  </Text>
                </View>
                
                <ScrollView style={styles.proposalDescriptionScroll}>
                  <Text style={styles.proposalDescriptionFull}>{selectedProposal.description}</Text>
                </ScrollView>
                
                <View style={styles.voteInfo}>
                  <View style={styles.voteCount}>
                    <Text style={styles.voteLabel}>Yes Votes</Text>
                    <Text style={styles.voteValue}>{selectedProposal.votes.yes}</Text>
                  </View>
                  <View style={styles.voteCount}>
                    <Text style={styles.voteLabel}>No Votes</Text>
                    <Text style={styles.voteValue}>{selectedProposal.votes.no}</Text>
                  </View>
                </View>
                
                <Text style={styles.endTime}>Voting Ends: {selectedProposal.endTime}</Text>
                
                {selectedProposal.status === 'Active' && (
                  <View style={styles.voteButtons}>
                    <TouchableOpacity 
                      style={[styles.voteButton, styles.yesButton]}
                      onPress={() => {
                        handleVote(selectedProposal.id, 'yes');
                        closeProposalDetails();
                      }}
                    >
                      <Text style={styles.voteButtonText}>Vote Yes</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.voteButton, styles.noButton]}
                      onPress={() => {
                        handleVote(selectedProposal.id, 'no');
                        closeProposalDetails();
                      }}
                    >
                      <Text style={styles.voteButtonText}>Vote No</Text>
                    </TouchableOpacity>
                  </View>
                )}
                
                <TouchableOpacity 
                  style={[styles.modalButton, styles.closeButton]}
                  onPress={closeProposalDetails}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: '#333',
  },
  createButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 15,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 20,
  },
  createButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  proposalsSection: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
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
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  proposalCard: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  proposalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  proposalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    color: '#333',
    marginRight: 10,
  },
  status: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  activeStatus: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  endedStatus: {
    backgroundColor: '#e5e7eb',
    color: '#374151',
  },
  proposalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  voteInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  voteCount: {
    alignItems: 'center',
  },
  voteLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  voteValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    color: '#374151',
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
  closeButton: {
    backgroundColor: '#f3f4f6',
    marginTop: 20,
  },
  closeButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  proposalStatus: {
    alignItems: 'center',
    marginBottom: 15,
  },
  proposalDescriptionScroll: {
    marginBottom: 15,
    maxHeight: 200,
  },
  proposalDescriptionFull: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  endTime: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  voteButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  voteButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  yesButton: {
    backgroundColor: '#22c55e',
  },
  noButton: {
    backgroundColor: '#ef4444',
  },
  voteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});