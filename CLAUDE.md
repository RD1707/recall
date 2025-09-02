
## Project Overview
Recall is an AI-powered flashcard platform that generates intelligent study materials from various content sources. The system uses spaced repetition with AI explanations to help users memorize information more effectively.

## Architecture
- **Frontend**: Vanilla JavaScript, HTML, CSS served as static files
- **Backend**: Express.js API server with background worker processes
- **Database**: PostgreSQL via Supabase
- **AI**: Cohere API for flashcard generation
- **Queue System**: Redis + BullMQ for background processing
- **File Processing**: Supports text, markdown, PDF uploads and YouTube transcript extraction

## Development Commands

### Backend
```bash
cd backend
npm install
npm start          # Start API server on port 3000
npm run worker     # Start background job worker
npm run dev        # Run both server and worker concurrently
```

### Frontend  
Open `frontend/public/index.html` directly or use Live Server. No build process required.

## Key Architecture Patterns

### Backend Structure
- `server.js` - Express app setup and route mounting
- `src/worker.js` - BullMQ worker for background flashcard generation
- `src/routes/` - API route handlers (auth, decks, flashcards, analytics, profiles, sharing)
- `src/controllers/` - Business logic for each domain
- `src/services/` - External service integrations (Cohere AI, SRS algorithm)
- `src/config/` - Database, logging, and queue configuration

### Data Flow
1. Content uploaded via API (text/file/YouTube URL)
2. Background job queued for AI flashcard generation
3. Worker processes job using Cohere API
4. Generated flashcards saved to Supabase
5. Frontend polls for completion or receives real-time updates

### Environment Setup
Backend requires:
- `PORT` - Server port (default 3000)
- `SUPABASE_URL` and `SUPABASE_KEY` - Database connection
- `COHERE_API_KEY` - AI service
- `REDIS_URL` - Queue backend

### Key Services
- **SRS Service** (`src/services/srsService.js`) - Implements SM-2 spaced repetition algorithm
- **Generation Service** (`src/services/generationService.js`) - Orchestrates content processing and AI generation
- **Cohere Service** (`src/services/cohereService.js`) - AI flashcard generation with different card types (multiple choice, open-ended)

### Database Schema
Core entities: users, decks, flashcards, user_progress, shares
- Flashcards support multiple types (multiple choice with options array, open-ended)
- SRS tracking via user_progress table with intervals and ease factors
- Deck sharing system with public/private visibility

## Development Notes
- No testing framework currently configured
- No linting configuration at project level
- Frontend uses Chart.js for analytics, Toastify.js for notifications
- Background processing is essential - always run both server and worker in development