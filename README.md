# Flashcards App

A mobile-friendly flashcards web application for learning Dutch vocabulary and grammar.

## Features

- **Multi-deck support** with 6 Dutch learning decks (313 total cards)
- **Bidirectional learning** - practice both Dutch→English and English→Dutch
- **User management** - track progress per user
- **Smart card prioritization** - focuses on cards you're struggling with
- **Mastery tracking** - cards disappear after 5 consecutive correct answers
- **Progress statistics** - view success rate and progress for each deck
- **Example sentences** - contextual examples with translations
- **Mobile-responsive** design

## Decks Included

1. **Dutch Course Unit 1** - 87 basic vocabulary cards
2. **Dutch Course Unit 2** - 76 vocabulary cards
3. **Zijn Hebben Mijn** - 40 cards (verb conjugations, possessives, articles)
4. **Numbers** - 37 number cards (1-1000)
5. **Questions & Politeness** - 28 cards
6. **Time** - 48 time-related cards

## Technology Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Node.js with Express
- **Storage**: JSON file-based (no database required)
- **Architecture**: REST API with separate content and progress tracking

## Local Development

### Prerequisites

- Node.js (v14 or higher)
- npm

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:3000 in your browser

### Production

To run in production mode:
```bash
npm start
```

## Deployment

The app is designed to be deployed easily to any Node.js hosting platform.

### Deployment Checklist

✅ **Progress data excluded** - The `progress/` directory is in `.gitignore` and will be created automatically on the server
✅ **Auto-initialization** - Server creates necessary directories and files on startup
✅ **Environment ready** - PORT can be configured via environment variable

### Recommended Hosting Platforms

1. **Railway** (Recommended - Easy deployment)
   - Connect GitHub repository
   - Automatic deployments on push
   - Free tier available

2. **Render**
   - Free tier available
   - Auto-deploys from GitHub
   - Easy environment configuration

3. **Fly.io**
   - Global edge deployment
   - Free tier available

4. **Vercel** (requires some configuration for Node.js backend)

5. **Heroku** (paid plans only now)

### Environment Variables

The app uses the following environment variables:

- `PORT` - Server port (default: 3000)

### Data Persistence

- **Deck content** (.json files in decks/) is committed to the repository
- **User progress** (progress/ directory) is generated on the server and NOT committed
- Progress is stored as JSON files: progress/{username}/{deckId}.json

## Configuration

### Mastery Threshold

The number of consecutive correct answers required to master a card is configurable in app.js:

```javascript
const MASTERY_THRESHOLD = 5; // Change this value
```

## API Endpoints

### Decks
- GET /api/decks - Get all decks
- GET /api/decks/:deckId/cards - Get cards for a deck
- POST /api/decks - Create a new deck
- DELETE /api/decks/:deckId - Delete a deck
- PUT /api/decks/:deckId/cards - Update deck cards

### Users
- GET /api/users - Get all users
- POST /api/users - Create or select a user

### Progress
- GET /api/progress/:username/:deckId - Get progress for user and deck
- PUT /api/progress/:username/:deckId - Save progress
- DELETE /api/progress/:username/:deckId - Reset deck progress
- DELETE /api/progress/:username - Reset all progress for user

## License

MIT

---
*Last deployment test: 2025-11-05*
<!-- Persistence test: Wed Nov  5 18:17:33 CET 2025 -->
