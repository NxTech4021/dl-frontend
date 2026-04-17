import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useOnboarding } from '../OnboardingContext';
import { useSession } from '@/lib/auth-client';
import { BackgroundGradient } from '../components';
import { LoadingSpinner } from '@/shared/components/ui';
import { SimpleSkillDropdown } from './skill-assessment/SimpleSkillDropdown';
import { QuestionnaireIntroduction } from './skill-assessment/questionnaire/QuestionnaireIntroduction';
import { QuestionnaireFlow } from './skill-assessment/questionnaire/QuestionnaireFlow';
import { useQuestionnaire } from './skill-assessment/hooks/useQuestionnaire';
import { useQuestionProgress } from './skill-assessment/hooks/useQuestionProgress';
import { expandSkillMatrixQuestions } from './skill-assessment/utils/skillMatrixExpander';
import { getFirstName } from './skill-assessment/utils/questionnaireHelpers';
import { filterVisibleQuestions } from './skill-assessment/utils/showIfEvaluator';
import { shouldCompleteQuestionnaire } from './skill-assessment/utils/completionCheck';
import { validateNumberInput } from './skill-assessment/utils/validateNumberInput';
import { PickleballQuestionnaire, QuestionnaireResponse } from '../services/PickleballQuestionnaire';
import { TennisQuestionnaire, TennisQuestionnaireResponse } from '../services/TennisQuestionnaire';
import { PadelQuestionnaire, PadelQuestionnaireResponse } from '../services/PadelQuestionnaire';
import { toast } from 'sonner-native';
import type { SportType } from '../types';

const snapshot = (data: any) => JSON.parse(JSON.stringify(data ?? {}));

const SkillAssessmentScreen = () => {
  const { sport, sportIndex, fromDashboard } = useLocalSearchParams();
  const { data, updateData } = useOnboarding();
  const session = useSession();
  const currentSportIndex = parseInt(sportIndex as string) || 0;
  const selectedSports = data.selectedSports || [];

  // Questionnaire instances
  const [pickleballQuestionnaire] = useState(() => new PickleballQuestionnaire());
  const [tennisQuestionnaire] = useState(() => new TennisQuestionnaire());
  const [padelQuestionnaire] = useState(() => new PadelQuestionnaire());

  // Use custom hook for questionnaire state
  const { state, actions } = useQuestionnaire();

  // Loading state
  const [isSubmittingAssessment, setIsSubmittingAssessment] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Processing...');

  // Ref to store pending answers for synchronous access (avoids race condition with reducer)
  const pendingAnswersRef = useRef<Record<string, any>>({});

  // Guard: prevent the init useEffect from re-running when completion handlers
  // update data.skillAssessments (which would reset the questionnaire mid-flow)
  const hasInitializedForSport = useRef<string | null>(null);

  // Determine if comprehensive questionnaire
  const isComprehensive = sport === 'pickleball' || sport === 'tennis' || sport === 'padel';

  // Fully reset questionnaire state whenever the selected sport changes so previous answers/history don't bleed over
  useEffect(() => {
    if (sport === 'pickleball' || sport === 'tennis' || sport === 'padel') {
      // Allow re-init for the new sport
      hasInitializedForSport.current = null;
      actions.resetQuestionnaire();
    }
  }, [sport, actions]);

  // Get current questionnaire instance (memoized)
  const currentQuestionnaire = React.useMemo(() => {
    if (sport === 'pickleball') return pickleballQuestionnaire;
    if (sport === 'tennis') return tennisQuestionnaire;
    if (sport === 'padel') return padelQuestionnaire;
    return null;
  }, [sport, pickleballQuestionnaire, tennisQuestionnaire, padelQuestionnaire]);

  // For backwards compatibility
  const getCurrentQuestionnaire = useCallback(() => currentQuestionnaire, [currentQuestionnaire]);

  // Calculate progress using custom hook
  const progress = useQuestionProgress(
    state.currentQuestionnaireType,
    currentQuestionnaire,
    state.responses,
    state.currentPageAnswers,
    expandSkillMatrixQuestions
  );

  // Initialize questionnaire based on sport
  // IMPORTANT: Only runs once per sport. Completion handlers update data.skillAssessments
  // which must NOT re-trigger this effect (it would reset the questionnaire mid-flow).
  useEffect(() => {
    if (sport === 'pickleball' || sport === 'tennis' || sport === 'padel') {
      // Skip re-init if we've already initialized for this sport
      if (hasInitializedForSport.current === sport) return;
      hasInitializedForSport.current = sport as string;

      actions.setQuestionnaireType(sport as 'pickleball' | 'tennis' | 'padel');
      actions.showIntroduction(true);
      actions.forceShowQuestionnaire(false);

      const questionnaire = getCurrentQuestionnaire();
      if (!questionnaire) {
        console.error('No questionnaire instance available for sport:', sport);
        hasInitializedForSport.current = null; // Allow retry
        return;
      }

      // Validate questionnaire has getAllQuestions method
      if (typeof questionnaire.getAllQuestions !== 'function') {
        console.error('Questionnaire missing getAllQuestions method');
        hasInitializedForSport.current = null; // Allow retry
        return;
      }

      // Load ALL questions upfront (with showIf conditions)
      // This provides stable carousel data for smooth animations
      try {
        const allQuestions = questionnaire.getAllQuestions();
        const expandedQuestions = expandSkillMatrixQuestions(allQuestions);
        actions.setQuestions(expandedQuestions);
        console.log(`Loaded ${expandedQuestions.length} questions for ${sport} (stable array)`);
      } catch (error) {
        console.error('Failed to load all questions:', error);
        toast.error('Failed to load questionnaire. Please try again.');
        hasInitializedForSport.current = null; // Allow retry
        return;
      }

      // Check if there's already a completed assessment
      const existingSkillData = data.skillAssessments?.[sport as SportType];
      if (existingSkillData && typeof existingSkillData === 'string') {
        // Check if it's the "answer_later" placeholder first
        if (existingSkillData === 'answer_later') {
          console.log('User previously chose to answer later, starting fresh assessment');
          actions.setResponses({});
          actions.setQuestionIndex(0);
          actions.showIntroduction(true);
          return;
        }

        try {
          const skillDataObject = JSON.parse(existingSkillData);
          // If assessment is already complete and launched from dashboard, block retake
          if (skillDataObject.rating) {
            if (fromDashboard === 'true') {
              // Rating already exists — do not allow redo from the dashboard/profile page
              router.replace('/user-dashboard');
              return;
            }
            actions.setResponses({});
            actions.setQuestionIndex(0);
          } else {
            // Continue incomplete assessment with existing responses
            const existingResponses = skillDataObject.responses || {};
            actions.setResponses(existingResponses);
            actions.setQuestionIndex(0);
          }
        } catch (error) {
          console.error('Failed to parse existing skill data:', error);
          // Start fresh if data is corrupted
          actions.setResponses({});
          actions.setQuestionIndex(0);
        }
      } else {
        // No existing data, start fresh
        actions.setResponses({});
        actions.setQuestionIndex(0);
      }
    }
  }, [sport, data.skillAssessments, getCurrentQuestionnaire, actions]);

  // Initialize question history when questionnaire starts
  useEffect(() => {
    if (isComprehensive && state.questions.length > 0 && state.questionHistory.length === 0) {
      actions.initHistory(
        [...state.questions],
        snapshot(state.responses),
        state.currentQuestionIndex,
        snapshot(state.currentPageAnswers)
      );
      console.log('📖 Initialized question history with first page');
    }
  }, [isComprehensive, state.questions, state.questionHistory.length, state.responses, actions]);

  // Navigation helpers
  const proceedToNext = useCallback(async () => {
    // When launched from the dashboard (adding a new sport's DMR), skip the onboarding
    // multi-sport loop and go straight back to the dashboard after assessment.
    if (fromDashboard === 'true') {
      router.replace('/user-dashboard');
      return;
    }

    if (currentSportIndex < selectedSports.length - 1) {
      const nextSport = selectedSports[currentSportIndex + 1];
      router.push(`/onboarding/skill-assessment?sport=${nextSport}&sportIndex=${currentSportIndex + 1}`);
    } else {
      // All sports assessed - complete onboarding and go to dashboard
      if (session.data?.user?.id) {
        try {
          const { questionnaireAPI } = await import('../services/api');
          console.log('SkillAssessmentScreen: Completing onboarding...');
          await questionnaireAPI.completeOnboarding(session.data.user.id);
          // Wait for backend to process
          await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (error) {
          console.error('SkillAssessmentScreen: Error completing onboarding:', error);
        }
      }
      router.replace('/user-dashboard');
    }
  }, [fromDashboard, currentSportIndex, selectedSports, session.data?.user?.id]);

  // Backend save helper
  const saveToBackend = useCallback(async (sportName: string, responses: any) => {
    try {
      if (!session.data?.user?.id) {
        throw new Error('User not authenticated');
      }

      const { questionnaireAdapter } = await import('../services/adapter');
      await questionnaireAdapter.saveQuestionnaireResponse(sportName, responses, session.data.user.id);
      console.log(`Successfully saved ${sportName} responses to backend`);

      // Update onboarding step to SKILL_ASSESSMENT
      const { questionnaireAPI } = await import('../services/api');
      try {
        await questionnaireAPI.updateOnboardingStep(session.data.user.id, 'SKILL_ASSESSMENT');
        console.log('Onboarding step updated to SKILL_ASSESSMENT');
      } catch (stepError) {
        console.error('Error updating onboarding step:', stepError);
      }
    } catch (error) {
      console.error(`Failed to save ${sportName} responses to backend:`, error);
      throw error;
    }
  }, [session.data?.user?.id]);

  // Completion handlers
  const completePickleballAssessment = useCallback(async (finalResponses: QuestionnaireResponse) => {
    setLoadingMessage('Calculating your Pickleball rating...');
    setIsSubmittingAssessment(true);
    try {
      const ratingResult = pickleballQuestionnaire.calculateInitialRating(finalResponses);

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

      try {
        await saveToBackend('pickleball', finalResponses);
      } catch (backendError) {
        console.warn('Failed to save to backend:', backendError);
        toast.warning('Rating saved locally', {
          description: "We'll sync your rating when connection improves.",
        });
      }

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
  }, [pickleballQuestionnaire, data.skillAssessments, updateData, sport, currentSportIndex, fromDashboard, saveToBackend, proceedToNext]);

  const completeTennisAssessment = useCallback(async (finalResponses: TennisQuestionnaireResponse) => {
    setLoadingMessage('Calculating your Tennis rating...');
    setIsSubmittingAssessment(true);
    try {
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

      try {
        await saveToBackend('tennis', finalResponses);
      } catch (backendError) {
        console.warn('Failed to save to backend:', backendError);
        toast.warning('Rating saved locally', {
          description: "We'll sync your rating when connection improves.",
        });
      }

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
  }, [tennisQuestionnaire, data.skillAssessments, updateData, sport, currentSportIndex, fromDashboard, saveToBackend, proceedToNext]);

  const completePadelAssessment = useCallback(async (finalResponses: PadelQuestionnaireResponse) => {
    setLoadingMessage('Calculating your Padel rating...');
    setIsSubmittingAssessment(true);
    try {
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

      try {
        await saveToBackend('padel', finalResponses);
      } catch (backendError) {
        console.warn('Failed to save to backend:', backendError);
        toast.warning('Rating saved locally', {
          description: "We'll sync your rating when connection improves.",
        });
      }

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
  }, [padelQuestionnaire, data.skillAssessments, updateData, sport, currentSportIndex, fromDashboard, saveToBackend, proceedToNext]);

  // Handle back button - go to previous visible question (never resets to Q1)
  const handleBack = useCallback(() => {
    // Clear pending answers when navigating back
    pendingAnswersRef.current = {};

    if (isComprehensive) {
      // Navigate by visible question index (mirrors complete-questionnaire.tsx)
      const visibleQs = filterVisibleQuestions(state.questions, state.responses);
      const currentQuestion = state.questions[state.currentQuestionIndex];
      const currentVisibleIndex = visibleQs.findIndex(q => q.key === currentQuestion?.key);

      if (currentVisibleIndex > 0) {
        // Go to previous visible question
        const prevVisibleQuestion = visibleQs[currentVisibleIndex - 1];
        const prevIndexInAll = state.questions.findIndex(q => q.key === prevVisibleQuestion.key);
        actions.setQuestionIndex(prevIndexInAll);
        console.log('📖 Going back to previous question');
      } else {
        // On first question, go back to the introduction/skip screen
        actions.forceShowQuestionnaire(false);
        actions.showIntroduction(true);
      }
    }
    // For simple dropdown, back button is not shown
  }, [isComprehensive, state.questions, state.currentQuestionIndex, state.responses, actions]);

  // Handle next question - simplified with stable questions array
  const proceedToNextQuestion = useCallback(async () => {
    if (!isComprehensive) return;

    const currentQuestion = state.questions[state.currentQuestionIndex];
    // Merge state with pending answers from ref (fixes race condition with skip button)
    let finalPageAnswers = { ...state.currentPageAnswers, ...pendingAnswersRef.current };
    pendingAnswersRef.current = {};

    // Handle skill matrix questions - aggregate into parent key
    let newResponses = { ...state.responses };
    if (currentQuestion && 'originalKey' in currentQuestion && 'skillKey' in currentQuestion) {
      const originalKey = (currentQuestion as any).originalKey;
      const skillKey = (currentQuestion as any).skillKey;
      const existingMatrix = (newResponses[originalKey] as Record<string, unknown>) || {};
      newResponses[originalKey] = {
        ...existingMatrix,
        [skillKey]: finalPageAnswers[currentQuestion.key]
      };
    }

    // Validate number inputs BEFORE normalizing (early return on failure)
    for (const [key, value] of Object.entries(finalPageAnswers)) {
      if (typeof value === 'string' && value.trim() !== '') {
        const numberQuestion = state.questions.find(
          (q: any) => q.key === key && q.type === 'number'
        ) as any;
        if (numberQuestion) {
          const parsed = parseFloat(value.replace(',', '.'));
          if (!isNaN(parsed)) {
            const validation = validateNumberInput(parsed, {
              min_value: numberQuestion.min_value,
              max_value: numberQuestion.max_value,
            });
            if (!validation.valid) {
              toast.error(validation.error || 'Invalid value');
              return; // Stop advancement — don't proceed past invalid input
            }
          }
        }
      }
    }

    // Normalize number inputs (validation already passed above)
    const normalizedPageAnswers: Record<string, any> = {};
    for (const [key, value] of Object.entries(finalPageAnswers)) {
      if (typeof value === 'string' && value.trim() !== '') {
        const numberQuestion = state.questions.find(
          (q: any) => q.key === key && q.type === 'number'
        ) as any;
        if (numberQuestion) {
          const parsed = parseFloat(value.replace(',', '.'));
          if (!isNaN(parsed)) {
            normalizedPageAnswers[key] = parsed;
            continue;
          }
        }
      }
      normalizedPageAnswers[key] = value;
    }

    // Merge normalized answers into responses
    newResponses = { ...newResponses, ...normalizedPageAnswers };
    actions.setResponses(newResponses);

    const questionnaire = getCurrentQuestionnaire();
    if (!questionnaire) return;

    // Calculate visible questions with new responses
    const visibleQuestions = filterVisibleQuestions(state.questions, newResponses);
    const currentVisibleIndex = visibleQuestions.findIndex(
      q => q.key === currentQuestion?.key
    );
    const isLastVisibleQuestion = shouldCompleteQuestionnaire(currentVisibleIndex, visibleQuestions.length);

    // Check completion: all visible questions answered
    // (showIf conditions handle DUPR→questionnaire branching declaratively)
    if (isLastVisibleQuestion) {
      console.log('Questionnaire complete, calculating rating...');
      if (state.currentQuestionnaireType === 'pickleball') {
        await completePickleballAssessment(newResponses as QuestionnaireResponse);
      } else if (state.currentQuestionnaireType === 'tennis') {
        await completeTennisAssessment(newResponses as TennisQuestionnaireResponse);
      } else {
        await completePadelAssessment(newResponses as PadelQuestionnaireResponse);
      }
      return;
    }

    // Save current state to history before advancing (BUG 12 fix)
    actions.pushHistory(
      [...state.questions],
      snapshot(newResponses),
      state.currentQuestionIndex,
      snapshot(finalPageAnswers)
    );

    // Move to next visible question (QuestionnaireFlow handles carousel animation)
    const nextVisibleQuestion = visibleQuestions[currentVisibleIndex + 1];
    if (nextVisibleQuestion) {
      const nextIndexInAll = state.questions.findIndex(q => q.key === nextVisibleQuestion.key);
      actions.setQuestionIndex(nextIndexInAll);
      actions.incrementPageIndex();
      actions.clearPageAnswers();
    }
  }, [isComprehensive, state, actions, getCurrentQuestionnaire, sport, completePickleballAssessment, completeTennisAssessment, completePadelAssessment]);

  const handleAnswer = useCallback(
    (key: string, value: any) => {
      actions.removeResponse(key);
      actions.addPageAnswers({ [key]: value });
      // Store in ref for immediate synchronous access (avoids race condition)
      pendingAnswersRef.current[key] = value;
    },
    [actions]
  );

  // Start fresh assessment
  const startFreshAssessment = useCallback(() => {
    console.log('Starting fresh assessment...');

    // Ensure we start from a clean slate
    actions.resetQuestionnaire();
    actions.setResponses({});
    actions.setQuestionIndex(0);

    // Questions are already loaded (stable array) - just need to reset state
    const questionnaire = getCurrentQuestionnaire();
    if (questionnaire) {
      const allQuestions = questionnaire.getAllQuestions();
      const expandedQuestions = expandSkillMatrixQuestions(allQuestions);
      actions.setQuestions(expandedQuestions);
    }

    actions.showIntroduction(false);
    actions.forceShowQuestionnaire(true);
    console.log('Introduction hidden - showing questionnaire');
  }, [actions, getCurrentQuestionnaire]);

  // Skip assessment
  const skipAssessmentForLater = useCallback(async () => {
    setLoadingMessage('Saving preferences...');
    setIsSubmittingAssessment(true);
    try {
      const updatedSkillLevels = {
        ...data.skillAssessments,
        [sport as SportType]: 'answer_later'
      };
      await updateData({ skillAssessments: updatedSkillLevels });

      toast.success('Assessment Skipped', {
        description: 'You can complete your skill assessment later in your profile settings.',
      });

      setIsSubmittingAssessment(false);
      proceedToNext();
    } catch (error) {
      console.error('Error skipping assessment:', error);
      setIsSubmittingAssessment(false);
      proceedToNext();
    }
  }, [data.skillAssessments, sport, updateData, proceedToNext]);

  // Handle simple dropdown confirm
  const handleSimpleConfirm = useCallback(async (value: string) => {
    setLoadingMessage('Saving your skill level...');
    setIsSubmittingAssessment(true);
    try {
      const updatedSkillLevels = {
        ...data.skillAssessments,
        [sport as SportType]: value
      };
      await updateData({ skillAssessments: updatedSkillLevels });

      try {
        await saveToBackend(sport as string, { skill_level: value });
      } catch (backendError) {
        console.warn('Failed to save skill level to backend:', backendError);
        toast.warning('Rating saved locally', {
          description: "We'll sync your rating when connection improves.",
        });
      }

      setIsSubmittingAssessment(false);
      proceedToNext();
    } catch (error) {
      console.error('Error saving simple skill level:', error);
      setIsSubmittingAssessment(false);
      proceedToNext();
    }
  }, [data.skillAssessments, sport, updateData, saveToBackend, proceedToNext]);

  const firstName = getFirstName(data.fullName);

  return (
    <SafeAreaView style={styles.container}>
      <BackgroundGradient sport={sport as string} />
      <View style={styles.contentContainer}>
        {isComprehensive ? (
          state.showIntroduction && !state.forceShowQuestionnaire ? (
            <QuestionnaireIntroduction
              sport={sport as 'pickleball' | 'tennis' | 'padel'}
              firstName={firstName}
              onStartAssessment={startFreshAssessment}
              onSkipAssessment={skipAssessmentForLater}
            />
          ) : (
            <QuestionnaireFlow
              sport={sport as 'pickleball' | 'tennis' | 'padel'}
              questions={state.questions}
              currentQuestionIndex={state.currentQuestionIndex}
              currentPageAnswers={state.currentPageAnswers}
              responses={state.responses}
              progress={progress}
              onAnswer={handleAnswer}
              onBack={handleBack}
              onNext={proceedToNextQuestion}
            />
          )
        ) : (
          <SimpleSkillDropdown
            initialValue={data.skillAssessments?.[sport as SportType] as unknown as string}
            onConfirm={handleSimpleConfirm}
          />
        )}
      </View>

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
});

export default SkillAssessmentScreen;
