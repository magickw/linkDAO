import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Image } from 'react-native';

export default function FeedScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Image 
          source={require('../../../assets/logo.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>LinkDAO Feed</Text>
      </View>
      <View style={styles.content}>
        <Text>Social Feed Coming Soon</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { 
    padding: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#eee',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  logo: { width: 30, height: 30 },
  title: { fontSize: 20, fontWeight: 'bold' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
