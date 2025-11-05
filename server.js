const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files from current directory

// Paths
const DECKS_DIR = path.join(__dirname, 'decks');
const DECKS_INDEX_FILE = path.join(__dirname, 'decks', 'index.json');
const PROGRESS_DIR = path.join(__dirname, 'progress');
const USERS_FILE = path.join(__dirname, 'progress', 'users.json');

// Ensure decks directory exists
async function ensureDecksDir() {
    try {
        await fs.access(DECKS_DIR);
    } catch {
        await fs.mkdir(DECKS_DIR, { recursive: true });
    }
}

// Ensure progress directory exists
async function ensureProgressDir() {
    try {
        await fs.access(PROGRESS_DIR);
    } catch {
        await fs.mkdir(PROGRESS_DIR, { recursive: true });
    }
}

// Initialize users file if it doesn't exist
async function initializeUsersFile() {
    try {
        await fs.access(USERS_FILE);
    } catch {
        await fs.writeFile(USERS_FILE, JSON.stringify([], null, 2));
    }
}

// Initialize decks index file if it doesn't exist
async function initializeDecksIndex() {
    try {
        await fs.access(DECKS_INDEX_FILE);
    } catch {
        const defaultDecks = [
            { id: 'dutch-course-unit-1', name: 'Dutch course Unit 1', file: 'decks/dutch-course-unit-1.json' }
        ];
        await fs.writeFile(DECKS_INDEX_FILE, JSON.stringify(defaultDecks, null, 2));
    }
}

// API Routes

// Get all decks
app.get('/api/decks', async (req, res) => {
    try {
        const data = await fs.readFile(DECKS_INDEX_FILE, 'utf8');
        const decks = JSON.parse(data);
        res.json(decks);
    } catch (error) {
        console.error('Error reading decks:', error);
        res.status(500).json({ error: 'Failed to load decks' });
    }
});

// Get cards for a specific deck
app.get('/api/decks/:deckId/cards', async (req, res) => {
    try {
        const { deckId } = req.params;
        const deckFile = path.join(DECKS_DIR, `${deckId}.json`);

        const data = await fs.readFile(deckFile, 'utf8');
        const cards = JSON.parse(data);
        res.json(cards);
    } catch (error) {
        console.error('Error reading deck cards:', error);
        res.status(500).json({ error: 'Failed to load cards' });
    }
});

// Create a new deck
app.post('/api/decks', async (req, res) => {
    try {
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Deck name is required' });
        }

        const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const newDeck = {
            id,
            name,
            file: `decks/${id}.json`
        };

        // Read existing decks
        const data = await fs.readFile(DECKS_INDEX_FILE, 'utf8');
        const decks = JSON.parse(data);

        // Check if deck already exists
        if (decks.some(d => d.id === id)) {
            return res.status(400).json({ error: 'Deck already exists' });
        }

        // Add new deck
        decks.push(newDeck);
        await fs.writeFile(DECKS_INDEX_FILE, JSON.stringify(decks, null, 2));

        // Create empty cards file
        const deckFile = path.join(DECKS_DIR, `${id}.json`);
        await fs.writeFile(deckFile, JSON.stringify([], null, 2));

        res.status(201).json(newDeck);
    } catch (error) {
        console.error('Error creating deck:', error);
        res.status(500).json({ error: 'Failed to create deck' });
    }
});

// Delete a deck
app.delete('/api/decks/:deckId', async (req, res) => {
    try {
        const { deckId } = req.params;

        // Read existing decks
        const data = await fs.readFile(DECKS_INDEX_FILE, 'utf8');
        let decks = JSON.parse(data);

        // Filter out the deck to delete
        decks = decks.filter(d => d.id !== deckId);
        await fs.writeFile(DECKS_INDEX_FILE, JSON.stringify(decks, null, 2));

        // Delete the deck file
        const deckFile = path.join(DECKS_DIR, `${deckId}.json`);
        try {
            await fs.unlink(deckFile);
        } catch (error) {
            console.log('Deck file not found, continuing...');
        }

        res.json({ message: 'Deck deleted successfully' });
    } catch (error) {
        console.error('Error deleting deck:', error);
        res.status(500).json({ error: 'Failed to delete deck' });
    }
});

// Add a card to a deck
app.post('/api/decks/:deckId/cards', async (req, res) => {
    try {
        const { deckId } = req.params;
        const { question, answer } = req.body;

        if (!question || !answer) {
            return res.status(400).json({ error: 'Question and answer are required' });
        }

        const deckFile = path.join(DECKS_DIR, `${deckId}.json`);

        // Read existing cards
        const data = await fs.readFile(deckFile, 'utf8');
        const cards = JSON.parse(data);

        // Add new card
        const newCard = { question, answer };
        cards.push(newCard);

        // Save updated cards
        await fs.writeFile(deckFile, JSON.stringify(cards, null, 2));

        res.status(201).json(newCard);
    } catch (error) {
        console.error('Error adding card:', error);
        res.status(500).json({ error: 'Failed to add card' });
    }
});

// Update all cards in a deck
app.put('/api/decks/:deckId/cards', async (req, res) => {
    try {
        const { deckId } = req.params;
        const { cards } = req.body;

        if (!Array.isArray(cards)) {
            return res.status(400).json({ error: 'Cards must be an array' });
        }

        const deckFile = path.join(DECKS_DIR, `${deckId}.json`);
        await fs.writeFile(deckFile, JSON.stringify(cards, null, 2));

        res.json({ message: 'Cards updated successfully' });
    } catch (error) {
        console.error('Error updating cards:', error);
        res.status(500).json({ error: 'Failed to update cards' });
    }
});

// Delete a card from a deck
app.delete('/api/decks/:deckId/cards/:cardIndex', async (req, res) => {
    try {
        const { deckId, cardIndex } = req.params;
        const index = parseInt(cardIndex);

        const deckFile = path.join(DECKS_DIR, `${deckId}.json`);

        // Read existing cards
        const data = await fs.readFile(deckFile, 'utf8');
        const cards = JSON.parse(data);

        // Remove card at index
        if (index >= 0 && index < cards.length) {
            cards.splice(index, 1);
            await fs.writeFile(deckFile, JSON.stringify(cards, null, 2));
            res.json({ message: 'Card deleted successfully' });
        } else {
            res.status(404).json({ error: 'Card not found' });
        }
    } catch (error) {
        console.error('Error deleting card:', error);
        res.status(500).json({ error: 'Failed to delete card' });
    }
});

// User Management Endpoints

// Get all users
app.get('/api/users', async (req, res) => {
    try {
        const data = await fs.readFile(USERS_FILE, 'utf8');
        const users = JSON.parse(data);
        res.json(users);
    } catch (error) {
        console.error('Error reading users:', error);
        res.status(500).json({ error: 'Failed to load users' });
    }
});

// Create or select a user
app.post('/api/users', async (req, res) => {
    try {
        const { username } = req.body;

        if (!username || username.trim().length === 0) {
            return res.status(400).json({ error: 'Username is required' });
        }

        const cleanUsername = username.trim().toLowerCase();

        // Read existing users
        const data = await fs.readFile(USERS_FILE, 'utf8');
        const users = JSON.parse(data);

        // Check if user already exists
        const existingUser = users.find(u => u.username === cleanUsername);
        if (existingUser) {
            return res.json(existingUser);
        }

        // Create new user
        const newUser = {
            username: cleanUsername,
            displayName: username.trim(),
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));

        // Create user's progress directory
        const userProgressDir = path.join(PROGRESS_DIR, cleanUsername);
        await fs.mkdir(userProgressDir, { recursive: true });

        res.status(201).json(newUser);
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// Progress Tracking Endpoints

// Get progress for a user and deck
app.get('/api/progress/:username/:deckId', async (req, res) => {
    try {
        const { username, deckId } = req.params;
        const progressFile = path.join(PROGRESS_DIR, username, `${deckId}.json`);

        try {
            const data = await fs.readFile(progressFile, 'utf8');
            const progress = JSON.parse(data);
            res.json(progress);
        } catch (error) {
            // If file doesn't exist, return empty progress
            res.json({});
        }
    } catch (error) {
        console.error('Error reading progress:', error);
        res.status(500).json({ error: 'Failed to load progress' });
    }
});

// Save progress for a user and deck
app.put('/api/progress/:username/:deckId', async (req, res) => {
    try {
        const { username, deckId } = req.params;
        const { progress } = req.body;

        if (!progress || typeof progress !== 'object') {
            return res.status(400).json({ error: 'Progress data is required' });
        }

        // Ensure user directory exists
        const userProgressDir = path.join(PROGRESS_DIR, username);
        await fs.mkdir(userProgressDir, { recursive: true });

        const progressFile = path.join(userProgressDir, `${deckId}.json`);
        await fs.writeFile(progressFile, JSON.stringify(progress, null, 2));

        res.json({ message: 'Progress saved successfully' });
    } catch (error) {
        console.error('Error saving progress:', error);
        res.status(500).json({ error: 'Failed to save progress' });
    }
});

// Reset progress for a user and deck
app.delete('/api/progress/:username/:deckId', async (req, res) => {
    try {
        const { username, deckId } = req.params;
        const progressFile = path.join(PROGRESS_DIR, username, `${deckId}.json`);

        try {
            await fs.unlink(progressFile);
            res.json({ message: 'Progress reset successfully' });
        } catch (error) {
            if (error.code === 'ENOENT') {
                // File doesn't exist, which is fine
                res.json({ message: 'Progress already empty' });
            } else {
                throw error;
            }
        }
    } catch (error) {
        console.error('Error resetting progress:', error);
        res.status(500).json({ error: 'Failed to reset progress' });
    }
});

// Reset all progress for a user
app.delete('/api/progress/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const userProgressDir = path.join(PROGRESS_DIR, username);

        try {
            // Read all files in user's progress directory
            const files = await fs.readdir(userProgressDir);

            // Delete all progress files
            await Promise.all(
                files.map(file => fs.unlink(path.join(userProgressDir, file)))
            );

            res.json({ message: 'All progress reset successfully' });
        } catch (error) {
            if (error.code === 'ENOENT') {
                // Directory doesn't exist, which is fine
                res.json({ message: 'Progress already empty' });
            } else {
                throw error;
            }
        }
    } catch (error) {
        console.error('Error resetting all progress:', error);
        res.status(500).json({ error: 'Failed to reset all progress' });
    }
});

// Initialize and start server
async function startServer() {
    await ensureDecksDir();
    await ensureProgressDir();
    await initializeDecksIndex();
    await initializeUsersFile();

    app.listen(PORT, () => {
        console.log(`Flashcards server running on http://localhost:${PORT}`);
    });
}

startServer();
