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

  const thumbWidthPercent = Math.max((viewWidth / contentWidth) * 100, 20);
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
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 4,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
    position: 'absolute',
    top: 0,
    opacity: 0.8,
  },
});

export default ScrollProgressBar;
