const API_BASE_URL = '/api';

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const shareId = params.get('id');

    if (!shareId) {
        document.getElementById('deck-title-heading').textContent = 'Erro';
        document.getElementById('deck-description-paragraph').textContent = 'O link para este baralho compartilhado é inválido ou está em falta.';
        return;
    }

    loadSharedDeck(shareId);
});

async function loadSharedDeck(shareId) {
    const titleElement = document.getElementById('deck-title-heading');
    const descriptionElement = document.getElementById('deck-description-paragraph');
    const flashcardsContainer = document.getElementById('flashcards-container');

    try {
        const response = await fetch(`${API_BASE_URL}/shared/${shareId}`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Não foi possível encontrar o baralho.');
        }

        const deckData = await response.json();

        titleElement.textContent = deckData.title;
        descriptionElement.textContent = deckData.description;

        flashcardsContainer.innerHTML = '';
        if (deckData.flashcards && deckData.flashcards.length > 0) {
            deckData.flashcards.forEach(card => {
                const listItem = document.createElement('li');
                listItem.innerHTML = `
                    <div class="flashcard">
                        <p class="question">${card.question}</p>
                        <p class="answer">${card.answer}</p>
                    </div>`;
                flashcardsContainer.appendChild(listItem);
            });
        } else {
            flashcardsContainer.innerHTML = '<li><p>Este baralho não contém flashcards.</p></li>';
        }

    } catch (error) {
        titleElement.textContent = 'Baralho não encontrado';
        descriptionElement.textContent = error.message;
    }
}