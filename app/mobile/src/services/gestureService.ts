import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue } from 'react-native-reanimated';

export class GestureService {
  private static instance: GestureService;

  private constructor() {}

  public static getInstance(): GestureService {
    if (!GestureService.instance) {
      GestureService.instance = new GestureService();
    }
    return GestureService.instance;
  }

  /**
   * Create swipe gesture for navigation
   */
  createSwipeGesture(
    onSwipeLeft: () => void,
    onSwipeRight: () => void,
    onSwipeUp?: () => void,
    onSwipeDown?: () => void
  ) {
    const startX = useSharedValue(0);
    const startY = useSharedValue(0);

    const panGesture = Gesture.Pan()
      .onStart((event) => {
        startX.value = event.x;
        startY.value = event.y;
      })
      .onUpdate((event) => {
        // We can add visual feedback here if needed
      })
      .onEnd((event) => {
        const deltaX = event.x - startX.value;
        const deltaY = event.y - startY.value;
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);

        // Determine primary direction
        if (absDeltaX > absDeltaY && absDeltaX > 50) {
          // Horizontal swipe
          if (deltaX > 0) {
            // Swipe right
            runOnJS(onSwipeRight)();
          } else {
            // Swipe left
            runOnJS(onSwipeLeft)();
          }
        } else if (absDeltaY > absDeltaX && absDeltaY > 50) {
          // Vertical swipe
          if (deltaY > 0) {
            // Swipe down
            if (onSwipeDown) {
              runOnJS(onSwipeDown)();
            }
          } else {
            // Swipe up
            if (onSwipeUp) {
              runOnJS(onSwipeUp)();
            }
          }
        }
      });

    return panGesture;
  }

  /**
   * Create long press gesture
   */
  createLongPressGesture(
    onLongPress: () => void,
    duration: number = 500
  ) {
    const longPressGesture = Gesture.LongPress()
      .duration(duration)
      .onEnd(() => {
        runOnJS(onLongPress)();
      });

    return longPressGesture;
  }

  /**
   * Create double tap gesture
   */
  createDoubleTapGesture(
    onDoubleTap: () => void,
    maxDuration: number = 300
  ) {
    const doubleTapGesture = Gesture.Tap()
      .numberOfTaps(2)
      .maxDuration(maxDuration)
      .onEnd(() => {
        runOnJS(onDoubleTap)();
      });

    return doubleTapGesture;
  }

  /**
   * Create pinch gesture for zoom
   */
  createPinchGesture(
    onPinch: (scale: number) => void
  ) {
    const scale = useSharedValue(1);

    const pinchGesture = Gesture.Pinch()
      .onUpdate((event) => {
        scale.value = event.scale;
        runOnJS(onPinch)(event.scale);
      })
      .onEnd(() => {
        scale.value = 1;
      });

    return pinchGesture;
  }

  /**
   * Create rotation gesture
   */
  createRotationGesture(
    onRotate: (rotation: number) => void
  ) {
    const rotation = useSharedValue(0);

    const rotationGesture = Gesture.Rotation()
      .onUpdate((event) => {
        rotation.value = event.rotation;
        runOnJS(onRotate)(event.rotation);
      })
      .onEnd(() => {
        rotation.value = 0;
      });

    return rotationGesture;
  }

  /**
   * Create combined gesture
   */
  createCombinedGesture(...gestures: any[]) {
    return Gesture.Simultaneous(...gestures);
  }

  /**
   * Create exclusive gesture (only one can be active)
   */
  createExclusiveGesture(...gestures: any[]) {
    return Gesture.Exclusive(...gestures);
  }

  /**
   * Create pan gesture for dragging
   */
  createPanGesture(
    onDragStart: (x: number, y: number) => void,
    onDragUpdate: (x: number, y: number) => void,
    onDragEnd: (x: number, y: number) => void
  ) {
    const startX = useSharedValue(0);
    const startY = useSharedValue(0);

    const panGesture = Gesture.Pan()
      .onStart((event) => {
        startX.value = event.x;
        startY.value = event.y;
        runOnJS(onDragStart)(event.x, event.y);
      })
      .onUpdate((event) => {
        runOnJS(onDragUpdate)(event.x, event.y);
      })
      .onEnd((event) => {
        runOnJS(onDragEnd)(event.x, event.y);
      });

    return panGesture;
  }

  /**
   * Create tap gesture
   */
  createTapGesture(
    onTap: () => void,
    numberOfTaps: number = 1
  ) {
    const tapGesture = Gesture.Tap()
      .numberOfTaps(numberOfTaps)
      .onEnd(() => {
        runOnJS(onTap)();
      });

    return tapGesture;
  }

  /**
   * Create force touch gesture (iOS only)
   */
  createForceTouchGesture(
    onForceChange: (force: number) => void
  ) {
    const forceTouchGesture = Gesture.ForceTouch()
      .onBegin((event) => {
        runOnJS(onForceChange)(event.force);
      })
      .onUpdate((event) => {
        runOnJS(onForceChange)(event.force);
      })
      .onEnd((event) => {
        runOnJS(onForceChange)(event.force);
      });

    return forceTouchGesture;
  }
}

export default GestureService.getInstance();