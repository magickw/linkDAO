/**
 * Liquid Glass Modal Component
 * 
 * A translucent, dynamic modal with glass effect for overlays and dialogs.
 * 
 * Features:
 * - Materialization animation on open
 * - Backdrop blur effect
 * - Swipe to dismiss
 * - Multiple sizes (small, medium, large, full)
 * - Custom header and footer
 * - Scrollable content
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Modal,
  TouchableOpacity,
  PanResponder,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { LiquidGlassTheme, createGlassStyle } from '../../constants/liquidGlassTheme';

const { height } = Dimensions.get('window');

export interface LiquidGlassModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  size?: 'small' | 'medium' | 'large' | 'full';
  isDarkMode?: boolean;
  showCloseButton?: boolean;
  scrollable?: boolean;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  swipeToDismiss?: boolean;
  backdropPressToClose?: boolean;
}

const LiquidGlassModal: React.FC<LiquidGlassModalProps> = ({
  visible,
  onClose,
  children,
  title,
  size = 'medium',
  isDarkMode = false,
  showCloseButton = true,
  scrollable = true,
  header,
  footer,
  swipeToDismiss = true,
  backdropPressToClose = true,
}) => {
  const animatedOpacity = useRef(new Animated.Value(0)).current;
  const animatedScale = useRef(new Animated.Value(0.9)).current;
  const animatedTranslateY = useRef(new Animated.Value(50)).current;
  const panY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(animatedOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(animatedScale, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(animatedTranslateY, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(animatedOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(animatedScale, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(animatedTranslateY, {
          toValue: 50,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, animatedOpacity, animatedScale, animatedTranslateY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => swipeToDismiss,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        swipeToDismiss && gestureState.dy > 10,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          handleClose();
        } else {
          Animated.spring(panY, {
            toValue: 0,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(animatedOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(animatedScale, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(panY, {
        toValue: height,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
      panY.setValue(0);
    });
  };

  const glassStyle = createGlassStyle(
    {
      variant: 'regular' as any,
      shape: 'roundedRectangle' as any,
      opacity: 0.9,
      isInteractive: false,
      isEnabled: true,
    },
    isDarkMode
  );

  const sizeStyles = {
    small: {
      maxHeight: height * 0.3,
      minHeight: height * 0.2,
    },
    medium: {
      maxHeight: height * 0.5,
      minHeight: height * 0.3,
    },
    large: {
      maxHeight: height * 0.7,
      minHeight: height * 0.5,
    },
    full: {
      maxHeight: height * 0.95,
      minHeight: height * 0.8,
    },
  };

  const ContentComponent = scrollable ? ScrollView : View;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      {/* Backdrop */}
      <TouchableOpacity
        activeOpacity={1}
        style={styles.backdrop}
        onPress={backdropPressToClose ? handleClose : undefined}
      >
        <Animated.View
          style={[
            styles.backdropOverlay,
            {
              opacity: animatedOpacity,
            },
          ]}
        />
      </TouchableOpacity>

      {/* Modal Container */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <Animated.View
          style={[
            styles.modalContainer,
            glassStyle,
            sizeStyles[size],
            {
              opacity: animatedOpacity,
              transform: [
                { scale: animatedScale },
                { translateY: Animated.add(panY, animatedTranslateY) },
              ],
            },
          ]}
          {...panResponder.panHandlers}
        >
          {/* Header */}
          {header || title ? (
            <View style={styles.header}>
              {header || (
                <View style={styles.headerContent}>
                  <View style={styles.titleContainer}>
                    <Animated.Text
                      style={[
                        styles.title,
                        {
                          opacity: animatedOpacity,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {title}
                    </Animated.Text>
                  </View>
                  {showCloseButton && (
                    <TouchableOpacity
                      style={styles.closeButton}
                      onPress={handleClose}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Animated.Text
                        style={[
                          styles.closeButtonText,
                          {
                            opacity: animatedOpacity,
                          },
                        ]}
                      >
                        ✕
                      </Animated.Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          ) : null}

          {/* Content */}
          <ContentComponent
            style={styles.contentContainer}
            contentContainerStyle={styles.scrollContent}
            bounces={false}
          >
            {children}
          </ContentComponent>

          {/* Footer */}
          {footer ? <View style={styles.footer}>{footer}</View> : null}

          {/* Highlight effect */}
          <View style={styles.highlight} pointerEvents="none" />
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdropOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
    pointerEvents: 'none',
  },
});

export default LiquidGlassModal;