import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Svg, Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
  Easing
} from 'react-native-reanimated';
import { QuestionCard } from '../../../components/QuestionContainer';
import { QuestionProgressBar } from './QuestionProgressBar';
import { NavigationButtons } from '../components/NavigationButtons';
import { styles } from './QuestionnaireFlow.styles';

interface QuestionnaireFlowProps {
  sport: 'pickleball' | 'tennis' | 'padel';
  questions: any[];
  currentQuestionIndex: number;
  currentPageAnswers: { [key: string]: any };
  responses: any;
  progress: { current: number; total: number };
  onAnswer: (questionKey: string, answer: any) => void;
  onBack: () => void;
  onNext: () => void;
}

export const QuestionnaireFlow: React.FC<QuestionnaireFlowProps> = ({
  sport,
  questions,
  currentQuestionIndex,
  currentPageAnswers,
  responses,
  progress,
  onAnswer,
  onBack,
  onNext,
}) => {
  // Track displayed question index separately from prop
  const [displayedIndex, setDisplayedIndex] = useState(currentQuestionIndex);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showContent, setShowContent] = useState(true); // Control content visibility for animations

  // Ref for timeout cleanup on unmount
  const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    const timeoutRef = animationTimeoutRef;
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Shared values for card animation
  const fade = useSharedValue(1);
  const slideX = useSharedValue(0); // Current card slides left
  const scale = useSharedValue(1); // Current card scales down
  const nextCardTranslateY = useSharedValue(20); // Blank card starts 20px below
  const nextCardScale = useSharedValue(0.95); // Slightly smaller
  const nextCardOpacity = useSharedValue(0); // Start hidden

  // When parent updates currentQuestionIndex OR when animation unlocks, sync state
  useEffect(() => {
    console.log(`🔄 Sync check: currentQuestionIndex=${currentQuestionIndex}, displayedIndex=${displayedIndex}, isAnimating=${isAnimating}, showContent=${showContent}`);

    if (currentQuestionIndex !== displayedIndex) {
      if (!isAnimating) {
        // Safe to sync - no animation in progress
        console.log(`📌 Syncing displayedIndex: ${displayedIndex} → ${currentQuestionIndex}`);
        setDisplayedIndex(currentQuestionIndex);
        fade.value = 1; // Reset opacity for new question
        slideX.value = 0; // Reset position
        scale.value = 1; // Reset scale
        nextCardTranslateY.value = 20; // Reset blank card position
        nextCardScale.value = 0.95;
        nextCardOpacity.value = 0;
        setShowContent(true); // Show content with entrance animations
      } else {
        // Animation in progress - will sync once it unlocks
        console.log(`⏳ Parent updated questions during animation (expected), will sync once unlocked`);
      }
    } else if (!isAnimating && !showContent) {
      // Edge case: indices match but content is hidden (happens after parent updates same index)
      console.log(`🔓 Animation unlocked, restoring content for question ${currentQuestionIndex}`);
      fade.value = 1;
      slideX.value = 0;
      scale.value = 1;
      nextCardTranslateY.value = 20;
      nextCardScale.value = 0.95;
      nextCardOpacity.value = 0;
      setShowContent(true);
    }
  }, [currentQuestionIndex, displayedIndex, isAnimating, showContent]);

  // Animated style for current card (slides left + fades + scales)
  const activeCardStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [
      { translateX: slideX.value },
      { scale: scale.value },
    ],
  }));

  // Animated style for blank next card (slides up)
  const blankCardStyle = useAnimatedStyle(() => ({
    opacity: nextCardOpacity.value,
    transform: [
      { translateY: nextCardTranslateY.value },
      { scale: nextCardScale.value },
    ],
  }));

  // Callback to execute after animation completes
  // MUST be at component level, not inside handleNext (Hooks rule)
  const finishTransition = useCallback(() => {
    // IMPORTANT: Call onNext AFTER animation completes
    // This prevents parent state updates from interfering with animation
    onNext();

    // Wait a bit longer for the card to fully settle before showing content
    animationTimeoutRef.current = setTimeout(() => {
      setIsAnimating(false);
    }, 150); // Give card time to settle before content fades in
  }, [onNext]);

  const handleNext = useCallback(() => {
    if (isAnimating) return; // Prevent rapid taps

    setIsAnimating(true);
    setShowContent(false); // Hide content to prepare for next question's entrance

    // Stage 1: Show blank card behind and animate current card out
    nextCardOpacity.value = 0.7; // Make blank card visible

    const onCardTransitionComplete = () => {
      'worklet';
      // Stage 2: Call parent to update question, which will trigger content fade-in
      runOnJS(finishTransition)();
    };

    // Animate current card out (slide left + scale down + fade)
    slideX.value = withTiming(-500, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });

    scale.value = withTiming(0.8, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });

    fade.value = withTiming(0, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });

    // Animate blank card sliding up (parallel)
    nextCardTranslateY.value = withTiming(0, {
      duration: 500,
      easing: Easing.inOut(Easing.cubic),
    });

    nextCardScale.value = withTiming(1, {
      duration: 500,
      easing: Easing.inOut(Easing.cubic),
    });

    nextCardOpacity.value = withTiming(1, {
      duration: 500,
      easing: Easing.inOut(Easing.cubic),
    }, onCardTransitionComplete);
  }, [isAnimating, finishTransition, fade, slideX, scale, nextCardTranslateY, nextCardScale, nextCardOpacity]);

  // Wrapper that handles skip + navigation together to avoid race condition
  // This ensures the skip value is set BEFORE the animation starts
  const handleSkipAndProceed = useCallback(() => {
    const question = questions[displayedIndex];
    if (question?.optional && question?.key) {
      // Set the skip value synchronously before triggering animation
      onAnswer(question.key, '');
    }
    // Then trigger the animation and navigation
    handleNext();
  }, [questions, displayedIndex, onAnswer, handleNext]);

  return (
    <>
      {/* Header */}
      <View style={styles.questionnaireHeader}>
        <Text style={[
          styles.questionnaireTitle,
          sport === 'tennis' && styles.tennisQuestionnaireTitle,
          sport === 'padel' && styles.padelQuestionnaireTitle
        ]}>
          {sport}
        </Text>
      </View>

      {/* Progress Bar */}
      <QuestionProgressBar current={progress.current} total={progress.total} />

      {/* Question Content - Card Stack */}
      <View style={styles.questionnaireContainer}>
        {questions && questions.length > 0 && displayedIndex < questions.length ? (
          <View style={styles.cardStack}>
            {/* Render stack placeholder cards (showing remaining depth) - max 3 visible */}
            {(() => {
              const remainingCards = questions.length - displayedIndex - 2; // -2 for current and next card
              const visibleStackCards = Math.max(0, Math.min(3, remainingCards));

              return [...Array(visibleStackCards)].map((_, i) => {
                const cardIndex = displayedIndex + i + 2;
                if (cardIndex >= questions.length) return null;

                // Each card is offset further back and down
                const offsetY = (i + 2) * 6; // Stack offset: 12px, 18px, 24px
                const offsetX = (i + 2) * 4; // Side offset: 8px, 12px, 16px

                return (
                  <Animated.View
                    key={`stack-card-${cardIndex}`}
                    style={[
                      styles.stackedCardLayer,
                      {
                        transform: [
                          { translateY: offsetY },
                          { scale: 1 - (i + 2) * 0.02 }, // Slightly smaller: 0.96, 0.94, 0.92
                        ],
                        marginHorizontal: offsetX,
                        zIndex: 8 - i,
                      },
                    ]}
                  >
                    {/* Empty card placeholder showing just the edge - solid white */}
                    <View style={styles.cardPlaceholder} />
                  </Animated.View>
                );
              });
            })()}

            {/* Blank next card (behind current, slides up during transition) */}
            <Animated.View
              style={[styles.nextCardContainer, blankCardStyle]}
            >
              <View style={styles.blankCard} />
            </Animated.View>

            {/* Active card (current question) - fades out when answered */}
            <Animated.View
              key={`question-card-${displayedIndex}`}
              style={[styles.activeCardContainer, activeCardStyle]}
            >
              <QuestionCard
                question={questions[displayedIndex]}
                isActive={true}
                onAnswer={onAnswer}
                currentPageAnswers={currentPageAnswers}
                responses={responses}
                showContent={showContent}
                onSkipAndProceed={handleSkipAndProceed}
                navigationButtons={
                  <NavigationButtons
                    onBack={onBack}
                    onNext={handleNext}
                    nextEnabled={(() => {
                      if (isAnimating) return false; // Disable during animation
                      const question = questions?.[displayedIndex];
                      if (!question) return false;
                      if (question.type === 'number') {
                        return currentPageAnswers[question.key] !== undefined || question.optional;
                      } else {
                        return currentPageAnswers[question.key] !== undefined;
                      }
                    })()}
                  />
                }
                sport={sport}
              />
            </Animated.View>
          </View>
        ) : (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>
              {questions.length === 0 ? 'Loading questions...' : 'Preparing assessment...'}
            </Text>
          </View>
        )}
      </View>
    </>
  );
};
