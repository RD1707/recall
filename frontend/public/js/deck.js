// Variável para armazenar os flashcards carregados na página
let currentFlashcards = [];

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

async function loadAndRenderFlashcards(deckId) {
    const container = document.getElementById('flashcards-container');

    // 1. Exibir os skeleton loaders
    container.innerHTML = '';
    for (let i = 0; i < 4; i++) { // Mostra 4 skeletons como placeholder
        const skeletonItem = document.createElement('li');
        skeletonItem.innerHTML = `
            <div class="flashcard-skeleton">
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text"></div>
            </div>
        `;
        container.appendChild(skeletonItem);
    }

    // 2. Buscar os dados da API
    currentFlashcards = await fetchFlashcards(deckId);

    // 3. Renderizar o conteúdo real
    container.innerHTML = ''; 

    if (!currentFlashcards || currentFlashcards.length === 0) {
        container.innerHTML = '<li><p>Este baralho ainda não tem flashcards. Gere novos com a IA!</p></li>';
    } else {
        currentFlashcards.forEach(card => {
            const listItem = document.createElement('li');
            listItem.classList.add('flashcard-list-item');
            listItem.setAttribute('data-card-id', card.id);

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
    }
}

function handleGenerateForm(deckId) {
    const form = document.getElementById('generate-cards-form');
    const button = document.getElementById('generate-button');
    const cardCountInput = document.getElementById('card-count');
    const cardTypeSelect = document.getElementById('card-type');

    // Elementos do seletor de modo
    const modeSelector = form.querySelector('.input-mode-selector');
    const textInputArea = document.getElementById('text-input-area');
    const fileInputArea = document.getElementById('file-input-area');
    const textarea = document.getElementById('text-content');
    const fileInput = document.getElementById('file-content');

    let currentMode = 'text'; // 'text' ou 'file'

    // Lógica para alternar entre os modos
    modeSelector.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON') return;

        currentMode = e.target.dataset.mode;

        // Atualiza a aparência dos botões
        form.querySelectorAll('.input-mode-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');

        // Mostra/esconde as áreas de input
        if (currentMode === 'text') {
            textInputArea.classList.remove('hidden');
            fileInputArea.classList.add('hidden');
        } else {
            textInputArea.classList.add('hidden');
            fileInputArea.classList.remove('hidden');
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        button.disabled = true;
        button.textContent = 'A Enviar...';

        let result;
        try {
            if (currentMode === 'text') {
                // --- Lógica para submissão de TEXTO ---
                const textContent = textarea.value.trim();
                if (!textContent) {
                    alert('Por favor, cole algum texto.');
                    return;
                }
                const params = {
                    textContent,
                    count: parseInt(cardCountInput.value, 10),
                    type: cardTypeSelect.value,
                };
                result = await generateFlashcards(deckId, params);

            } else {
                // --- Lógica para submissão de FICHEIRO ---
                const file = fileInput.files[0];
                if (!file) {
                    alert('Por favor, selecione um ficheiro.');
                    return;
                }
                const formData = new FormData();
                formData.append('file', file);
                formData.append('count', cardCountInput.value);
                formData.append('type', cardTypeSelect.value);
                result = await generateFlashcardsFromFile(deckId, formData);
            }

            // --- Lógica de feedback e polling (comum a ambos) ---
            if (result) {
                textarea.value = '';
                fileInput.value = ''; // Limpa o seletor de ficheiro
                alert('Pedido recebido! Os flashcards estão a ser gerados e a lista será atualizada em breve.');

                form.style.display = 'none';
                const processingMessage = document.createElement('p');
                processingMessage.id = 'processing-msg';
                processingMessage.textContent = 'A IA está a trabalhar... por favor, aguarde.';
                form.parentElement.appendChild(processingMessage);

                const initialCardCount = currentFlashcards.length;
                const pollInterval = setInterval(async () => {
                    const newCards = await fetchFlashcards(deckId); // Busca os dados atualizados
                    if (newCards && newCards.length > initialCardCount) {
                        clearInterval(pollInterval);
                        await loadAndRenderFlashcards(deckId); // Renderiza a lista completa
                        form.style.display = 'block';
                        document.getElementById('processing-msg').remove();
                    }
                }, 5000); // 5 segundos
            }
        } catch (error) {
            // O erro já é mostrado pelo apiCall
        } finally {
            if (!result) { // Apenas reativa se o pedido inicial falhar
                button.disabled = false;
                button.textContent = 'Gerar Flashcards';
            }
        }
    });
}

// --- Lógica do Modal e Ações CRUD ---

function setupEventListeners(deckId) {
    // --- Modal de Edição ---
    const flashcardsContainer = document.getElementById('flashcards-container');
    const editModal = document.getElementById('edit-flashcard-modal');
    const closeEditModalBtn = editModal.querySelector('.close-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const editForm = document.getElementById('edit-flashcard-form');

    // --- Modal de Compartilhamento ---
    const shareButton = document.getElementById('share-deck-button');
    const shareModal = document.getElementById('share-deck-modal');
    const closeShareModalBtn = shareModal.querySelector('.close-btn');
    const copyLinkButton = document.getElementById('copy-link-button');

    // Delegação de eventos para editar/excluir flashcards
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

    // Eventos para fechar o modal de edição
    editModal.addEventListener('click', (e) => { if (e.target === editModal) closeEditModal(); });
    closeEditModalBtn.addEventListener('click', closeEditModal);
    cancelEditBtn.addEventListener('click', closeEditModal);
    editForm.addEventListener('submit', (e) => handleEditFormSubmit(e, deckId));

    // --- Novos Eventos para Compartilhamento ---
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

// Adicione estas novas funções ao seu arquivo `deck.js`
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
            await loadAndRenderFlashcards(deckId); // Recarrega a lista
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
        alert('A pergunta e a resposta não podem estar vazias.');
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