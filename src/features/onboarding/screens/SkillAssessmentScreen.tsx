import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Modal,
  FlatList,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useOnboarding } from '../OnboardingContext';
import { Svg, Path, G } from 'react-native-svg';
import { PickleballQuestionnaire, Question, QuestionnaireResponse, SkillQuestions } from '../services/PickleballQuestionnaire';
import { TennisQuestionnaire, TennisQuestion, TennisQuestionnaireResponse, TennisSkillQuestions } from '../services/TennisQuestionnaire';
import { PadelQuestionnaire, PadelQuestion, PadelQuestionnaireResponse, PadelSkillQuestions } from '../services/PadelQuestionnaire';
import { OptionButton, NumberInput, QuestionContainer, BackgroundGradient } from '../components';
import { QuestionCard } from '../components/QuestionContainer';
import { LoadingSpinner } from '@/shared/components/ui';
import { useSession } from '@/lib/auth-client';
import type { SportType } from '../types';
import { toast } from 'sonner-native';
import TennisIconSvg from '@/assets/images/tennis-icon.svg';
import PadelIconSvg from '@/assets/images/padel-icon.svg';

const ChevronDown = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path
      d="M7 10L12 15L17 10"
      stroke="#6C7278"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Sport Icons with faded yellow-orange color
const PickleballIcon = () => (
  <Svg width="70" height="70" viewBox="0 0 64 64" fill="none">
    <G>
      <G fill="#F8F3FF">
        <Path d="M6.519 33.26a1.5 1.5 0 0 1-1.461-1.166C.346 11.497 12.714 4.013 13.243 3.704a1.5 1.5 0 0 1 1.516 2.59c-.477.284-10.97 6.8-6.778 25.131A1.5 1.5 0 0 1 6.52 33.26zM17 15.5a1.5 1.5 0 0 1-1.5-1.5c-.001-6.771 5.493-10.146 5.728-10.286a1.5 1.5 0 0 1 1.548 2.57C22.6 6.391 18.5 8.96 18.5 14a1.5 1.5 0 0 1-1.5 1.5z" fill="#F8F3FF" opacity="1"/>
        <Path d="M13.17 26.61a1.5 1.5 0 0 1-1.326-.799c-2.444-4.62-.942-9.194-.876-9.387a1.499 1.499 0 1 1 2.842.962c-.01.029-1.14 3.572.686 7.023a1.5 1.5 0 0 1-1.325 2.201zM28.52 19.21c-.263 0-.529-.07-.771-.214-4.985-2.988-4.674-7.66-2.893-10.754a1.5 1.5 0 0 1 2.6 1.497c-.719 1.248-1.978 4.398 1.836 6.684a1.5 1.5 0 0 1-.772 2.786zM22.768 43.452a1.5 1.5 0 0 1-.197-2.987l3.584-.478a1.5 1.5 0 1 1 .396 2.974l-3.583.478a1.543 1.543 0 0 1-.2.013zM27.482 36.565c-.272 0-.546-.074-.794-.228l-2.996-1.873a1.499 1.499 0 1 1 1.59-2.544l2.996 1.873a1.499 1.499 0 0 1-.796 2.772zM32.259 32.245a1.5 1.5 0 0 1-1.38-.91l-1.15-2.688a1.5 1.5 0 1 1 2.758-1.18l1.15 2.688a1.5 1.5 0 0 1-1.378 2.09z" fill="#F8F3FF" opacity="1"/>
        <Path d="M22.549 54.498c-1.171 0-2.35-.302-3.414-.922-6.609-3.826-10.872-8.09-14.713-14.714-1.536-2.66-1.11-6.016 1.037-8.163l13.29-13.29a6.837 6.837 0 0 1 6.047-1.895l10.48 1.89a1.5 1.5 0 0 1-.533 2.952l-10.48-1.89a3.843 3.843 0 0 0-3.393 1.065L7.58 32.82c-1.187 1.187-1.419 3.054-.561 4.539 3.601 6.212 7.42 10.032 13.622 13.621 1.48.862 3.35.63 4.551-.565l7.456-7.466a1.5 1.5 0 1 1 2.123 2.12l-7.46 7.47a6.75 6.75 0 0 1-4.762 1.958zM40.202 30.5a1.5 1.5 0 0 1-1.474-1.234l-1.084-6.01a1.501 1.501 0 0 1 2.953-.532l1.084 6.01a1.501 1.501 0 0 1-1.479 1.766z" fill="#F8F3FF" opacity="1"/>
        <Path d="M39.116 24.493c-.384 0-.767-.146-1.06-.44l-4.109-4.108a1.5 1.5 0 0 1 0-2.12l11.069-11.07.643-1.715a2.37 2.37 0 0 1 3.897-.844l4.249 4.248c.572.573.812 1.387.641 2.179a2.364 2.364 0 0 1-1.484 1.718l-1.716.644-11.07 11.069c-.292.293-.676.44-1.06.44zm-1.987-5.608 1.987 1.987 10.238-10.238c.152-.152.333-.269.535-.344l1.105-.415-2.868-2.869-.415 1.106a1.5 1.5 0 0 1-.344.534zm9.178-11.3h.01zm2.16-1.492z" fill="#F8F3FF" opacity="1"/>
        <Path d="M43.626 19.984c-.384 0-.768-.146-1.06-.44l-4.11-4.11a1.5 1.5 0 1 1 2.12-2.12l4.11 4.11a1.5 1.5 0 0 1-1.06 2.56zM48.026 15.585c-.383 0-.767-.147-1.06-.44l-4.11-4.11a1.5 1.5 0 1 1 2.12-2.121l4.11 4.11a1.5 1.5 0 0 1-1.06 2.561z" fill="#F8F3FF" opacity="1"/>
      </G>
      <Path fill="#C89AFF" d="M46.255 32.01c-7.855 0-14.244 6.39-14.244 14.245S38.4 60.5 46.255 60.5 60.5 54.11 60.5 46.255s-6.39-14.244-14.245-14.244zm-5.409 17.054a2 2 0 1 1-3.912-.831 2 2 0 0 1 3.912.831zm1.066-7.085a2 2 0 1 1-.418-3.978 2 2 0 0 1 .418 3.978zm6.075 13.02a2 2 0 1 1-3.464-2 2 2 0 0 1 3.464 2zm0-7.744a2 2 0 1 1-3.464-2 2 2 0 0 1 3.464 2zm.993-6.452a2 2 0 1 1 3.654-1.627 2 2 0 0 1-3.654 1.627zm5.979 9.332a2 2 0 1 1-2.677-2.973 2 2 0 0 1 2.677 2.973z" opacity="1"/>
    </G>
  </Svg>
);

const TennisIcon = () => <TennisIconSvg width={70} height={70} />;

const PadelIcon = () => <PadelIconSvg width={70} height={70} />;

// Simple Question Card Component for dropdown
interface SimpleQuestionCardProps {
  question: string;
  selectedOption: string | null;
  dropdownRef: React.RefObject<View | null>;
  onPress: () => void;
  isActive: boolean;
}

const SimpleQuestionCard: React.FC<SimpleQuestionCardProps> = ({
  question,
  selectedOption,
  dropdownRef,
  onPress,
  isActive,
}) => {
  return (
    <View style={[styles.stackedCard, isActive ? styles.activeCard : styles.inactiveCard]}>
      <QuestionContainer question={question}>
        <TouchableOpacity
          ref={dropdownRef}
          style={styles.dropdown}
          onPress={onPress}
        >
          <Text style={[
            styles.dropdownText,
            selectedOption && styles.dropdownTextSelected
          ]}>
            {selectedOption || 'Select an option'}
          </Text>
          <ChevronDown />
        </TouchableOpacity>
      </QuestionContainer>
    </View>
  );
};

const SkillAssessmentScreen = () => {
  const { sport, sportIndex, fromDashboard } = useLocalSearchParams();
  const { data, updateData } = useOnboarding();
  const session = useSession(); // Get session at component level
  const currentSportIndex = parseInt(sportIndex as string) || 0;
  const selectedSports = data.selectedSports || [];
  
  // For non-pickleball sports, keep the simple dropdown
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0, width: 0 });
  const dropdownRef = useRef<View>(null);
  
  // For comprehensive questionnaires (pickleball, tennis, and padel)
  const [pickleballQuestionnaire] = useState(() => new PickleballQuestionnaire());
  const [tennisQuestionnaire] = useState(() => new TennisQuestionnaire());
  const [padelQuestionnaire] = useState(() => new PadelQuestionnaire());
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<QuestionnaireResponse | TennisQuestionnaireResponse | PadelQuestionnaireResponse>({});
  const [questions, setQuestions] = useState<Question[] | TennisQuestion[] | PadelQuestion[]>([]);
  const [isComprehensiveQuestionnaire, setIsComprehensiveQuestionnaire] = useState(false);
  const [currentQuestionnaireType, setCurrentQuestionnaireType] = useState<'pickleball' | 'tennis' | 'padel' | null>(null);
  const [textInput, setTextInput] = useState('');
  const [skillResponses, setSkillResponses] = useState<SkillQuestions | TennisSkillQuestions | PadelSkillQuestions>({});
  const [showIntroduction, setShowIntroduction] = useState(false);
  const [forceShowQuestionnaire, setForceShowQuestionnaire] = useState(false);
  const [isSubmittingAssessment, setIsSubmittingAssessment] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Processing...');
  const [currentPageAnswers, setCurrentPageAnswers] = useState<{[key: string]: any}>({});
  const [questionHistory, setQuestionHistory] = useState<Array<{questions: Question[] | TennisQuestion[] | PadelQuestion[], responses: any}>>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [expandedSkillQuestions, setExpandedSkillQuestions] = useState<Question[] | TennisQuestion[] | PadelQuestion[]>([]);
  const [isInSkillMatrix, setIsInSkillMatrix] = useState(false);
  const [currentSkillIndex, setCurrentSkillIndex] = useState(0);

  // Update navigation state for simple dropdown
  useEffect(() => {
    if (!isComprehensiveQuestionnaire) {
      // Navigation is always available for simple dropdown
    }
  }, [selectedOption, isComprehensiveQuestionnaire]);
  
  // Reset navigation when question changes
  useEffect(() => {
    if (isComprehensiveQuestionnaire) {
      // Navigation is handled within question cards
      setCurrentPageAnswers({});
    }
  }, [currentQuestionIndex, questions]);

  // Expand skill matrix questions into individual questions
  const expandSkillMatrixQuestions = (questions: Question[] | TennisQuestion[] | PadelQuestion[]) => {
    const expandedQuestions: any[] = [];
    
    questions.forEach(question => {
      if (question.type === 'skill_matrix' && question.sub_questions) {
        // Create individual questions for each skill
        Object.entries(question.sub_questions).forEach(([skillKey, skillData]) => {
          const skill = skillData as { question: string; options: string[]; tooltip?: string };
          expandedQuestions.push({
            key: `${question.key}_${skillKey}`,
            question: skill.question,
            type: 'single_choice' as const,
            options: skill.options,
            help_text: skill.tooltip,
            // Store the original question key for response mapping
            originalKey: question.key,
            skillKey: skillKey,
          });
        });
      } else {
        expandedQuestions.push(question);
      }
    });
    
    return expandedQuestions;
  };
  
  // Initialize question history when questionnaire starts
  useEffect(() => {
    if (isComprehensiveQuestionnaire && questions.length > 0 && questionHistory.length === 0) {
      setQuestionHistory([{
        questions: [...questions],
        responses: { ...responses }
      }]);
      setCurrentPageIndex(0);
      console.log('📖 Initialized question history with first page');
    }
  }, [isComprehensiveQuestionnaire, questions, questionHistory.length, responses]);

  // Initialize questionnaire based on sport
  useEffect(() => {
    if (sport === 'pickleball' || sport === 'tennis' || sport === 'padel') {
      setIsComprehensiveQuestionnaire(true);
      setCurrentQuestionnaireType(sport as 'pickleball' | 'tennis' | 'padel');
      setShowIntroduction(true);
      setForceShowQuestionnaire(false);
      
      const questionnaire = sport === 'pickleball' ? pickleballQuestionnaire : 
                           sport === 'tennis' ? tennisQuestionnaire : padelQuestionnaire;
      
      // Check if there's already a completed assessment
      const existingSkillData = data.skillAssessments?.[sport as SportType];
      if (existingSkillData && typeof existingSkillData === 'string') {
        // Check if it's the "answer_later" placeholder first
        if (existingSkillData === 'answer_later') {
          console.log('User previously chose to answer later, starting fresh assessment');
          setResponses({});
          setSkillResponses({});
          setCurrentQuestionIndex(0);
          setShowIntroduction(true);
          return;
        }
        
        try {
          const skillDataObject = JSON.parse(existingSkillData);
          // There's a complete assessment already, use its data
          const existingResponses = skillDataObject.responses || {};
          setResponses(existingResponses);
            
          // If assessment is complete, show introduction for retake
          if (skillDataObject.rating) {
            setResponses({});
            setSkillResponses({});
            setCurrentQuestionIndex(0);
            const initialQuestions = questionnaire.getConditionalQuestions({});
            const expandedQuestions = expandSkillMatrixQuestions(initialQuestions);
            setQuestions(expandedQuestions);
          } else {
            // Continue incomplete assessment
            const nextQuestions = questionnaire.getConditionalQuestions(existingResponses);
            const expandedQuestions = expandSkillMatrixQuestions(nextQuestions);
            setQuestions(expandedQuestions);
            setCurrentQuestionIndex(0);
          }
        } catch (error) {
          console.error('Failed to parse existing skill data:', error);
          // Start fresh if data is corrupted
          setResponses({});
          setSkillResponses({});
          setCurrentQuestionIndex(0);
          const initialQuestions = questionnaire.getConditionalQuestions({});
          const expandedQuestions = expandSkillMatrixQuestions(initialQuestions);
          setQuestions(expandedQuestions);
        }
      } else {
        // No existing data, start fresh
        setResponses({});
        setSkillResponses({});
        setCurrentQuestionIndex(0);
        const initialQuestions = questionnaire.getConditionalQuestions({});
        const expandedQuestions = expandSkillMatrixQuestions(initialQuestions);
        setQuestions(expandedQuestions);
      }
    } else {
      setIsComprehensiveQuestionnaire(false);
      setCurrentQuestionnaireType(null);
      // Load saved skill level for other sports
      if (data.skillAssessments && data.skillAssessments[sport as SportType]) {
        const skillData = data.skillAssessments[sport as SportType];
        if (skillData && typeof skillData === 'string' && skillData !== 'answer_later') {
          // Handle simple string skill levels
          setSelectedOption(skillData);
        } else {
          setSelectedOption(null);
        }
      } else {
        setSelectedOption(null);
      }
    }
  }, [sport, data.skillAssessments]);

  const skillOptions = [
    'Never played before',
    'Less than 1 month',
    '1-3 months',
    '3-6 months',
    '6-12 months',
    '1-2 years',
    '2-5 years',
    'More than 5 years',
  ];

  const handleConfirm = () => {
    if (isComprehensiveQuestionnaire) {
      // For comprehensive questionnaires, this shouldn't be called since we use the questionnaire flow
      return;
    }
    
    if (selectedOption) {
      // Update skill level for current sport (non-pickleball)
      const updatedSkillLevels = {
        ...data.skillAssessments,
        [sport as SportType]: selectedOption
      };
      updateData({ skillAssessments: updatedSkillLevels });
      proceedToNext();
    }
  };

  const measureDropdownPosition = () => {
    if (dropdownRef.current) {
      dropdownRef.current.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
        setDropdownPosition({
          x: pageX,
          y: pageY + height - 8,
          width: width
        });
      });
    }
  };

  const getSportTitle = () => {
    return typeof sport === 'string' ? sport.charAt(0).toUpperCase() + sport.slice(1) : '';
  };

  const getSportIcon = () => {
    switch (sport) {
      case 'pickleball':
        return <PickleballIcon />;
      case 'tennis':
        return <TennisIcon />;
      case 'padel':
        return <PadelIcon />;
      default:
        return null;
    }
  };

  const openDropdown = () => {
    measureDropdownPosition();
    setDropdownOpen(true);
  };

  const selectOption = (option: string) => {
    setSelectedOption(option);
    setDropdownOpen(false);
  };

  // Comprehensive questionnaire handlers
  const handleQuestionnaireResponse = (questionKey: string, answer: string | number | { [key: string]: string }) => {
    console.log('🎯 Question answered:', questionKey, answer);
    // Update current page answers instead of proceeding immediately
    const newPageAnswers = { ...currentPageAnswers, [questionKey]: answer };
    setCurrentPageAnswers(newPageAnswers);
    console.log('📝 Current page answers:', newPageAnswers);
    
    // For individual skill questions, we don't need special handling since they're now single_choice
    console.log('✅ Question answered - showing navigation');
  };

  const completePickleballAssessment = async (finalResponses: QuestionnaireResponse) => {
    setLoadingMessage('Calculating your Pickleball rating...');
    setIsSubmittingAssessment(true);
    try {
      // Calculate rating using existing logic (for immediate UI feedback)
      const ratingResult = pickleballQuestionnaire.calculateInitialRating(finalResponses);
      
      // Store the complete responses and rating in context (for UI compatibility)
      const skillData = {
        responses: finalResponses,
        rating: ratingResult,
        feedback: pickleballQuestionnaire.generateFeedback(ratingResult)
      };
      
      const updatedSkillLevels = {
        ...data.skillAssessments,
        [sport as SportType]: JSON.stringify(skillData)
      };
      await updateData({ skillAssessments: updatedSkillLevels });

      // Save to backend
      try {
        await saveToBackend('pickleball', finalResponses);
      } catch (backendError) {
        console.warn('Failed to save to backend, but proceeding with local data:', backendError);
      }
      
      // Navigate directly to results without delay
      setIsSubmittingAssessment(false);
      router.replace(`/onboarding/assessment-results?sport=${sport}&sportIndex=${currentSportIndex}${fromDashboard ? '&fromDashboard=true' : ''}`);
    } catch (error) {
      console.error('Error in completePickleballAssessment:', error);
      setIsSubmittingAssessment(false);
      toast.error('Error', {
        description: 'There was an issue calculating your rating. Using default assessment.',
      });
      proceedToNext();
    }
  };

  const completeTennisAssessment = async (finalResponses: TennisQuestionnaireResponse) => {
    setLoadingMessage('Calculating your Tennis rating...');
    setIsSubmittingAssessment(true);
    try {
      // Calculate rating using existing logic
      const ratingResult = tennisQuestionnaire.calculateInitialRating(finalResponses);
      
      const skillData = {
        responses: finalResponses,
        rating: ratingResult,
        feedback: tennisQuestionnaire.generateFeedback(ratingResult)
      };
      
      const updatedSkillLevels = {
        ...data.skillAssessments,
        [sport as SportType]: JSON.stringify(skillData)
      };
      await updateData({ skillAssessments: updatedSkillLevels });

      // Save to backend
      try {
        await saveToBackend('tennis', finalResponses);
      } catch (backendError) {
        console.warn('Failed to save to backend, but proceeding with local data:', backendError);
      }
      
      // Navigate directly to results without delay
      setIsSubmittingAssessment(false);
      router.replace(`/onboarding/assessment-results?sport=${sport}&sportIndex=${currentSportIndex}${fromDashboard ? '&fromDashboard=true' : ''}`);
    } catch (error) {
      console.error('Error in completeTennisAssessment:', error);
      setIsSubmittingAssessment(false);
      toast.error('Error', {
        description: 'There was an issue calculating your rating. Using default assessment.',
      });
      proceedToNext();
    }
  };

  const completePadelAssessment = async (finalResponses: PadelQuestionnaireResponse) => {
    setLoadingMessage('Calculating your Padel rating...');
    setIsSubmittingAssessment(true);
    try {
      // Calculate rating using existing logic
      const ratingResult = padelQuestionnaire.calculateInitialRating(finalResponses);
      
      const skillData = {
        responses: finalResponses,
        rating: ratingResult,
        feedback: padelQuestionnaire.generateFeedback(ratingResult)
      };
      
      const updatedSkillLevels = {
        ...data.skillAssessments,
        [sport as SportType]: JSON.stringify(skillData)
      };
      await updateData({ skillAssessments: updatedSkillLevels });

      // Save to backend
      try {
        await saveToBackend('padel', finalResponses);
      } catch (backendError) {
        console.warn('Failed to save to backend, but proceeding with local data:', backendError);
      }
      
      // Navigate directly to results without delay
      setIsSubmittingAssessment(false);
      router.replace(`/onboarding/assessment-results?sport=${sport}&sportIndex=${currentSportIndex}${fromDashboard ? '&fromDashboard=true' : ''}`);
    } catch (error) {
      console.error('Error in completePadelAssessment:', error);
      setIsSubmittingAssessment(false);
      toast.error('Error', {
        description: 'There was an issue calculating your rating. Using default assessment.',
      });
      proceedToNext();
    }
  };

  // Helper function to save responses to backend
  const saveToBackend = async (sportName: string, responses: any) => {
    try {
      if (!session.data?.user?.id) {
        throw new Error('User not authenticated');
      }
      
      const { questionnaireAdapter } = await import('../services/adapter');
      await questionnaireAdapter.saveQuestionnaireResponse(sportName, responses, session.data.user.id);
      console.log(`Successfully saved ${sportName} responses to backend`);
    } catch (error) {
      console.error(`Failed to save ${sportName} responses to backend:`, error);
      throw error;
    }
  };


  const proceedToNext = () => {
    // Check if there are more sports to assess
    if (currentSportIndex < selectedSports.length - 1) {
      // Navigate to skill assessment for next sport
      const nextSport = selectedSports[currentSportIndex + 1];
      router.push(`/onboarding/skill-assessment?sport=${nextSport}&sportIndex=${currentSportIndex + 1}`);
    } else {
      // All sports assessed, go to profile picture
      router.push('/onboarding/profile-picture');
    }
  };

  const handleBack = () => {
    if (isComprehensiveQuestionnaire) {
      // Go back to previous question page within the questionnaire
      if (currentPageIndex > 0) {
        const previousPage = questionHistory[currentPageIndex - 1];
        setQuestions(previousPage.questions);
        setResponses(previousPage.responses);
        setCurrentPageIndex(currentPageIndex - 1);
        setCurrentPageAnswers({});
        // Navigation is handled within question cards
        setSkillResponses({});
        setTextInput('');
        console.log('📖 Going back to previous question page:', currentPageIndex - 1);
      } else {
        // At first question page, go back to previous sport or game select
        if (currentSportIndex > 0) {
          const previousSport = selectedSports[currentSportIndex - 1];
          router.push(`/onboarding/skill-assessment?sport=${previousSport}&sportIndex=${currentSportIndex - 1}`);
        } else {
          router.push('/onboarding/game-select');
        }
      }
    } else {
      // For simple dropdown, go back to previous sport or game select
      if (currentSportIndex > 0) {
        const previousSport = selectedSports[currentSportIndex - 1];
        router.push(`/onboarding/skill-assessment?sport=${previousSport}&sportIndex=${currentSportIndex - 1}`);
      } else {
        router.push('/onboarding/game-select');
      }
    }
  };

  const proceedToNextQuestion = async () => {
    if (isComprehensiveQuestionnaire) {
      // Handle individual skill questions differently
      const currentQuestion = questions[currentQuestionIndex];
      let finalPageAnswers = { ...currentPageAnswers };
      
      // Check if this is a skill question (has originalKey and skillKey)
      if (currentQuestion && 'originalKey' in currentQuestion && 'skillKey' in currentQuestion) {
        const originalKey = (currentQuestion as any).originalKey;
        const skillKey = (currentQuestion as any).skillKey;
        
        // Initialize the skill responses object if it doesn't exist
        if (!responses[originalKey]) {
          (responses as any)[originalKey] = {};
        }
        
        // Add the skill response to the appropriate skill matrix
        (responses as any)[originalKey][skillKey] = currentPageAnswers[currentQuestion.key];
        
        // Move to next question
        if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
          setCurrentPageAnswers({});
          return;
        }
      }
      
      const newResponses = { ...responses, ...finalPageAnswers };
      setResponses(newResponses);
      
      // Get the appropriate questionnaire
      const questionnaire = currentQuestionnaireType === 'pickleball' ? pickleballQuestionnaire : 
                           currentQuestionnaireType === 'tennis' ? tennisQuestionnaire : padelQuestionnaire;
      
      // Get next questions based on updated responses
      const nextQuestions = questionnaire.getConditionalQuestions(newResponses);
      
      // Clear current page answers and navigation
      setCurrentPageAnswers({});
      setSkillResponses({});
      setTextInput('');
      
      // Check if questionnaire is complete
      if (nextQuestions.length === 0) {
        // Questionnaire complete, calculate rating
        console.log('🎯 Questionnaire complete, calculating rating...');
        if (currentQuestionnaireType === 'pickleball') {
          await completePickleballAssessment(newResponses as QuestionnaireResponse);
        } else if (currentQuestionnaireType === 'tennis') {
          await completeTennisAssessment(newResponses as TennisQuestionnaireResponse);
        } else {
          await completePadelAssessment(newResponses as PadelQuestionnaireResponse);
        }
        return;
      }
      
      // Update questions and reset to first question of new set
      const expandedQuestions = expandSkillMatrixQuestions(nextQuestions);
      setQuestions(expandedQuestions);
      setCurrentQuestionIndex(0);
      setCurrentPageIndex(currentPageIndex + 1);
      console.log('📖 Moving to next question set:', expandedQuestions.length, 'questions');
    } else {
      // For simple dropdown
      if (selectedOption) {
        setLoadingMessage('Saving your skill level...');
        setIsSubmittingAssessment(true);
        try {
          const updatedSkillLevels = {
            ...data.skillAssessments,
            [sport as SportType]: selectedOption
          };
          await updateData({ skillAssessments: updatedSkillLevels });

          // Save simple skill level to backend
          try {
            await saveToBackend(sport as string, { skill_level: selectedOption });
          } catch (backendError) {
            console.warn('Failed to save skill level to backend:', backendError);
          }

          setIsSubmittingAssessment(false);
          proceedToNext();
        } catch (error) {
          console.error('Error saving simple skill level:', error);
          setIsSubmittingAssessment(false);
          proceedToNext(); // Proceed anyway
        }
      }
    }
  };

  const handleNext = () => {
    // Direct navigation without animations
    proceedToNextQuestion();
  };

  const startFreshAssessment = () => {
    console.log('🔍 Starting fresh assessment...');
    
    try {
      // Reset all questionnaire state for a fresh start
      const emptyResponses = {};
      setResponses(emptyResponses);
      setSkillResponses({});
      setCurrentQuestionIndex(0);
      setTextInput('');
      
      console.log('✅ State reset complete');
      
      // Skip updating skill levels for now to avoid context issues
      console.log('⏭️ Skipping skill levels update');
      
      // Get the appropriate questionnaire
      const questionnaire = currentQuestionnaireType === 'pickleball' ? pickleballQuestionnaire : 
                           currentQuestionnaireType === 'tennis' ? tennisQuestionnaire : padelQuestionnaire;
      
      // Get questions from questionnaire service
      const initialQuestions = questionnaire.getConditionalQuestions(emptyResponses);
      console.log('📋 Questions from service:', initialQuestions.length, initialQuestions);
      
      if (initialQuestions.length > 0) {
        const expandedQuestions = expandSkillMatrixQuestions(initialQuestions);
        setQuestions(expandedQuestions);
        console.log('✅ Service questions set');
      } else {
        // Fallback question based on sport
        if (currentQuestionnaireType === 'pickleball') {
          const hasDoprQuestion = {
            key: 'has_dupr',
            question: 'Do you have a DUPR (Dynamic Universal Pickleball Rating)?',
            type: 'single_choice' as const,
            options: ['Yes', 'No', 'Not sure what DUPR is'],
            help_text: 'DUPR is the official rating system used in competitive pickleball',
          };
          const expandedQuestions = expandSkillMatrixQuestions([hasDoprQuestion]);
          setQuestions(expandedQuestions);
        } else if (currentQuestionnaireType === 'tennis') {
          const experienceQuestion = {
            key: 'experience',
            question: 'How long have you been playing tennis?',
            type: 'single_choice' as const,
            options: ['Less than 6 months', '6 months - 1 year', '1-2 years', '2-5 years', 'More than 5 years'],
            help_text: 'Include all tennis experience, whether casual or formal',
          };
          const expandedQuestions = expandSkillMatrixQuestions([experienceQuestion]);
          setQuestions(expandedQuestions);
        } else {
          const experienceQuestion = {
            key: 'experience',
            question: 'How long have you been playing padel?',
            type: 'single_choice' as const,
            options: ['Less than 3 months', '3-6 months', '6 months - 1 year', '1-2 years', 'More than 2 years'],
            help_text: 'Include all padel experience, whether casual or formal',
          };
          const expandedQuestions = expandSkillMatrixQuestions([experienceQuestion]);
          setQuestions(expandedQuestions);
        }
        console.log('✅ Fallback question set');
      }
      
      // Hide introduction and force questionnaire to show
      setShowIntroduction(false);
      setForceShowQuestionnaire(true);
      console.log('✅ Introduction hidden - should now show questionnaire');
      
    } catch (error) {
      console.error('❌ Error in startFreshAssessment:', error);
    }
  };

  const skipAssessmentForLater = async () => {
    setLoadingMessage('Saving preferences...');
    setIsSubmittingAssessment(true);
    try {
      // Set a placeholder value to indicate they'll answer later
      const updatedSkillLevels = {
        ...data.skillAssessments,
        [sport as SportType]: 'answer_later'
      };
      await updateData({ skillAssessments: updatedSkillLevels });
      
      // Show toast notification
      toast.success('Assessment Skipped', {
        description: 'You can complete your skill assessment later in your profile settings.',
      });
      
      setIsSubmittingAssessment(false);
      proceedToNext();
    } catch (error) {
      console.error('Error skipping assessment:', error);
      setIsSubmittingAssessment(false);
      proceedToNext(); // Proceed anyway
    }
  };

  const renderIntroduction = () => {
    const sportName = currentQuestionnaireType === 'pickleball' ? 'pickleball' : 
                     currentQuestionnaireType === 'tennis' ? 'tennis' : 'padel';
    const ratingSystem = currentQuestionnaireType === 'pickleball' ? 'DUPR rating integration for existing players' : 
                        currentQuestionnaireType === 'tennis' ? 'Standard tennis rating assessment' : 
                        'Padel-specific rating for doubles play';
    
    // Extract first name from full name
    const firstName = data.fullName ? data.fullName.split(' ')[0] : 'there';
    
    return (
      <>
        {/* Sport branding */}
        <View style={styles.sportBranding}>
          <View style={styles.sportIconContainer}>
            {currentQuestionnaireType === 'pickleball' ? <PickleballIcon /> : 
             currentQuestionnaireType === 'tennis' ? <TennisIcon /> : 
             <PadelIcon />}
          </View>
          <Text style={[
            styles.sportText,
            currentQuestionnaireType === 'tennis' && styles.tennisSportText,
            currentQuestionnaireType === 'padel' && styles.padelSportText
          ]}>
            {sportName}
          </Text>
        </View>
        
        {/* Introduction container */}
        <View style={styles.introductionContainer}>
          <View style={styles.whiteCard}>
            {/* Greeting at top-left of white card */}
            <View style={styles.greetingContainer}>
              <Text style={[
                styles.greetingText,
                currentQuestionnaireType === 'tennis' && styles.tennisGreetingText,
                currentQuestionnaireType === 'padel' && styles.padelGreetingText
              ]}>
                Hi, {firstName}
              </Text>
            </View>
            <Text style={styles.introTitle}>It&apos;s time to set your level.</Text>
            <View style={styles.introPoints}>
              <View style={styles.introPointContainer}>
                <View style={[
                  styles.arrowCircle,
                  currentQuestionnaireType === 'tennis' && styles.tennisArrowCircle,
                  currentQuestionnaireType === 'padel' && styles.padelArrowCircle
                ]}>
                  <Text style={[
                    styles.arrowText,
                    currentQuestionnaireType === 'tennis' && styles.tennisArrowText,
                    currentQuestionnaireType === 'padel' && styles.padelArrowText
                  ]}>→</Text>
                </View>
                <Text style={styles.introPoint}>5 mins or less</Text>
              </View>
              <View style={styles.introPointContainer}>
                <View style={[
                  styles.arrowCircle,
                  currentQuestionnaireType === 'tennis' && styles.tennisArrowCircle,
                  currentQuestionnaireType === 'padel' && styles.padelArrowCircle
                ]}>
                  <Text style={[
                    styles.arrowText,
                    currentQuestionnaireType === 'tennis' && styles.tennisArrowText,
                    currentQuestionnaireType === 'padel' && styles.padelArrowText
                  ]}>→</Text>
                </View>
                <Text style={styles.introPoint}>About your play style & experience</Text>
              </View>
              {currentQuestionnaireType !== 'tennis' && (
              <View style={styles.introPointContainer}>
                  <View style={[
                    styles.arrowCircle,
                    currentQuestionnaireType === 'padel' && styles.padelArrowCircle
                  ]}>
                    <Text style={[
                      styles.arrowText,
                      currentQuestionnaireType === 'padel' && styles.padelArrowText
                    ]}>→</Text>
                </View>
                  <Text style={styles.introPoint}>
                    Already have a DUPR rating? We&apos;ll sync it
                  </Text>
              </View>
              )}
              <View style={styles.introPointContainer}>
                <View style={[
                  styles.arrowCircle,
                  currentQuestionnaireType === 'tennis' && styles.tennisArrowCircle,
                  currentQuestionnaireType === 'padel' && styles.padelArrowCircle
                ]}>
                  <Text style={[
                    styles.arrowText,
                    currentQuestionnaireType === 'tennis' && styles.tennisArrowText,
                    currentQuestionnaireType === 'padel' && styles.padelArrowText
                  ]}>→</Text>
                </View>
                <Text style={styles.introPoint}>Not sure? Skip and come back later</Text>
              </View>
            </View>
            <Text style={styles.introDescription}>
              You&apos;ll start with a provisional DMR based on your experience and skill level to match you with the most balanced competition in the right division.
            </Text>
            <View style={styles.introButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.startButton,
                  currentQuestionnaireType === 'tennis' && styles.tennisStartButton,
                  currentQuestionnaireType === 'padel' && styles.padelStartButton
                ]}
                onPress={startFreshAssessment}
              >
                <Text style={styles.startButtonText}>Start Now</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.answerLaterButton,
                  currentQuestionnaireType === 'tennis' && styles.tennisAnswerLaterButton,
                  currentQuestionnaireType === 'padel' && styles.padelAnswerLaterButton
                ]}
                onPress={skipAssessmentForLater}
              >
                <Text style={[
                  styles.answerLaterButtonText,
                  currentQuestionnaireType === 'tennis' && styles.tennisAnswerLaterButtonText,
                  currentQuestionnaireType === 'padel' && styles.padelAnswerLaterButtonText
                ]}>Skip for now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </>
    );
  };


  // Calculate total questions and current progress
  const getQuestionProgress = () => {
    if (!isComprehensiveQuestionnaire || !currentQuestionnaireType) {
      return { current: currentQuestionIndex + 1, total: questions.length };
    }
    
    const questionnaire = currentQuestionnaireType === 'pickleball' ? pickleballQuestionnaire : 
                         currentQuestionnaireType === 'tennis' ? tennisQuestionnaire : padelQuestionnaire;
    
    // Count answered questions
    const allResponses = { ...responses, ...currentPageAnswers };
    let answeredQuestions = 0;
    
    // Count questions that have been answered
    for (const [key, value] of Object.entries(allResponses)) {
      if (value !== undefined && value !== null && value !== '') {
        if (typeof value === 'object' && value !== null) {
          // For skill matrix, count each sub-question
          answeredQuestions += Object.keys(value).length;
        } else {
          answeredQuestions += 1;
        }
      }
    }
    
    // Calculate total questions by simulating the flow
    let totalQuestions = answeredQuestions;
    let currentResponses = { ...allResponses };
    
    // Simulate remaining questions
    while (true) {
      const nextQuestions = questionnaire.getConditionalQuestions(currentResponses);
      if (nextQuestions.length === 0) break;
      
      totalQuestions += nextQuestions.length;
      
      // Simulate answering all questions in this set
      for (const question of nextQuestions) {
        if (question.type === 'single_choice') {
          currentResponses[question.key] = question.options?.[0] || '';
        } else if (question.type === 'number') {
          currentResponses[question.key] = question.min_value || 0;
        } else if (question.type === 'skill_matrix' && question.sub_questions) {
          const skillResponses: { [key: string]: string } = {};
          for (const [skillKey, skillData] of Object.entries(question.sub_questions)) {
            const skill = skillData as { question: string; options: string[] };
            skillResponses[skillKey] = skill.options[0] || '';
          }
          currentResponses[question.key] = skillResponses;
        }
      }
    }
    
    return { current: answeredQuestions + 1, total: totalQuestions };
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackgroundGradient sport={sport as string} />
      <View style={styles.contentContainer}>
        

        {/* Render different content based on sport type */}
        {isComprehensiveQuestionnaire ? (
          showIntroduction && !forceShowQuestionnaire ? (
            renderIntroduction()
          ) : (
            <>
              {/* Questionnaire Header */}
              <View style={styles.questionnaireHeader}>
                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={() => router.back()}
                >
                  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M15 18L9 12L15 6"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </TouchableOpacity>
                
                <Text style={[
                  styles.questionnaireTitle,
                  currentQuestionnaireType === 'tennis' && styles.tennisQuestionnaireTitle,
                  currentQuestionnaireType === 'padel' && styles.padelQuestionnaireTitle
                ]}>
                  {currentQuestionnaireType === 'pickleball' ? 'pickleball' : 
                   currentQuestionnaireType === 'tennis' ? 'tennis' : 'padel'}
                </Text>
                
                <View style={styles.headerSpacer} />
              </View>

              {/* Progress Indicator */}
              <View style={styles.progressContainer}>
                {(() => {
                  const progress = getQuestionProgress();
                  return (
                    <>
                      <Text style={styles.progressText}>
                        Question {progress.current}/{progress.total}
                      </Text>
                      <View style={styles.progressBar}>
                        <View 
                          style={[
                            styles.progressFill, 
                            { width: `${(progress.current / progress.total) * 100}%` }
                          ]} 
                        />
                      </View>
                    </>
                  );
                })()}
              </View>

              {/* Question Content */}
              <View style={styles.questionnaireContainer}>
                {questions.length > 0 && currentQuestionIndex < questions.length ? (
                  <View style={styles.cardStackContainer}>
                    {/* Render current and next question cards */}
                    {questions.slice(currentQuestionIndex, currentQuestionIndex + 2).map((question, index) => {
                      const actualIndex = currentQuestionIndex + index;
                      const isActive = index === 0;
                      
                      // Determine if Next button should be enabled
                      const isNextEnabled = () => {
                        if (question.type === 'number') {
                          // For number input, check if there's a valid input or if it's optional
                          return currentPageAnswers[question.key] !== undefined || question.optional;
                        } else {
                          // For single choice, check if an option is selected
                          return currentPageAnswers[question.key] !== undefined;
                        }
                      };
                      
                      const navigationButtons = (
                        <>
                          <TouchableOpacity
                            style={styles.skipButton}
                            onPress={handleBack}
                          >
                            <Text style={styles.skipButtonText}>Back</Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity
                            style={[
                              styles.nextButton,
                              !isNextEnabled() && styles.nextButtonDisabled
                            ]}
                            onPress={handleNext}
                            disabled={!isNextEnabled()}
                          >
                            <Text style={styles.nextButtonText}>Next</Text>
                          </TouchableOpacity>
                        </>
                      );
                      
                      return (
                        <QuestionCard
                          key={actualIndex}
                          question={question}
                          isActive={isActive}
                          onAnswer={handleQuestionnaireResponse}
                          currentPageAnswers={currentPageAnswers}
                          responses={responses}
                          navigationButtons={navigationButtons}
                          sport={currentQuestionnaireType || 'pickleball'}
                        />
                      );
                    })}
                  </View>
                ) : questions.length === 0 ? (
                  <View style={styles.questionContainer}>
                    <Text style={styles.loadingText}>Loading questions...</Text>
                  </View>
                ) : (
                  <View style={styles.questionContainer}>
                    <Text style={styles.loadingText}>Preparing assessment...</Text>
                  </View>
                )}
              </View>
            </>
          )
        ) : (
          <View style={styles.cardStackContainer}>
            <SimpleQuestionCard
              question="How long have you been playing?"
              selectedOption={selectedOption}
              dropdownRef={dropdownRef}
              onPress={openDropdown}
              isActive={true}
            />
            
            {/* Confirm Button */}
            {selectedOption && (
              <View style={styles.simpleConfirmButtonContainer}>
                <TouchableOpacity
                  style={styles.simpleConfirmButton}
                  onPress={handleConfirm}
                >
                  <Text style={styles.simpleConfirmButtonText}>Continue</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

      </View>
      

      {/* Dropdown Modal */}
      <Modal
        visible={dropdownOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDropdownOpen(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => setDropdownOpen(false)}
        >
          <View 
            style={[
              styles.modalDropdown,
              {
                top: dropdownPosition.y,
                left: dropdownPosition.x,
                width: dropdownPosition.width,
              }
            ]}
          >
            <FlatList
              data={skillOptions}
              keyExtractor={(item, index) => `${item}-${index}`}
              style={styles.modalDropdownList}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              bounces={true}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={[
                    styles.dropdownItem,
                    index === skillOptions.length - 1 && styles.dropdownItemLast,
                  ]}
                  onPress={() => selectOption(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dropdownItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Loading Overlay */}
      {isSubmittingAssessment && (
        <LoadingSpinner
          overlay={true}
          showCard={true}
          message={loadingMessage}
          color="#FE9F4D"
          size="large"
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    flex: 1,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    paddingHorizontal: 71,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logo: {
    fontSize: 24,
    fontWeight: '700',
    fontStyle: 'italic',
    color: '#FE9F4D',
  },
  headerContainer: {
    paddingHorizontal: 37,
    marginBottom: 20,
  },
  sportTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    lineHeight: 40,
    textAlign: 'center',
    fontFamily: 'Inter',
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    lineHeight: 20,
    textAlign: 'center',
    fontFamily: 'Inter',
  },
  questionContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  dropdown: {
    height: 46,
    borderWidth: 1,
    borderColor: '#EDF1F3',
    borderRadius: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    shadowColor: '#E4E5E7',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.24,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 16,
  },
  dropdownText: {
    fontSize: 14,
    color: '#6C7278',
    fontWeight: '500',
  },
  dropdownTextSelected: {
    color: '#1A1C1E',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  modalDropdown: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EDF1F3',
    borderRadius: 10,
    maxHeight: 250,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalDropdownList: {
    maxHeight: 250,
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF1F3',
  },
  dropdownItemLast: {
    borderBottomWidth: 0,
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#1A1C1E',
    fontWeight: '500',
  },
  questionsContainer: {
    paddingHorizontal: 37,
  },
  questionnaireContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 10,
  },
  cardStackContainer: {
    flex: 1,
    position: 'relative',
  },
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
  simpleConfirmButtonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  simpleConfirmButton: {
    backgroundColor: '#FE9F4D',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: 'center',
    shadowColor: '#FE9F4D',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  simpleConfirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Roboto',
  },
  questionnaireHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionnaireTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: '#CA9BFF',
    fontFamily: 'Poppins',
    textTransform: 'lowercase',
  },
  tennisQuestionnaireTitle: {
    color: '#D7FFA9',
  },
  padelQuestionnaireTitle: {
    color: '#9BD0FF',
  },
  headerSpacer: {
    width: 40,
  },
  progressContainer: {
    paddingHorizontal: 36,
    paddingBottom: 20,
  },
  progressText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Roboto',
    marginBottom: 20,
    marginTop: 30,
    textAlign: 'left',
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FE9F4D',
    borderRadius: 4,
  },
  questionnaireNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  skipButtonText: {
    fontSize: 16,
    color: '#FE9F4D',
    fontWeight: '500',
    fontFamily: 'Roboto',
  },
  nextButton: {
    backgroundColor: '#FE9F4D',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 32,
    minWidth: 100,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  nextButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: 'Roboto',
  },
  skillQuestionContainer: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF1F3',
  },
  skillQuestionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    fontFamily: 'Roboto',
    flex: 1,
  },
  skillOptionsContainer: {
    gap: 8,
  },
  skillQuestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  skillTooltipButton: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FE9F4D',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  skillTooltipIcon: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  button: {
    height: 40,
    backgroundColor: '#FE9F4D',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonTennis: {
    backgroundColor: '#374F35',
    borderWidth: 1,
    borderColor: '#5D825A',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 24,
  },
  // New UX Enhancement Styles
  greetingContainer: {
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  greetingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#A04DFE',
    fontFamily: 'Poppins',
  },
  tennisGreetingText: {
    color: '#A2E047',
  },
  padelGreetingText: {
    color: '#4DABFE',
  },
  sportBranding: {
    position: 'absolute',
    right: 20,
    bottom: 610,
    alignItems: 'flex-end',
    zIndex: 10,
  },
  sportIconContainer: {
    marginBottom: 8,
  },
  sportText: {
    fontSize: 48,
    fontWeight: '500',
    color: '#CA9BFF',
    fontFamily: 'Poppins',
    textAlign: 'right',
  },
  tennisSportText: {
    color: '#D7FFA9',
  },
  padelSportText: {
    color: '#9BD0FF',
  },
  introductionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 15,
    paddingBottom: 15,
    paddingTop: 20,
  },
  whiteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  introTitle: {
    fontSize: 30,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 24,
    fontFamily: 'Inter',
    textAlign: 'left',
  },
  introPoints: {
    marginBottom: 20,
  },
  introPointContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  arrowCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(160, 77, 254, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tennisArrowCircle: {
    backgroundColor: 'rgba(162, 224, 71, 0.15)',
  },
  padelArrowCircle: {
    backgroundColor: 'rgba(77, 171, 254, 0.15)',
  },
  arrowText: {
    fontSize: 17,
    color: '#A04DFE',
    fontWeight: '600',
  },
  tennisArrowText: {
    color: '#A2E047',
  },
  padelArrowText: {
    color: '#4DABFE',
  },
  introDescription: {
    fontSize: 15,
    color: '#000000',
    lineHeight: 21,
    marginBottom: 2,
    fontFamily: 'Poppins',
  },
  introPoint: {
    fontSize: 15,
    fontWeight: '500',
    color: '#8C8C8C',
    lineHeight: 21,
    fontFamily: 'Roboto',
    flex: 1,
  },
  introButtonContainer: {
    gap: 14,
    marginTop: 28,
  },
  startButton: {
    height: 50,
    backgroundColor: '#A04DFE',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#A04DFE',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  tennisStartButton: {
    backgroundColor: '#A2E047',
    shadowColor: '#A2E047',
  },
  padelStartButton: {
    backgroundColor: '#4DABFE',
    shadowColor: '#4DABFE',
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'Poppins',
  },
  answerLaterButton: {
    height: 50,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#A04DFE',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tennisAnswerLaterButton: {
    borderColor: '#A2E047',
  },
  padelAnswerLaterButton: {
    borderColor: '#4DABFE',
  },
  answerLaterButtonText: {
    color: '#777777',
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'Poppins',
  },
  tennisAnswerLaterButtonText: {
    color: '#A2E047',
  },
  padelAnswerLaterButtonText: {
    color: '#4DABFE',
  },
  loadingText: {
    fontSize: 16,
    color: '#6C7278',
    fontFamily: 'Roboto',
    textAlign: 'center',
    marginTop: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF6B6B',
    fontFamily: 'Roboto',
    textAlign: 'center',
    marginTop: 20,
  },
  navigationContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 37,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    paddingTop: 20,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: '#EDF1F3',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 5,
  },
  navigationButton: {
    height: 40,
    paddingHorizontal: 24,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  backButtonText: {
    color: '#6C7278',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Roboto',
  },
});

export default SkillAssessmentScreen;