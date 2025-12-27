import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import OptionButton from './OptionButton';
import NumberInput from './NumberInput';
import { toast } from 'sonner-native';
import {
  scaleFontSize,
  moderateScale,
  getResponsivePadding,
  createShadow,
  isSmallDevice,
} from '../screens/skill-assessment/utils/responsive';

const isSmall = isSmallDevice();

interface QuestionContainerProps {
  question: string;
  helpText?: string;
  contextText?: string;
  tooltipText?: string;
  children: React.ReactNode;
  containerStyle?: ViewStyle;
  navigationButtons?: React.ReactNode;
  questionKey?: string;
  showContent?: boolean; // Control content visibility for entrance animations
}

// Question context mapping
const getQuestionContext = (questionKey?: string) => {
  if (!questionKey) return null;
  
  const pickleballContextMap: { [key: string]: { text: string; tooltip?: string } } = {
    has_dupr: { 
      text: "We will take into account of your existing DUPR (if any) in calculating a provisional DMR for you.",
      tooltip: "DUPR is the official rating system used in competitive pickleball"
    },
    dupr_singles: { 
      text: "Your official singles rating for accurate assessment",
      tooltip: "DUPR ratings typically range from 2.0 (beginner) to 8.0+ (professional)"
    },
    dupr_doubles: { 
      text: "Your official doubles rating for accurate assessment",
      tooltip: "Doubles ratings may differ from singles due to partner play dynamics"
    },
    dupr_reliability_games: { 
      text: "More games means a more reliable rating",
      tooltip: "DUPR becomes more accurate with 15+ rated games"
    },
    dupr_recent_activity: { 
      text: "Recent play ensures current skill level",
      tooltip: "Skills can change over time, recent games reflect current ability"
    },
    dupr_competition_level: { 
      text: "Competition level affects rating accuracy",
      tooltip: "Tournament games typically provide more accurate ratings"
    },
    experience: { 
      text: "Experience level helps gauge your development",
      tooltip: "Playing time correlates with skill development patterns"
    },
    sports_background: { 
      text: "Other sports experience translates to pickleball",
      tooltip: "Tennis, badminton, and paddle sports provide transferable skills"
    },
    frequency: { 
      text: "How often you play affects skill development",
      tooltip: "Regular play accelerates improvement and maintains consistency"
    },
    competitive_level: { 
      text: "Your typical competition level",
      tooltip: "The skill level of your regular opponents indicates your own level"
    },
    skills: { 
      text: "Technical skills assessment",
      tooltip: "Different aspects of your game may be at different skill levels"
    },
    self_rating: { 
      text: "Your honest self-assessment",
      tooltip: "Self-perception helps validate our calculated rating"
    },
    tournament: { 
      text: "Tournament experience indicates skill level",
      tooltip: "Competitive play demonstrates ability under pressure"
    },
    consistency_check_1: { 
      text: "Overall ability check",
      tooltip: "Helps us verify the consistency of your responses"
    },
    consistency_check_2: { 
      text: "Competition level verification",
      tooltip: "Cross-validates your skill level assessment"
    },
    coaching_background: {
      text: "Formal instruction background",
      tooltip: "Coaching experience often indicates higher skill levels"
    }
  };
  
  return pickleballContextMap[questionKey];
};

const QuestionContainer: React.FC<QuestionContainerProps> = ({
  question,
  helpText,
  contextText,
  tooltipText,
  children,
  containerStyle,
  navigationButtons,
  questionKey,
  showContent = true,
}) => {
  const showTooltip = () => {
    if (tooltipText) {
      Alert.alert('Info', tooltipText);
    }
  };

  // Use provided contextText or fall back to questionKey lookup
  const effectiveContextText = contextText || getQuestionContext(questionKey)?.text;
  const effectiveTooltipText = tooltipText || getQuestionContext(questionKey)?.tooltip;

  return (
    <View style={[styles.container, containerStyle]}>
      {showContent ? (
        <>
          <ScrollView
            key={`scroll-${questionKey}-${showContent}`} // Force remount for animations
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <Animated.View entering={FadeIn.duration(300).delay(100)}>
              <Text style={styles.instructionText}>Select an answer</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(400).delay(150)}>
              <Text style={styles.questionText}>{question}</Text>
            </Animated.View>

            {effectiveContextText && (
              <Animated.View entering={FadeIn.duration(300).delay(250)}>
                <Text style={styles.contextText}>{effectiveContextText}</Text>
              </Animated.View>
            )}

            <Animated.View
              entering={FadeInDown.duration(400).delay(300)}
              style={styles.contentContainer}
            >
              {children}
            </Animated.View>
          </ScrollView>

          {navigationButtons && (
            <Animated.View
              entering={FadeIn.duration(200).delay(350)}
              style={styles.navigationContainer}
            >
              {navigationButtons}
            </Animated.View>
          )}
        </>
      ) : (
        // Blank card - no content or buttons visible during transition
        <View style={styles.blankCardContent} />
      )}
    </View>
  );
};

// Reusable QuestionCard component for stacked UI
interface QuestionCardProps {
  question: any;
  isActive: boolean;
  onAnswer: (questionKey: string, answer: string | number | { [key: string]: string }) => void;
  currentPageAnswers: {[key: string]: any};
  responses: any;
  navigationButtons: React.ReactNode;
  sport?: 'pickleball' | 'tennis' | 'padel';
  showContent?: boolean; // Control content visibility for entrance animations
  onSkipAndProceed?: () => void; // Called after skip to navigate to next question
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  isActive,
  onAnswer,
  currentPageAnswers,
  responses,
  navigationButtons,
  sport = 'pickleball',
  showContent = true,
  onSkipAndProceed,
}) => {
  const renderQuestionContent = () => {
    switch (question.type) {
      case 'single_choice':
        return (
          <QuestionContainer
            key={question.key} // Force re-mount for fade-in animation
            question={question.question}
            helpText={question.help_text}
            questionKey={question.key}
            navigationButtons={navigationButtons}
            showContent={showContent}
          >
            {question.options?.map((option: string, index: number) => (
              <OptionButton
                key={index}
                title={option}
                isSelected={currentPageAnswers[question.key] === option || responses[question.key] === option}
                onPress={() => onAnswer(question.key, option)}
                sport={sport}
              />
            ))}
          </QuestionContainer>
        );
      
      case 'number':
        return (
          <QuestionContainer
            key={question.key} // Force re-mount for fade-in animation
            question={question.question}
            helpText={question.help_text}
            questionKey={question.key}
            navigationButtons={navigationButtons}
            showContent={showContent}
          >
            <NumberInput
              value={currentPageAnswers[question.key] ? String(currentPageAnswers[question.key]) : ''}
              onChangeText={(text) => {
                const numValue = parseFloat(text);
                if (!isNaN(numValue) &&
                    (!question.min_value || numValue >= question.min_value) &&
                    (!question.max_value || numValue <= question.max_value)) {
                  onAnswer(question.key, numValue);
                }
              }}
              onSubmit={() => {
                const text = currentPageAnswers[question.key] ? String(currentPageAnswers[question.key]) : '';
                const numValue = parseFloat(text);
                if (!isNaN(numValue) &&
                    (!question.min_value || numValue >= question.min_value) &&
                    (!question.max_value || numValue <= question.max_value)) {
                  onAnswer(question.key, numValue);
                } else {
                  toast.error('Invalid Input', {
                    description: `Please enter a valid number ${question.min_value ? `between ${question.min_value} and ${question.max_value}` : ''}`,
                  });
                }
              }}
              onSkipAndProceed={question.optional ? onSkipAndProceed : undefined}
              minValue={question.min_value}
              maxValue={question.max_value}
              allowSkip={question.optional}
            />
          </QuestionContainer>
        );
      
      default:
        return null;
    }
  };

  return (
    <View style={styles.questionCardContainer}>
      {renderQuestionContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  // Question Card Container - Must fill absolute parent
  questionCardContainer: {
    flex: 1, // Fill the absolute positioned parent
  },

  // FULLY RESPONSIVE QUESTION CONTAINER
  container: {
    flex: 1, // Take full available height for consistent card size
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(isSmall ? 24 : 30),
    padding: 0,
    ...createShadow('#000', 0.1, 8, 5),
  },
  scrollContainer: {
    flexGrow: 1, // Allow scroll to grow but not enforce full height
    paddingHorizontal: getResponsivePadding(isSmall ? 24 : 28),
    paddingTop: moderateScale(isSmall ? 24 : 28),
  },
  scrollContent: {
    paddingBottom: moderateScale(20),
  },
  instructionText: {
    fontSize: scaleFontSize(isSmall ? 12 : 13),
    color: '#8C8C8C',
    marginBottom: moderateScale(isSmall ? 12 : 16),
    fontFamily: 'Roboto',
    textAlign: 'left',
  },
  questionText: {
    fontSize: scaleFontSize(isSmall ? 18 : 20),
    fontWeight: '600',
    color: '#000000',
    marginBottom: moderateScale(isSmall ? 20 : 24),
    fontFamily: 'Roboto',
    lineHeight: scaleFontSize(isSmall ? 24 : 28),
    textAlign: 'left',
  },
  contextText: {
    fontSize: scaleFontSize(isSmall ? 14 : 15),
    color: '#6C7278',
    marginBottom: moderateScale(isSmall ? 16 : 20),
    fontFamily: 'Roboto',
    lineHeight: scaleFontSize(isSmall ? 20 : 22),
    textAlign: 'left',
    fontStyle: 'italic',
  },
  contentContainer: {
    gap: moderateScale(isSmall ? 12 : 16),
    marginBottom: moderateScale(isSmall ? 16 : 20),
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: getResponsivePadding(isSmall ? 28 : 36),
    paddingVertical: moderateScale(isSmall ? 16 : 20),
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: moderateScale(isSmall ? 24 : 30),
    borderBottomRightRadius: moderateScale(isSmall ? 24 : 30),
  },
  blankCardContent: {
    flex: 1, // Fill space with nothing (truly blank)
  },
});

export default QuestionContainer;