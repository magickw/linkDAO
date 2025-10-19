import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import GestureService from '../services/gestureService';

interface GestureHandlerProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onLongPress?: () => void;
  onDoubleTap?: () => void;
}

export default function GestureHandler({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onLongPress,
  onDoubleTap
}: GestureHandlerProps) {
  // Create gestures using the gesture service
  const swipeGesture = GestureService.createSwipeGesture(
    onSwipeLeft || (() => {}),
    onSwipeRight || (() => {}),
    onSwipeUp,
    onSwipeDown
  );

  const longPressGesture = GestureService.createLongPressGesture(
    onLongPress || (() => {})
  );

  const doubleTapGesture = GestureService.createDoubleTapGesture(
    onDoubleTap || (() => {})
  );

  // Combine gestures
  const composedGesture = Gesture.Simultaneous(
    swipeGesture,
    longPressGesture,
    doubleTapGesture
  );

  return (
    <GestureDetector gesture={composedGesture}>
      <View style={styles.container}>
        {children}
        <View style={styles.gestureIndicator}>
          <Text style={styles.gestureText}>Gesture Controls Active</Text>
        </View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gestureIndicator: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  gestureText: {
    backgroundColor: 'rgba(59, 130, 246, 0.8)',
    color: 'white',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 20,
    fontSize: 12,
  },
});