/**
 * Arquivo: deck.js
 * Descrição: Gerencia a lógica da página de um baralho específico, incluindo a visualização,
 * criação, edição e exclusão de flashcards, além da geração via IA.
 */

// Armazena o estado da página para evitar variáveis globais
const pageState = {
    deckId: null,
    currentFlashcards: [],
    deckDetails: null,
};

document.addEventListener('DOMContentLoaded', () => {
    // 1. INICIALIZAÇÃO
    // Pega o ID do baralho da URL e inicia o carregamento da página.
    const params = new URLSearchParams(window.location.search);
    pageState.deckId = params.get('id');

    if (!pageState.deckId) {
        showToast('ID do baralho não encontrado. Redirecionando...', 'error');
        setTimeout(() => window.location.href = 'dashboard.html', 2000);
        return;
    }

    initializePage();
});

/**
 * Função principal que orquestra a inicialização da página.
 */
async function initializePage() {
    setupEventListeners();
    await loadPageData();
}

/**
 * Busca e renderiza os dados essenciais da página (informações do baralho e flashcards).
 */
async function loadPageData() {
    const allDecks = await fetchDecks();
    if (!allDecks) return;

    pageState.deckDetails = allDecks.find(deck => deck.id === pageState.deckId);

    if (pageState.deckDetails) {
        renderDeckHeader(pageState.deckDetails);
    } else {
        showToast('Baralho não encontrado.', 'error');
    }

    await loadAndRenderFlashcards();
}

/**
 * Busca os flashcards do baralho atual e os exibe na tela.
 * @param {number} [previousCardCount=-1] - Usado para animar apenas os novos cards após a geração.
 */
async function loadAndRenderFlashcards(previousCardCount = -1) {
    const container = document.getElementById('flashcards-container');
    container.innerHTML = '<li><p>A carregar flashcards...</p></li>'; // Estado de carregamento

    pageState.currentFlashcards = await fetchFlashcards(pageState.deckId);
    container.innerHTML = ''; // Limpa o container

    if (!pageState.currentFlashcards || pageState.currentFlashcards.length === 0) {
        container.innerHTML = '<li><p>Este baralho ainda não tem flashcards. Use o gerador com IA para criar novos!</p></li>';
        return;
    }

    pageState.currentFlashcards.forEach((card, index) => {
        const isNew = previousCardCount !== -1 && index >= previousCardCount;
        const cardElement = createFlashcardElement(card, isNew);
        container.appendChild(cardElement);
    });

    // Rola a tela para o primeiro novo card gerado
    if (previousCardCount !== -1 && pageState.currentFlashcards.length > previousCardCount) {
        const firstNewCard = container.querySelector('.new-card');
        firstNewCard?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}


// --- FUNÇÕES DE RENDERIZAÇÃO ---

/**
 * Atualiza o cabeçalho da página com o título e a descrição do baralho.
 * @param {object} deck - O objeto do baralho.
 */
function renderDeckHeader(deck) {
    document.getElementById('deck-title-heading').textContent = deck.title;
    document.getElementById('deck-description-paragraph').textContent = deck.description || 'Sem descrição.';
    document.getElementById('study-deck-button').href = `study.html?deckId=${deck.id}`;
}

/**
 * Cria o elemento HTML para um único flashcard.
 * @param {object} card - O objeto do flashcard.
 * @param {boolean} isNew - Se o card deve ter a animação de "novo".
 * @returns {HTMLLIElement} O elemento <li> do flashcard.
 */
function createFlashcardElement(card, isNew) {
    const listItem = document.createElement('li');
    listItem.className = `flashcard-list-item ${isNew ? 'new-card' : ''}`;
    listItem.dataset.cardId = card.id;

    listItem.innerHTML = `
        <div class="card flashcard">
            <p class="question">${card.question}</p>
            <p class="answer">${card.answer}</p>
        </div>
        <div class="flashcard-actions">
            <button class="action-btn edit-btn" title="Editar Card">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
            </button>
            <button class="action-btn delete-btn" title="Excluir Card">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
        </div>
    `;
    return listItem;
}


// --- GERENCIAMENTO DE EVENTOS ---

/**
 * Configura todos os event listeners da página.
 */
function setupEventListeners() {
    // Formulário de Geração com IA
    const generateForm = document.getElementById('generate-cards-form');
    generateForm.addEventListener('submit', handleGenerateSubmit);

    // Seletor de modo de entrada (Texto, Ficheiro, YouTube)
    const modeSelector = document.querySelector('.input-mode-selector');
    modeSelector.addEventListener('click', handleInputModeChange);

    // Ações nos flashcards (Editar/Excluir) - Usando delegação de eventos
    const flashcardsContainer = document.getElementById('flashcards-container');
    flashcardsContainer.addEventListener('click', handleFlashcardActions);

    // Modal de Edição
    setupModalEventListeners('edit-flashcard-modal', closeEditModal);
    document.getElementById('edit-flashcard-form').addEventListener('submit', handleEditFormSubmit);

    // Modal de Compartilhamento
    setupModalEventListeners('share-deck-modal', closeShareModal);
    document.getElementById('share-deck-button').addEventListener('click', handleShareDeck);
    document.getElementById('copy-link-button').addEventListener('click', copyShareLink);
}

/**
 * Gerencia a submissão do formulário de geração de flashcards.
 * @param {Event} e - O evento de submissão do formulário.
 */
async function handleGenerateSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const button = document.getElementById('generate-button');
    const processingFeedback = document.getElementById('processing-feedback');
    const currentMode = form.querySelector('.input-mode-btn.active').dataset.mode;

    button.disabled = true;
    button.textContent = 'A gerar...';

    let result;
    const commonParams = {
        count: parseInt(document.getElementById('card-count').value, 10),
        type: document.getElementById('card-type').value,
    };

    try {
        switch (currentMode) {
            case 'text':
                const textContent = document.getElementById('text-content').value.trim();
                if (!textContent) {
                    showToast('Por favor, insira algum texto.', 'error');
                    return;
                }
                result = await generateFlashcards(pageState.deckId, { ...commonParams, textContent });
                break;

            case 'file':
                const fileInput = document.getElementById('file-content');
                const file = fileInput.files[0];
                if (!file) {
                    showToast('Por favor, selecione um ficheiro.', 'error');
                    return;
                }
                const formData = new FormData();
                formData.append('file', file);
                formData.append('count', commonParams.count);
                formData.append('type', commonParams.type);
                result = await generateFlashcardsFromFile(pageState.deckId, formData);
                break;

            case 'youtube':
                const youtubeUrl = document.getElementById('youtube-url').value.trim();
                if (!youtubeUrl.includes('youtube.com') && !youtubeUrl.includes('youtu.be')) {
                    showToast('Por favor, insira um link válido do YouTube.', 'error');
                    return;
                }
                result = await generateFlashcardsFromYouTube(pageState.deckId, { ...commonParams, youtubeUrl });
                break;
        }

        if (result) {
            showToast(result.message, 'info');
            form.reset();
            form.classList.add('hidden');
            processingFeedback.classList.remove('hidden');
            pollForNewFlashcards(); // Inicia a verificação por novos cards
        }
    } finally {
        button.disabled = false;
        button.textContent = 'Gerar Flashcards';
        if (!result) { // Se houve erro antes de iniciar o polling
            form.classList.remove('hidden');
            processingFeedback.classList.add('hidden');
        }
    }
}

/**
 * Alterna a visibilidade dos campos de entrada (Texto, Ficheiro, YouTube).
 * @param {Event} e - O evento de clique.
 */
function handleInputModeChange(e) {
    const button = e.target.closest('.input-mode-btn');
    if (!button) return;

    const currentMode = button.dataset.mode;

    document.querySelectorAll('.input-mode-btn').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');

    document.getElementById('text-input-area').classList.toggle('hidden', currentMode !== 'text');
    document.getElementById('file-input-area').classList.toggle('hidden', currentMode !== 'file');
    document.getElementById('youtube-input-area').classList.toggle('hidden', currentMode !== 'youtube');
}

/**
 * Lida com cliques nos botões de editar e excluir de um flashcard.
 * @param {Event} e - O evento de clique.
 */
function handleFlashcardActions(e) {
    const cardId = e.target.closest('.flashcard-list-item')?.dataset.cardId;
    if (!cardId) return;

    if (e.target.closest('.edit-btn')) {
        openEditModal(cardId);
    }
    if (e.target.closest('.delete-btn')) {
        handleDeleteFlashcard(cardId);
    }
}

/**
 * Confirma e processa a exclusão de um flashcard.
 * @param {string} cardId - O ID do flashcard a ser excluído.
 */
async function handleDeleteFlashcard(cardId) {
    if (confirm('Tem a certeza de que deseja excluir este flashcard?')) {
        const result = await deleteFlashcard(cardId);
        if (result) {
            showToast('Flashcard excluído com sucesso.', 'success');
            // Remove o elemento do DOM para uma UI mais rápida
            document.querySelector(`[data-card-id="${cardId}"]`).remove();
            // Atualiza o estado local
            pageState.currentFlashcards = pageState.currentFlashcards.filter(c => c.id !== cardId);
        }
    }
}

/**
 * Verifica periodicamente se novos flashcards foram adicionados ao baralho.
 */
function pollForNewFlashcards() {
    const initialCardCount = pageState.currentFlashcards.length;
    const pollInterval = setInterval(async () => {
        const newCardsList = await fetchFlashcards(pageState.deckId);
        if (newCardsList && newCardsList.length > initialCardCount) {
            clearInterval(pollInterval);
            await loadAndRenderFlashcards(initialCardCount); // Passa a contagem antiga

            // Restaura a visibilidade do formulário
            document.getElementById('generate-cards-form').classList.remove('hidden');
            document.getElementById('processing-feedback').classList.add('hidden');
        }
    }, 5000); // Verifica a cada 5 segundos
}


// --- LÓGICA DOS MODAIS ---

/**
 * Abre o modal para editar um flashcard específico.
 * @param {string} cardId - O ID do flashcard a ser editado.
 */
function openEditModal(cardId) {
    const card = pageState.currentFlashcards.find(c => c.id === cardId);
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

/**
 * Lida com a submissão do formulário de edição de flashcard.
 * @param {Event} e - O evento de submissão.
 */
async function handleEditFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const cardId = form.querySelector('#edit-card-id').value;
    const question = form.querySelector('#edit-question').value.trim();
    const answer = form.querySelector('#edit-answer').value.trim();

    if (!question || !answer) {
        showToast('Pergunta e resposta não podem estar vazios.', 'error');
        return;
    }

    const result = await updateFlashcard(cardId, { question, answer });
    if (result) {
        showToast('Flashcard atualizado!', 'success');
        closeEditModal();
        await loadAndRenderFlashcards(); // Recarrega a lista para mostrar a alteração
    }
}

/**
 * Busca o link compartilhável e abre o modal de compartilhamento.
 */
async function handleShareDeck() {
    const result = await shareDeck(pageState.deckId);
    if (result && result.shareableId) {
        const shareLink = `${window.location.origin}/shared-deck.html?id=${result.shareableId}`;
        document.getElementById('shareable-link-input').value = shareLink;
        document.getElementById('share-deck-modal').classList.add('visible');
    }
}

function closeShareModal() {
    document.getElementById('share-deck-modal').classList.remove('visible');
}

/**
 * Copia o link de compartilhamento para a área de transferência.
 */
function copyShareLink() {
    const linkInput = document.getElementById('shareable-link-input');
    const copyButton = document.getElementById('copy-link-button');
    navigator.clipboard.writeText(linkInput.value).then(() => {
        copyButton.textContent = 'Copiado!';
        setTimeout(() => { copyButton.textContent = 'Copiar'; }, 2000);
    });
}

/**
 * Função genérica para configurar os event listeners de um modal.
 * @param {string} modalId - O ID do overlay do modal.
 * @param {Function} closeFn - A função a ser chamada para fechar o modal.
 */
function setupModalEventListeners(modalId, closeFn) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    // Fechar ao clicar no botão 'x' ou similar que tenha o atributo 'data-close-modal'
    modal.querySelectorAll('[data-close-modal], .close-btn, .cancel-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            closeFn();
        });
    });

    // Fechar ao clicar fora da área do modal
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeFn();
        }
    });
}