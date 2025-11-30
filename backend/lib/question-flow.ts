/**
 * Question Flow Manager
 * Manages the guided question sequence for gathering user context
 * Requirements: 7.1, 7.2, 7.3, 8.1, 8.2, 9.1, 9.2
 */

import type { UserContext } from './types';

export type QuestionType = 'freeText' | 'singleChoice' | 'multipleChoice';

export interface Question {
  id: string;
  prompt: string;
  type: QuestionType;
  options?: string[];
  optional: boolean;
  contextKey: keyof UserContext;
}

// Question configuration - easily extensible
export const QUESTIONS: Question[] = [
  {
    id: 'trick',
    prompt: 'What trick do you want to do?',
    type: 'freeText',
    optional: false,
    contextKey: 'trick',
  },
  {
    id: 'featureSize',
    prompt: 'What size feature are you doing?',
    type: 'singleChoice',
    options: ['small', 'medium', 'large', 'xl', 'flat'],
    optional: true,
    contextKey: 'featureSize',
  },
  {
    id: 'preTrick',
    prompt: 'Have you landed the pre-trick?',
    type: 'singleChoice',
    options: ['yes', 'sometimes', 'no', 'unknown'],
    optional: true,
    contextKey: 'preTrick',
  },
  {
    id: 'edgeTransfers',
    prompt: 'How are your edge transfers?',
    type: 'singleChoice',
    options: ['good', 'okay', 'struggling'],
    optional: true,
    contextKey: 'edgeTransfers',
  },
  {
    id: 'issues',
    prompt: 'What specific issues are you having?',
    type: 'freeText',
    optional: true,
    contextKey: 'issues',
  },
  {
    id: 'spotLanding',
    prompt: 'Can you spot the landing for the full rotation?',
    type: 'singleChoice',
    options: ['yes', 'sometimes', 'no', 'unknown'],
    optional: true,
    contextKey: 'spotLanding',
  },
  {
    id: 'consistency',
    prompt: 'How consistently are you landing this trick?',
    type: 'singleChoice',
    options: ['always', 'usually', 'sometimes', 'rarely', 'never'],
    optional: true,
    contextKey: 'consistency',
  },
  {
    id: 'control',
    prompt: 'Do you feel in control during this trick?',
    type: 'singleChoice',
    options: ['yes', 'mostly', 'no', 'untried'],
    optional: true,
    contextKey: 'control',
  },
];

// Skip command patterns
const SKIP_PATTERNS = [
  /^(that'?s?\s*all|skip|done|finish|stop|enough|ok\s*that'?s?\s*it)$/i,
  /^(no\s*more|i'?m\s*done|that\s*is\s*all|nothing\s*else)$/i,
];

/**
 * Check if a message is a skip command
 */
export function isSkipCommand(message: string): boolean {
  const trimmed = message.trim().toLowerCase();
  return SKIP_PATTERNS.some(pattern => pattern.test(trimmed));
}

/**
 * Question Flow Manager class
 */
export class QuestionFlowManager {
  private currentIndex: number = 0;
  private context: Partial<UserContext> = {};
  private completed: boolean = false;
  private skipped: boolean = false;
  
  constructor(initialContext?: Partial<UserContext>) {
    if (initialContext) {
      this.context = { ...initialContext };
      // Skip questions that already have answers
      this.skipAnsweredQuestions();
    }
  }
  
  /**
   * Skip questions that already have answers in context
   */
  private skipAnsweredQuestions(): void {
    while (this.currentIndex < QUESTIONS.length) {
      const question = QUESTIONS[this.currentIndex];
      if (this.context[question.contextKey] !== undefined) {
        this.currentIndex++;
      } else {
        break;
      }
    }
    
    if (this.currentIndex >= QUESTIONS.length) {
      this.completed = true;
    }
  }
  
  /**
   * Get the current question
   */
  getCurrentQuestion(): Question | null {
    if (this.completed || this.skipped) {
      return null;
    }
    
    if (this.currentIndex >= QUESTIONS.length) {
      this.completed = true;
      return null;
    }
    
    return QUESTIONS[this.currentIndex];
  }
  
  /**
   * Submit an answer to the current question
   */
  submitAnswer(answer: string): void {
    // Check for skip command
    if (isSkipCommand(answer)) {
      this.skip();
      return;
    }
    
    const question = this.getCurrentQuestion();
    if (!question) return;
    
    // Store the answer in context
    // Type assertion needed because contextKey is a union type
    (this.context as any)[question.contextKey] = this.parseAnswer(answer, question);
    
    // Move to next question
    this.currentIndex++;
    
    // Check if we're done
    if (this.currentIndex >= QUESTIONS.length) {
      this.completed = true;
    }
  }
  
  /**
   * Parse answer based on question type
   */
  private parseAnswer(answer: string, question: Question): any {
    const trimmed = answer.trim();
    
    if (question.type === 'singleChoice' && question.options) {
      // Try to match to an option
      const lowerAnswer = trimmed.toLowerCase();
      const matchedOption = question.options.find(
        opt => opt.toLowerCase() === lowerAnswer || 
               opt.toLowerCase().startsWith(lowerAnswer)
      );
      return matchedOption || trimmed;
    }
    
    // Handle boolean-like answers for spotLanding
    if (question.contextKey === 'spotLanding') {
      const lower = trimmed.toLowerCase();
      if (lower === 'yes' || lower === 'true') return true;
      if (lower === 'no' || lower === 'false') return false;
      return trimmed;
    }
    
    return trimmed;
  }
  
  /**
   * Skip remaining questions
   */
  skip(): void {
    this.skipped = true;
    this.completed = true;
  }
  
  /**
   * Check if the flow is complete
   */
  isComplete(): boolean {
    return this.completed;
  }
  
  /**
   * Check if the flow was skipped
   */
  wasSkipped(): boolean {
    return this.skipped;
  }
  
  /**
   * Get the collected context
   */
  getContext(): Partial<UserContext> {
    return { ...this.context };
  }
  
  /**
   * Get progress info
   */
  getProgress(): { current: number; total: number; percentage: number } {
    return {
      current: this.currentIndex,
      total: QUESTIONS.length,
      percentage: Math.round((this.currentIndex / QUESTIONS.length) * 100),
    };
  }
  
  /**
   * Reset the flow
   */
  reset(): void {
    this.currentIndex = 0;
    this.context = {};
    this.completed = false;
    this.skipped = false;
  }
}

/**
 * Get all questions (for UI rendering)
 */
export function getAllQuestions(): Question[] {
  return [...QUESTIONS];
}

/**
 * Get a question by ID
 */
export function getQuestionById(id: string): Question | undefined {
  return QUESTIONS.find(q => q.id === id);
}
