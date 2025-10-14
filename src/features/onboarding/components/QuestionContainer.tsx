import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Alert,
  ScrollView,
} from 'react-native';
import OptionButton from './OptionButton';
import NumberInput from './NumberInput';
import { toast } from 'sonner-native';

interface QuestionContainerProps {
  question: string;
  helpText?: string;
  contextText?: string;
  tooltipText?: string;
  children: React.ReactNode;
  containerStyle?: ViewStyle;
  navigationButtons?: React.ReactNode;
  questionKey?: string;
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
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Text style={styles.instructionText}>Select an answer</Text>
        <Text style={styles.questionText}>{question}</Text>
        
        {effectiveContextText && (
          <Text style={styles.contextText}>{effectiveContextText}</Text>
        )}
        
        <View style={styles.contentContainer}>
          {children}
        </View>
      </ScrollView>
      
      {navigationButtons && (
        <View style={styles.navigationContainer}>
          {navigationButtons}
        </View>
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
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  isActive,
  onAnswer,
  currentPageAnswers,
  responses,
  navigationButtons,
  sport = 'pickleball',
}) => {
  const renderQuestionContent = () => {
    switch (question.type) {
      case 'single_choice':
        return (
          <QuestionContainer
            question={question.question}
            helpText={question.help_text}
            questionKey={question.key}
            navigationButtons={navigationButtons}
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
            question={question.question}
            helpText={question.help_text}
            questionKey={question.key}
            navigationButtons={navigationButtons}
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
              onSkip={question.optional ? () => onAnswer(question.key, '') : undefined}
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
    <View style={[styles.stackedCard, isActive ? styles.activeCard : styles.inactiveCard]}>
      {renderQuestionContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 0,
    marginHorizontal: 12,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    minHeight: 600,
    maxHeight: '85%',
    maxWidth: '100%',
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 36,
    paddingTop: 36,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  instructionText: {
    fontSize: 14,
    color: '#8C8C8C',
    marginBottom: 16,
    fontFamily: 'Roboto',
    textAlign: 'left',
  },
  questionText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 24,
    fontFamily: 'Roboto',
    lineHeight: 28,
    textAlign: 'left',
  },
  contextText: {
    fontSize: 16,
    color: '#6C7278',
    marginBottom: 20,
    fontFamily: 'Roboto',
    lineHeight: 22,
    textAlign: 'left',
    fontStyle: 'italic',
  },
  contentContainer: {
    gap: 16,
    marginBottom: 20,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 36,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  // Stacked card styles
  stackedCard: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  activeCard: {
    zIndex: 2,
    opacity: 1,
  },
  inactiveCard: {
    zIndex: 1,
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
});

export default QuestionContainer;