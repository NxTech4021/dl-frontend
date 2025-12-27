import { useReducer, useMemo } from 'react';
import type {
  QuestionnaireResponse,
  TennisQuestionnaireResponse,
  PadelQuestionnaireResponse,
  Question,
  TennisQuestion,
  PadelQuestion,
  SkillQuestions,
  TennisSkillQuestions,
  PadelSkillQuestions,
  AnyQuestion,
  AnyQuestionnaireResponse,
} from '../types/questionnaire.types';

// State shape
interface QuestionHistoryEntry {
  questions: Question[] | TennisQuestion[] | PadelQuestion[];
  responses: any;
  currentQuestionIndex: number;
  pageAnswers: { [key: string]: any };
}

interface QuestionnaireState {
  // Question flow
  currentQuestionIndex: number;
  responses: QuestionnaireResponse | TennisQuestionnaireResponse | PadelQuestionnaireResponse;
  questions: Question[] | TennisQuestion[] | PadelQuestion[];
  currentQuestionnaireType: 'pickleball' | 'tennis' | 'padel' | null;
  skillResponses: SkillQuestions | TennisSkillQuestions | PadelSkillQuestions;
  currentPageAnswers: { [key: string]: any };

  // UI state
  showIntroduction: boolean;
  forceShowQuestionnaire: boolean;

  // History
  questionHistory: QuestionHistoryEntry[];
  currentPageIndex: number;
}

// Action types
type QuestionnaireAction =
  | { type: 'SET_QUESTION_INDEX'; payload: number }
  | { type: 'ADD_RESPONSE'; payload: { key: string; value: any } }
  | { type: 'SET_RESPONSES'; payload: any }
  | { type: 'ADD_PAGE_ANSWERS'; payload: { [key: string]: any } }
  | { type: 'CLEAR_PAGE_ANSWERS' }
  | { type: 'SET_QUESTIONS'; payload: Question[] | TennisQuestion[] | PadelQuestion[] }
  | { type: 'SET_QUESTIONNAIRE_TYPE'; payload: 'pickleball' | 'tennis' | 'padel' }
  | { type: 'SHOW_INTRODUCTION'; payload: boolean }
  | { type: 'FORCE_SHOW_QUESTIONNAIRE'; payload: boolean }
  | { type: 'PUSH_HISTORY'; payload: QuestionHistoryEntry }
  | { type: 'GO_BACK_HISTORY' }
  | { type: 'RESET_QUESTIONNAIRE' }
  | { type: 'INCREMENT_PAGE_INDEX' }
  | { type: 'INIT_HISTORY'; payload: QuestionHistoryEntry }
  | { type: 'REMOVE_RESPONSE'; payload: string };

// Initial state
const initialState: QuestionnaireState = {
  currentQuestionIndex: 0,
  responses: {},
  questions: [],
  currentQuestionnaireType: null,
  skillResponses: {},
  currentPageAnswers: {},
  showIntroduction: false,
  forceShowQuestionnaire: false,
  questionHistory: [],
  currentPageIndex: 0,
};

// Reducer
function questionnaireReducer(
  state: QuestionnaireState,
  action: QuestionnaireAction
): QuestionnaireState {
  switch (action.type) {
    case 'SET_QUESTION_INDEX':
      return { ...state, currentQuestionIndex: action.payload };

    case 'ADD_RESPONSE':
      return {
        ...state,
        responses: { ...state.responses, [action.payload.key]: action.payload.value },
      };

    case 'SET_RESPONSES':
      return {
        ...state,
        responses: action.payload,
      };

    case 'ADD_PAGE_ANSWERS':
      return {
        ...state,
        currentPageAnswers: { ...state.currentPageAnswers, ...action.payload },
      };

    case 'CLEAR_PAGE_ANSWERS':
      return {
        ...state,
        currentPageAnswers: {},
        skillResponses: {},
      };

    case 'SET_QUESTIONS':
      return { ...state, questions: action.payload };

    case 'SET_QUESTIONNAIRE_TYPE':
      return { ...state, currentQuestionnaireType: action.payload };

    case 'SHOW_INTRODUCTION':
      return { ...state, showIntroduction: action.payload };

    case 'FORCE_SHOW_QUESTIONNAIRE':
      return { ...state, forceShowQuestionnaire: action.payload };

    case 'INIT_HISTORY':
      return {
        ...state,
        questionHistory: [action.payload],
        currentPageIndex: 0,
      };

    case 'PUSH_HISTORY':
      return {
        ...state,
        questionHistory: [...state.questionHistory, action.payload],
      };

    case 'INCREMENT_PAGE_INDEX':
      return {
        ...state,
        currentPageIndex: state.currentPageIndex + 1,
      };

    case 'GO_BACK_HISTORY': {
      if (state.questionHistory.length === 0) return state;
      const previousPage = state.questionHistory[state.questionHistory.length - 1];
      if (!previousPage) return state;
      const updatedHistory = state.questionHistory.slice(0, -1);
      return {
        ...state,
        questions: previousPage.questions || [],
        responses: previousPage.responses || {},
        currentPageAnswers: previousPage.pageAnswers || {},
        currentQuestionIndex: previousPage.currentQuestionIndex ?? 0,
        questionHistory: updatedHistory,
        currentPageIndex: Math.max(state.currentPageIndex - 1, 0),
        skillResponses: {},
      };
    }

    case 'RESET_QUESTIONNAIRE':
      return {
        ...initialState,
        currentQuestionnaireType: state.currentQuestionnaireType,
      };

    case 'REMOVE_RESPONSE': {
      const { [action.payload]: _, ...rest } = state.responses as Record<string, any>;
      return {
        ...state,
        responses: rest,
      };
    }

    default:
      return state;
  }
}

// Custom hook
export function useQuestionnaire() {
  const [state, dispatch] = useReducer(questionnaireReducer, initialState);

  // Memoized selectors
  const currentQuestion = useMemo(
    () => state.questions[state.currentQuestionIndex],
    [state.questions, state.currentQuestionIndex]
  );

  const isLastQuestion = useMemo(
    () => state.currentQuestionIndex === state.questions.length - 1,
    [state.currentQuestionIndex, state.questions.length]
  );

  const canGoBack = useMemo(
    () => state.currentPageIndex > 0,
    [state.currentPageIndex]
  );

  // Action creators
  const actions = useMemo(() => ({
    setQuestionIndex: (index: number) =>
      dispatch({ type: 'SET_QUESTION_INDEX', payload: index }),

    addResponse: (key: string, value: any) =>
      dispatch({ type: 'ADD_RESPONSE', payload: { key, value } }),

    setResponses: (responses: any) =>
      dispatch({ type: 'SET_RESPONSES', payload: responses }),

    addPageAnswers: (answers: { [key: string]: any }) =>
      dispatch({ type: 'ADD_PAGE_ANSWERS', payload: answers }),

    clearPageAnswers: () =>
      dispatch({ type: 'CLEAR_PAGE_ANSWERS' }),

    setQuestions: (questions: any[]) =>
      dispatch({ type: 'SET_QUESTIONS', payload: questions }),

    setQuestionnaireType: (type: 'pickleball' | 'tennis' | 'padel') =>
      dispatch({ type: 'SET_QUESTIONNAIRE_TYPE', payload: type }),

    showIntroduction: (show: boolean) =>
      dispatch({ type: 'SHOW_INTRODUCTION', payload: show }),

    forceShowQuestionnaire: (force: boolean) =>
      dispatch({ type: 'FORCE_SHOW_QUESTIONNAIRE', payload: force }),

    initHistory: (
      questions: any[],
      responses: any,
      currentQuestionIndex: number,
      pageAnswers: any
    ) =>
      dispatch({
        type: 'INIT_HISTORY',
        payload: { questions, responses, currentQuestionIndex, pageAnswers },
      }),

    pushHistory: (
      questions: any[],
      responses: any,
      currentQuestionIndex: number,
      pageAnswers: any
    ) =>
      dispatch({
        type: 'PUSH_HISTORY',
        payload: { questions, responses, currentQuestionIndex, pageAnswers },
      }),

    incrementPageIndex: () =>
      dispatch({ type: 'INCREMENT_PAGE_INDEX' }),

    goBackHistory: () =>
      dispatch({ type: 'GO_BACK_HISTORY' }),

    resetQuestionnaire: () =>
      dispatch({ type: 'RESET_QUESTIONNAIRE' }),

    removeResponse: (key: string) =>
      dispatch({ type: 'REMOVE_RESPONSE', payload: key }),
  }), []);

  return {
    state,
    actions,
    currentQuestion,
    isLastQuestion,
    canGoBack,
  };
}
