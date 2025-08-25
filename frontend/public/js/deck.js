document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const deckId = params.get('id');

    if (!deckId) {
        alert('ID do baralho não encontrado.');
        window.location.href = 'dashboard.html';
        return;
    }

    document.getElementById('study-deck-button').href = `study.html?deckId=${deckId}`;

    loadPageData(deckId);
    handleGenerateForm(deckId);
});

async function loadPageData(deckId) {
    const allDecks = await fetchDecks(); 
    const currentDeck = allDecks.find(deck => deck.id === deckId);

    if (currentDeck) {
        document.getElementById('deck-title-heading').textContent = currentDeck.title;
        document.getElementById('deck-description-paragraph').textContent = currentDeck.description;
    }

    await loadAndRenderFlashcards(deckId);
}

async function loadAndRenderFlashcards(deckId) {
    const container = document.getElementById('flashcards-container');
    container.innerHTML = '<li id="loading-flashcards"><p>Carregando flashcards...</p></li>';
    const flashcards = await fetchFlashcards(deckId);

    container.innerHTML = ''; 
    
    if (flashcards.length === 0) {
        container.innerHTML = '<li><p>Este baralho ainda não tem flashcards. Gere novos com a IA!</p></li>';
    } else {
        flashcards.forEach(card => {
            const listItem = document.createElement('li');
            listItem.classList.add('flashcard-list-item');

            const flashcardDiv = document.createElement('div');
            flashcardDiv.classList.add('flashcard');
            flashcardDiv.innerHTML = `
                <p class="question">${card.question}</p>
                <p class="answer">${card.answer}</p>
            `;
            
            listItem.appendChild(flashcardDiv);
            container.appendChild(listItem);
        });
    }
}

/* recall/frontend/public/js/deck.js */
function handleGenerateForm(deckId) {
    const form = document.getElementById('generate-cards-form');
    const button = document.getElementById('generate-button');
    const textarea = document.getElementById('text-content');
    const cardCountInput = document.getElementById('card-count');
    const cardTypeSelect = document.getElementById('card-type');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const textContent = textarea.value.trim();
        if (!textContent) return;
        
        const generationParams = {
            textContent,
            count: parseInt(cardCountInput.value, 10),
            type: cardTypeSelect.value,
        };

        button.disabled = true;
        button.textContent = 'A Gerar...';

        try {
            const result = await generateFlashcards(deckId, generationParams);

            if (result && result.flashcards) {
                textarea.value = '';
                await loadAndRenderFlashcards(deckId);
            } else {
                alert('Ocorreu um erro ao gerar os flashcards. Tente novamente.');
            }
        } finally {
            button.disabled = false;
            button.textContent = 'Gerar Flashcards';
        }
    });
}