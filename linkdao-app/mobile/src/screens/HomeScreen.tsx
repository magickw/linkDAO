import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, Image } from 'react-native';

export default function HomeScreen({ navigation }: any) {
  const [posts, setPosts] = useState([
    {
      id: '1',
      author: {
        handle: 'johndoe',
        avatar: '',
      },
      content: 'Just deployed my first smart contract on Base! The future of web3 is looking bright. #web3 #blockchain',
      timestamp: '2 hours ago',
      likes: 24,
      comments: 5,
    },
    {
      id: '2',
      author: {
        handle: 'web3dev',
        avatar: '',
      },
      content: 'Excited to announce that our DAO has reached 1000 members! Thank you all for your support and participation in governance.',
      timestamp: '5 hours ago',
      likes: 142,
      comments: 23,
    },
    {
      id: '3',
      author: {
        handle: 'cryptoenthusiast',
        avatar: '',
      },
      content: 'The new LinkDAO features are amazing! Love the seamless integration between social features and wallet functionality.',
      timestamp: '1 day ago',
      likes: 87,
      comments: 12,
    },
  ]);

  const [newPost, setNewPost] = useState('');

  const handleCreatePost = () => {
    if (!newPost.trim()) {
      Alert.alert('Error', 'Please enter some content for your post');
      return;
    }

    // In a real app, this would connect to the post service
    const post = {
      id: (posts.length + 1).toString(),
      author: {
        handle: 'you',
        avatar: '',
      },
      content: newPost,
      timestamp: 'Just now',
      likes: 0,
      comments: 0,
    };

    setPosts([post, ...posts]);
    setNewPost('');
    Alert.alert('Success', 'Post created successfully!');
  };

  const handleLike = (postId: string) => {
    // In a real app, this would connect to the post service
    setPosts(posts.map(post => 
      post.id === postId 
        ? {...post, likes: post.likes + 1} 
        : post
    ));
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>LinkDAO</Text>
      
      {/* Create Post */}
      <View style={styles.createPostContainer}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>You</Text>
        </View>
        <View style={styles.postInputContainer}>
          <TextInput
            style={styles.postInput}
            value={newPost}
            onChangeText={setNewPost}
            placeholder="What's happening?"
            multiline
          />
          <TouchableOpacity style={styles.postButton} onPress={handleCreatePost}>
            <Text style={styles.postButtonText}>Post</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Feed */}
      <View style={styles.feedContainer}>
        {posts.map((post) => (
          <View key={post.id} style={styles.postCard}>
            <View style={styles.postHeader}>
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {post.author.handle.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.postAuthorInfo}>
                <Text style={styles.postAuthor}>{post.author.handle}</Text>
                <Text style={styles.postTimestamp}>{post.timestamp}</Text>
              </View>
            </View>
            
            <Text style={styles.postContent}>{post.content}</Text>
            
            <View style={styles.postActions}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => handleLike(post.id)}
              >
                <Text style={styles.actionText}>❤️ Like ({post.likes})</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => Alert.alert('Comment', 'Comment functionality would go here')}
              >
                <Text style={styles.actionText}>💬 Comment ({post.comments})</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => Alert.alert('Share', 'Share functionality would go here')}
              >
                <Text style={styles.actionText}>↗️ Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
      
      {/* Navigation */}
      <View style={styles.navContainer}>
        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.navButtonText}>Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => navigation.navigate('Wallet')}
        >
          <Text style={styles.navButtonText}>Wallet</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => navigation.navigate('Governance')}
        >
          <Text style={styles.navButtonText}>Governance</Text>
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
  createPostContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 15,
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
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#999',
    fontSize: 14,
  },
  postInputContainer: {
    flex: 1,
  },
  postInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
    marginBottom: 10,
    textAlignVertical: 'top',
    height: 80,
  },
  postButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    alignSelf: 'flex-end',
    width: 80,
  },
  postButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  feedContainer: {
    marginBottom: 20,
  },
  postCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  postHeader: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  postAuthorInfo: {
    justifyContent: 'center',
  },
  postAuthor: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  postTimestamp: {
    fontSize: 12,
    color: '#999',
  },
  postContent: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 15,
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    color: '#666',
  },
  navContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    padding: 15,
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
  navButton: {
    padding: 10,
  },
  navButtonText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
  },
});