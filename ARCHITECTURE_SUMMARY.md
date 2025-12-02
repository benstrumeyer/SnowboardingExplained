# AI Snowboarding Coach - Architecture Summary

## Current Direction
We're building a **knowledge base with a natural language interface**, not a smart AI assistant. The system is a searchable database of snowboarding trick knowledge that the LLM queries to provide context for answers.

## Core Concept
- **MCP Tools = API Endpoints** that the LLM calls to fetch relevant data
- **LLM = Orchestrator** that interprets user problems and calls tools to gather context
- **User Query Example**: "Why does my backside 180 not work? I am sliding out after landing"
- **System Response**: LLM identifies trick → calls tools to get phases/problems/fixes → synthesizes answer

## Architecture Overview

```
User Query
    ↓
Chat API
    ↓
LLM (Claude/Gemini) - Interprets problem, decides what data to fetch
    ↓
MCP Server (Node.js/TypeScript) - Exposes data retrieval tools
    ↓
MongoDB - Stores structured trick knowledge
```

## Data Structure (MongoDB)

Each trick has 8-10 sequential steps/phases:
1. Approach
2. Pop/Ollie
3. Rotation Initiation
4. Mid-air Positioning
5. Landing Preparation
6. Landing
7. Edge Control Post-landing
8. Ride Away

Each step contains:
- **Requirements**: What needs to happen correctly (e.g., "maintain edge control")
- **Common Problems**: Issues that can occur (e.g., "sliding out after landing")
- **Root Causes**: Why it happens (e.g., "landing on edge, not enough edge control")
- **Fixes**: How to correct it (e.g., "land flat, keep weight centered")
- **Video Timestamp**: Where in the tutorial video to see this

## MCP Tools Needed

### 1. Trick & Phase Tools
- `get_trick_steps(trick_name)` → All 8-10 steps with requirements
- `get_step_requirements(trick_name, step_number)` → Specific step details
- `get_phase_video(trick_name, step_number)` → Video URL + timestamp

### 2. Problem Diagnosis Tools
- `get_problems_by_symptom(symptom, trick_name)` → Problems matching symptom + which steps
- `get_problem_causes(trick_name, step_number, problem)` → Root causes ranked by likelihood
- `get_step_fixes(trick_name, step_number, problem)` → Fixes ranked by effectiveness

### 3. Progression Tools
- `get_progression_for_step(trick_name, step_number)` → Easier tricks that teach this step
- `get_next_tricks(current_trick)` → Recommended next tricks

### 4. Concept Tools
- `get_concept_info(concept_name)` → Definition and importance
- `get_concept_by_step(concept_name, trick_name, step_number)` → How concept applies

## Data Population Strategy

### Phase 1: Programmatic Extraction
1. Use LLM to parse existing video transcripts (from pinecone-dump.json)
2. Extract: steps, problems, causes, fixes, timestamps
3. Generate structured JSON for each trick

### Phase 2: Manual Review & Fill Blanks
1. Generate review templates showing extracted data
2. Manually fill in: difficulty level, prerequisites, concepts, missing timestamps
3. Validate extracted information

### Phase 3: Load to MongoDB
1. Convert reviewed data to MongoDB documents
2. Create indexes for fast queries
3. Populate MCP tools with data

## Key Files
- `.kiro/specs/mcp-knowledge-agent/requirements.md` - Feature requirements
- `.kiro/specs/mcp-knowledge-agent/design.md` - System design & data models
- `.kiro/specs/mcp-knowledge-agent/tasks.md` - Implementation tasks
- `data-pipeline/data/pinecone-dump.json` - Existing video transcripts (source data)

## Next Steps
1. Create LLM extraction script to parse transcripts
2. Generate review templates for manual validation
3. Build MCP server with MongoDB connection
4. Implement the 4 tool categories
5. Integrate with existing chat API
6. Test end-to-end with sample queries

## Important Notes
- This is NOT trying to teach the AI snowboarding - it's providing structured data for the LLM to reference
- The LLM's job is to interpret natural language problems and fetch relevant context
- All domain knowledge lives in the database, not in the LLM
- Scope is realistic: diagnostic tool for existing tricks, not a full AI coach
