// Flashcards App with Backend Support
// Configuration
const MASTERY_THRESHOLD = 5; // Number of consecutive correct answers required to master a card

class FlashcardsApp {
    constructor() {
        this.decks = [];
        this.currentDeck = null;
        this.currentUser = null;
        this.flashcards = [];
        this.currentIndex = 0;
        this.isFlipped = false;
        this.isStudying = false;
        this.apiBase = window.location.origin;
        this.progress = {}; // Stores progress for current deck
        this.originalCards = []; // Stores original cards without bidirectional transformation
        this.MASTERY_THRESHOLD = MASTERY_THRESHOLD; // Make accessible to instance

        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.setupHistorySupport();

        // Check if user is logged in
        const savedUser = localStorage.getItem('flashcards_current_user');
        if (savedUser) {
            try {
                this.currentUser = JSON.parse(savedUser);
                await this.showDecksView();
            } catch (error) {
                this.showUserSelection();
            }
        } else {
            this.showUserSelection();
        }
    }

    // API Helper Methods
    async apiCall(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.apiBase}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'API request failed');
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // User Management
    async showUserSelection() {
        this.switchView('user', false);
        await this.loadExistingUsers();
    }

    async loadExistingUsers() {
        try {
            const users = await this.apiCall('/api/users');
            const container = document.getElementById('existingUsers');

            if (users.length > 0) {
                container.innerHTML = `
                    <h3>Or select existing user:</h3>
                    ${users.map(user => `
                        <div class="user-item" onclick="app.selectUser('${user.username}')">
                            ${this.escapeHtml(user.displayName)}
                        </div>
                    `).join('')}
                `;
            }
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    async loginUser() {
        const input = document.getElementById('usernameInput');
        const username = input.value.trim();

        if (!username) {
            alert('Please enter your name');
            return;
        }

        try {
            const user = await this.apiCall('/api/users', {
                method: 'POST',
                body: JSON.stringify({ username })
            });

            this.currentUser = user;
            localStorage.setItem('flashcards_current_user', JSON.stringify(user));
            await this.showDecksView();
        } catch (error) {
            alert('Failed to login. Please try again.');
        }
    }

    async selectUser(username) {
        try {
            const user = await this.apiCall('/api/users', {
                method: 'POST',
                body: JSON.stringify({ username })
            });

            this.currentUser = user;
            localStorage.setItem('flashcards_current_user', JSON.stringify(user));
            await this.showDecksView();
        } catch (error) {
            alert('Failed to select user. Please try again.');
        }
    }

    changeUser() {
        if (confirm('Are you sure you want to switch users?')) {
            this.currentUser = null;
            localStorage.removeItem('flashcards_current_user');
            this.showUserSelection();
        }
    }

    async resetDeckProgress(deckId, deckName) {
        if (!this.currentUser) return;

        if (confirm(`Reset all progress for "${deckName}"?\n\nThis will delete all your learning history for this deck.\n\nThis action cannot be undone!`)) {
            try {
                await this.apiCall(`/api/progress/${this.currentUser.username}/${deckId}`, {
                    method: 'DELETE'
                });
                alert('Progress reset successfully!');
                this.renderDecksList(); // Refresh to show updated stats
            } catch (error) {
                alert('Failed to reset progress. Please try again.');
                console.error('Error resetting progress:', error);
            }
        }
    }

    async resetAllProgress() {
        if (!this.currentUser) return;

        if (confirm(`Reset ALL progress for all decks?\n\nThis will delete your entire learning history.\n\nThis action cannot be undone!`)) {
            try {
                await this.apiCall(`/api/progress/${this.currentUser.username}`, {
                    method: 'DELETE'
                });
                alert('All progress reset successfully!');
                this.renderDecksList(); // Refresh to show updated stats
            } catch (error) {
                alert('Failed to reset progress. Please try again.');
                console.error('Error resetting all progress:', error);
            }
        }
    }

    async showDecksView() {
        // Update header to show current user
        document.getElementById('userDisplay').style.display = 'flex';
        document.getElementById('currentUser').textContent = `Logged in as: ${this.currentUser.displayName}`;

        await this.loadDecks();
        this.switchView('decks', false);
        this.renderDecksList();
    }

    // Deck Management
    async loadDecks() {
        try {
            this.decks = await this.apiCall('/api/decks');

            // Add virtual "All Decks" deck at the beginning
            this.decks.unshift({
                id: 'all-decks',
                name: 'All Decks (Random)',
                file: 'virtual',
                virtual: true
            });
        } catch (error) {
            alert('Failed to load decks. Please make sure the server is running.');
            this.decks = [];
        }
    }

    async loadDeckCards(deck) {
        try {
            // Handle virtual "All Decks" deck
            if (deck.id === 'all-decks') {
                return await this.loadAllDecksCards();
            }

            // Load cards (without history)
            const cards = await this.apiCall(`/api/decks/${deck.id}/cards`);
            this.originalCards = cards;

            // Load user's progress for this deck
            await this.loadProgress(deck.id);

            return this.createBidirectionalCards(this.originalCards);
        } catch (error) {
            console.error('Error loading deck cards:', error);
            return [];
        }
    }

    async loadAllDecksCards() {
        try {
            const allCards = [];
            const realDecks = this.decks.filter(d => !d.virtual);

            // Load all progress data for all decks
            this.progress = {};

            for (const deck of realDecks) {
                const cards = await this.apiCall(`/api/decks/${deck.id}/cards`);
                const deckProgress = await this.apiCall(`/api/progress/${this.currentUser.username}/${deck.id}`);

                // Tag cards with their deck ID and merge progress
                cards.forEach(card => {
                    card.deckId = deck.id;
                    card.deckName = deck.name;
                });

                // Merge progress
                Object.assign(this.progress, deckProgress);

                allCards.push(...cards);
            }

            this.originalCards = allCards;

            // Create bidirectional cards and shuffle
            const bidirectionalCards = this.createBidirectionalCards(allCards);
            return this.shuffleArray(bidirectionalCards);
        } catch (error) {
            console.error('Error loading all decks cards:', error);
            return [];
        }
    }

    async loadProgress(deckId) {
        try {
            if (!this.currentUser) return;

            this.progress = await this.apiCall(`/api/progress/${this.currentUser.username}/${deckId}`);

            // If progress is empty, initialize it
            if (Object.keys(this.progress).length === 0) {
                this.progress = {};
            }
        } catch (error) {
            console.error('Error loading progress:', error);
            this.progress = {};
        }
    }

    async saveProgress(deckId) {
        try {
            if (!this.currentUser) return;

            await this.apiCall(`/api/progress/${this.currentUser.username}/${deckId}`, {
                method: 'PUT',
                body: JSON.stringify({ progress: this.progress })
            });
        } catch (error) {
            console.error('Error saving progress:', error);
        }
    }

    getCardProgress(cardId, direction) {
        const key = `${cardId}_${direction}`;
        if (!this.progress[key]) {
            this.progress[key] = [];
        }
        return this.progress[key];
    }

    updateCardProgress(cardId, direction, knewIt) {
        const key = `${cardId}_${direction}`;
        if (!this.progress[key]) {
            this.progress[key] = [];
        }

        this.progress[key].push(knewIt);

        // Keep only last N attempts (where N = MASTERY_THRESHOLD)
        if (this.progress[key].length > this.MASTERY_THRESHOLD) {
            this.progress[key].shift();
        }
    }

    createBidirectionalCards(cards) {
        const bidirectionalCards = [];
        cards.forEach((card, index) => {
            // Original direction (question -> answer)
            const forwardCard = {
                id: card.id,
                question: card.question,
                answer: card.answer,
                example: card.example,
                exampleTranslation: card.exampleTranslation,
                direction: 'forward',
                originalIndex: index // Keep for array access to original cards
            };

            // Reverse direction (answer -> question)
            const reverseCard = {
                id: card.id,
                question: card.answer,
                answer: card.question,
                example: card.example,
                exampleTranslation: card.exampleTranslation,
                direction: 'reverse',
                originalIndex: index // Keep for array access to original cards
            };

            // Check if card is mastered (5 correct in a row)
            const forwardProgress = this.getCardProgress(card.id, 'forward');
            const reverseProgress = this.getCardProgress(card.id, 'reverse');

            // Only include if not mastered (doesn't have 5 consecutive trues)
            if (!this.isCardMastered(forwardProgress)) {
                bidirectionalCards.push(forwardCard);
            }
            if (!this.isCardMastered(reverseProgress)) {
                bidirectionalCards.push(reverseCard);
            }
        });

        // Sort by priority instead of random shuffle
        return this.prioritizeCards(bidirectionalCards);
    }

    // Check if card has been mastered (MASTERY_THRESHOLD trues in a row)
    isCardMastered(history) {
        if (!history || history.length < this.MASTERY_THRESHOLD) return false;

        // Check last N attempts
        const lastN = history.slice(-this.MASTERY_THRESHOLD);
        return lastN.length === this.MASTERY_THRESHOLD && lastN.every(result => result === true);
    }

    // Calculate success rate for a card
    calculateCardSuccessRate(history) {
        if (!history || history.length === 0) return 0;
        const correct = history.filter(result => result === true).length;
        return correct / history.length;
    }

    // Prioritize cards by: no progress > low success > high success
    prioritizeCards(cards) {
        const cardsWithPriority = cards.map(card => {
            const progress = this.getCardProgress(card.id, card.direction);
            const hasProgress = progress && progress.length > 0;
            const successRate = this.calculateCardSuccessRate(progress);

            // Priority scoring:
            // - No progress: priority 0 (highest)
            // - Has progress: priority = success rate (0-1, lower is higher priority)
            const priority = hasProgress ? successRate : -1; // -1 means no progress (highest priority)

            return { ...card, priority, successRate, attemptCount: progress ? progress.length : 0 };
        });

        // Sort by priority (lowest first = highest priority)
        // Secondary sort: random within same priority group for variety
        cardsWithPriority.sort((a, b) => {
            if (a.priority !== b.priority) {
                return a.priority - b.priority;
            }
            // Random sort within same priority
            return Math.random() - 0.5;
        });

        return cardsWithPriority;
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // Removed saveDeckCards - we now save progress separately

    async createDeck(name) {
        try {
            const newDeck = await this.apiCall('/api/decks', {
                method: 'POST',
                body: JSON.stringify({ name })
            });

            this.decks.push(newDeck);
            this.renderDecksList();
        } catch (error) {
            alert(error.message || 'Failed to create deck');
        }
    }

    async deleteDeck(deckId) {
        if (confirm('Are you sure you want to delete this deck and all its cards?')) {
            try {
                await this.apiCall(`/api/decks/${deckId}`, {
                    method: 'DELETE'
                });

                this.decks = this.decks.filter(d => d.id !== deckId);
                this.renderDecksList();
            } catch (error) {
                alert('Failed to delete deck');
            }
        }
    }

    async openDeck(deck, mode = 'study') {
        this.currentDeck = deck;

        if (mode === 'study') {
            this.flashcards = await this.loadDeckCards(deck);
            this.switchView('study', true);
            document.getElementById('currentDeckName').textContent = deck.name;
            // Auto-start studying
            this.startStudy();
        } else if (mode === 'manage') {
            // For manage mode, load original cards without bidirectional transformation
            const cards = await this.apiCall(`/api/decks/${deck.id}/cards`);
            this.originalCards = cards;

            // Load progress for stats display
            await this.loadProgress(deck.id);

            this.switchView('manage', true);
            document.getElementById('manageDeckName').textContent = deck.name;
            this.renderCardsList();
        }
    }

    // History Support
    setupHistorySupport() {
        // Set initial state
        if (!window.history.state) {
            window.history.replaceState({ view: 'decks' }, '', '#decks');
        }

        // Handle browser back/forward buttons
        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.view) {
                this.switchView(event.state.view, false, event.state.deck);
            }
        });
    }

    // Event Listeners
    setupEventListeners() {
        // User Management
        document.getElementById('loginBtn').addEventListener('click', () => this.loginUser());
        document.getElementById('usernameInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.loginUser();
            }
        });
        document.getElementById('changeUser').addEventListener('click', () => this.changeUser());
        document.getElementById('resetAllProgress').addEventListener('click', () => this.resetAllProgress());

        // Deck Navigation
        document.getElementById('navDecks').addEventListener('click', () => this.switchView('decks', true));
        document.getElementById('backToDecks').addEventListener('click', () => window.history.back());
        document.getElementById('backToDecksManage').addEventListener('click', () => window.history.back());

        // Study Mode
        document.getElementById('flashcard').addEventListener('click', () => {
            if (this.isStudying) this.flipCard();
        });

        // Response buttons
        document.getElementById('knewItBtn').addEventListener('click', () => this.handleResponse(true));
        document.getElementById('didntKnowBtn').addEventListener('click', () => this.handleResponse(false));

        // Manage Mode
        document.getElementById('addCardBtn').addEventListener('click', () => this.addCard());

        // Allow Enter key in textareas with Ctrl/Cmd
        document.getElementById('newQuestion').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                this.addCard();
            }
        });
        document.getElementById('newAnswer').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                this.addCard();
            }
        });

        // Keyboard shortcuts for study mode
        document.addEventListener('keydown', (e) => {
            if (!this.isStudying || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.tagName === 'INPUT') return;

            switch(e.key) {
                case ' ':
                case 'ArrowUp':
                    e.preventDefault();
                    this.flipCard();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.previousCard();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.nextCard();
                    break;
            }
        });
    }

    // View Management
    switchView(view, addToHistory = true, deckData = null) {
        const userView = document.getElementById('userMode');
        const decksView = document.getElementById('decksMode');
        const studyView = document.getElementById('studyMode');
        const manageView = document.getElementById('manageMode');
        const navDecks = document.getElementById('navDecks');

        // Hide all views
        userView.classList.remove('active');
        decksView.classList.remove('active');
        studyView.classList.remove('active');
        manageView.classList.remove('active');
        navDecks.classList.remove('active');

        // Reset study state when leaving study view
        if (view !== 'study') {
            this.isStudying = false;
        }

        // Show selected view
        if (view === 'user') {
            userView.classList.add('active');
            if (addToHistory) {
                window.history.pushState({ view: 'user' }, '', '#user');
            }
        } else if (view === 'decks') {
            decksView.classList.add('active');
            navDecks.classList.add('active');
            this.renderDecksList();
            if (addToHistory) {
                window.history.pushState({ view: 'decks' }, '', '#decks');
            }
        } else if (view === 'study') {
            studyView.classList.add('active');
            if (addToHistory && this.currentDeck) {
                window.history.pushState({
                    view: 'study',
                    deck: this.currentDeck
                }, '', `#study/${this.currentDeck.id}`);
            }
        } else if (view === 'manage') {
            manageView.classList.add('active');
            if (addToHistory && this.currentDeck) {
                window.history.pushState({
                    view: 'manage',
                    deck: this.currentDeck
                }, '', `#manage/${this.currentDeck.id}`);
            }
        }
    }

    // Deck UI
    // addDeck() - Removed from UI, decks are managed manually via JSON files

    renderDecksList() {
        const container = document.getElementById('decksList');

        if (this.decks.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999;">No decks yet. Create one above!</p>';
            return;
        }

        const promises = this.decks.map(async (deck) => {
            // Handle virtual "All Decks" differently
            if (deck.id === 'all-decks') {
                const realDecks = this.decks.filter(d => !d.virtual);
                let totalCount = 0;
                for (const realDeck of realDecks) {
                    const cards = await this.apiCall(`/api/decks/${realDeck.id}/cards`);
                    totalCount += cards.length;
                }
                const stats = await this.calculateDeckStats(deck.id, totalCount);
                return { deck, count: totalCount, stats };
            }

            // Get original card count (not bidirectional)
            const cards = await this.apiCall(`/api/decks/${deck.id}/cards`);
            const count = cards.length;

            // Calculate stats
            const stats = await this.calculateDeckStats(deck.id, count);

            return { deck, count, stats };
        });

        Promise.all(promises).then(results => {
            container.innerHTML = results.map(({ deck, count, stats }) => `
                <div class="deck-item-wrapper">
                    <div class="deck-item" onclick="app.openDeck(${JSON.stringify(deck).replace(/"/g, '&quot;')}, 'study')">
                        <div class="deck-item-info">
                            <div class="deck-item-name">${this.escapeHtml(deck.name)}</div>
                            <div class="deck-item-count">${count} cards</div>
                            <div class="deck-item-stats">
                                <div class="stat-item">
                                    <span class="stat-label">Success:</span>
                                    <span class="stat-value">${stats.successRate}%</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Progress:</span>
                                    <span class="stat-value">${stats.progress}/${stats.total}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    ${stats.progress > 0 ? `
                        <button class="btn-reset-deck"
                                onclick="event.stopPropagation(); app.resetDeckProgress('${deck.id}', '${this.escapeHtml(deck.name)}')"
                                title="Reset progress for this deck">
                            🔄
                        </button>
                    ` : ''}
                </div>
            `).join('');
        });
    }

    // Study Mode Functions
    startStudy() {
        if (this.flashcards.length === 0) {
            const totalCards = this.originalCards.length * 2;
            if (totalCards > 0) {
                // All cards are mastered!
                alert(`🎉 Congratulations!\n\nAll cards in this deck are mastered!\n(${this.MASTERY_THRESHOLD} correct answers in a row for each direction)\n\nTake a break or review another deck.`);
            } else {
                alert('This deck has no flashcards. Add some cards first!');
            }
            window.history.back();
            return;
        }

        this.isStudying = true;
        this.currentIndex = 0;
        this.isFlipped = false;

        this.showCard();
    }

    showCard() {
        const card = document.getElementById('flashcard');
        const questionText = document.getElementById('questionText');
        const answerText = document.getElementById('answerText');
        const counter = document.getElementById('cardCounter');
        const responseButtons = document.getElementById('responseButtons');
        const exampleText = document.getElementById('exampleText');

        if (this.flashcards.length === 0) {
            questionText.textContent = 'No flashcards available';
            answerText.textContent = '';
            counter.textContent = '0 / 0';
            return;
        }

        const currentCard = this.flashcards[this.currentIndex];

        // Reset flip state first (unflip the card)
        if (this.isFlipped) {
            card.classList.remove('flipped');
            this.isFlipped = false;
        }

        // Wait for flip animation to complete before changing content
        setTimeout(() => {
            questionText.textContent = currentCard.question;
            answerText.textContent = currentCard.answer;
            exampleText.innerHTML = '';
            counter.textContent = `${this.currentIndex + 1} / ${this.flashcards.length}`;

            // Reset buttons visibility
            responseButtons.style.display = 'none';
        }, 300); // Match the CSS transition time
    }

    flipCard() {
        if (!this.isStudying) return;

        const card = document.getElementById('flashcard');
        const responseButtons = document.getElementById('responseButtons');
        const exampleText = document.getElementById('exampleText');

        this.isFlipped = !this.isFlipped;

        if (this.isFlipped) {
            card.classList.add('flipped');
            // Show response buttons after flipping
            responseButtons.style.display = 'flex';

            // Display example when flipped to answer side
            const currentCard = this.flashcards[this.currentIndex];
            if (currentCard.example && currentCard.exampleTranslation) {
                exampleText.innerHTML = `
                    <div class="example-label">Example:</div>
                    <div class="dutch-example">${this.escapeHtml(currentCard.example)}</div>
                    <div class="english-example">${this.escapeHtml(currentCard.exampleTranslation)}</div>
                `;
            } else {
                exampleText.innerHTML = '';
            }
        } else {
            card.classList.remove('flipped');
            responseButtons.style.display = 'none';
            exampleText.innerHTML = '';
        }
    }

    previousCard() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.showCard();
        }
    }

    nextCard() {
        if (this.currentIndex < this.flashcards.length - 1) {
            this.currentIndex++;
            this.showCard();
        }
    }

    async handleResponse(knewIt) {
        const currentCard = this.flashcards[this.currentIndex];
        const cardId = currentCard.id;
        const direction = currentCard.direction;

        console.log(`Recording response: ${knewIt ? '✓ Knew it' : '✗ Didn\'t know'} for "${currentCard.question}" (${direction}, ID: ${cardId})`);

        // Update progress for this card using ID
        this.updateCardProgress(cardId, direction, knewIt);

        // Save progress to backend (to correct deck)
        const targetDeckId = currentCard.deckId || this.currentDeck.id;
        console.log(`Saving progress for deck "${targetDeckId}"...`);
        await this.saveProgress(targetDeckId);
        console.log('✓ Progress saved successfully');

        // Automatically move to next card
        if (this.currentIndex < this.flashcards.length - 1) {
            this.nextCard();
        } else {
            // Reached the end of the deck
            const totalCards = this.originalCards.length * 2; // Total possible cards (both directions)
            const activeCards = this.flashcards.length;
            const masteredCards = totalCards - activeCards;

            let message = `Deck complete! You've reviewed all ${activeCards} active cards.`;
            if (masteredCards > 0) {
                message += `\n\n🎉 ${masteredCards} cards mastered (${this.MASTERY_THRESHOLD} correct in a row)!`;
            }
            alert(message);
            window.history.back();
        }
    }

    // Manage Mode Functions
    async addCard() {
        if (!this.currentDeck) return;

        const questionInput = document.getElementById('newQuestion');
        const answerInput = document.getElementById('newAnswer');

        const question = questionInput.value.trim();
        const answer = answerInput.value.trim();

        if (!question || !answer) {
            alert('Please enter both question and answer');
            return;
        }

        // Generate ID for new card (simple hash function for browser)
        const cardId = this.generateCardId(question, answer);

        // Add new card
        this.originalCards.push({
            id: cardId,
            question,
            answer
        });

        // Save to backend
        await this.apiCall(`/api/decks/${this.currentDeck.id}/cards`, {
            method: 'PUT',
            body: JSON.stringify({ cards: this.originalCards })
        });

        questionInput.value = '';
        answerInput.value = '';
        questionInput.focus();

        this.renderCardsList();
    }

    async deleteCard(index) {
        if (!this.currentDeck) return;

        if (confirm('Are you sure you want to delete this flashcard?')) {
            this.originalCards.splice(index, 1);

            // Save to backend
            await this.apiCall(`/api/decks/${this.currentDeck.id}/cards`, {
                method: 'PUT',
                body: JSON.stringify({ cards: this.originalCards })
            });

            this.renderCardsList();
        }
    }

    renderCardsList() {
        const container = document.getElementById('cardsList');

        if (this.originalCards.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999;">No flashcards yet. Add one above!</p>';
            return;
        }

        container.innerHTML = this.originalCards.map((card, index) => `
            <div class="card-item">
                <div class="card-item-question">Q: ${this.escapeHtml(card.question)}</div>
                <div class="card-item-answer">A: ${this.escapeHtml(card.answer)}</div>
                <div class="card-item-stats">
                    Forward: ${this.formatHistory(this.getCardProgress(card.id, 'forward'))} |
                    Reverse: ${this.formatHistory(this.getCardProgress(card.id, 'reverse'))}
                </div>
            </div>
        `).join('');
    }

    formatHistory(history) {
        if (!history || history.length === 0) return 'No attempts yet';
        const icons = history.map(knew => knew ? '✓' : '✗').join(' ');
        const correct = history.filter(knew => knew).length;
        return `${icons} (${correct}/${history.length})`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Simple hash function for browser (generates same ID as backend)
    generateCardId(question, answer) {
        const str = `${question}|${answer}`;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(36).substring(0, 12).padStart(12, '0');
    }

    // Calculate deck statistics from progress
    async calculateDeckStats(deckId, cardCount) {
        if (!this.currentUser) {
            return { successRate: 0, progress: 0, total: cardCount * 2 * this.MASTERY_THRESHOLD };
        }

        try {
            // Handle virtual "All Decks" - aggregate stats from all decks
            if (deckId === 'all-decks') {
                return await this.calculateAllDecksStats();
            }

            const progress = await this.apiCall(`/api/progress/${this.currentUser.username}/${deckId}`);

            let totalAttempts = 0;
            let correctAttempts = 0;
            let currentCorrect = 0;
            const totalNeeded = cardCount * 2 * this.MASTERY_THRESHOLD; // cards × directions × mastery threshold

            // Count all attempts and correct answers
            Object.values(progress).forEach(history => {
                if (Array.isArray(history)) {
                    history.forEach(result => {
                        totalAttempts++;
                        if (result === true) {
                            correctAttempts++;
                            currentCorrect++;
                        }
                    });
                }
            });

            const successRate = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

            return {
                successRate,
                progress: currentCorrect,
                total: totalNeeded
            };
        } catch (error) {
            console.error('Error calculating stats:', error);
            return { successRate: 0, progress: 0, total: cardCount * 2 * this.MASTERY_THRESHOLD };
        }
    }

    async calculateAllDecksStats() {
        const realDecks = this.decks.filter(d => !d.virtual);
        let totalAttempts = 0;
        let correctAttempts = 0;
        let currentCorrect = 0;
        let totalCards = 0;

        for (const deck of realDecks) {
            const cards = await this.apiCall(`/api/decks/${deck.id}/cards`);
            const progress = await this.apiCall(`/api/progress/${this.currentUser.username}/${deck.id}`);

            totalCards += cards.length;

            Object.values(progress).forEach(history => {
                if (Array.isArray(history)) {
                    history.forEach(result => {
                        totalAttempts++;
                        if (result === true) {
                            correctAttempts++;
                            currentCorrect++;
                        }
                    });
                }
            });
        }

        const successRate = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;
        const totalNeeded = totalCards * 2 * this.MASTERY_THRESHOLD;

        return {
            successRate,
            progress: currentCorrect,
            total: totalNeeded
        };
    }
}

// Initialize app
const app = new FlashcardsApp();
