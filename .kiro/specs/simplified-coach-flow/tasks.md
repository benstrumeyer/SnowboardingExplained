# Implementation Plan

- [ ] 1. Create Coach Personality Configuration
  - [x] 1.1 Create coach-personality.ts with Taevis personality prompt


    - Define personality traits, coaching style, and voice
    - Export function to get coach prompt for different contexts
    - _Requirements: 5.1, 5.2, 5.3_



- [x] 2. Create Query Interpreter
  - [x] 2.1 Create query-interpreter.ts with AI interpretation
    - Use Gemini with coach personality to interpret user input
    - Handle abbreviations, typos, and concepts (not just trick names)
    - Return interpretedMeaning, concepts, and searchTerms


    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 3. Create Tip Extractor
  - [x] 3.1 Create tip-extractor.ts to extract tips from segments
    - Use Gemini with Taevis personality to generate tips


    - Extract exactly 5 tips from transcript segments
    - Map each tip to its source video with timestamp
    - _Requirements: 2.3, 2.4, 3.1, 3.2, 3.3, 3.4_

- [ ] 4. Update Chat API
  - [x] 4.1 Modify chat.ts to use simplified flow




    - Bypass multi-question flow
    - Use query interpreter for AI interpretation
    - Use tip extractor for structured tips
    - Return Taevis-style conversational response
    - _Requirements: 4.2, 4.3, 5.1, 5.2, 5.4_

- [ ] 5. Update Mobile Chat Screen
  - [x] 5.1 Update ChatScreen.tsx with new greeting and flow


    - Show "Hey! I'm Taevis, your snowboarding coach. How can I help you today?"
    - Display tips as cards with video thumbnails
    - Remove multi-question flow UI
    - _Requirements: 4.1, 4.4_

- [ ] 6. Test End-to-End Flow
  - Manually test the full flow from greeting to tips
  - Verify AI interpretation works for various inputs
  - Confirm videos are linked correctly
