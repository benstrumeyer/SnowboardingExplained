# Requirements Document: AI Snowboarding Coach

## Introduction

The AI Snowboarding Coach is a diagnostic tool that helps riders understand and fix technical issues in their tricks. Rather than just showing videos, it analyzes problems at each phase of the trick execution (setup, windup, throw, lip timing, takeoff) and provides targeted fixes. The system understands that tricks require precise sequencing and timing, and can diagnose issues like "overrotated backside 180 with toe edge catch" by breaking down what went wrong at each phase and how to correct it.

## Glossary

- **Trick**: A specific snowboarding maneuver (e.g., backside-360, frontside-boardslide)
- **Phase**: A distinct stage in trick execution (setup carve, windup, throw, lip timing, momentum/body position off takeoff)
- **Phase Requirement**: A specific technical requirement that must be executed correctly during a phase
- **Common Problem**: A specific issue that can occur during a phase (e.g., toe edge catch, overrotation, late rotation)
- **Problem Cause**: The root technical issue causing a problem (e.g., incorrect body position, timing error, edge control failure)
- **Fix**: A specific action or adjustment to correct a problem at a particular phase
- **Progression Path**: The recommended sequence of tricks to learn from one skill level to another
- **Concept**: A fundamental snowboarding principle that applies across multiple tricks (e.g., edge control, weight distribution)

## Requirements

### Requirement 1: Trick Phase Breakdown

**User Story:** As a coach, I want to understand every phase of a trick execution, so that I can diagnose issues at each stage.

#### Acceptance Criteria

1. WHEN querying a trick THEN the system SHALL return all five phases (setup carve, windup, throw, lip timing, momentum/body position off takeoff)
2. WHEN querying a phase THEN the system SHALL return the specific technical requirements for that phase
3. WHEN querying phase requirements THEN the system SHALL include body position, edge control, timing, and rotation targets
4. WHEN a trick has phase-specific variations THEN the system SHALL return different requirements based on trick type (spin, flip, grab, etc.)

### Requirement 2: Problem Diagnosis by Phase

**User Story:** As a rider, I want to describe my problem and get diagnosed at the exact phase where it's happening, so that I can fix it precisely.

#### Acceptance Criteria

1. WHEN a user describes a problem (e.g., "overrotated backside 180 with toe edge catch") THEN the system SHALL identify the trick, the problem, and the phase where it occurs
2. WHEN diagnosing a problem THEN the system SHALL return the root cause (what technical failure caused this)
3. WHEN a problem could occur in multiple phases THEN the system SHALL return all possible phases ranked by likelihood
4. WHEN a problem is ambiguous THEN the system SHALL ask clarifying questions about timing or body position

### Requirement 3: Phase-Specific Fixes

**User Story:** As a coach, I want to provide fixes that are specific to the phase where the problem occurred, so that riders know exactly what to adjust.

#### Acceptance Criteria

1. WHEN a problem is diagnosed at a specific phase THEN the system SHALL return fixes specific to that phase
2. WHEN returning a fix THEN the system SHALL include what to adjust, how to adjust it, and why it matters
3. WHEN a fix requires video reference THEN the system SHALL return video timestamps showing the correct execution at that phase
4. WHEN multiple fixes could work THEN the system SHALL rank them by effectiveness and difficulty

### Requirement 4: Common Problems by Phase

**User Story:** As a coach, I want to know all the problems that can happen at each phase, so that I can anticipate issues.

#### Acceptance Criteria

1. WHEN querying a trick and phase THEN the system SHALL return all common problems that occur at that phase
2. WHEN returning problems THEN the system SHALL include the problem name, causes, and typical fixes
3. WHEN a problem has multiple causes THEN the system SHALL list all possible causes ranked by frequency
4. WHEN a problem is rare but serious THEN the system SHALL flag it with severity level

### Requirement 5: Trick Progression with Phase Mastery

**User Story:** As a coach, I want to recommend tricks based on which phases the rider has mastered, so that progression is safe and logical.

#### Acceptance Criteria

1. WHEN querying prerequisites for a trick THEN the system SHALL return tricks that teach each phase requirement
2. WHEN a rider has mastered certain phases THEN the system SHALL recommend tricks that build on those phases
3. WHEN recommending a progression THEN the system SHALL explain which new phases the next trick introduces
4. WHEN a progression is too difficult THEN the system SHALL suggest intermediate tricks that bridge the gap

### Requirement 6: Concept Application Across Phases

**User Story:** As a coach, I want to explain how fundamental concepts apply to each phase, so that riders understand the bigger picture.

#### Acceptance Criteria

1. WHEN querying a concept (e.g., edge control) THEN the system SHALL return how it applies to each phase of different tricks
2. WHEN a problem is caused by a concept failure THEN the system SHALL explain which concept is failing and why
3. WHEN teaching a concept THEN the system SHALL return examples from multiple tricks showing the concept in action
4. WHEN a concept is critical to a phase THEN the system SHALL flag it and provide extra resources

### Requirement 7: Video Reference by Phase

**User Story:** As a rider, I want to see video examples of correct execution at each phase, so that I can visualize what I need to do.

#### Acceptance Criteria

1. WHEN querying a trick phase THEN the system SHALL return video URLs with timestamps for that specific phase
2. WHEN returning a video THEN the system SHALL include the phase name, what to look for, and common mistakes to avoid
3. WHEN multiple videos show the same phase THEN the system SHALL rank them by clarity and relevance
4. WHEN no video exists for a phase THEN the system SHALL suggest related tricks with similar phase requirements

### Requirement 8: Knowledge Base Structure for Phase-Based Coaching

**User Story:** As a data architect, I want a schema that supports phase-based diagnosis, so that queries are efficient and accurate.

#### Acceptance Criteria

1. WHEN storing a trick THEN the system SHALL include all five phases with their requirements, common problems, and fixes
2. WHEN storing a problem THEN the system SHALL include which phase it occurs in, root causes, and phase-specific fixes
3. WHEN storing a concept THEN the system SHALL include how it applies to each phase of different tricks
4. WHEN storing a video THEN the system SHALL include phase timestamps and what to look for at each phase

### Requirement 9: Problem Interpretation and Clarification

**User Story:** As a coach, I want to understand ambiguous problem descriptions, so that I can diagnose accurately even when riders aren't precise.

#### Acceptance Criteria

1. WHEN a user describes a problem with unclear timing THEN the system SHALL ask clarifying questions about which phase
2. WHEN a user mentions multiple issues THEN the system SHALL identify which is the primary issue and which are secondary
3. WHEN a problem description uses non-standard terminology THEN the system SHALL map it to standard snowboarding terms
4. WHEN a problem could be multiple things THEN the system SHALL ask about body position, edge, or timing to narrow it down

### Requirement 10: Performance and Caching

**User Story:** As a user, I want fast responses from the coaching system, so that the experience feels responsive.

#### Acceptance Criteria

1. WHEN querying frequently accessed data THEN the system SHALL return results within 100ms
2. WHEN the same query is made multiple times THEN the system SHALL cache results for 5 minutes
3. WHEN the knowledge base is updated THEN the system SHALL invalidate relevant caches
4. WHEN a query would be slow THEN the system SHALL return partial results with a note about limitations
