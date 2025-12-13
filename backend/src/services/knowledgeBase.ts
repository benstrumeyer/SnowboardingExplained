import logger from '../logger';

export interface KnowledgeEntry {
  id: string;
  content: string;
  source: 'transcript' | 'notes' | 'manual' | 'progression';
  topic: string;
  trick?: string;
  phase?: string;
  embedding?: number[];
}

export interface PhaseRequirements {
  phase: string;
  trick: string;
  requirements: string[];
  commonProblems: string[];
  fixes: string[];
}

/**
 * Knowledge Base Service
 * Manages phase-based coaching knowledge and RAG retrieval
 */
export class KnowledgeBaseService {
  private static knowledgeBase: KnowledgeEntry[] = [];
  private static phaseRequirements: Map<string, PhaseRequirements> = new Map();

  /**
   * Initialize knowledge base
   */
  static async initialize(): Promise<void> {
    logger.info('Initializing knowledge base');

    // Load default phase requirements
    this.loadPhaseRequirements();

    // Load knowledge entries
    this.loadKnowledgeEntries();

    logger.info(`Knowledge base initialized with ${this.knowledgeBase.length} entries`);
  }

  /**
   * Load phase-specific requirements
   */
  private static loadPhaseRequirements(): void {
    const requirements: PhaseRequirements[] = [
      {
        phase: 'setupCarve',
        trick: 'all',
        requirements: [
          'Maintain proper edge control (heelside to toeside for backside, toeside to heelside for frontside)',
          'Weight slightly shifted toward back foot',
          'Smooth carving arc with consistent edge pressure',
          'Body stacked and aligned',
          'Approach speed appropriate for trick'
        ],
        commonProblems: [
          'Losing edge control before takeoff',
          'Weight too far forward',
          'Flat carve instead of clean arc',
          'Misaligned body position',
          'Inconsistent approach speed'
        ],
        fixes: [
          'Practice edge transitions separately',
          'Focus on weight distribution over back foot',
          'Increase carve radius for smoother arc',
          'Stack shoulders over hips over ankles',
          'Maintain consistent speed through approach'
        ]
      },
      {
        phase: 'windupSnap',
        trick: 'all',
        requirements: [
          'Load the board with upper/lower body separation',
          'Snap with clean momentum transfer',
          'Maintain rotation commitment',
          'Keep arms in for momentum',
          'Windup duration ~4 frames for spins'
        ],
        commonProblems: [
          'Prolonged windup (too long)',
          'Weak snap with momentum loss',
          'Upper body not leading',
          'Arms flailing instead of controlled',
          'Losing commitment mid-snap'
        ],
        fixes: [
          'Shorten windup to 4 frames',
          'Increase snap intensity and speed',
          'Lead with upper body rotation',
          'Keep arms tight to body',
          'Commit fully to rotation'
        ]
      },
      {
        phase: 'landing',
        trick: 'all',
        requirements: [
          'Counter-rotate to control spin',
          'Land with bent legs for shock absorption',
          'Maintain edge control on landing',
          'Spot landing zone throughout trick',
          'Prepare for next feature'
        ],
        commonProblems: [
          'Straight leg pop on landing',
          'Over-rotating or under-rotating',
          'Losing edge control',
          'Not spotting landing',
          'Falling or sliding out'
        ],
        fixes: [
          'Maintain 10-15% leg bend throughout',
          'Practice rotation count accuracy',
          'Engage edge immediately on landing',
          'Keep head up spotting landing',
          'Prepare for next feature early'
        ]
      }
    ];

    for (const req of requirements) {
      const key = `${req.trick}-${req.phase}`;
      this.phaseRequirements.set(key, req);
    }

    logger.info(`Loaded ${requirements.length} phase requirement sets`);
  }

  /**
   * Load knowledge entries
   */
  private static loadKnowledgeEntries(): void {
    const entries: KnowledgeEntry[] = [
      {
        id: 'setup-carve-edge-control',
        content: 'Edge control is critical in the setup carve phase. For backside tricks, transition from heelside to toeside and take off toeside. For frontside tricks, start toeside and take off heelside. Maintain consistent pressure throughout the carve.',
        source: 'manual',
        topic: 'edge-control',
        phase: 'setupCarve'
      },
      {
        id: 'weight-distribution-backfoot',
        content: 'Weight should be slightly shifted toward the back foot during setup carve. This allows for better control and prepares the rider for the snap. Avoid having weight too far forward as this reduces rotation potential.',
        source: 'notes',
        topic: 'weight-distribution',
        phase: 'setupCarve'
      },
      {
        id: 'snap-timing',
        content: 'The snap should carry momentum through the lip of the jump. A good snap transfers energy from the board to the rider, initiating rotation. The snap should occur quickly (around 4 frames for spins) to maintain momentum.',
        source: 'manual',
        topic: 'snap-timing',
        phase: 'windupSnap'
      },
      {
        id: 'upper-lower-separation',
        content: 'Upper and lower body separation is key to rotation. The upper body should lead the rotation while the lower body follows. This creates the twist that initiates the spin. Maintain this separation throughout the trick.',
        source: 'notes',
        topic: 'body-separation',
        phase: 'windupSnap'
      },
      {
        id: 'leg-bend-landing',
        content: 'Maintain 10-15% leg bend throughout the trick, especially on landing. Straight leg pops reduce shock absorption and control. Bent legs allow for better edge control and smoother landings.',
        source: 'manual',
        topic: 'leg-bend',
        phase: 'landing'
      },
      {
        id: 'counter-rotation-control',
        content: 'Counter-rotation is used to slow down the spin and land cleanly. As the rider approaches the landing, they counter-rotate (rotate in the opposite direction) to stop the spin at the right moment. This requires practice to get the timing right.',
        source: 'notes',
        topic: 'counter-rotation',
        phase: 'landing'
      },
      {
        id: 'spotting-technique',
        content: 'Spotting is the process of tracking the landing zone with your head and eyes. This helps with rotation control and landing accuracy. Spot the landing early and keep your head up throughout the trick.',
        source: 'manual',
        topic: 'spotting',
        phase: 'landing'
      },
      {
        id: '180-progression',
        content: '180s are a fundamental trick. Start with small 180s on flat ground, then progress to 180s off small jumps. Focus on clean edge transitions and smooth rotation. Once comfortable, progress to 360s.',
        source: 'progression',
        topic: 'trick-progression',
        trick: '180'
      },
      {
        id: '360-progression',
        content: '360s require more rotation than 180s. Focus on upper/lower body separation and snap timing. Practice on progressively larger jumps. Once comfortable with 360s, progress to 540s.',
        source: 'progression',
        topic: 'trick-progression',
        trick: '360'
      },
      {
        id: '720-progression',
        content: '720s are advanced tricks requiring significant rotation and air awareness. Master 360s first, then progress to 540s, then 720s. Focus on maintaining rotation momentum and spotting the landing.',
        source: 'progression',
        topic: 'trick-progression',
        trick: '720'
      }
    ];

    this.knowledgeBase = entries;
    logger.info(`Loaded ${entries.length} knowledge entries`);
  }

  /**
   * Get phase requirements for a trick
   */
  static getPhaseRequirements(trick: string, phase: string): PhaseRequirements | undefined {
    const key = `${trick}-${phase}`;
    return this.phaseRequirements.get(key) || this.phaseRequirements.get(`all-${phase}`);
  }

  /**
   * Retrieve relevant knowledge for a phase
   */
  static retrievePhaseKnowledge(phase: string, query?: string): KnowledgeEntry[] {
    let results = this.knowledgeBase.filter(entry => entry.phase === phase || entry.topic.includes(phase.toLowerCase()));

    if (query) {
      const queryLower = query.toLowerCase();
      results = results.filter(entry => entry.content.toLowerCase().includes(queryLower) || entry.topic.includes(queryLower));
    }

    return results;
  }

  /**
   * Retrieve trick progression knowledge
   */
  static getTrickProgression(trick: string): KnowledgeEntry[] {
    return this.knowledgeBase.filter(entry => entry.trick === trick && entry.source === 'progression');
  }

  /**
   * Search knowledge base
   */
  static search(query: string): KnowledgeEntry[] {
    const queryLower = query.toLowerCase();
    return this.knowledgeBase.filter(
      entry =>
        entry.content.toLowerCase().includes(queryLower) ||
        entry.topic.toLowerCase().includes(queryLower) ||
        (entry.trick && entry.trick.toLowerCase().includes(queryLower))
    );
  }

  /**
   * Get all knowledge entries
   */
  static getAllEntries(): KnowledgeEntry[] {
    return this.knowledgeBase;
  }

  /**
   * Format knowledge for LLM context
   */
  static formatKnowledgeContext(entries: KnowledgeEntry[]): string {
    return entries.map(entry => `[${entry.topic}] ${entry.content}`).join('\n\n');
  }
}
