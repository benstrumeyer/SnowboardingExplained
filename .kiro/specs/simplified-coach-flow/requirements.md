# Requirements Document

## Introduction

A simplified snowboard coaching experience that acts as a full coach to help users every step of the way. The system asks a single question ("What trick are you working on?"), uses AI to interpret the user's intent (handling typos, abbreviations, slang), and returns 5 actionable tips with associated video references from the transcript database. The multi-question flow is disabled in favor of a more conversational, responsive coaching experience.

## Glossary

- **Coach**: The AI-powered snowboarding assistant that provides personalized tips and video recommendations
- **Trick Query**: The user's input describing what trick they want to learn (may include typos, abbreviations like "bs 180", slang)
- **Interpreted Query**: The AI-normalized version of the user's input (e.g., "bs 180" → "backside 180")
- **Tip**: A specific, actionable piece of coaching advice derived from video transcript content
- **Video Reference**: A link to a specific YouTube video and timestamp where the tip's content originates
- **Transcript Segment**: A chunk of video transcript stored in Pinecone with embeddings

## Requirements

### Requirement 1

**User Story:** As a snowboarder, I want to ask about any trick using natural language, so that I don't have to know exact terminology.

#### Acceptance Criteria

1. WHEN a user submits a trick query THEN the Coach SHALL use AI to interpret the intended trick name
2. WHEN the query contains abbreviations (bs, fs, sw, 3, 5, 7, 180, 360, etc.) THEN the Coach SHALL expand them to full terms
3. WHEN the query contains typos or misspellings THEN the Coach SHALL correct them and identify the intended trick
4. WHEN the AI interprets the query THEN the Coach SHALL include the interpreted trick name in the response

### Requirement 2

**User Story:** As a snowboarder, I want to receive exactly 5 actionable tips for my trick, so that I have clear guidance on what to work on.

#### Acceptance Criteria

1. WHEN a trick query is processed THEN the Coach SHALL use AI to interpret the user's intent and search Pinecone for relevant transcript segments
2. WHEN searching Pinecone THEN the Coach SHALL generate an embedding from the interpreted query and retrieve the top matching segments
3. WHEN transcript segments are found THEN the Coach SHALL extract exactly 5 tips from the actual transcript text
4. WHEN a tip is generated THEN the Coach SHALL ensure the tip is specific and actionable (not generic advice)
5. WHEN tips are returned THEN the Coach SHALL order them by relevance to the user's query

### Requirement 3

**User Story:** As a snowboarder, I want each tip to have an associated video, so that I can watch the source content.

#### Acceptance Criteria

1. WHEN a tip is derived from a transcript segment THEN the Coach SHALL include the associated YouTube video reference
2. WHEN a video reference is included THEN the Coach SHALL provide the video title, URL with timestamp parameter, and videoId
3. WHEN the timestamp is provided THEN the Coach SHALL link to the exact moment in the video where the tip content appears (using &t= parameter)
4. WHEN displaying video references THEN the Coach SHALL include a thumbnail image from YouTube (img.youtube.com/vi/{videoId}/maxresdefault.jpg)

### Requirement 4

**User Story:** As a snowboarder, I want a simple one-question experience, so that I can get help quickly without answering many questions.

#### Acceptance Criteria

1. WHEN the chat starts THEN the Coach SHALL greet the user with "Hey! I'm Taevis, your snowboarding coach. How can I help you today?"
2. WHEN the user responds THEN the Coach SHALL immediately process and return tips (no follow-up questions)
3. WHEN the multi-question flow code exists THEN the Coach SHALL bypass it and use the simplified flow
4. WHEN the user wants to ask about a different trick THEN the Coach SHALL allow starting a new conversation

### Requirement 5

**User Story:** As a snowboarder, I want the coach to feel conversational and supportive, so that I feel guided through my learning.

#### Acceptance Criteria

1. WHEN returning tips THEN the Coach SHALL include a friendly introductory message acknowledging the trick
2. WHEN the interpreted trick differs from the input THEN the Coach SHALL confirm the interpretation (e.g., "Got it, you're working on a backside 180!")
3. WHEN providing tips THEN the Coach SHALL use encouraging, supportive language
4. WHEN no relevant content is found THEN the Coach SHALL provide a helpful fallback message and suggest alternatives

### Requirement 6

**User Story:** As a snowboarder, I want to ask follow-up questions about my trick, so that I can get deeper coaching.

#### Acceptance Criteria

1. WHEN a user sends a follow-up message after receiving tips THEN the Coach SHALL maintain context about the original trick
2. WHEN processing a follow-up THEN the Coach SHALL search for content relevant to both the trick and the follow-up question
3. WHEN returning follow-up responses THEN the Coach SHALL provide 1-3 additional tips with video references
4. WHEN the follow-up is unrelated to snowboarding THEN the Coach SHALL redirect to snowboarding topics
