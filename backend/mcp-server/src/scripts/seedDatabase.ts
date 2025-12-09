import { connectDB, disconnectDB, getDB } from '../db/connection';
import { initializeCollections } from '../db/schemas';

const sampleTricks = [
  {
    name: 'backside-360',
    difficulty: 3,
    prerequisites: [],
    concepts: ['rotation', 'edge-control', 'timing'],
    phases: [
      {
        name: 'setup carve',
        requirements: ['light heel pressure', 'maintain edge control'],
        common_problems: [
          {
            problem: 'too much speed',
            causes: ['not controlling approach'],
            fixes: ['ease off throttle', 'use heel edge to slow down'],
          },
        ],
        video_url: 'https://youtube.com/watch?v=example',
        video_timestamp: 5,
      },
      {
        name: 'pop',
        requirements: ['weight on tail', 'explosive upward motion'],
        common_problems: [
          {
            problem: 'weak pop',
            causes: ['not committing weight to tail'],
            fixes: ['load weight into tail', 'explode upward'],
          },
        ],
        video_url: 'https://youtube.com/watch?v=example',
        video_timestamp: 18,
      },
    ],
  },
  {
    name: 'backside-180',
    difficulty: 2,
    prerequisites: [],
    concepts: ['rotation', 'timing', 'body-position'],
    phases: [
      {
        name: 'approach',
        requirements: ['maintain consistent speed', 'stay centered'],
        common_problems: [
          {
            problem: 'not enough speed',
            causes: ['hesitation', 'weak approach'],
            fixes: ['commit to approach', 'build momentum'],
          },
        ],
        video_url: 'https://youtube.com/watch?v=example',
        video_timestamp: 0,
      },
      {
        name: 'landing',
        requirements: ['both feet land simultaneously', 'weight centered'],
        common_problems: [
          {
            problem: 'sliding out after landing',
            causes: ['landing on edge', 'not enough edge control'],
            fixes: ['land flat', 'keep weight centered', 'engage edge control'],
          },
        ],
        video_url: 'https://youtube.com/watch?v=example',
        video_timestamp: 45,
      },
    ],
  },
];

const sampleConcepts = [
  {
    name: 'rotation',
    definition: 'The spinning motion of the body and board around the vertical axis',
    importance: 'critical',
    applies_to_phases: {
      'backside-360': ['pop', 'mid-air positioning'],
      'backside-180': ['rotation initiation'],
    },
    related_problems: ['overrotating', 'underrotating'],
    techniques: [
      {
        technique: 'upper body lead',
        description: 'Lead rotation with shoulders and upper body',
        tricks: ['backside-360', 'backside-180'],
      },
    ],
  },
  {
    name: 'edge-control',
    definition: 'Managing pressure on the toe or heel edge of the board',
    importance: 'critical',
    applies_to_phases: {
      'backside-360': ['setup carve', 'landing'],
      'backside-180': ['landing'],
    },
    related_problems: ['catching edge', 'sliding out'],
    techniques: [
      {
        technique: 'flat landing',
        description: 'Land with board flat to avoid edge catches',
        tricks: ['backside-360', 'backside-180'],
      },
    ],
  },
];

const sampleProgressions = [
  {
    from_trick: 'backside-180',
    to_trick: 'backside-360',
    new_phases_introduced: ['mid-air positioning', 'counter rotation'],
    phase_progression: [
      {
        phase: 'rotation',
        from_trick_requirement: '180 degrees',
        to_trick_requirement: '360 degrees',
        difficulty_increase: 2,
      },
    ],
  },
];

const sampleTips = [
  {
    content: 'Focus on committing to the approach. Hesitation kills momentum.',
    trick: 'backside-180',
    concept: 'timing',
    problem: 'not enough speed',
    relevance_score: 0.95,
  },
  {
    content: 'Land with your board flat to avoid catching an edge.',
    trick: 'backside-180',
    concept: 'edge-control',
    problem: 'sliding out after landing',
    relevance_score: 0.9,
  },
];

async function seedDatabase() {
  try {
    const db = await connectDB();
    await initializeCollections(db);

    // Clear existing data
    await db.collection('tricks').deleteMany({});
    await db.collection('concepts').deleteMany({});
    await db.collection('progressions').deleteMany({});
    await db.collection('tips').deleteMany({});

    // Insert sample data
    await db.collection('tricks').insertMany(sampleTricks);
    console.log(`✓ Inserted ${sampleTricks.length} tricks`);

    await db.collection('concepts').insertMany(sampleConcepts);
    console.log(`✓ Inserted ${sampleConcepts.length} concepts`);

    await db.collection('progressions').insertMany(sampleProgressions);
    console.log(`✓ Inserted ${sampleProgressions.length} progressions`);

    await db.collection('tips').insertMany(sampleTips);
    console.log(`✓ Inserted ${sampleTips.length} tips`);

    console.log('✓ Database seeded successfully');
  } catch (error) {
    console.error('✗ Failed to seed database:', error);
    throw error;
  } finally {
    await disconnectDB();
  }
}

// Run if executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { seedDatabase };
