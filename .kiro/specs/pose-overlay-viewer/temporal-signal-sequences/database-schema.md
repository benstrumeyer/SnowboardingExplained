# Temporal Signal Sequences - Database Schema

## Overview

The database stores:
1. **Perfect Phases** - Reference sequences with complete pose mathematics
2. **Signal Sequences** - Metadata about signal definitions
3. **Comparison Results** - Historical comparisons between riders and perfect references
4. **Body Proportions** - Rider body measurements for normalization

## Schema Design

### Table: perfect_phases

Stores complete pose mathematics for perfect trick execution.

```sql
CREATE TABLE perfect_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Metadata
  trick_name VARCHAR(255) NOT NULL,
  phase VARCHAR(100) NOT NULL,
  stance VARCHAR(50) NOT NULL, -- 'regular' or 'switch'
  source_video_id VARCHAR(255),
  
  -- Frame range
  frame_start INTEGER NOT NULL,
  frame_end INTEGER NOT NULL,
  fps INTEGER NOT NULL,
  duration_seconds FLOAT NOT NULL,
  
  -- Pose data (stored as JSONB for flexibility)
  pose_timeline JSONB NOT NULL, -- Array of {frameNumber, timestamp, keypoints}
  mesh_data JSONB, -- 3D mesh for visualization
  
  -- Temporal signals (stored as JSONB)
  temporal_signals JSONB NOT NULL, -- {bodyParts, relationships, fps, frameCount, duration}
  
  -- Body proportions (for normalization)
  body_proportions JSONB NOT NULL, -- {height, armLength, legLength, ...}
  
  -- Quality metrics
  quality_confidence FLOAT, -- 0-1, average keypoint confidence
  quality_consistency FLOAT, -- 0-1, consistency across frames
  quality_smoothness FLOAT, -- 0-1, smoothness of curves
  
  -- LLM Analysis
  llm_analysis JSONB, -- {bodyPartsInvolved, movementType, description, ...}
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  UNIQUE(trick_name, phase, stance),
  INDEX idx_trick_phase (trick_name, phase),
  INDEX idx_stance (stance),
  INDEX idx_created_by (created_by),
  INDEX idx_tags (tags)
);
```

### Table: signal_sequences

Stores metadata about signal definitions (before extraction).

```sql
CREATE TABLE signal_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Metadata
  name VARCHAR(255) NOT NULL,
  phases TEXT[] NOT NULL, -- Array of phase names
  description TEXT NOT NULL,
  
  -- Video reference
  video_id VARCHAR(255) NOT NULL,
  frame_start INTEGER NOT NULL,
  frame_end INTEGER NOT NULL,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'extracting', 'completed', 'failed'
  
  -- Extracted signals (once completed)
  temporal_signals JSONB,
  extraction_error TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_video_id (video_id),
  INDEX idx_status (status),
  INDEX idx_created_by (created_by)
);
```

### Table: comparison_results

Stores historical comparisons between riders and perfect references.

```sql
CREATE TABLE comparison_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  rider_id UUID NOT NULL,
  perfect_phase_id UUID NOT NULL REFERENCES perfect_phases(id),
  
  -- Rider data
  rider_video_id VARCHAR(255) NOT NULL,
  rider_frame_start INTEGER NOT NULL,
  rider_frame_end INTEGER NOT NULL,
  
  -- Comparison data (stored as JSONB)
  body_part_comparisons JSONB NOT NULL, -- {bodyPart: {positionDelta, velocityDelta, ...}}
  overall_similarity_score FLOAT NOT NULL, -- 0-100
  
  -- Deviations
  magnitude_deviations TEXT[] DEFAULT '{}', -- body parts with magnitude issues
  timing_deviations TEXT[] DEFAULT '{}', -- body parts with timing issues
  coordination_deviations TEXT[] DEFAULT '{}', -- coordination issues
  
  -- Coaching feedback
  coaching_feedback TEXT[] NOT NULL,
  
  -- Metadata
  compared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_rider_id (rider_id),
  INDEX idx_perfect_phase_id (perfect_phase_id),
  INDEX idx_similarity_score (overall_similarity_score),
  INDEX idx_compared_at (compared_at)
);
```

### Table: body_proportions

Stores rider body measurements for normalization.

```sql
CREATE TABLE body_proportions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference
  rider_id UUID NOT NULL,
  video_id VARCHAR(255) NOT NULL,
  
  -- Measurements (in pixels, normalized to video resolution)
  height FLOAT NOT NULL,
  arm_length FLOAT NOT NULL,
  leg_length FLOAT NOT NULL,
  torso_length FLOAT NOT NULL,
  shoulder_width FLOAT NOT NULL,
  hip_width FLOAT NOT NULL,
  
  -- Metadata
  extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  confidence FLOAT, -- 0-1, confidence in measurements
  
  -- Indexes
  INDEX idx_rider_id (rider_id),
  INDEX idx_video_id (video_id)
);
```

## TypeScript Interfaces

```typescript
// backend/src/types/temporalSignals.ts

interface PerfectPhase {
  id: string;
  
  // Metadata
  trickName: string;
  phase: string;
  stance: 'regular' | 'switch';
  sourceVideoId?: string;
  
  // Frame range
  frameStart: number;
  frameEnd: number;
  fps: number;
  durationSeconds: number;
  
  // Pose data
  poseTimeline: PoseFrame[];
  meshData?: MeshFrame[];
  
  // Temporal signals
  temporalSignals: TemporalSignals;
  
  // Body proportions
  bodyProportions: BodyProportions;
  
  // Quality metrics
  quality: {
    confidence: number;
    consistency: number;
    smoothness: number;
  };
  
  // LLM Analysis
  llmAnalysis?: LLMAnalysis;
  
  // Metadata
  tags: string[];
  notes?: string;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
}

interface SignalSequence {
  id: string;
  name: string;
  phases: string[];
  description: string;
  videoId: string;
  frameStart: number;
  frameEnd: number;
  status: 'pending' | 'extracting' | 'completed' | 'failed';
  temporalSignals?: TemporalSignals;
  extractionError?: string;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
}

interface ComparisonResult {
  id: string;
  riderId: string;
  perfectPhaseId: string;
  riderVideoId: string;
  riderFrameStart: number;
  riderFrameEnd: number;
  bodyPartComparisons: Record<string, {
    positionDelta: number;
    velocityDelta: number;
    accelerationDelta: number;
    timingOffset: number;
    similarityScore: number;
    feedback: string;
  }>;
  overallSimilarityScore: number;
  magnitudeDeviations: string[];
  timingDeviations: string[];
  coordinationDeviations: string[];
  coachingFeedback: string[];
  comparedAt: Date;
  createdAt: Date;
}

interface BodyProportions {
  id: string;
  riderId: string;
  videoId: string;
  height: number;
  armLength: number;
  legLength: number;
  torsoLength: number;
  shoulderWidth: number;
  hipWidth: number;
  extractedAt: Date;
  confidence: number;
}

interface PoseFrame {
  frameNumber: number;
  timestamp: number; // milliseconds
  keypoints: Keypoint[];
}

interface Keypoint {
  name: string;
  x: number;
  y: number;
  z: number;
  confidence: number;
}

interface MeshFrame {
  frameNumber: number;
  vertices: number[][];
  faces: number[][];
}

interface TemporalSignals {
  bodyParts: Record<string, BodyPartSignal>;
  relationships: Record<string, {
    separation: number[];
    coordination: number;
  }>;
  fps: number;
  frameCount: number;
  duration: number;
}

interface BodyPartSignal {
  name: string;
  position: number[];
  velocity: number[];
  acceleration: number[];
  jerk: number[];
  peakMagnitude: number;
  peakTiming: number;
  smoothness: number;
}

interface LLMAnalysis {
  bodyPartsInvolved: string[];
  movementType: string;
  description: string;
  acceleratingParts: string[];
  deceleratingParts: string[];
  coordinationPattern: string;
  asymmetries: string[];
  relatedSignals: string[];
  coachingInsights: string[];
  suggestedName: string;
  suggestedDescription: string;
}
```

## Query Patterns

### Find perfect phases by trick and phase

```sql
SELECT * FROM perfect_phases
WHERE trick_name = 'backside_360'
  AND phase = 'takeoff'
  AND stance = 'regular'
ORDER BY quality_confidence DESC
LIMIT 1;
```

### Find all perfect phases for a trick

```sql
SELECT * FROM perfect_phases
WHERE trick_name = 'backside_360'
ORDER BY phase, stance;
```

### Find perfect phases by tags

```sql
SELECT * FROM perfect_phases
WHERE tags @> ARRAY['explosive']
ORDER BY created_at DESC;
```

### Find comparison results for a rider

```sql
SELECT * FROM comparison_results
WHERE rider_id = $1
ORDER BY compared_at DESC
LIMIT 20;
```

### Find comparisons with low similarity scores

```sql
SELECT * FROM comparison_results
WHERE overall_similarity_score < 70
ORDER BY overall_similarity_score ASC;
```

### Get average similarity score by perfect phase

```sql
SELECT 
  perfect_phase_id,
  AVG(overall_similarity_score) as avg_score,
  COUNT(*) as comparison_count
FROM comparison_results
GROUP BY perfect_phase_id
ORDER BY avg_score DESC;
```

## Indexing Strategy

### Primary Indexes
- `perfect_phases(trick_name, phase, stance)` - UNIQUE, for finding specific references
- `perfect_phases(created_by)` - for finding coach's perfect phases
- `comparison_results(rider_id, compared_at)` - for rider history
- `comparison_results(perfect_phase_id)` - for finding comparisons to a reference

### Secondary Indexes
- `perfect_phases(tags)` - for tag-based filtering
- `comparison_results(overall_similarity_score)` - for finding low-scoring comparisons
- `body_proportions(rider_id)` - for finding rider measurements

## Partitioning Strategy

For large datasets, consider partitioning:

```sql
-- Partition comparison_results by month
CREATE TABLE comparison_results_2024_01 PARTITION OF comparison_results
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE comparison_results_2024_02 PARTITION OF comparison_results
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
```

## Data Retention

- **Perfect Phases**: Keep indefinitely (reference data)
- **Comparison Results**: Keep for 2 years (historical analysis)
- **Body Proportions**: Keep for 1 year (rider measurements change)
- **Signal Sequences**: Delete after extraction (temporary working data)

## Backup Strategy

1. **Daily backups** of perfect_phases table (critical reference data)
2. **Weekly backups** of comparison_results table
3. **Monthly archives** of historical data
4. **Point-in-time recovery** enabled for 30 days

## Performance Considerations

1. **JSONB columns**: Use GIN indexes for complex queries
   ```sql
   CREATE INDEX idx_temporal_signals ON perfect_phases USING GIN (temporal_signals);
   ```

2. **Large arrays**: Consider storing temporal signals in separate table if they grow very large
   ```sql
   CREATE TABLE temporal_signal_values (
     id UUID PRIMARY KEY,
     perfect_phase_id UUID REFERENCES perfect_phases(id),
     body_part VARCHAR(100),
     signal_type VARCHAR(50), -- 'position', 'velocity', etc.
     values FLOAT8[] NOT NULL
   );
   ```

3. **Query optimization**: Use EXPLAIN ANALYZE to identify slow queries
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM perfect_phases
   WHERE trick_name = 'backside_360'
     AND phase = 'takeoff';
   ```

## Migration Strategy

### Phase 1: Create tables
```sql
CREATE TABLE perfect_phases (...);
CREATE TABLE signal_sequences (...);
CREATE TABLE comparison_results (...);
CREATE TABLE body_proportions (...);
```

### Phase 2: Add indexes
```sql
CREATE INDEX idx_trick_phase ON perfect_phases(trick_name, phase);
CREATE INDEX idx_rider_id ON comparison_results(rider_id);
```

### Phase 3: Migrate data (if migrating from existing system)
```sql
INSERT INTO perfect_phases (...)
SELECT ... FROM old_perfect_phases;
```

### Phase 4: Validate and cleanup
```sql
-- Verify data integrity
SELECT COUNT(*) FROM perfect_phases;
SELECT COUNT(*) FROM comparison_results;

-- Drop old tables if migration successful
DROP TABLE old_perfect_phases;
```

## Monitoring

### Key metrics to monitor
1. **Table sizes**: `SELECT pg_size_pretty(pg_total_relation_size('perfect_phases'));`
2. **Query performance**: Monitor slow query log
3. **Index usage**: `SELECT * FROM pg_stat_user_indexes;`
4. **Connection count**: Monitor active connections
5. **Disk space**: Monitor available disk space

### Alerts
- Alert if perfect_phases table grows > 10GB
- Alert if comparison_results query takes > 1 second
- Alert if disk space < 20% available
