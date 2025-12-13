import logger from '../logger';
import { ChatMessage, ChatSession, PhaseBasedCoachingFeedback } from '../types';

/**
 * Chat Service
 * Manages chat sessions and message history for coaching interactions
 */
export class ChatService {
  private static sessions: Map<string, ChatSession> = new Map();

  /**
   * Create a new chat session
   */
  static createSession(videoId: string, analysis: PhaseBasedCoachingFeedback): ChatSession {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const session: ChatSession = {
      sessionId,
      videoId,
      messages: [],
      analysisContext: analysis
    };

    this.sessions.set(sessionId, session);

    logger.info(`Created chat session: ${sessionId}`, {
      sessionId,
      videoId
    });

    return session;
  }

  /**
   * Get session by ID
   */
  static getSession(sessionId: string): ChatSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Add message to session
   */
  static addMessage(sessionId: string, message: ChatMessage): ChatSession | undefined {
    const session = this.sessions.get(sessionId);

    if (!session) {
      logger.warn(`Session not found: ${sessionId}`);
      return undefined;
    }

    session.messages.push(message);

    logger.info(`Added message to session: ${sessionId}`, {
      sessionId,
      role: message.role,
      contentLength: message.content.length
    });

    return session;
  }

  /**
   * Get session messages
   */
  static getMessages(sessionId: string): ChatMessage[] {
    const session = this.sessions.get(sessionId);
    return session ? session.messages : [];
  }

  /**
   * Get analysis context for session
   */
  static getAnalysisContext(sessionId: string): PhaseBasedCoachingFeedback | undefined {
    const session = this.sessions.get(sessionId);
    return session ? session.analysisContext : undefined;
  }

  /**
   * Format session for LLM context
   */
  static formatSessionContext(sessionId: string): string {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return '';
    }

    const analysis = session.analysisContext;
    let context = `Video Analysis Summary:\n`;
    context += `Trick: ${analysis.trickName} (${analysis.rotationDirection})\n`;
    context += `Rotation Count: ${analysis.phases.length} phases analyzed\n\n`;

    for (const phase of analysis.phases) {
      context += `${phase.phaseName.toUpperCase()}:\n`;
      context += `- Summary: ${phase.summary}\n`;
      context += `- Issues: ${phase.issues.length}\n`;
    }

    context += `\nOverall Assessment: ${analysis.overallAssessment}\n`;
    context += `Progression Advice: ${analysis.progressionAdvice}\n`;

    return context;
  }

  /**
   * Build conversation history for LLM
   */
  static buildConversationHistory(sessionId: string): Array<{ role: string; content: string }> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return [];
    }

    return session.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  /**
   * Clear session
   */
  static clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    logger.info(`Cleared session: ${sessionId}`);
  }

  /**
   * Get all sessions
   */
  static getAllSessions(): ChatSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get sessions for video
   */
  static getSessionsForVideo(videoId: string): ChatSession[] {
    return Array.from(this.sessions.values()).filter(s => s.videoId === videoId);
  }
}
