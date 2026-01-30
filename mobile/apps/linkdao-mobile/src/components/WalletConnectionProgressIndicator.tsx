/**
 * Wallet Connection Progress Indicator Component
 * Displays real-time connection progress with visual feedback
 */

import React from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WalletConnectionProgress } from '../services/walletConnectService';

interface WalletConnectionProgressIndicatorProps {
  progress: WalletConnectionProgress | null;
  style?: any;
  compact?: boolean;
}

const WalletConnectionProgressIndicator: React.FC<WalletConnectionProgressIndicatorProps> = ({ 
  progress, 
  style,
  compact = false 
}) => {
  const spinValue = new Animated.Value(0);
  
  // Animation for spinning loader
  React.useEffect(() => {
    if (progress?.status === 'connecting' || progress?.status === 'initializing') {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinValue.setValue(0);
    }
  }, [progress?.status, spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  if (!progress) {
    return null;
  }

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'initializing':
        return (
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Ionicons name="sync" size={compact ? 16 : 20} color="#3b82f6" />
          </Animated.View>
        );
      case 'connecting':
        return (
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Ionicons name="link" size={compact ? 16 : 20} color="#3b82f6" />
          </Animated.View>
        );
      case 'connected':
        return <Ionicons name="checkmark-circle" size={compact ? 16 : 20} color="#10b981" />;
      case 'failed':
        return <Ionicons name="close-circle" size={compact ? 16 : 20} color="#ef4444" />;
      case 'cancelled':
        return <Ionicons name="close-circle" size={compact ? 16 : 20} color="#6b7280" />;
      default:
        return <Ionicons name="ellipse-outline" size={compact ? 16 : 20} color="#6b7280" />;
    }
  };

  const getStatusColor = () => {
    switch (progress.status) {
      case 'initializing':
      case 'connecting':
        return '#3b82f6';
      case 'connected':
        return '#10b981';
      case 'failed':
        return '#ef4444';
      case 'cancelled':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const getStatusText = () => {
    if (progress.error) {
      return progress.error;
    }
    return progress.message;
  };

  if (compact) {
    return (
      <View style={[styles.compactContainer, style]}>
        <View style={styles.compactIconContainer}>
          {getStatusIcon()}
        </View>
        <View style={styles.compactTextContainer}>
          <Text style={styles.compactStatusText} numberOfLines={1}>
            {getStatusText()}
          </Text>
          {(progress.status === 'connecting' || progress.status === 'initializing') && (
            <Text style={styles.compactProgressText}>{progress.progress}%</Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Progress bar */}
      {(progress.status === 'connecting' || progress.status === 'initializing') && (
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { backgroundColor: getStatusColor() }]} />
          <View 
            style={[
              styles.progressFill, 
              { 
                backgroundColor: getStatusColor(),
                width: `${progress.progress}%`
              }
            ]} 
          />
        </View>
      )}
      
      {/* Status content */}
      <View style={styles.contentContainer}>
        <View style={styles.iconContainer}>
          {getStatusIcon()}
        </View>
        
        <View style={styles.textContainer}>
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {progress.providerId.charAt(0).toUpperCase() + progress.providerId.slice(1)}
          </Text>
          <Text style={styles.messageText} numberOfLines={2}>
            {getStatusText()}
          </Text>
          
          {(progress.status === 'connecting' || progress.status === 'initializing') && (
            <Text style={styles.progressText}>
              {progress.progress}% complete
            </Text>
          )}
          
          {progress.timestamp && (
            <Text style={styles.timestampText}>
              {progress.timestamp.toLocaleTimeString()}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginVertical: 8,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.3,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  compactIconContainer: {
    marginRight: 8,
  },
  iconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  compactTextContainer: {
    flex: 1,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  compactStatusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1f2937',
  },
  messageText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
    marginBottom: 2,
  },
  compactProgressText: {
    fontSize: 10,
    color: '#3b82f6',
    fontWeight: '500',
  },
  timestampText: {
    fontSize: 10,
    color: '#9ca3af',
  },
});

export default WalletConnectionProgressIndicator;