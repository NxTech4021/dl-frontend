import React from 'react';
import { StyleSheet, View } from 'react-native';

interface ScrollProgressBarProps {
  progress: number;
  viewWidth: number;
  contentWidth: number;
  accentColor: string;
}

export const ScrollProgressBar: React.FC<ScrollProgressBarProps> = ({
  progress,
  viewWidth,
  contentWidth,
  accentColor,
}) => {
  // Don't render if content fits in view
  if (contentWidth <= viewWidth) return null;

  const thumbWidthPercent = (viewWidth / contentWidth) * 100;
  const maxLeftPercent = 100 - thumbWidthPercent;
  const leftPercent = progress * maxLeftPercent;

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressBar,
            {
              width: `${thumbWidthPercent}%`,
              left: `${leftPercent}%`,
              backgroundColor: accentColor,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  progressContainer: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
    position: 'absolute',
    top: 0,
  },
});

export default ScrollProgressBar;
