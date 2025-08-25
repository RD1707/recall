let currentFlashcards = [];

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const deckId = params.get('id');

    if (!deckId) {
        showToast('ID do baralho não encontrado.');
        window.location.href = 'dashboard.html';
        return;
    }

    document.getElementById('study-deck-button').href = `study.html?deckId=${deckId}`;

    loadPageData(deckId);
    handleGenerateForm(deckId);
    setupEventListeners(deckId);
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

async function loadAndRenderFlashcards(deckId, previousCardCount = -1) {
    const container = document.getElementById('flashcards-container');

    if (previousCardCount === -1) {
        container.innerHTML = '';
        for (let i = 0; i < 4; i++) {
            const skeletonItem = document.createElement('li');
            skeletonItem.innerHTML = `
                <div class="flashcard-skeleton">
                    <div class="skeleton skeleton-text"></div>
                    <div class="skeleton skeleton-text"></div>
                </div>
            `;
            container.appendChild(skeletonItem);
        }
    }

    currentFlashcards = await fetchFlashcards(deckId);
    container.innerHTML = '';

    if (!currentFlashcards || currentFlashcards.length === 0) {
        container.innerHTML = '<li><p>Este baralho ainda não tem flashcards. Gere novos com a IA!</p></li>';
    } else {
        currentFlashcards.forEach((card, index) => {
            const listItem = document.createElement('li');
            listItem.classList.add('flashcard-list-item');
            listItem.setAttribute('data-card-id', card.id);

            if (previousCardCount !== -1 && index >= previousCardCount) {
                listItem.classList.add('new-card');
            }

            listItem.innerHTML = `
                <div class="flashcard">
                    <p class="question">${card.question}</p>
                    <p class="answer">${card.answer}</p>
                </div>
                <div class="flashcard-actions">
                    <button class="action-btn edit-btn" title="Editar card">Editar</button>
                    <button class="action-btn delete-btn" title="Excluir card">Excluir</button>
                </div>
            `;
            container.appendChild(listItem);
        });

        if (previousCardCount !== -1 && currentFlashcards.length > previousCardCount) {
            const firstNewCard = container.querySelector('.new-card');
            if (firstNewCard) {
                firstNewCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }
}

function handleGenerateForm(deckId) {
    const form = document.getElementById('generate-cards-form');
    const button = document.getElementById('generate-button');
    const cardCountInput = document.getElementById('card-count');
    const cardTypeSelect = document.getElementById('card-type');
    const processingFeedback = document.getElementById('processing-feedback');

    const modeSelector = form.querySelector('.input-mode-selector');
    const textInputArea = document.getElementById('text-input-area');
    const fileInputArea = document.getElementById('file-input-area');
    const youtubeInputArea = document.getElementById('youtube-input-area');

    const textarea = document.getElementById('text-content');
    const fileInput = document.getElementById('file-content');
    const youtubeUrlInput = document.getElementById('youtube-url');

    let currentMode = 'text';

    modeSelector.addEventListener('click', (e) => {
        const button = e.target.closest('.input-mode-btn');
        if (!button) return;

        currentMode = button.dataset.mode;

        form.querySelectorAll('.input-mode-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        textInputArea.classList.toggle('hidden', currentMode !== 'text');
        fileInputArea.classList.toggle('hidden', currentMode !== 'file');
        youtubeInputArea.classList.toggle('hidden', currentMode !== 'youtube');
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        button.disabled = true;
        button.textContent = 'A Enviar...';

        let result;
        const commonParams = {
            count: parseInt(cardCountInput.value, 10),
            type: cardTypeSelect.value,
        };

        try {
            switch (currentMode) {
                case 'text':
                    const textContent = textarea.value.trim();
                    if (!textContent) {
                        showToast('Por favor, cole algum texto.', 'error');
                        return; 
                    }
                    result = await generateFlashcards(deckId, { ...commonParams, textContent });
                    break;

                case 'file':
                    const file = fileInput.files[0];
                    if (!file) {
                        showToast('Por favor, selecione um ficheiro.', 'error');
                        return;
                    }
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('count', commonParams.count);
                    formData.append('type', commonParams.type);
                    result = await generateFlashcardsFromFile(deckId, formData);
                    break;

                case 'youtube':
                    const youtubeUrl = youtubeUrlInput.value.trim();
                    if (!youtubeUrl.includes('youtube.com') && !youtubeUrl.includes('youtu.be')) {
                        showToast('Por favor, insira um link válido do YouTube.', 'error');
                        return;
                    }
                    result = await generateFlashcardsFromYouTube(deckId, { ...commonParams, youtubeUrl });
                    break;
            }

            if (result) {
                showToast(result.message, 'info');
                textarea.value = '';
                fileInput.value = '';
                youtubeUrlInput.value = '';

                form.classList.add('hidden');
                processingFeedback.classList.remove('hidden');

                const initialCardCount = currentFlashcards.length;
                const pollInterval = setInterval(async () => {
                    const newCardsList = await fetchFlashcards(deckId);
                    if (newCardsList && newCardsList.length > initialCardCount) {
                        clearInterval(pollInterval);
                        await loadAndRenderFlashcards(deckId, initialCardCount);
                        
                        form.classList.remove('hidden');
                        processingFeedback.classList.add('hidden');
                        button.disabled = false;
                        button.textContent = 'Gerar Flashcards';
                    }
                }, 5000); 
            } else {
                button.disabled = false;
                button.textContent = 'Gerar Flashcards';
            }
        } catch (error) {
            button.disabled = false;
            button.textContent = 'Gerar Flashcards';
        }
    });
}

function setupEventListeners(deckId) {
    const flashcardsContainer = document.getElementById('flashcards-container');
    const editModal = document.getElementById('edit-flashcard-modal');
    const closeEditModalBtn = editModal.querySelector('.close-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const editForm = document.getElementById('edit-flashcard-form');

    const shareButton = document.getElementById('share-deck-button');
    const shareModal = document.getElementById('share-deck-modal');
    const closeShareModalBtn = shareModal.querySelector('.close-btn');
    const copyLinkButton = document.getElementById('copy-link-button');

    flashcardsContainer.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('edit-btn')) {
            const cardId = target.closest('.flashcard-list-item').dataset.cardId;
            openEditModal(cardId);
        }
        if (target.classList.contains('delete-btn')) {
            const cardId = target.closest('.flashcard-list-item').dataset.cardId;
            handleDeleteFlashcard(cardId, deckId);
        }
    });

    editModal.addEventListener('click', (e) => { if (e.target === editModal) closeEditModal(); });
    closeEditModalBtn.addEventListener('click', closeEditModal);
    cancelEditBtn.addEventListener('click', closeEditModal);
    editForm.addEventListener('submit', (e) => handleEditFormSubmit(e, deckId));

    shareButton.addEventListener('click', () => handleShareDeck(deckId));
    shareModal.addEventListener('click', (e) => { if (e.target === shareModal) closeShareModal(); });
    closeShareModalBtn.addEventListener('click', closeShareModal);

    copyLinkButton.addEventListener('click', () => {
        const linkInput = document.getElementById('shareable-link-input');
        navigator.clipboard.writeText(linkInput.value).then(() => {
            copyLinkButton.textContent = 'Copiado!';
            setTimeout(() => { copyLinkButton.textContent = 'Copiar'; }, 2000);
        });
    });
}

async function handleShareDeck(deckId) {
    const result = await shareDeck(deckId);
    if (result && result.shareableId) {
        const shareLink = `${window.location.origin}/shared-deck.html?id=${result.shareableId}`;
        const linkInput = document.getElementById('shareable-link-input');
        linkInput.value = shareLink;
        document.getElementById('share-deck-modal').classList.add('visible');
    }
}

function closeShareModal() {
    document.getElementById('share-deck-modal').classList.remove('visible');
}

function openEditModal(cardId) {
    const card = currentFlashcards.find(c => c.id === cardId);
    if (!card) return;

    document.getElementById('edit-card-id').value = card.id;
    document.getElementById('edit-question').value = card.question;
    document.getElementById('edit-answer').value = card.answer;

    document.getElementById('edit-flashcard-modal').classList.add('visible');
}

function closeEditModal() {
    document.getElementById('edit-flashcard-modal').classList.remove('visible');
    document.getElementById('edit-flashcard-form').reset();
}

async function handleDeleteFlashcard(cardId, deckId) {
    if (confirm('Tem a certeza de que deseja excluir este flashcard? Esta ação não pode ser desfeita.')) {
        const result = await deleteFlashcard(cardId);
        if (result) {
            await loadAndRenderFlashcards(deckId); 
        }
    }
}

async function handleEditFormSubmit(event, deckId) {
    event.preventDefault();
    const form = event.target;
    const cardId = form.querySelector('#edit-card-id').value;
    const question = form.querySelector('#edit-question').value.trim();
    const answer = form.querySelector('#edit-answer').value.trim();
    const submitButton = form.querySelector('button[type="submit"]');

    if (!question || !answer) {
        showToast('A pergunta e a resposta não podem estar vazias.');
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'A Salvar...';

    try {
        const result = await updateFlashcard(cardId, { question, answer });
        if (result) {
            closeEditModal();
            await loadAndRenderFlashcards(deckId);
        }
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Salvar Alterações';
    }
}