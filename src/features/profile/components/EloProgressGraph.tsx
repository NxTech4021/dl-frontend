import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  ScrollView,
} from 'react-native';
import Svg, {
  Line,
  Circle,
  Polyline,
  Polygon,
  G,
  Text as SvgText,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Rect,
} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { theme } from '@core/theme/theme';
import type { EloProgressGraphProps } from '../types';

// Create animated SVG components for line drawing and area fade
const AnimatedPolyline = Animated.createAnimatedComponent(Polyline);
const AnimatedPolygon = Animated.createAnimatedComponent(Polygon);

const { width: screenWidth } = Dimensions.get('window');

export const EloProgressGraph: React.FC<EloProgressGraphProps> = ({
  data,
  onPointPress,
  selectedIndex: externalSelectedIndex,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [internalSelectedIndex, setInternalSelectedIndex] = useState<number | null>(null);

  // Use external selected index if provided, otherwise use internal
  const selectedIndex = externalSelectedIndex !== undefined ? externalSelectedIndex : internalSelectedIndex;

  const yAxisWidth = 40;
  const graphHeight = 200;
  const paddingConfig = { top: 25, bottom: 35 };
  const pointSpacing = 80;

  // Animation values for mount animations
  const lineProgress = useSharedValue(0);
  const areaOpacity = useSharedValue(0);

  // Mount animation: line drawing, then area fade
  useEffect(() => {
    // Reset animations
    lineProgress.value = 0;
    areaOpacity.value = 0;

    // Animate line drawing
    lineProgress.value = withTiming(1, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });

    // Fade in area after line draws
    areaOpacity.value = withDelay(
      400,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) })
    );
  }, [data.length]);

  const scrollableViewportWidth = screenWidth - 48 - yAxisWidth;
  const sortedData = [...data].reverse();
  const leftPadding = 20; // Start points closer to the left edge
  const rightPadding = scrollableViewportWidth / 2; // Keep right padding for scrolling to last point
  const dataWidth = sortedData.length > 1 ? (sortedData.length - 1) * pointSpacing : 0;
  const totalWidth = leftPadding + dataWidth + rightPadding;

  const chartHeight = graphHeight - paddingConfig.top - paddingConfig.bottom;
  const ratings = sortedData.map(d => d.rating).filter(r => !isNaN(r) && typeof r === 'number');

  let minRating = 1000;
  let maxRating = 2000;

  if (ratings.length > 0) {
    const actualMin = Math.min(...ratings);
    const actualMax = Math.max(...ratings);

    if (ratings.length === 1) {
      const singleRating = actualMin;
      const ratingPadding = Math.max(200, singleRating * 0.15);
      minRating = Math.max(500, singleRating - ratingPadding);
      maxRating = Math.min(5000, singleRating + ratingPadding);
    } else {
      const range = actualMax - actualMin;
      const ratingPadding = Math.max(100, range * 0.1);
      minRating = Math.max(500, actualMin - ratingPadding);
      maxRating = Math.min(5000, actualMax + ratingPadding);
    }

    if (isNaN(minRating)) minRating = 1000;
    if (isNaN(maxRating)) maxRating = 2000;
  }

  const xScale = (index: number) => leftPadding + (index * pointSpacing);

  const yScale = (rating: number) => {
    if (isNaN(rating)) rating = 1400;
    const range = maxRating - minRating;
    if (range === 0) return chartHeight / 2 + paddingConfig.top;
    return chartHeight - ((rating - minRating) / range) * chartHeight + paddingConfig.top;
  };

  const formatDateLabel = (dateString: string): string => {
    if (dateString === 'No matches yet') return 'No Data';
    if (dateString === 'Current Rating') return 'Current';

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      const parts = dateString.split(' ');
      if (parts.length >= 2) {
        return `${parts[0]} ${parts[1].replace(',', '')}`;
      }
      return dateString.substring(0, 6);
    }

    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    return `${month} ${day}`;
  };

  // Create points for polyline
  const linePoints = sortedData
    .map((point, index) => `${xScale(index)},${yScale(point.rating)}`)
    .join(' ');

  // Calculate approximate line length for stroke animation
  const lineLength = useMemo(() => {
    if (sortedData.length < 2) return 0;
    let length = 0;
    for (let i = 1; i < sortedData.length; i++) {
      const x1 = xScale(i - 1);
      const y1 = yScale(sortedData[i - 1].rating);
      const x2 = xScale(i);
      const y2 = yScale(sortedData[i].rating);
      length += Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }
    return length;
  }, [sortedData, xScale, yScale]);

  // Animated props for line drawing effect
  const animatedLineProps = useAnimatedProps(() => ({
    strokeDasharray: lineLength > 0 ? `${lineLength}` : undefined,
    strokeDashoffset: lineLength > 0 ? lineLength * (1 - lineProgress.value) : 0,
  }));

  // Animated props for area fade
  const animatedAreaProps = useAnimatedProps(() => ({
    opacity: areaOpacity.value * 0.25,
  }));

  // Create points for gradient fill area (polygon under the line)
  const bottomY = graphHeight - paddingConfig.bottom;
  const areaPoints = sortedData.length > 0
    ? `${xScale(0)},${bottomY} ` +
      sortedData.map((point, index) => `${xScale(index)},${yScale(point.rating)}`).join(' ') +
      ` ${xScale(sortedData.length - 1)},${bottomY}`
    : '';

  const gridLines = [0, 1, 2, 3, 4].map(i => {
    const y = paddingConfig.top + (chartHeight / 4) * i;
    const rating = maxRating - ((maxRating - minRating) / 4) * i;
    return { y, rating };
  });

  const handlePointPress = (point: any, index: number) => {
    setInternalSelectedIndex(index);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPointPress(point, index);
  };

  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      style={styles.graphContainer}
    >
      {/* Fixed Y-axis labels */}
      <Animated.View
        entering={FadeIn.delay(100).duration(300)}
        style={styles.yAxisContainer}
      >
        {gridLines.map((line, i) => (
          <View key={`ylabel-${i}`} style={[styles.yAxisLabel, { top: line.y - 6 }]}>
            <Text style={styles.yAxisText}>
              {Math.round(line.rating) >= 1000
                ? `${(Math.round(line.rating) / 1000).toFixed(1)}k`
                : Math.round(line.rating)}
            </Text>
          </View>
        ))}
      </Animated.View>

      {/* Scrollable graph area */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ width: totalWidth }}
        style={styles.scrollView}
      >
        <View style={{ position: 'relative', width: totalWidth, height: graphHeight }}>
          <Svg width={totalWidth} height={graphHeight} style={styles.graph}>
            {/* Gradient definitions */}
            <Defs>
              <SvgLinearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor="#FE9F4D" stopOpacity="1" />
                <Stop offset="100%" stopColor="#FFA366" stopOpacity="1" />
              </SvgLinearGradient>
              <SvgLinearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#FE9F4D" stopOpacity="0.25" />
                <Stop offset="100%" stopColor="#FE9F4D" stopOpacity="0.02" />
              </SvgLinearGradient>
              <SvgLinearGradient id="selectedGlow" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#FF8C00" stopOpacity="0.6" />
                <Stop offset="100%" stopColor="#FE9F4D" stopOpacity="0.3" />
              </SvgLinearGradient>
            </Defs>

            {/* Grid lines */}
            {gridLines.map((line, i) => (
              <Line
                key={`grid-${i}`}
                x1={0}
                y1={line.y}
                x2={totalWidth}
                y2={line.y}
                stroke={theme.colors.neutral.gray[200]}
                strokeWidth="1"
                strokeDasharray="3,3"
              />
            ))}

            {/* Gradient area fill under line - animated fade in */}
            {sortedData.length > 1 && (
              <AnimatedPolygon
                points={areaPoints}
                fill="url(#areaGradient)"
                animatedProps={animatedAreaProps}
              />
            )}

            {/* Main line - animated drawing effect */}
            {sortedData.length > 1 && (
              <AnimatedPolyline
                points={linePoints}
                fill="none"
                stroke="url(#lineGradient)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                animatedProps={animatedLineProps}
              />
            )}

            {/* Data points */}
            {sortedData.map((point, index) => {
              const isSelected = selectedIndex === index;
              const cx = xScale(index);
              const cy = yScale(point.rating);

              return (
                <G key={`point-${index}`}>
                  {/* Outer glow for selected */}
                  {isSelected && (
                    <>
                      <Circle
                        cx={cx}
                        cy={cy}
                        r="18"
                        fill="#FE9F4D"
                        opacity="0.15"
                      />
                      <Circle
                        cx={cx}
                        cy={cy}
                        r="12"
                        fill="#FE9F4D"
                        opacity="0.25"
                      />
                    </>
                  )}
                  {/* Base glow */}
                  <Circle
                    cx={cx}
                    cy={cy}
                    r={isSelected ? 10 : 8}
                    fill="#FE9F4D"
                    opacity={isSelected ? 0.3 : 0.15}
                  />
                  {/* Main circle */}
                  <Circle
                    cx={cx}
                    cy={cy}
                    r={isSelected ? 8 : 6}
                    fill={isSelected ? '#FF8C00' : '#FE9F4D'}
                  />
                  {/* Inner highlight */}
                  <Circle
                    cx={cx}
                    cy={cy}
                    r={isSelected ? 4 : 3}
                    fill="#ffffff"
                    opacity={isSelected ? 0.7 : 0.5}
                  />
                </G>
              );
            })}

            {/* Rating tooltip for selected point */}
            {selectedIndex !== null && sortedData[selectedIndex] && (
              <G>
                <Rect
                  x={xScale(selectedIndex) - 28}
                  y={yScale(sortedData[selectedIndex].rating) - 32}
                  width="56"
                  height="22"
                  rx="6"
                  fill="#1f2937"
                  opacity="0.9"
                />
                <SvgText
                  x={xScale(selectedIndex)}
                  y={yScale(sortedData[selectedIndex].rating) - 17}
                  fontSize="12"
                  fill="#ffffff"
                  textAnchor="middle"
                  fontWeight="600"
                >
                  {sortedData[selectedIndex].rating}
                </SvgText>
              </G>
            )}

            {/* Date labels */}
            {sortedData.map((point, index) => (
              <SvgText
                key={`label-${index}`}
                x={xScale(index)}
                y={graphHeight - 10}
                fontSize="10"
                fill={selectedIndex === index ? '#FE9F4D' : theme.colors.neutral.gray[500]}
                textAnchor="middle"
                fontWeight={selectedIndex === index ? '600' : '500'}
              >
                {formatDateLabel(point.date)}
              </SvgText>
            ))}

            {/* "Current" label on newest point */}
            {sortedData.length > 0 && (
              <G>
                <Rect
                  x={xScale(sortedData.length - 1) - 26}
                  y={yScale(sortedData[sortedData.length - 1].rating) - 50}
                  width="52"
                  height="16"
                  rx="8"
                  fill="#10b981"
                  opacity="0.9"
                />
                <SvgText
                  x={xScale(sortedData.length - 1)}
                  y={yScale(sortedData[sortedData.length - 1].rating) - 38}
                  fontSize="9"
                  fill="#ffffff"
                  textAnchor="middle"
                  fontWeight="600"
                >
                  Current
                </SvgText>
              </G>
            )}
          </Svg>

          {/* Clickable overlays */}
          {sortedData.map((point, index) => (
            <Pressable
              key={`press-${index}`}
              style={[
                styles.pressablePoint,
                {
                  left: xScale(index) - 24,
                  top: yScale(point.rating) - 24,
                },
              ]}
              onPress={() => handlePointPress(point, index)}
            />
          ))}
        </View>
      </ScrollView>

      {/* Scroll hint */}
      {sortedData.length > 3 && (
        <Animated.View
          entering={FadeIn.delay(800).duration(400)}
          style={styles.scrollHint}
        >
          <Text style={styles.scrollHintText}>Scroll to see more →</Text>
        </Animated.View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  graphContainer: {
    marginTop: theme.spacing.sm,
    width: '100%',
    position: 'relative',
  },
  yAxisContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 40,
    height: 200,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  yAxisLabel: {
    position: 'absolute',
    left: 0,
    width: 38,
    alignItems: 'flex-end',
  },
  yAxisText: {
    fontSize: 10,
    color: theme.colors.neutral.gray[500],
    fontFamily: theme.typography.fontFamily.primary,
  },
  scrollView: {
    marginLeft: 40,
  },
  graph: {
    backgroundColor: 'transparent',
  },
  pressablePoint: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  scrollHint: {
    position: 'absolute',
    right: 8,
    bottom: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  scrollHintText: {
    fontSize: 10,
    color: theme.colors.neutral.gray[400],
    fontFamily: theme.typography.fontFamily.primary,
  },
});
