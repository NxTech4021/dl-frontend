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

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Shared values for rendered dimensions (for worklet access)
  const renderedWidth = useSharedValue(CROP_SIZE);
  const renderedHeight = useSharedValue(CROP_SIZE);

  // Reset transforms when modal opens
  useEffect(() => {
    if (visible && imageUri) {
      scale.value = 1;
      savedScale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
      setIsImageLoaded(false);

      Image.getSize(imageUri, (width, height) => {
        console.log('=== IMAGE SIZE VERIFICATION ===');
        console.log('Image URI:', imageUri);
        console.log('Image.getSize() returned:', { width, height });
        console.log('Aspect ratio:', width / height);
        console.log('==============================');
        setImageSize({ width, height });
        setIsImageLoaded(true);
      });
    }
  }, [visible, imageUri]);

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

  // Update shared values when dimensions change
  useEffect(() => {
    renderedWidth.value = renderedDimensions.width;
    renderedHeight.value = renderedDimensions.height;

    console.log('=== RENDERED DIMENSIONS UPDATE ===');
    console.log('Calculated rendered dimensions:', renderedDimensions);
    console.log('CROP_SIZE:', CROP_SIZE);
    console.log('Rendered/CROP ratio:', {
      widthRatio: renderedDimensions.width / CROP_SIZE,
      heightRatio: renderedDimensions.height / CROP_SIZE
    });
    console.log('===================================');
  }, [renderedDimensions]);

  const clampScale = (value: number) => {
    'worklet';
    return Math.min(Math.max(value, MIN_SCALE), MAX_SCALE);
  };

  const getClampLimits = (currentScale: number) => {
    'worklet';
    const scaledWidth = renderedWidth.value * currentScale;
    const scaledHeight = renderedHeight.value * currentScale;

    return {
      maxX: Math.max(0, (scaledWidth - CROP_SIZE) / 2),
      maxY: Math.max(0, (scaledHeight - CROP_SIZE) / 2),
    };
  };

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      const newScale = clampScale(savedScale.value * e.scale);
      scale.value = newScale;

      // Re-clamp translation for new scale
      const limits = getClampLimits(newScale);
      translateX.value = Math.min(Math.max(savedTranslateX.value, -limits.maxX), limits.maxX);
      translateY.value = Math.min(Math.max(savedTranslateY.value, -limits.maxY), limits.maxY);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      const limits = getClampLimits(scale.value);
      translateX.value = Math.min(
        Math.max(savedTranslateX.value + e.translationX, -limits.maxX),
        limits.maxX
      );
      translateY.value = Math.min(
        Math.max(savedTranslateY.value + e.translationY, -limits.maxY),
        limits.maxY
      );
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  const handleCrop = async () => {
    setIsCropping(true);
    try {
      if (!imageSize.width || !imageSize.height) {
        console.error('Image size not available');
        return;
      }

      const currentScale = savedScale.value;
      const currentTranslateX = savedTranslateX.value;
      const currentTranslateY = savedTranslateY.value;

      // Use memoized rendered dimensions
      const rendered = renderedDimensions;

      // Calculate what portion of the rendered image is visible in the crop area
      // The image is centered in the container via flexbox (justifyContent/alignItems: center)
      // This means the image may overflow the container on some sides

      // Calculate initial image offset due to centering
      const initialImageOffsetX = (rendered.width - CROP_SIZE) / 2;
      const initialImageOffsetY = (rendered.height - CROP_SIZE) / 2;

      // At default state (scale=1, translate=0), the container shows:
      // - Horizontally: from initialImageOffsetX to (initialImageOffsetX + CROP_SIZE)
      // - Vertically: from initialImageOffsetY to (initialImageOffsetY + CROP_SIZE)

      // After user transforms (scale + translate), calculate visible portion
      // Transform origin is at the image center
      const imageCenterX = rendered.width / 2;
      const imageCenterY = rendered.height / 2;

      // Container center relative to image center
      const containerCenterX = CROP_SIZE / 2;
      const containerCenterY = CROP_SIZE / 2;

      // Distance from image center to container center (before transforms)
      const centerOffsetX = containerCenterX - imageCenterX + initialImageOffsetX;
      const centerOffsetY = containerCenterY - imageCenterY + initialImageOffsetY;

      // Apply inverse transforms to find what part of the image is visible
      // Work backwards: undo translate, then undo scale
      const afterTranslateX = centerOffsetX - currentTranslateX;
      const afterTranslateY = centerOffsetY - currentTranslateY;

      const afterScaleX = afterTranslateX / currentScale;
      const afterScaleY = afterTranslateY / currentScale;

      // Calculate the size of the visible area in rendered space
      const visibleWidth = CROP_SIZE / currentScale;
      const visibleHeight = CROP_SIZE / currentScale;

      // Convert from center-relative to top-left coordinates
      // afterScaleX/Y gives us the CENTER of the visible area relative to image center
      // We need to subtract half the visible size to get the top-left corner
      const visibleCenterX = imageCenterX + afterScaleX;
      const visibleCenterY = imageCenterY + afterScaleY;

      const visibleLeft = visibleCenterX - (visibleWidth / 2);
      const visibleTop = visibleCenterY - (visibleHeight / 2);

      // Convert from rendered space to original image space
      const scaleX = imageSize.width / rendered.width;
      const scaleY = imageSize.height / rendered.height;

      const cropX = Math.max(0, visibleLeft * scaleX);
      const cropY = Math.max(0, visibleTop * scaleY);
      const cropWidth = Math.min(imageSize.width - cropX, visibleWidth * scaleX);
      const cropHeight = Math.min(imageSize.height - cropY, visibleHeight * scaleY);

      console.log('=== DETAILED CROP CALCULATION ===');
      console.log('1. Image Info:');
      console.log('   - Original size:', imageSize);
      console.log('   - Rendered size:', rendered);
      console.log('   - Aspect ratio:', imageSize.width / imageSize.height);
      console.log('   - CROP_SIZE:', CROP_SIZE);

      console.log('2. Initial Offsets & Centers:');
      console.log('   - Initial image offset:', { x: initialImageOffsetX, y: initialImageOffsetY });
      console.log('   - Container center:', { x: containerCenterX, y: containerCenterY });
      console.log('   - Image center:', { x: imageCenterX, y: imageCenterY });
      console.log('   - Center offset:', { x: centerOffsetX, y: centerOffsetY });

      console.log('3. User Transforms:');
      console.log('   - Scale:', currentScale);
      console.log('   - TranslateX:', currentTranslateX);
      console.log('   - TranslateY:', currentTranslateY);

      console.log('4. Reverse Transform Steps:');
      console.log('   - After undo translate:', { x: afterTranslateX, y: afterTranslateY });
      console.log('   - After undo scale:', { x: afterScaleX, y: afterScaleY });
      console.log('   - Visible position in rendered space:', { left: visibleLeft, top: visibleTop });
      console.log('   - Visible size:', { width: visibleWidth, height: visibleHeight });

      console.log('5. Convert to Original Space:');
      console.log('   - Scale factors:', { scaleX, scaleY });
      console.log('   - Crop position:', { x: cropX, y: cropY });
      console.log('   - Crop size:', { width: cropWidth, height: cropHeight });

      console.log('6. Final Crop Rectangle:');
      console.log('   - originX:', Math.round(cropX));
      console.log('   - originY:', Math.round(cropY));
      console.log('   - width:', Math.round(cropWidth));
      console.log('   - height:', Math.round(cropHeight));
      console.log('================================');

      // Image is already normalized before being passed to cropper, just crop it
      console.log('=== CROPPING IMAGE ===');
      console.log('Image URI (already normalized):', imageUri);
      console.log('Crop params:', {
        originX: Math.round(cropX),
        originY: Math.round(cropY),
        width: Math.round(cropWidth),
        height: Math.round(cropHeight),
      });
      console.log('======================');

      // CRITICAL: manipulateAsync reads raw image dimensions, not EXIF-rotated dimensions
      // We need to detect if there's a dimension mismatch and adjust crop coordinates
      const testRead = await manipulateAsync(imageUri, [], { compress: 1, format: SaveFormat.JPEG });

      console.log('=== DIMENSION MISMATCH DETECTION ===');
      console.log('Image.getSize() dimensions:', { width: imageSize.width, height: imageSize.height });
      console.log('manipulateAsync dimensions:', { width: testRead.width, height: testRead.height });

      // Calculate scaling factor if dimensions don't match
      const dimensionScaleX = testRead.width / imageSize.width;
      const dimensionScaleY = testRead.height / imageSize.height;

      console.log('Dimension scale factors:', { dimensionScaleX, dimensionScaleY });

      // Adjust crop coordinates for the actual image dimensions
      const adjustedCropX = Math.round(cropX * dimensionScaleX);
      const adjustedCropY = Math.round(cropY * dimensionScaleY);
      const adjustedCropWidth = Math.round(cropWidth * dimensionScaleX);
      const adjustedCropHeight = Math.round(cropHeight * dimensionScaleY);

      console.log('Original crop:', { originX: Math.round(cropX), originY: Math.round(cropY), width: Math.round(cropWidth), height: Math.round(cropHeight) });
      console.log('Adjusted crop:', { originX: adjustedCropX, originY: adjustedCropY, width: adjustedCropWidth, height: adjustedCropHeight });
      console.log('====================================');

      // First crop only, then check dimensions
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

      console.log('=== AFTER CROP (before resize) ===');
      console.log('Cropped URI:', croppedOnly.uri);
      console.log('Cropped dimensions:', { width: croppedOnly.width, height: croppedOnly.height });
      console.log('Expected dimensions:', { width: Math.round(cropWidth), height: Math.round(cropHeight) });
      console.log('===================================');

      // Then resize to 500×500
      // CRITICAL: Use PNG to avoid any JPEG/EXIF issues
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

      console.log('=== CROPPED IMAGE RESULT ===');
      console.log('Cropped image URI:', croppedImage.uri);
      console.log('Cropped image width:', croppedImage.width);
      console.log('Cropped image height:', croppedImage.height);
      console.log('============================');

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
                <GestureDetector gesture={composedGesture} enabled={isImageLoaded}>
                  <Animated.Image
                    source={{ uri: imageUri }}
                    style={[
                      {
                        width: renderedDimensions.width,
                        height: renderedDimensions.height,
                        position: 'absolute',
                      },
                      animatedStyle,
                    ]}
                    resizeMode="contain"
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
