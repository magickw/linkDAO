import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, Image } from 'react-native';

export default function ProfileScreen() {
  const [profile, setProfile] = useState({
    handle: 'johndoe',
    ens: 'johndoe.eth',
    avatar: '',
    bio: 'Web3 enthusiast and developer',
    followers: 1245,
    following: 321,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editProfile, setEditProfile] = useState({...profile});

  const handleSave = () => {
    // In a real app, this would connect to the profile service
    setProfile({...editProfile});
    setIsEditing(false);
    Alert.alert('Success', 'Profile updated successfully!');
  };

  const handleEdit = () => {
    setEditProfile({...profile});
    setIsEditing(true);
  };

  if (isEditing) {
    return (
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Edit Profile</Text>
        
        <View style={styles.avatarContainer}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>Avatar</Text>
          </View>
          <TouchableOpacity style={styles.changeAvatarButton}>
            <Text style={styles.changeAvatarText}>Change Avatar</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Handle</Text>
            <TextInput
              style={styles.input}
              value={editProfile.handle}
              onChangeText={(text) => setEditProfile({...editProfile, handle: text})}
              placeholder="Your handle"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>ENS Name</Text>
            <TextInput
              style={styles.input}
              value={editProfile.ens}
              onChangeText={(text) => setEditProfile({...editProfile, ens: text})}
              placeholder="yourname.eth"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={editProfile.bio}
              onChangeText={(text) => setEditProfile({...editProfile, bio: text})}
              placeholder="Tell us about yourself..."
              multiline
              numberOfLines={4}
            />
          </View>
        </View>
        
        <View style={styles.buttonGroup}>
          <TouchableOpacity 
            style={[styles.button, styles.cancelButton]}
            onPress={() => setIsEditing(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.button, styles.saveButton]}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Your Profile</Text>
      
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>Avatar</Text>
          </View>
        </View>
        
        <View style={styles.profileInfo}>
          <Text style={styles.handle}>@{profile.handle}</Text>
          {profile.ens ? <Text style={styles.ens}>{profile.ens}</Text> : null}
        </View>
        
        <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{profile.followers}</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{profile.following}</Text>
          <Text style={styles.statLabel}>Following</Text>
        </View>
      </View>
      
      <View style={styles.bioContainer}>
        <Text style={styles.bioLabel}>Bio</Text>
        <Text style={styles.bioText}>{profile.bio}</Text>
      </View>
      
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>View Posts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>View Following</Text>
        </TouchableOpacity>
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
  profileHeader: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarText: {
    color: '#999',
    fontSize: 14,
  },
  changeAvatarButton: {
    padding: 8,
  },
  changeAvatarText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
  profileInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  handle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  ens: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  editButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  editButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
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
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  bioContainer: {
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
  bioLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  bioText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 15,
    borderRadius: 6,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    paddingVertical: 15,
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
  saveButton: {
    backgroundColor: '#3b82f6',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});