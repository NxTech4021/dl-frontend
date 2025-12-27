// Backend-integrated questionnaire service
import { questionnaireAPI, QuestionnaireData, Question, QuestionnaireResponse } from './api';

export interface BackendQuestion {
  key: string;
  question: string;
  type: 'single_choice' | 'number' | 'skill_matrix';
  options?: string[];
  sub_questions?: {
    [key: string]: {
      question: string;
      options: string[];
    };
  };
  min_value?: number;
  max_value?: number;
  step?: number;
  optional?: boolean;
  help_text?: string;
}

export class BackendQuestionnaireService {
  private questionnaireData: QuestionnaireData | null = null;
  private sport: string;
  private userId: string;

  constructor(sport: string, userId?: string) {
    this.sport = sport;
    this.userId = userId || '';
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  async loadQuestionnaire(): Promise<void> {
    try {
      this.questionnaireData = await questionnaireAPI.getQuestionnaire(this.sport);
    } catch (error) {
      console.error('Failed to load questionnaire:', error);
      throw error;
    }
  }

  getConditionalQuestions(responses: QuestionnaireResponse): BackendQuestion[] {
    if (!this.questionnaireData) {
      throw new Error('Questionnaire not loaded. Call loadQuestionnaire() first.');
    }

    const { questions } = this.questionnaireData;
    const nextQuestions: BackendQuestion[] = [];

    // Find the next unanswered question
    for (const question of questions) {
      if (this.isQuestionAnswered(question.key, responses)) {
        continue;
      }

      if (!this.shouldShowQuestion(question, responses)) {
        continue;
      }

      const frontendQuestion = this.convertQuestion(question);
      nextQuestions.push(frontendQuestion);
      
      // Return one question at a time
      break;
    }

    return nextQuestions;
  }

  private isQuestionAnswered(key: string, responses: QuestionnaireResponse): boolean {
    return responses[key] !== undefined && responses[key] !== null;
  }

  private shouldShowQuestion(question: Question, responses: QuestionnaireResponse): boolean {
    if (!question.visible_if || question.visible_if.length === 0) {
      return true;
    }

    return question.visible_if.every(condition => {
      const responseValue = responses[condition.key];
      
      switch (condition.op) {
        case '==':
          return responseValue === condition.value;
        case '!=':
          return responseValue !== condition.value;
        case '>':
          return Number(responseValue) > Number(condition.value);
        case '<':
          return Number(responseValue) < Number(condition.value);
        default:
          return true;
      }
    });
  }

  private convertQuestion(question: Question): BackendQuestion {
    const frontendQuestion: BackendQuestion = {
      key: question.key,
      question: question.question,
      type: question.type,
      options: question.options?.map(opt => opt.label) || [],
      help_text: question.helptext,
      optional: question.optional,
    };

    if (question.type === 'skill_matrix' && question.subQuestions) {
      frontendQuestion.sub_questions = {};
      for (const [key, subQ] of Object.entries(question.subQuestions)) {
        frontendQuestion.sub_questions[key] = {
          question: subQ.question,
          options: subQ.options.map(opt => opt.label)
        };
      }
    }

    if (question.type === 'number') {
      frontendQuestion.min_value = question.min;
      frontendQuestion.max_value = question.max;
      frontendQuestion.step = question.step;
    }

    return frontendQuestion;
  }

  async submitResponses(responses: QuestionnaireResponse) {
    try {
      const result = await questionnaireAPI.submitQuestionnaire(this.sport, responses, this.userId);
      return result;
    } catch (error) {
      console.error('Failed to submit responses:', error);
      throw error;
    }
  }

  async getUserPreviousResponse() {
    try {
      const response = await questionnaireAPI.getSportResponse(this.sport, this.userId);
      return response;
    } catch (error) {
      console.error('Failed to get previous response:', error);
      return null;
    }
  }

  calculateInitialRating(responses: QuestionnaireResponse) {
    // This will be handled by the backend when submitting
    return {
      singles_rating: 1500,
      doubles_rating: 1500,
      confidence: 'medium' as const,
      rating_deviation: 250,
      source: 'questionnaire'
    };
  }

  generateFeedback(ratingData: any): string {
    return 'Your rating has been calculated based on your responses. Check the results page for detailed feedback.';
  }
}

// Factory function to create questionnaire service
export function createQuestionnaireService(sport: string): BackendQuestionnaireService {
  return new BackendQuestionnaireService(sport);
}
