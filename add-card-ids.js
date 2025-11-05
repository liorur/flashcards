const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const DECKS_DIR = path.join(__dirname, 'decks');

function generateCardId(question, answer) {
    // Create a deterministic ID based on question and answer
    // This ensures the same card always gets the same ID
    const content = `${question}|${answer}`;
    return crypto.createHash('md5').update(content).digest('hex').substring(0, 12);
}

async function addIdsToAllDecks() {
    const indexFile = path.join(DECKS_DIR, 'index.json');
    const indexData = await fs.readFile(indexFile, 'utf8');
    const decks = JSON.parse(indexData);

    for (const deck of decks) {
        const deckFile = path.join(__dirname, deck.file);
        console.log(`Processing ${deck.name}...`);

        try {
            const data = await fs.readFile(deckFile, 'utf8');
            const cards = JSON.parse(data);

            // Add IDs to cards that don't have them
            let updated = false;
            const updatedCards = cards.map(card => {
                if (!card.id) {
                    updated = true;
                    return {
                        id: generateCardId(card.question, card.answer),
                        ...card
                    };
                }
                return card;
            });

            if (updated) {
                await fs.writeFile(deckFile, JSON.stringify(updatedCards, null, 2));
                console.log(`  ✓ Added IDs to ${updatedCards.length} cards`);
            } else {
                console.log(`  - Already has IDs`);
            }
        } catch (error) {
            console.error(`  ✗ Error: ${error.message}`);
        }
    }

    console.log('\nDone!');
}

addIdsToAllDecks().catch(console.error);
