import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Modal,
  Image,
  StyleSheet,
  TouchableOpacity,
  Text,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CROP_SIZE = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.75;
const MIN_SCALE = 1;
const MAX_SCALE = 3;

interface CircularImageCropperProps {
  visible: boolean;
  imageUri: string;
  onCropComplete: (croppedUri: string) => void;
  onCancel: () => void;
}

const CircularImageCropper: React.FC<CircularImageCropperProps> = ({
  visible,
  imageUri,
  onCropComplete,
  onCancel,
}) => {
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [isCropping, setIsCropping] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  // Separate previous/current state prevents transform drift
  const scalePrevious = useSharedValue(1);
  const scaleCurrent = useSharedValue(1);
  const translateXPrevious = useSharedValue(0);
  const translateYPrevious = useSharedValue(0);
  const translateXCurrent = useSharedValue(0);
  const translateYCurrent = useSharedValue(0);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);
  const renderedWidth = useSharedValue(CROP_SIZE);
  const renderedHeight = useSharedValue(CROP_SIZE);

  // Memoize rendered dimensions to avoid recalculation on every render
  const renderedDimensions = useMemo(() => {
    if (!imageSize.width || !imageSize.height) {
      return { width: CROP_SIZE, height: CROP_SIZE };
    }

    const imageAspect = imageSize.width / imageSize.height;

    if (imageAspect > 1) {
      // Landscape - height matches container
      return {
        width: CROP_SIZE * imageAspect,
        height: CROP_SIZE,
      };
    } else {
      // Portrait - width matches container
      return {
        width: CROP_SIZE,
        height: CROP_SIZE / imageAspect,
      };
    }
  }, [imageSize.width, imageSize.height]);

  // Reset transforms when modal opens
  useEffect(() => {
    if (visible && imageUri) {
      scalePrevious.value = 1;
      scaleCurrent.value = 1;
      translateXPrevious.value = 0;
      translateYPrevious.value = 0;
      translateXCurrent.value = 0;
      translateYCurrent.value = 0;
      focalX.value = 0;
      focalY.value = 0;
      setIsImageLoaded(false);

      Image.getSize(imageUri, (width, height) => {
        setImageSize({ width, height });
        setIsImageLoaded(true);
      });
    }
  }, [visible, imageUri]);

  // Center the image when dimensions are calculated
  useEffect(() => {
    if (isImageLoaded && renderedDimensions.width > 0) {
      const imageCenterX = renderedDimensions.width / 2;
      const imageCenterY = renderedDimensions.height / 2;
      const cropCenterX = CROP_SIZE / 2;
      const cropCenterY = CROP_SIZE / 2;

      const initialTranslateX = cropCenterX - imageCenterX;
      const initialTranslateY = cropCenterY - imageCenterY;

      translateXPrevious.value = initialTranslateX;
      translateYPrevious.value = initialTranslateY;
      translateXCurrent.value = 0;
      translateYCurrent.value = 0;
    }
  }, [isImageLoaded, renderedDimensions.width, renderedDimensions.height]);

  // Update shared values when dimensions change
  useEffect(() => {
    renderedWidth.value = renderedDimensions.width;
    renderedHeight.value = renderedDimensions.height;
  }, [renderedDimensions]);

  const clampScale = (value: number) => {
    'worklet';
    return Math.min(Math.max(value, MIN_SCALE), MAX_SCALE);
  };

  const getClampLimits = (currentScale: number) => {
    'worklet';

    const baseWidth = renderedWidth.value;
    const baseHeight = renderedHeight.value;
    const scaledWidth = baseWidth * currentScale;
    const scaledHeight = baseHeight * currentScale;

    const maxTranslateX = (scaledWidth - baseWidth) / 2;
    const maxTranslateY = (scaledHeight - baseHeight) / 2;
    const minTranslateX = CROP_SIZE - (baseWidth + scaledWidth) / 2;
    const minTranslateY = CROP_SIZE - (baseHeight + scaledHeight) / 2;

    return {
      minX: minTranslateX,
      maxX: maxTranslateX,
      minY: minTranslateY,
      maxY: maxTranslateY,
    };
  };

  const pinchGesture = Gesture.Pinch()
    .onStart((e) => {
      if (e.numberOfPointers === 2) {
        focalX.value = e.focalX;
        focalY.value = e.focalY;
      }
    })
    .onUpdate((e) => {
      const newScale = clampScale(scalePrevious.value * e.scale);
      scaleCurrent.value = newScale;

      // Focal point scaling formula
      const focalOffsetX = (1 - newScale) * (focalX.value - CROP_SIZE / 2);
      const focalOffsetY = (1 - newScale) * (focalY.value - CROP_SIZE / 2);

      const newTranslateX = translateXPrevious.value + focalOffsetX;
      const newTranslateY = translateYPrevious.value + focalOffsetY;

      const limits = getClampLimits(newScale);
      translateXCurrent.value = Math.min(Math.max(newTranslateX, limits.minX), limits.maxX);
      translateYCurrent.value = Math.min(Math.max(newTranslateY, limits.minY), limits.maxY);
    })
    .onEnd(() => {
      scalePrevious.value = scaleCurrent.value;
      scaleCurrent.value = 1;

      translateXPrevious.value = translateXCurrent.value;
      translateYPrevious.value = translateYCurrent.value;
      translateXCurrent.value = 0;
      translateYCurrent.value = 0;
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      const currentScale = scalePrevious.value * scaleCurrent.value;
      const limits = getClampLimits(currentScale);

      const newTranslateX = translateXPrevious.value + e.translationX;
      const newTranslateY = translateYPrevious.value + e.translationY;

      translateXCurrent.value = Math.min(Math.max(newTranslateX, limits.minX), limits.maxX);
      translateYCurrent.value = Math.min(Math.max(newTranslateY, limits.minY), limits.maxY);
    })
    .onEnd(() => {
      if (translateXCurrent.value !== 0 || translateYCurrent.value !== 0) {
        translateXPrevious.value = translateXCurrent.value;
        translateYPrevious.value = translateYCurrent.value;
        translateXCurrent.value = 0;
        translateYCurrent.value = 0;
      }
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => {
    const totalScale = scalePrevious.value * scaleCurrent.value;
    const totalTranslateX = translateXPrevious.value + translateXCurrent.value;
    const totalTranslateY = translateYPrevious.value + translateYCurrent.value;

    return {
      transform: [
        { scale: totalScale },
        { translateX: totalTranslateX },
        { translateY: totalTranslateY },
      ],
    };
  });

  const handleCrop = async () => {
    if (isCropping) return; // Prevent double-tap

    setIsCropping(true);
    try {
      if (!imageSize.width || !imageSize.height) {
        console.error('[CircularImageCropper] Image size not available');
        return;
      }

      if (!imageUri) {
        console.error('[CircularImageCropper] No image URI provided');
        return;
      }

      const currentScale = scalePrevious.value;
      const currentTranslateX = translateXPrevious.value;
      const currentTranslateY = translateYPrevious.value;

      const rendered = renderedDimensions;

      const imageCenterX = rendered.width / 2;
      const imageCenterY = rendered.height / 2;

      // React Native applies scale around original center: center = original_center + translation * scale
      const imageCenterInContainerX = imageCenterX + currentTranslateX * currentScale;
      const imageCenterInContainerY = imageCenterY + currentTranslateY * currentScale;

      const cropCircleCenterX = CROP_SIZE / 2;
      const cropCircleCenterY = CROP_SIZE / 2;

      const centerToCropX = cropCircleCenterX - imageCenterInContainerX;
      const centerToCropY = cropCircleCenterY - imageCenterInContainerY;

      const cropCenterInImageX = imageCenterX + (centerToCropX / currentScale);
      const cropCenterInImageY = imageCenterY + (centerToCropY / currentScale);

      const visibleWidth = CROP_SIZE / currentScale;
      const visibleHeight = CROP_SIZE / currentScale;

      const visibleLeft = cropCenterInImageX - (visibleWidth / 2);
      const visibleTop = cropCenterInImageY - (visibleHeight / 2);

      const scaleX = imageSize.width / rendered.width;
      const scaleY = imageSize.height / rendered.height;

      const cropX = Math.max(0, visibleLeft * scaleX);
      const cropY = Math.max(0, visibleTop * scaleY);
      const cropWidth = Math.min(imageSize.width - cropX, visibleWidth * scaleX);
      const cropHeight = Math.min(imageSize.height - cropY, visibleHeight * scaleY);

      // Handle EXIF dimension mismatch
      const testRead = await manipulateAsync(imageUri, [], { compress: 1, format: SaveFormat.JPEG });

      const dimensionScaleX = testRead.width / imageSize.width;
      const dimensionScaleY = testRead.height / imageSize.height;

      const adjustedCropX = Math.round(cropX * dimensionScaleX);
      const adjustedCropY = Math.round(cropY * dimensionScaleY);
      const adjustedCropWidth = Math.round(cropWidth * dimensionScaleX);
      const adjustedCropHeight = Math.round(cropHeight * dimensionScaleY);

      const croppedOnly = await manipulateAsync(
        testRead.uri,
        [
          {
            crop: {
              originX: adjustedCropX,
              originY: adjustedCropY,
              width: adjustedCropWidth,
              height: adjustedCropHeight,
            },
          },
        ],
        { compress: 1, format: SaveFormat.JPEG }
      );

      const croppedImage = await manipulateAsync(
        croppedOnly.uri,
        [
          {
            resize: {
              width: 500,
              height: 500,
            },
          },
        ],
        { compress: 1, format: SaveFormat.PNG, base64: false }
      );

      onCropComplete(croppedImage.uri);
    } catch (error) {
      console.error('Error cropping image:', error);
    } finally {
      setIsCropping(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Adjust Photo</Text>
            <TouchableOpacity
              onPress={handleCrop}
              style={styles.doneButton}
              disabled={isCropping || !isImageLoaded}
            >
              {isCropping ? (
                <ActivityIndicator color="#FE9F4D" size="small" />
              ) : (
                <Text style={[styles.doneText, !isImageLoaded && styles.disabledText]}>Done</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.cropArea}>
            <View style={styles.cropContainer}>
              <View style={styles.imageContainer}>
                <GestureDetector gesture={composedGesture}>
                  <Animated.Image
                    source={{ uri: imageUri }}
                    style={[
                      {
                        width: renderedDimensions.width,
                        height: renderedDimensions.height,
                        position: 'absolute',
                        top: 0,
                        left: 0,
                      },
                      animatedStyle,
                    ]}
                    resizeMode="stretch"
                  />
                </GestureDetector>
              </View>

              {/* Circular crop overlay */}
              <View style={styles.overlay} pointerEvents="none">
                <View style={styles.overlayTop} />
                <View style={styles.overlayMiddle}>
                  <View style={styles.overlaySide} />
                  <View style={styles.circularCrop}>
                    <View style={styles.circularBorder} />
                  </View>
                  <View style={styles.overlaySide} />
                </View>
                <View style={styles.overlayBottom} />
              </View>
            </View>
          </View>

          <Text style={styles.instructions}>
            Pinch to zoom • Drag to reposition
          </Text>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  cancelButton: {
    padding: 8,
  },
  cancelText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  doneButton: {
    padding: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  doneText: {
    color: '#FE9F4D',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledText: {
    opacity: 0.5,
  },
  cropArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cropContainer: {
    width: CROP_SIZE,
    height: CROP_SIZE,
    position: 'relative',
  },
  imageContainer: {
    width: CROP_SIZE,
    height: CROP_SIZE,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTop: {
    flex: 1,
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  overlayMiddle: {
    flexDirection: 'row',
    width: '100%',
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  circularCrop: {
    width: CROP_SIZE,
    height: CROP_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circularBorder: {
    width: CROP_SIZE,
    height: CROP_SIZE,
    borderRadius: CROP_SIZE / 2,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  overlayBottom: {
    flex: 1,
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  instructions: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    paddingBottom: 40,
  },
});

export default CircularImageCropper;
