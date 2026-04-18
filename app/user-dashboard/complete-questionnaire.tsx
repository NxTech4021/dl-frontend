import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Text,
  TouchableOpacity,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { PickleballQuestionnaire, QuestionnaireResponse } from '@/src/features/onboarding/services/PickleballQuestionnaire';
import { TennisQuestionnaire, TennisQuestionnaireResponse } from '@/src/features/onboarding/services/TennisQuestionnaire';
import { PadelQuestionnaire, PadelQuestionnaireResponse } from '@/src/features/onboarding/services/PadelQuestionnaire';
import { BackgroundGradient } from '@/src/features/onboarding/components';
import { LoadingSpinner } from '@/shared/components/ui';
import { useSession } from '@/lib/auth-client';
import { toast } from 'sonner-native';
import { questionnaireAdapter } from '@/src/features/onboarding/services/adapter';
import * as Haptics from 'expo-haptics';

// Import shared components from onboarding
import { QuestionnaireIntroduction } from '@/src/features/onboarding/screens/skill-assessment/questionnaire/QuestionnaireIntroduction';
import { QuestionnaireFlow } from '@/src/features/onboarding/screens/skill-assessment/questionnaire/QuestionnaireFlow';
import { useQuestionnaire } from '@/src/features/onboarding/screens/skill-assessment/hooks/useQuestionnaire';
import { useQuestionProgress } from '@/src/features/onboarding/screens/skill-assessment/hooks/useQuestionProgress';
import { expandSkillMatrixQuestions } from '@/src/features/onboarding/screens/skill-assessment/utils/skillMatrixExpander';
import { filterVisibleQuestions } from '@/src/features/onboarding/screens/skill-assessment/utils/showIfEvaluator';

// Keep QuestionnaireResults from dashboard-user as it's used for inline results display
import { QuestionnaireResults } from '@/src/features/dashboard-user/components';

const snapshot = (data: any) => JSON.parse(JSON.stringify(data ?? {}));

export default function CompleteQuestionnaireScreen() {
  const { sport, seasonId, leagueId, returnPath } = useLocalSearchParams<{
    sport: 'pickleball' | 'tennis' | 'padel';
    seasonId?: string;
    leagueId?: string;
    returnPath?: 'season-details' | 'league-details';
  }>();

  const { data: session } = useSession();
  const userId = session?.user?.id;

  // Get user's first name
  const firstName = session?.user?.name ? session.user.name.split(' ')[0] : 'there';

  // Questionnaire instances
  const [pickleballQuestionnaire] = useState(() => new PickleballQuestionnaire());
  const [tennisQuestionnaire] = useState(() => new TennisQuestionnaire());
  const [padelQuestionnaire] = useState(() => new PadelQuestionnaire());

  // Use shared questionnaire state hook
  const { state, actions } = useQuestionnaire();

  // Loading state
  const [isSubmittingAssessment, setIsSubmittingAssessment] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Processing...');
  const [showResults, setShowResults] = useState(false);
  const [assessmentResults, setAssessmentResults] = useState<any>(null);

  // Guard: track whether user already has a completed rating for this sport
  const [hasExistingRating, setHasExistingRating] = useState(false);
  const [isCheckingRating, setIsCheckingRating] = useState(true);

  // Ref to store pending answers for synchronous access
  const pendingAnswersRef = useRef<Record<string, any>>({}); 

  // Get current questionnaire instance
  const currentQuestionnaire = React.useMemo(() => {
    if (sport === 'pickleball') return pickleballQuestionnaire;
    if (sport === 'tennis') return tennisQuestionnaire;
    if (sport === 'padel') return padelQuestionnaire;
    return null;
  }, [sport, pickleballQuestionnaire, tennisQuestionnaire, padelQuestionnaire]);

  // Calculate progress using shared hook
  const progress = useQuestionProgress(
    state.currentQuestionnaireType,
    currentQuestionnaire,
    state.responses,
    state.currentPageAnswers,
    expandSkillMatrixQuestions
  );

  // Check whether the user already has a completed rating for this sport.
  // If they do, block the questionnaire — it should only be filled once.
  useEffect(() => {
    if (!userId || !sport) {
      setIsCheckingRating(false);
      return;
    }

    const checkExistingRating = async () => {
      try {
        const result = await questionnaireAdapter.getUserResponse(sport, userId);
        if (result && result.success) {
          setHasExistingRating(true);
        }
      } catch {
        // Fail-open: if the check fails, allow proceeding
      } finally {
        setIsCheckingRating(false);
      }
    };

    checkExistingRating();
  }, [userId, sport]);

  // Reset questionnaire state when sport changes
  useEffect(() => {
    if (sport === 'pickleball' || sport === 'tennis' || sport === 'padel') {
      actions.resetQuestionnaire();
    }
  }, [sport, actions]);

  // Initialize questionnaire based on sport
  useEffect(() => {
    if (sport && ['pickleball', 'tennis', 'padel'].includes(sport)) {
      actions.setQuestionnaireType(sport);
      actions.showIntroduction(true);
      actions.forceShowQuestionnaire(false);
      setShowResults(false);

      if (currentQuestionnaire) {
        // Load ALL questions upfront (with showIf conditions)
        // This provides stable carousel data for smooth animations
        // Visibility is controlled by filterVisibleQuestions at render time
        try {
          const allQuestions = currentQuestionnaire.getAllQuestions();
          const expandedQuestions = expandSkillMatrixQuestions(allQuestions);
          actions.setQuestions(expandedQuestions);
          actions.setResponses({});
          actions.setQuestionIndex(0);
          console.log(`Loaded ${expandedQuestions.length} questions for ${sport} (stable array)`);
        } catch (error) {
          console.error('Failed to load all questions:', error);
          toast.error('Failed to load questionnaire. Please try again.');
        }
      }
    }
  }, [sport, currentQuestionnaire, actions]);

  // Initialize question history when questionnaire starts
  useEffect(() => {
    if (state.questions.length > 0 && state.questionHistory.length === 0 && !state.showIntroduction) {
      actions.initHistory(
        [...state.questions],
        snapshot(state.responses),
        state.currentQuestionIndex,
        snapshot(state.currentPageAnswers)
      );
    }
  }, [state.questions, state.questionHistory.length, state.showIntroduction, state.responses, state.currentQuestionIndex, state.currentPageAnswers, actions]);

  const startFreshAssessment = useCallback(() => {
    if (!currentQuestionnaire) return;

    console.log('Starting fresh assessment...');

    // Ensure we start from a clean slate
    actions.resetQuestionnaire();
    actions.setResponses({});
    actions.setQuestionIndex(0);

    // Load ALL questions upfront (same as onboarding flow)
    const allQuestions = currentQuestionnaire.getAllQuestions();
    const expandedQuestions = expandSkillMatrixQuestions(allQuestions);
    actions.setQuestions(expandedQuestions);

    actions.showIntroduction(false);
    actions.forceShowQuestionnaire(true);
    console.log('Introduction hidden - showing questionnaire');
  }, [actions, currentQuestionnaire]);

  const handleSkipIntroduction = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, []);

  const completeQuestionnaire = useCallback(async (finalResponses: QuestionnaireResponse | TennisQuestionnaireResponse | PadelQuestionnaireResponse) => {
    if (!userId || !sport || !currentQuestionnaire) return;

    setLoadingMessage(`Calculating your ${sport} rating...`);
    setIsSubmittingAssessment(true);

    try {
      // Calculate rating
      const ratingResult = currentQuestionnaire.calculateInitialRating(finalResponses);
      // Generate feedback
      const feedback = (currentQuestionnaire as any).generateFeedback ? (currentQuestionnaire as any).generateFeedback(ratingResult) : '';

      console.log(`✅ ${sport} rating calculated:`, ratingResult);

      // Save to backend
      await questionnaireAdapter.saveQuestionnaireResponse(sport, finalResponses, userId);
      console.log(`✅ Questionnaire saved to backend for ${sport}`);

      // Store results to show in results screen
      setAssessmentResults({
        rating: ratingResult,
        feedback: feedback,
        responses: finalResponses
      });

      // Hide loading and show results
      setIsSubmittingAssessment(false);
      setShowResults(true);
    } catch (error) {
      console.error('Error completing questionnaire:', error);
      setIsSubmittingAssessment(false);
      toast.error('Error', {
        description: 'There was an issue submitting your questionnaire. Please try again.',
      });
    }
  }, [userId, sport, currentQuestionnaire]);

  const handleContinueFromResults = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.back();
  }, []);

  // Handle back navigation - simplified with stable questions array
  const handleBack = useCallback(() => {
    // Clear pending answers when navigating back
    pendingAnswersRef.current = {};

    // With stable questions array, we navigate by visible question index
    const visibleQuestions = filterVisibleQuestions(state.questions, state.responses);
    const currentQuestion = state.questions[state.currentQuestionIndex];
    const currentVisibleIndex = visibleQuestions.findIndex(q => q.key === currentQuestion?.key);

    if (currentVisibleIndex > 0) {
      // Go to previous visible question
      const prevVisibleQuestion = visibleQuestions[currentVisibleIndex - 1];
      const prevIndexInAll = state.questions.findIndex(q => q.key === prevVisibleQuestion.key);
      actions.setQuestionIndex(prevIndexInAll);
    } else {
      // At first question, go back to introduction
      actions.showIntroduction(true);
      actions.forceShowQuestionnaire(false);
    }
  }, [state.questions, state.currentQuestionIndex, state.responses, actions]);

  // Handle next question - simplified with stable questions array (same as onboarding flow)
  const handleNext = useCallback(async () => {
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
        [skillKey]: state.currentPageAnswers[currentQuestion.key]
      };
    }

    // Normalize number inputs
    const normalizedPageAnswers = Object.entries(finalPageAnswers).reduce(
      (acc, [key, value]) => {
        let normalizedValue = value;
        if (typeof value === 'string' && value.trim() !== '') {
          const isNumberQuestion = state.questions.some(
            (q: any) => q.key === key && q.type === 'number'
          );
          if (isNumberQuestion) {
            const parsed = parseFloat(value.replace(',', '.'));
            if (!isNaN(parsed)) normalizedValue = parsed;
          }
        }
        acc[key] = normalizedValue;
        return acc;
      },
      {} as Record<string, any>
    );

    // Merge normalized answers into responses
    newResponses = { ...newResponses, ...normalizedPageAnswers };
    actions.setResponses(newResponses);

    if (!currentQuestionnaire) return;

    // Calculate visible questions with new responses (using filterVisibleQuestions like onboarding)
    const visibleQuestions = filterVisibleQuestions(state.questions, newResponses);
    const currentVisibleIndex = visibleQuestions.findIndex(
      q => q.key === currentQuestion?.key
    );
    const isLastVisibleQuestion = currentVisibleIndex >= visibleQuestions.length - 1;

    // Check completion: all visible questions answered
    if (isLastVisibleQuestion) {
      console.log('🎯 Questionnaire complete, calculating rating...');
      await completeQuestionnaire(newResponses as QuestionnaireResponse);
      return;
    }

    // Move to next visible question (QuestionnaireFlow handles carousel animation)
    const nextVisibleQuestion = visibleQuestions[currentVisibleIndex + 1];
    if (nextVisibleQuestion) {
      const nextIndexInAll = state.questions.findIndex(q => q.key === nextVisibleQuestion.key);
      actions.setQuestionIndex(nextIndexInAll);
      actions.clearPageAnswers();
    }
  }, [state, actions, currentQuestionnaire, completeQuestionnaire]);

  const handleAnswer = useCallback((key: string, value: any) => {
    actions.removeResponse(key);
    actions.addPageAnswers({ [key]: value });
    pendingAnswersRef.current[key] = value;
  }, [actions]);

  if (isSubmittingAssessment) {
    return (
      <SafeAreaView style={styles.container}>
        <BackgroundGradient sport={sport || 'pickleball'} />
        <View style={styles.loadingContainer}>
          <LoadingSpinner message={loadingMessage} />
        </View>
      </SafeAreaView>
    );
  }

  // Show loading while checking for an existing rating
  if (isCheckingRating) {
    return (
      <SafeAreaView style={styles.container}>
        <BackgroundGradient sport={sport || 'pickleball'} />
        <View style={styles.loadingContainer}>
          <LoadingSpinner message="Loading..." />
        </View>
      </SafeAreaView>
    );
  }

  // Block re-entry: user already has a completed rating for this sport
  if (hasExistingRating) {
    return (
      <SafeAreaView style={styles.container}>
        <BackgroundGradient sport={sport || 'pickleball'} />
        <View style={styles.alreadyCompletedContainer}>
          <Text style={styles.alreadyCompletedTitle}>Assessment Complete</Text>
          <Text style={styles.alreadyCompletedText}>
            You have already completed the skill assessment for {sport}. Your DMR rating is locked in and cannot be redone.
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Show results screen if available
  if (showResults && assessmentResults && sport) {
    return (
      <QuestionnaireResults
        sport={sport}
        firstName={firstName}
        results={assessmentResults}
        onContinue={handleContinueFromResults}
      />
    );
  }

  if (!sport || !state.currentQuestionnaireType) {
    return (
      <SafeAreaView style={styles.container}>
        <BackgroundGradient sport={sport || 'pickleball'} />
        <View style={styles.loadingContainer}>
          <LoadingSpinner message="Loading questionnaire..." />
        </View>
      </SafeAreaView>
    );
  }

  // Show introduction screen first
  if (state.showIntroduction && !state.forceShowQuestionnaire) {
    return (
      <SafeAreaView style={styles.container}>
        <BackgroundGradient sport={sport} />
        <View style={styles.contentContainer}>
          <QuestionnaireIntroduction
            sport={sport}
            firstName={firstName}
            onStartAssessment={startFreshAssessment}
            onSkipAssessment={handleSkipIntroduction}
            skipButtonText="Go Back"
          />
        </View>
      </SafeAreaView>
    );
  }

  // Show questionnaire flow using shared component
  return (
    <SafeAreaView style={styles.container}>
      <BackgroundGradient sport={sport} />
      <View style={styles.contentContainer}>
        <QuestionnaireFlow
          sport={sport}
          questions={state.questions}
          currentQuestionIndex={state.currentQuestionIndex}
          currentPageAnswers={state.currentPageAnswers}
          responses={state.responses}
          progress={progress}
          onAnswer={handleAnswer}
          onBack={handleBack}
          onNext={handleNext}
        />
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
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alreadyCompletedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  alreadyCompletedTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  alreadyCompletedText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  backButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1C1E',
  },
});
