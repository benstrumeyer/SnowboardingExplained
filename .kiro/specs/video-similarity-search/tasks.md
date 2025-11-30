# Implementation Plan

- [x] 1. Implement Synonym Expander

  - [x] 1.1 Create synonym mapping dictionary with snowboarding abbreviations (bs, fs, sw, 3, 5, 7, etc.)


    - Define mappings for directions, rotations, tricks, and grabs
    - _Requirements: 1.1, 1.2_
  - [x] 1.2 Implement expand() function that processes query strings

    - Handle combined shorthand like "bs 3" → "backside 360"
    - Preserve original terms alongside expanded terms
    - _Requirements: 1.3, 1.4_
  - [ ]* 1.3 Write property test for synonym expansion
    - **Property 1: Synonym expansion preserves original terms**
    - **Validates: Requirements 1.4**


- [ ] 2. Implement TF-IDF Scorer
  - [x] 2.1 Create TF-IDF initialization function


    - Compute term frequency for each title
    - Compute document frequency across all 129 titles
    - Calculate inverse document frequency weights
    - _Requirements: 3.1_
  - [x] 2.2 Implement score() function for query-title matching

    - Normalize scores to 0-1 range
    - Weight rare terms higher than common terms
    - _Requirements: 3.2, 3.3, 3.4_
  - [ ]* 2.3 Write property tests for TF-IDF
    - **Property 4: TF-IDF scores are normalized**
    - **Property 5: Rare terms score higher than common terms**
    - **Validates: Requirements 3.2, 3.3, 3.4**

- [x] 3. Implement Fuzzy Search with Fuse.js

  - [x] 3.1 Install and configure Fuse.js with optimized settings


    - Set threshold to 0.4 for typo tolerance
    - Use ignoreLocation: true for better partial matches
    - Set minMatchCharLength: 2 to avoid noise
    - Pre-create Fuse index at startup (not per-search)
    - _Requirements: 2.3_
  - [x] 3.2 Implement fuzzy search wrapper function

    - Return results with fuzzy scores
    - Handle partial word matches
    - _Requirements: 2.1, 2.2_
  - [ ]* 3.3 Write property test for fuzzy matching
    - **Property 2: Fuzzy matching returns results above threshold**
    - **Validates: Requirements 2.1**

- [ ] 4. Implement Score Combiner
  - [x] 4.1 Create combine() function with weighted scoring


    - 50% fuzzy score + 30% TF-IDF + 20% synonym bonus
    - Apply 1.5x multiplier for exact matches
    - _Requirements: 4.1, 4.3_

  - [ ] 4.2 Implement result sorting by combined score
    - Sort descending by final score
    - Include similarity score in each result
    - _Requirements: 4.2, 4.4_
  - [ ]* 4.3 Write property tests for score combiner
    - **Property 3: Results are sorted by combined score**
    - **Property 6: Combined score formula is correct**
    - **Property 7: Results include similarity scores**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

- [x] 5. Integrate Video Search Service

  - [x] 5.1 Refactor video-search.ts to use new search components


    - Initialize TF-IDF weights on module load
    - Wire up synonym → fuzzy → TF-IDF → combiner pipeline
    - _Requirements: 5.1, 5.2_
  - [x] 5.2 Update chat API to fill video slots with similarity search


    - Use transcript videos first, fill remaining with similarity
    - Return exactly 5 videos (or fewer if not enough exist)
    - _Requirements: 6.1, 6.2, 6.3_
  - [ ]* 5.3 Write property test for video slot filling
    - **Property 8: Video array fills to 5 with similarity search**
    - **Validates: Requirements 6.1, 6.2**

- [ ] 6. Checkpoint - Ensure all search tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement Question Flow Manager
  - [x] 7.1 Create question configuration data structure


    - Define 8 questions with id, prompt, type, options, optional flag, contextKey
    - Questions: trick, featureSize, preTrick, edgeTransfers, issues, spotLanding, consistency, control
    - _Requirements: 9.1, 9.2_
  - [x] 7.2 Implement QuestionFlowManager class

    - getCurrentQuestion(), submitAnswer(), skip(), isComplete(), getContext()
    - Store answers in UserContext
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ] 7.3 Implement skip detection
    - Detect "that's all", "skip", "done" commands
    - Halt flow and proceed to API call with partial context
    - _Requirements: 8.1, 8.2_
  - [ ]* 7.4 Write property tests for question flow
    - **Property 9: Question flow stores answers in context**
    - **Property 10: Skip commands halt question flow**
    - **Property 11: Partial context triggers API call**
    - **Validates: Requirements 7.3, 8.1, 8.2, 8.4**

- [ ] 8. Implement Follow-up Mode
  - [x] 8.1 Add follow-up detection in chat API


    - Detect when initial coaching is complete
    - Maintain original UserContext for follow-ups
    - _Requirements: 12.1, 12.3_
  - [x] 8.2 Implement reduced video response for follow-ups

    - Return 1 relevant video + 1 similar video suggestion
    - _Requirements: 12.2_
  - [ ]* 8.3 Write property tests for follow-up mode
    - **Property 12: Follow-up responses return correct video count**
    - **Property 13: Context persists across follow-ups**
    - **Validates: Requirements 12.2, 12.3**

- [ ] 9. Checkpoint - Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Implement Sidebar Component
  - [x] 10.1 Create Sidebar component with slide-out animation


    - Slide from left on swipe right or menu icon tap
    - Display "Snowboarding Explained" header
    - _Requirements: 10.1_

  - [ ] 10.2 Add Text Mode and Voice Mode buttons
    - Text Mode (📝) and Voice Mode (🔊) buttons
    - Highlight active mode

    - _Requirements: 10.2, 10.3, 10.6_
  - [ ] 10.3 Implement chat history section
    - Group chats by trick name
    - Load conversation on tap
    - _Requirements: 10.4, 10.5_


- [ ] 11. Implement Voice Input
  - [x] 11.1 Set up voice input library

    - Use react-native-voice for mobile
    - Configure Web Speech API fallback for web
    - _Requirements: 11.5_

  - [ ] 11.2 Create Voice Mode screen
    - Microphone button to start/stop recording
    - Real-time transcription display

    - _Requirements: 11.1, 11.2_
  - [ ] 11.3 Integrate voice transcription with chat
    - Transcribed text appears in chat interface
    - Process identically to typed input
    - _Requirements: 11.3, 11.4_



- [x] 12. Implement Chat History Persistence

  - [ ] 12.1 Create chat storage service
    - Save chats to AsyncStorage/localStorage
    - Group by trick name
    - _Requirements: 10.5_
  - [x] 12.2 Implement chat loading


    - Load previous conversation and context
    - Resume from where user left off

    - _Requirements: 10.4_

- [ ] 13. Update Main Chat Interface
  - [ ] 13.1 Remove header/navbar from text mode screen
    - Clean interface with just chat and input
    - Menu icon (☰) to open sidebar
    - _Requirements: 10.1_
  - [x] 13.2 Integrate question flow with chat UI

    - Display questions as chat messages
    - Show predefined options as buttons
    - _Requirements: 7.1, 7.2_

- [ ] 14. Final Checkpoint - Full integration test
  - Ensure all tests pass, ask the user if questions arise.
