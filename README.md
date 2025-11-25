# Snowboarding Coach AI

An AI-powered snowboarding coach mobile app trained on Snowboarding Explained YouTube channel content. Chat with your pocket coach on the chairlift.

## Overview

This app provides personalized snowboarding coaching through an intelligent chat interface that references actual video content from the Snowboarding Explained YouTube channel. It uses a guided question flow to understand your situation, then provides coaching advice using the coach's exact words and teaching style.

## Key Features

- **Guided Coaching Flow** - Structured questions to understand your trick, skill level, and issues
- **AI-Powered Responses** - Natural language coaching using Gemini 1.5 Flash
- **Video References** - Every response includes relevant video clips with timestamps
- **Cost-Optimized** - Smart caching and local processing to minimize API costs
- **Offline-Capable** - Transcripts and embeddings stored locally
- **ChatGPT-Style UI** - Familiar, clean mobile interface

## Tech Stack

### Mobile App
- React Native (Expo)
- TypeScript
- NativeWind + twrnc (Tailwind styling)
- React Navigation
- Expo Video (video playback)

### Backend
- Vercel Serverless Functions
- TypeScript
- Google Gemini 1.5 Flash API
- Pinecone (vector database)
- Vercel KV (caching)

### Data Pipeline
- YouTube transcript scraper
- Sentence embeddings
- Vector similarity search

## Project Structure

```
SnowboardingExplained/
├── mobile/                      # React Native app
│   ├── src/
│   │   ├── screens/            # App screens
│   │   ├── components/         # Reusable components
│   │   ├── services/           # API services
│   │   ├── hooks/              # Custom hooks
│   │   ├── types/              # TypeScript types
│   │   └── utils/              # Utilities
│   └── app.json
├── backend/                     # Node.js API
│   ├── src/
│   │   ├── routes/             # API routes
│   │   ├── services/           # Business logic
│   │   ├── models/             # Data models
│   │   └── utils/              # Utilities
│   └── package.json
├── data-pipeline/               # Transcript processing
│   ├── scripts/
│   │   ├── scrape-transcripts.ts
│   │   ├── generate-embeddings.ts
│   │   └── build-index.ts
│   └── data/
│       ├── transcripts/        # Raw transcripts
│       ├── embeddings/         # Vector embeddings
│       └── index.json          # Searchable index
└── docs/                        # Documentation
```

## Cost Analysis

**One-time Setup:**
- Scrape ~200 videos: FREE
- Generate embeddings: ~$0.50
- Total: $0.50

**Per User Session:**
- Guided questions: FREE (local)
- Vector search: FREE (local)
- AI response: $0.00004 (Gemini Flash)
- Caching reduces by 80%

**Monthly (1000 users, 5 sessions each):**
- Without caching: $0.20/month
- With caching: $0.04/month

## Development Phases

See `SPEC.md` for detailed implementation plan.

## Getting Started

See `docs/SETUP.md` for installation and setup instructions.
