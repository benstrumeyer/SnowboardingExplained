import { Db } from 'mongodb';

export async function initializeCollections(db: Db): Promise<void> {
  // Tricks collection
  const tricksCollection = db.collection('tricks');
  await tricksCollection.createIndex({ name: 1 }, { unique: true });
  await tricksCollection.createIndex({ difficulty: 1 });
  await tricksCollection.createIndex({ prerequisites: 1 });
  await tricksCollection.createIndex({ concepts: 1 });

  // Concepts collection
  const conceptsCollection = db.collection('concepts');
  await conceptsCollection.createIndex({ name: 1 }, { unique: true });
  await conceptsCollection.createIndex({ importance: 1 });

  // Progressions collection
  const progressionsCollection = db.collection('progressions');
  await progressionsCollection.createIndex({ from_trick: 1, to_trick: 1 }, { unique: true });
  await progressionsCollection.createIndex({ from_trick: 1 });

  // Tips collection
  const tipsCollection = db.collection('tips');
  await tipsCollection.createIndex({ trick: 1 });
  await tipsCollection.createIndex({ concept: 1 });
  await tipsCollection.createIndex({ problem: 1 });
  await tipsCollection.createIndex({ relevance_score: -1 });

  console.log('✓ Collections initialized with indexes');
}

export interface Trick {
  _id?: string;
  name: string;
  difficulty: number;
  prerequisites: string[];
  concepts: string[];
  phases: Phase[];
  created_at?: Date;
}

export interface Phase {
  name: string;
  requirements: string[];
  common_problems: Problem[];
  video_url?: string;
  video_timestamp?: number;
}

export interface Problem {
  problem: string;
  causes: string[];
  fixes: string[];
}

export interface Concept {
  _id?: string;
  name: string;
  definition: string;
  importance: 'critical' | 'important' | 'helpful';
  applies_to_phases: Record<string, string[]>;
  related_problems: string[];
  techniques: Technique[];
  created_at?: Date;
}

export interface Technique {
  technique: string;
  description: string;
  tricks: string[];
}

export interface Progression {
  _id?: string;
  from_trick: string;
  to_trick: string;
  new_phases_introduced: string[];
  phase_progression: PhaseProgression[];
  created_at?: Date;
}

export interface PhaseProgression {
  phase: string;
  from_trick_requirement: string;
  to_trick_requirement: string;
  difficulty_increase: number;
}

export interface Tip {
  _id?: string;
  content: string;
  trick?: string;
  concept?: string;
  problem?: string;
  relevance_score: number;
  created_at?: Date;
}
