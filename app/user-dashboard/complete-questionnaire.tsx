import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
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
        actions.setResponses({});
        actions.setQuestionIndex(0);
        const initialQuestions = currentQuestionnaire.getConditionalQuestions({});
        const expandedQuestions = expandSkillMatrixQuestions(initialQuestions);
        actions.setQuestions(expandedQuestions);
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

    actions.resetQuestionnaire();
    actions.setResponses({});
    actions.setQuestionIndex(0);

    const initialQuestions = currentQuestionnaire.getConditionalQuestions({});
    const expandedQuestions = expandSkillMatrixQuestions(initialQuestions);
    actions.setQuestions(expandedQuestions);

    actions.showIntroduction(false);
    actions.forceShowQuestionnaire(true);
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

  // Handle back navigation
  const handleBack = useCallback(() => {
    pendingAnswersRef.current = {};

    if (state.currentPageIndex > 0) {
      actions.goBackHistory();
    } else {
      // At first question, go back to introduction
      actions.showIntroduction(true);
    }
  }, [state.currentPageIndex, actions]);

  // Handle next question
  const handleNext = useCallback(async () => {
    const currentQuestion = state.questions[state.currentQuestionIndex];
    let finalPageAnswers = { ...state.currentPageAnswers, ...pendingAnswersRef.current };
    pendingAnswersRef.current = {};

    // Handle skill matrix questions
    if (currentQuestion && 'originalKey' in currentQuestion && 'skillKey' in currentQuestion) {
      const originalKey = (currentQuestion as any).originalKey;
      const skillKey = (currentQuestion as any).skillKey;

      const skillMatrixResponse = state.responses[originalKey] || {};
      const existingMatrix = typeof skillMatrixResponse === 'object' && skillMatrixResponse !== null
        ? skillMatrixResponse as Record<string, unknown>
        : {};
      const updatedSkillMatrix = {
        ...existingMatrix,
        [skillKey]: state.currentPageAnswers[currentQuestion.key]
      };

      const newResponses = {
        ...state.responses,
        [originalKey]: updatedSkillMatrix
      };

      actions.setResponses(newResponses);

      if (state.currentQuestionIndex < state.questions.length - 1) {
        actions.setQuestionIndex(state.currentQuestionIndex + 1);
        actions.clearPageAnswers();
        return;
      }
    }

    // Normalize page answers
    const normalizedPageAnswers = Object.entries(finalPageAnswers).reduce(
      (acc, [key, value]) => {
        let normalizedValue = value;
        if (
          typeof value === 'string' &&
          value.trim() !== '' &&
          state.questions.some((q: any) => q.key === key && q.type === 'number')
        ) {
          const parsed = parseFloat(value.replace(',', '.'));
          if (!isNaN(parsed)) {
            normalizedValue = parsed;
          }
        }
        acc[key] = normalizedValue;
        return acc;
      },
      {} as Record<string, any>
    );

    const pageSnapshot = snapshot(normalizedPageAnswers);
    const newResponses = { ...state.responses, ...normalizedPageAnswers };
    actions.setResponses(newResponses);

    if (!currentQuestionnaire) return;

    // Get next questions
    const nextQuestions = currentQuestionnaire.getConditionalQuestions(newResponses);

    // Check if questionnaire is complete
    if (nextQuestions.length === 0) {
      console.log('🎯 Questionnaire complete, submitting...');
      await completeQuestionnaire(newResponses as QuestionnaireResponse);
      return;
    }

    // Update questions and push to history
    const expandedQuestions = expandSkillMatrixQuestions(nextQuestions);
    actions.pushHistory(
      [...state.questions],
      snapshot(newResponses),
      state.currentQuestionIndex,
      pageSnapshot
    );
    actions.clearPageAnswers();
    actions.setQuestions(expandedQuestions);
    actions.setQuestionIndex(0);
    actions.incrementPageIndex();
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
});
