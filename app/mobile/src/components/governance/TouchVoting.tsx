// @ts-ignore
import React from 'react';
// @ts-ignore
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface TouchVotingProps {
  onVote: (vote: 'yes' | 'no' | 'abstain') => void;
  voteCounts: {
    yes: number;
    no: number;
    abstain: number;
  };
  userVote?: 'yes' | 'no' | 'abstain';
  disabled?: boolean;
}

export default function TouchVoting({ 
  onVote, 
  voteCounts, 
  userVote, 
  disabled = false 
}: TouchVotingProps) {
  return (
    <View style={styles.container}>
      <View style={styles.voteButtonsContainer}>
        <TouchableOpacity
          style={[
            styles.voteButton,
            styles.yesButton,
            userVote === 'yes' && styles.selectedButton,
            disabled && styles.disabledButton
          ]}
          onPress={() => onVote('yes')}
          disabled={disabled}
        >
          <Text style={[
            styles.voteButtonText,
            userVote === 'yes' && styles.selectedButtonText
          ]}>
            YES
          </Text>
          <Text style={[
            styles.voteCount,
            userVote === 'yes' && styles.selectedButtonText
          ]}>
            {voteCounts.yes}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.voteButton,
            styles.noButton,
            userVote === 'no' && styles.selectedButton,
            disabled && styles.disabledButton
          ]}
          onPress={() => onVote('no')}
          disabled={disabled}
        >
          <Text style={[
            styles.voteButtonText,
            userVote === 'no' && styles.selectedButtonText
          ]}>
            NO
          </Text>
          <Text style={[
            styles.voteCount,
            userVote === 'no' && styles.selectedButtonText
          ]}>
            {voteCounts.no}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.voteButton,
            styles.abstainButton,
            userVote === 'abstain' && styles.selectedButton,
            disabled && styles.disabledButton
          ]}
          onPress={() => onVote('abstain')}
          disabled={disabled}
        >
          <Text style={[
            styles.voteButtonText,
            userVote === 'abstain' && styles.selectedButtonText
          ]}>
            ABSTAIN
          </Text>
          <Text style={[
            styles.voteCount,
            userVote === 'abstain' && styles.selectedButtonText
          ]}>
            {voteCounts.abstain}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 15,
  },
  voteButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  voteButton: {
    flex: 1,
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3.84,
  },
  yesButton: {
    backgroundColor: '#22c55e',
  },
  noButton: {
    backgroundColor: '#ef4444',
  },
  abstainButton: {
    backgroundColor: '#94a3b8',
  },
  selectedButton: {
    borderWidth: 3,
    borderColor: '#3b82f6',
  },
  disabledButton: {
    opacity: 0.5,
  },
  voteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectedButtonText: {
    color: '#3b82f6',
  },
  voteCount: {
    color: 'white',
    fontSize: 14,
    marginTop: 5,
  },
});