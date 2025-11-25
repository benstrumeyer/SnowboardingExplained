/**
 * Context Collection Hook
 * Manages the conversation flow and tracks what context we've collected
 */

import { useState, useCallback } from 'react';
import type { UserContext } from '../types';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'coach';
  timestamp: Date;
  isTyping?: boolean;
}

interface ContextState {
  trick?: string;
  featureSize?: string;
  issues?: string;
  preTrick?: string;
  edgeTransfers?: string;
  spotLanding?: boolean;
  consistency?: string;
  control?: boolean;
}

const QUESTIONS = {
  trick: "Hey! What trick are you working on?",
  featureSize: "Nice! What size feature are you hitting? (small/medium/large)",
  issues: "Got it. What's giving you trouble with it?",
};

export function useContextCollection() {
  const [context, setContext] = useState<ContextState>({});
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: QUESTIONS.trick,
      sender: 'coach',
      timestamp: new Date(),
    },
  ]);
  const [isComplete, setIsComplete] = useState(false);

  const addMessage = useCallback((text: string, sender: 'user' | 'coach') => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      sender,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
  }, []);

  const parseUserResponse = useCallback((text: string): Partial<ContextState> => {
    const lower = text.toLowerCase().trim();
    const parsed: Partial<ContextState> = {};

    // Parse trick name (if we don't have it yet)
    if (!context.trick) {
      parsed.trick = text.trim();
    }

    // Parse feature size
    if (lower.includes('small') || lower.includes('tiny')) {
      parsed.featureSize = 'small';
    } else if (lower.includes('medium') || lower.includes('mid')) {
      parsed.featureSize = 'medium';
    } else if (lower.includes('large') || lower.includes('big') || lower.includes('huge')) {
      parsed.featureSize = 'large';
    }

    // Parse issues (if we already have trick and size)
    if (context.trick && context.featureSize && !context.issues) {
      parsed.issues = text.trim();
    }

    return parsed;
  }, [context]);

  const getNextQuestion = useCallback((currentContext: ContextState): string | null => {
    if (!currentContext.trick) return QUESTIONS.trick;
    if (!currentContext.featureSize) return QUESTIONS.featureSize;
    if (!currentContext.issues) return QUESTIONS.issues;
    return null; // Context is complete
  }, []);

  const handleUserMessage = useCallback((text: string) => {
    // Add user message
    addMessage(text, 'user');

    // Parse the response
    const parsed = parseUserResponse(text);
    const newContext = { ...context, ...parsed };
    setContext(newContext);

    // Check if we need to ask another question
    const nextQuestion = getNextQuestion(newContext);
    
    if (nextQuestion) {
      // Add coach's next question after a short delay
      setTimeout(() => {
        addMessage(nextQuestion, 'coach');
      }, 500);
    } else {
      // Context is complete!
      setIsComplete(true);
    }
  }, [context, parseUserResponse, getNextQuestion, addMessage]);

  const addCoachResponse = useCallback((text: string) => {
    addMessage(text, 'coach');
  }, [addMessage]);

  const reset = useCallback(() => {
    setContext({});
    setMessages([
      {
        id: Date.now().toString(),
        text: QUESTIONS.trick,
        sender: 'coach',
        timestamp: new Date(),
      },
    ]);
    setIsComplete(false);
  }, []);

  const getUserContext = useCallback((): UserContext => {
    return {
      trick: context.trick || '',
      featureSize: context.featureSize,
      issues: context.issues,
      preTrick: context.preTrick,
      edgeTransfers: context.edgeTransfers,
      spotLanding: context.spotLanding,
      consistency: context.consistency,
      control: context.control,
    };
  }, [context]);

  return {
    messages,
    context,
    isComplete,
    handleUserMessage,
    addCoachResponse,
    reset,
    getUserContext,
  };
}
