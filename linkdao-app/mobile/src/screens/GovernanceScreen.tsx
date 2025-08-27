import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';

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

  const handleCreateProposal = () => {
    // In a real app, this would connect to the governance service
    console.log('Creating proposal:', newProposal);
    Alert.alert('Success', 'Proposal created successfully!');
    
    // Reset form
    setNewProposal({ title: '', description: '' });
  };

  const handleVote = (proposalId: string, vote: 'yes' | 'no') => {
    // In a real app, this would connect to the governance service
    console.log('Voting:', { proposalId, vote });
    Alert.alert('Success', `Voted ${vote} on proposal!`);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Governance</Text>
      
      <View style={styles.form}>
        <Text style={styles.sectionTitle}>Create New Proposal</Text>
        
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
        
        <TouchableOpacity style={styles.createButton} onPress={handleCreateProposal}>
          <Text style={styles.createButtonText}>Create Proposal</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.proposalsSection}>
        <Text style={styles.sectionTitle}>Active Proposals</Text>
        
        {proposals.map((proposal) => (
          <View key={proposal.id} style={styles.proposalCard}>
            <View style={styles.proposalHeader}>
              <Text style={styles.proposalTitle}>{proposal.title}</Text>
              <Text style={[
                styles.status, 
                proposal.status === 'Active' ? styles.activeStatus : styles.endedStatus
              ]}>
                {proposal.status}
              </Text>
            </View>
            
            <Text style={styles.proposalDescription}>{proposal.description}</Text>
            
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
            
            {proposal.status === 'Active' && (
              <View style={styles.voteButtons}>
                <TouchableOpacity 
                  style={[styles.voteButton, styles.yesButton]}
                  onPress={() => handleVote(proposal.id, 'yes')}
                >
                  <Text style={styles.voteButtonText}>Vote Yes</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.voteButton, styles.noButton]}
                  onPress={() => handleVote(proposal.id, 'no')}
                >
                  <Text style={styles.voteButtonText}>Vote No</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </View>
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
  form: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
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
  createButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 15,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
  },
  createButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
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
    marginBottom: 15,
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
  voteButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  voteButton: {
    flex: 1,
    paddingVertical: 10,
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