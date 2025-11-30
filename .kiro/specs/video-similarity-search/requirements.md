# Requirements Document

## Introduction

This feature implements an intelligent video similarity search system and structured user input flow for the Snowboarding Explained coaching app. The system matches user queries (trick names, techniques) to relevant YouTube tutorial videos using a combination of fuzzy string matching, TF-IDF weighting, and snowboarding-specific synonym expansion. A guided question flow gathers user context before making a single Gemini API call, keeping costs low. Videos shown are primarily sourced from transcript matches, with similarity search filling remaining slots.

## Glossary

- **Video_Search_System**: The backend service that matches user queries to relevant snowboarding tutorial videos
- **TF-IDF**: Term Frequency-Inverse Document Frequency, a statistical measure that evaluates word importance across documents
- **Fuzzy_Matching**: String matching algorithm that finds approximate matches, tolerating typos and misspellings
- **Synonym_Expansion**: Process of converting shorthand/slang terms to their full canonical forms
- **Video_Database**: JSON file containing 129 YouTube video entries with videoId, title, url, and thumbnail
- **Similarity_Score**: Numerical value (0-1) representing how well a video matches a query
- **Question_Flow**: The structured sequence of questions asked to gather user context
- **User_Context**: The collected answers from the question flow used to build the final query
- **Transcript_Videos**: Videos returned from Pinecone semantic search of video transcripts

## Requirements

### Requirement 1

**User Story:** As a snowboarder, I want to search for trick tutorials using common abbreviations and slang, so that I can quickly find relevant videos without typing full trick names.

#### Acceptance Criteria

1. WHEN a user searches with abbreviations like "bs", "fs", "sw" THEN the Video_Search_System SHALL expand these to "backside", "frontside", "switch" before matching
2. WHEN a user searches with number shorthand like "3", "5", "7" THEN the Video_Search_System SHALL expand these to "360", "540", "720" when in trick context
3. WHEN a user searches with combined shorthand like "bs 3" THEN the Video_Search_System SHALL expand to "backside 360"
4. WHEN synonym expansion occurs THEN the Video_Search_System SHALL preserve the original query terms alongside expanded terms for matching

### Requirement 2

**User Story:** As a snowboarder, I want the search to handle my typos and misspellings, so that I still get relevant results even when I make mistakes.

#### Acceptance Criteria

1. WHEN a user types a misspelled query like "backisde" or "frontsdie" THEN the Video_Search_System SHALL return videos matching the intended term with a fuzzy score above 0.6
2. WHEN a user types a partial word like "board" THEN the Video_Search_System SHALL match videos containing "boardslide", "snowboard", "skateboard"
3. WHEN fuzzy matching is performed THEN the Video_Search_System SHALL use Fuse.js library with configurable threshold settings
4. WHEN multiple videos match a fuzzy query THEN the Video_Search_System SHALL rank results by fuzzy match score

### Requirement 3

**User Story:** As a snowboarder, I want search results to prioritize videos with rare/specific terms over generic ones, so that searching "boardslide" returns boardslide tutorials not just any video mentioning "board".

#### Acceptance Criteria

1. WHEN the Video_Search_System initializes THEN it SHALL compute TF-IDF weights for all terms across the 129 video titles
2. WHEN a search query contains a rare term (low document frequency) THEN the Video_Search_System SHALL boost that term's contribution to the final score
3. WHEN a search query contains common terms like "how", "to", "snowboard" THEN the Video_Search_System SHALL reduce their weight in scoring
4. WHEN TF-IDF scores are computed THEN the Video_Search_System SHALL normalize scores to a 0-1 range

### Requirement 4

**User Story:** As a snowboarder, I want to see the most relevant videos first, so that I don't have to scroll through irrelevant results.

#### Acceptance Criteria

1. WHEN computing final relevance scores THEN the Video_Search_System SHALL combine fuzzy score (50%), TF-IDF score (30%), and synonym match bonus (20%)
2. WHEN returning search results THEN the Video_Search_System SHALL sort by final combined score in descending order
3. WHEN a query matches a video title exactly (after synonym expansion) THEN the Video_Search_System SHALL boost that video's score by 1.5x
4. WHEN returning results THEN the Video_Search_System SHALL include the similarity score with each video for transparency

### Requirement 5

**User Story:** As a developer, I want all search computations to happen locally without API calls, so that the app remains fast and cost-effective.

#### Acceptance Criteria

1. WHEN the backend server starts THEN the Video_Search_System SHALL pre-compute and cache TF-IDF weights for all video titles
2. WHEN a search query is received THEN the Video_Search_System SHALL complete the search without making any external API calls
3. WHEN the video database is updated THEN the Video_Search_System SHALL provide a script to regenerate TF-IDF weights
4. WHEN search is performed THEN the Video_Search_System SHALL return results within 50ms for typical queries

### Requirement 6

**User Story:** As a snowboarder, I want to see 5 relevant videos with my coaching results, so that I have video resources to learn from.

#### Acceptance Criteria

1. WHEN the chat API returns coaching results THEN it SHALL include a videos array with exactly 5 videos (or fewer if not enough exist)
2. WHEN Transcript_Videos from Pinecone provide fewer than 5 videos THEN the Video_Search_System SHALL fill remaining slots using title similarity search
3. WHEN no transcript matches exist THEN the Video_Search_System SHALL return 5 videos based on title similarity alone
4. WHEN returning videos THEN each entry SHALL include videoId, title, url, thumbnail, timestamp (if from transcript), and quote (if from transcript)

### Requirement 7

**User Story:** As a snowboarder, I want to answer guided questions about my trick attempt, so that I get personalized coaching advice.

#### Acceptance Criteria

1. WHEN a user starts a coaching session THEN the Question_Flow SHALL ask questions in this order: trick name, feature size, pre-trick status, edge transfers, issues, spot landing, consistency, control
2. WHEN a question is asked THEN the Question_Flow SHALL provide predefined answer options where applicable (e.g., feature size: small/medium/large/xl/flat)
3. WHEN a user provides an answer THEN the Question_Flow SHALL store it in User_Context and proceed to the next question
4. WHEN all questions are answered THEN the Question_Flow SHALL trigger the final Gemini API call with the complete User_Context

### Requirement 8

**User Story:** As a snowboarder, I want to skip remaining questions when I've provided enough context, so that I can get coaching faster.

#### Acceptance Criteria

1. WHEN a user indicates they want to skip (e.g., "that's all", "skip", "done") THEN the Question_Flow SHALL stop asking questions
2. WHEN the user skips THEN the Question_Flow SHALL proceed to the final Gemini API call with whatever User_Context has been collected
3. WHEN skipping occurs THEN the Video_Search_System SHALL still function with partial User_Context
4. WHEN fewer context fields are provided THEN the coaching response SHALL still be generated using available information

### Requirement 9

**User Story:** As a developer, I want the question flow to be easily extensible, so that I can add or modify questions without major refactoring.

#### Acceptance Criteria

1. WHEN defining questions THEN the Question_Flow SHALL use a configuration-driven approach with question definitions in a separate data structure
2. WHEN a question definition exists THEN it SHALL include: id, prompt text, answer type (free text, single choice, multiple choice), options (if applicable), and optional flag
3. WHEN adding a new question THEN a developer SHALL only need to add an entry to the question configuration
4. WHEN the question order needs to change THEN a developer SHALL only need to reorder the configuration array


### Requirement 10

**User Story:** As a snowboarder, I want a sidebar to switch modes and view chat history, so that I can navigate the app and continue previous sessions.

#### Acceptance Criteria

1. WHEN a user swipes right or taps a menu icon THEN a sidebar SHALL slide out from the left (similar to ChatGPT)
2. WHEN the sidebar is open THEN it SHALL display from top to bottom: Text Mode button, Voice Mode button, margin/separator, then chat history grouped by trick
3. WHEN a user taps Text Mode or Voice Mode THEN the app SHALL switch to that input mode and close the sidebar
4. WHEN a user taps a previous chat THEN the app SHALL load that conversation and its context
5. WHEN a new coaching session completes THEN the app SHALL save it to chat history with the trick name as the grouping key
6. WHEN the active mode changes THEN the sidebar SHALL highlight the currently active mode button

### Requirement 11

**User Story:** As a snowboarder, I want to use voice input for coaching, so that I can get help hands-free while on the mountain.

#### Acceptance Criteria

1. WHEN a user selects Voice Mode from the sidebar THEN the app SHALL display a voice input interface with a microphone button
2. WHEN a user speaks THEN the app SHALL transcribe speech to text in real-time
3. WHEN voice input is transcribed THEN it SHALL appear in the same chat interface as text input
4. WHEN voice transcription completes THEN the app SHALL process it identically to typed text input
5. WHEN selecting a voice API THEN the system SHALL use a cost-effective solution (Web Speech API, Whisper, or Deepgram)

### Requirement 12

**User Story:** As a snowboarder, I want follow-up conversations after the initial coaching, so that I can ask clarifying questions.

#### Acceptance Criteria

1. WHEN the initial coaching response is delivered (with 5 videos) THEN the app SHALL allow follow-up questions
2. WHEN a user asks a follow-up question THEN the Video_Search_System SHALL return 1 relevant video and 1 similar video suggestion
3. WHEN in follow-up mode THEN the app SHALL maintain the original User_Context for relevance
4. WHEN a follow-up is a simple/direct question THEN the response SHALL be concise without repeating full coaching advice
