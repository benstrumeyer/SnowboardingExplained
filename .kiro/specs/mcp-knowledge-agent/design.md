# Design Document: AI Snowboarding Coach

## Overview

The AI Snowboarding Coach is a diagnostic system that breaks down trick execution into five distinct phases and helps riders identify and fix problems at each stage. The system understands that tricks require precise sequencing and timing, and can interpret natural language problem descriptions (like "overrotated backside 180 with toe edge catch") to pinpoint the exact phase and root cause. The LLM becomes a diagnostic expert that:

- Interprets natural language problem descriptions and maps them to specific phases
- Identifies root causes by understanding phase requirements and common failures
- Provides phase-specific fixes with video references
- Recommends progressions based on phase mastery
- Explains how fundamental concepts apply to each phase

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Mobile App / Web Client                   │
│  (User describes problem: "overrotated backside 180")        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Chat API Endpoint                         │
│  (Receives user message, manages conversation)              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  LLM (Claude/Gemini)                         │
│  (Diagnostic expert: interprets problem, identifies phase)  │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  MCP Server  │  │  MCP Server  │  │  MCP Server  │
│  (Phases &   │  │  (Problems & │  │  (Concepts) │
│   Tricks)    │  │   Fixes)     │  │              │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       └─────────────────┼─────────────────┘
                         │
                         ▼
                  ┌──────────────┐
                  │   MongoDB    │
                  │ Knowledge DB │
                  │ (Phase-based)│
                  └──────────────┘
```

## Components and Interfaces

### 1. MCP Server (Node.js/TypeScript)

Exposes tools that the LLM can call:

```typescript
interface MCPTool {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, any>;
    required: string[];
  };
  handler: (params: any) => Promise<any>;
}
```

### 2. Tool Categories

#### Trick & Phase Tools
- `get_trick_phases(trick_name: string)` → All five phases with requirements
- `get_phase_requirements(trick_name: string, phase: string)` → Specific phase technical requirements
- `get_phase_video(trick_name: string, phase: string)` → Video timestamps for specific phase
- `get_trick_info(trick_name: string)` → Overall trick difficulty and prerequisites

#### Problem Diagnosis Tools
- `diagnose_problem(trick_name: string, problem_description: string)` → Identifies phase, root cause, and severity
- `get_phase_problems(trick_name: string, phase: string)` → All common problems at a specific phase
- `get_problem_causes(trick_name: string, phase: string, problem: string)` → Root causes ranked by likelihood
- `clarify_problem(problem_description: string, context: string)` → Asks clarifying questions for ambiguous problems

#### Fix & Solution Tools
- `get_phase_fixes(trick_name: string, phase: string, problem: string)` → Phase-specific fixes ranked by effectiveness
- `get_fix_video(trick_name: string, phase: string, fix: string)` → Video showing correct execution of fix
- `get_concept_application(concept_name: string, trick_name: string, phase: string)` → How concept applies to phase

#### Progression Tools
- `get_phase_progression(current_trick: string, mastered_phases: string[])` → Next tricks based on phase mastery
- `get_phase_prerequisites(trick_name: string, phase: string)` → Tricks that teach this phase
- `get_progression_path(goal_trick: string, current_level: string)` → Full progression with phase milestones

#### Concept Tools
- `get_concept_info(concept_name: string)` → Concept definition and importance
- `get_concept_by_phase(concept_name: string, trick_name: string)` → How concept applies across phases
- `find_tricks_by_concept(concept_name: string)` → Tricks that use this concept

### 3. MongoDB Schema

```typescript
// Tricks Collection
{
  _id: ObjectId,
  name: string,                    // "backside-360"
  difficulty: number,              // 1-10
  prerequisites: string[],         // ["backside-180", "rotation"]
  phases: [
    {
      name: string,                // "setup carve", "windup", "throw", "lip timing", "momentum/body position off takeoff"
      requirements: [{
        requirement: string,       // "maintain edge control"
        body_position: string,     // "shoulders aligned with hips"
        timing: string,            // "throughout phase"
        edge_control: string,      // "toe edge"
        rotation_target: number    // degrees
      }],
      common_problems: [{
        problem: string,           // "toe edge catch"
        causes: [{
          cause: string,           // "lost edge control"
          frequency: string        // "common", "rare"
        }],
        fixes: [{
          fix: string,             // "focus on weight distribution"
          difficulty: string,      // "easy", "medium", "hard"
          video_timestamp: number
        }]
      }],
      video_url: string,
      video_timestamp: number
    }
  ],
  concepts: string[],              // ["edge control", "rotation", "timing"]
  created_at: Date
}

// Problems Collection
{
  _id: ObjectId,
  name: string,                    // "toe edge catch"
  description: string,
  tricks_affected: string[],       // tricks where this can happen
  phases_affected: string[],       // which phases this occurs in
  causes: [{
    cause: string,                 // "lost edge control"
    technical_reason: string,      // why this causes the problem
    frequency: string              // "common", "rare"
  }],
  fixes: [{
    fix: string,
    phase_specific: boolean,
    applicable_phases: string[],
    difficulty: string,
    video_reference: {
      trick: string,
      phase: string,
      timestamp: number
    }
  }],
  related_concepts: string[],      // concepts that prevent this
  severity: string                 // "minor", "major", "critical"
}

// Concepts Collection
{
  _id: ObjectId,
  name: string,                    // "edge control"
  definition: string,
  importance: string,              // "critical", "important", "helpful"
  applies_to_phases: {
    [trick_name]: [phase_names]    // which phases in which tricks
  },
  related_problems: string[],      // problems this concept prevents
  techniques: [{
    technique: string,
    description: string,
    tricks: string[]
  }],
  created_at: Date
}

// Progressions Collection
{
  _id: ObjectId,
  from_trick: string,
  to_trick: string,
  new_phases_introduced: string[], // which phases are new
  phase_progression: [{
    phase: string,
    from_trick_requirement: string,
    to_trick_requirement: string,
    difficulty_increase: number
  }],
  created_at: Date
}
```

## Data Models

### Tool Response Format

All tools return consistent JSON:

```typescript
interface ToolResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  metadata?: {
    query_time_ms: number;
    cache_hit: boolean;
  };
}
```

### LLM Tool Call Format

```typescript
interface ToolCall {
  tool_name: string;
  parameters: Record<string, any>;
  reasoning: string;  // Why the LLM is calling this tool
}

interface ToolCallResult {
  tool_name: string;
  result: any;
  success: boolean;
}
```

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Phase Completeness
*For any* trick in the knowledge base, all five phases (setup carve, windup, throw, lip timing, momentum/body position off takeoff) SHALL be defined with requirements and common problems.
**Validates: Requirements 1.1, 1.2**

### Property 2: Problem-Phase Consistency
*For any* problem in the knowledge base, all tricks and phases listed as affected SHALL have that problem listed in their common_problems array.
**Validates: Requirements 2.1, 2.2**

### Property 3: Fix Applicability
*For any* fix returned for a problem at a specific phase, the fix SHALL be applicable to that phase and not contradict other fixes for the same problem.
**Validates: Requirements 3.1, 3.2, 3.3**

### Property 4: Problem Diagnosis Accuracy
*For any* problem description provided by a user, the system SHALL identify the correct trick and at least one valid phase where the problem could occur.
**Validates: Requirements 2.1, 2.2, 2.3**

### Property 5: Concept-Phase Mapping
*For any* concept in the knowledge base, all tricks and phases listed as using that concept SHALL have that concept listed in their requirements.
**Validates: Requirements 6.1, 6.2**

### Property 6: Progression Phase Mastery
*For any* progression from trick A to trick B, the new phases introduced in trick B SHALL build on phases already mastered in trick A.
**Validates: Requirements 5.1, 5.2, 5.3**

### Property 7: Video Timestamp Validity
*For any* video timestamp returned by a tool, the timestamp SHALL be within the video duration and correspond to the correct phase.
**Validates: Requirements 7.1, 7.2**

### Property 8: Problem Cause Ranking
*For any* problem with multiple causes, the causes SHALL be ranked by frequency and the most common cause SHALL be listed first.
**Validates: Requirements 2.2, 2.3**

### Property 9: Clarification Question Relevance
*For any* ambiguous problem description, clarifying questions SHALL be specific to the problem and help narrow down the phase or root cause.
**Validates: Requirements 9.1, 9.2, 9.3**

### Property 10: Query Performance
*For any* tool query, the response time SHALL be less than 100ms for cached queries and less than 500ms for uncached queries.
**Validates: Requirements 10.1, 10.2**

## Error Handling

- Invalid parameters → Return 400 with parameter schema
- Database connection failure → Return 503 with retry suggestion
- Query timeout → Return 504 with partial results if available
- Missing data → Return 404 with suggestions for related queries
- LLM tool call failure → LLM handles gracefully and tries alternative tools

## Testing Strategy

### Unit Testing
- Test each MCP tool independently with valid and invalid inputs
- Test MongoDB queries with sample data
- Test parameter validation for all tools
- Test error handling for each failure mode

### Property-Based Testing
- Generate random tricks and verify progression consistency
- Generate random concepts and verify no cycles exist
- Generate random tool calls and verify response format
- Generate random knowledge base updates and verify cache invalidation

### Integration Testing
- Test LLM chaining multiple tool calls
- Test end-to-end user queries with various intents
- Test knowledge base consistency across all tools
- Test performance under load

### Performance Testing
- Measure query response times
- Verify cache hit rates
- Test with large knowledge bases (10,000+ tricks/tips)
- Measure LLM token usage for tool calls
