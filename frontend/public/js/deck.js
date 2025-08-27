/**
 * Arquivo: deck.js (Versão Reformulada)
 * Descrição: Gerencia toda a lógica e interatividade da página de gerenciamento de baralho,
 * incluindo carregamento de dados, renderização, modais e geração de flashcards por IA.
 */

// Objeto de estado para armazenar dados da página, facilitando o acesso
const pageState = {
    deckId: null,
    currentDeck: {},
    flashcards: [],
    reviewCards: [],
};

/**
 * Ponto de entrada principal do script.
 * Garante que o DOM esteja carregado antes de executar o código.
 */
document.addEventListener('DOMContentLoaded', () => {
    pageState.deckId = new URLSearchParams(window.location.search).get('id');

    if (!pageState.deckId) {
        showToast('ID do baralho não encontrado na URL.', 'error');
        window.location.href = 'dashboard.html';
        return;
    }

    // Inicia todas as funcionalidades da página
    initializeDeckPage();
});

/**
 * Orquestra a inicialização da página do baralho.
 */
async function initializeDeckPage() {
    // Referências aos elementos do DOM
    const elements = cacheDOMElements();

    // Carrega todos os dados iniciais da API
    await loadPageData();

    // Renderiza os componentes da página com os dados carregados
    renderDeckHeader(elements);
    renderDeckStats(elements);
    renderFlashcards(elements);

    // Configura todos os event listeners para interatividade
    bindEventListeners(elements);
}

/**
 * Busca e armazena referências para todos os elementos interativos do DOM.
 * @returns {object} Um objeto contendo as referências do DOM.
 */
function cacheDOMElements() {
    return {
        // Cabeçalho e Stats
        deckTitle: document.getElementById('deck-title-heading'),
        deckDescription: document.getElementById('deck-description-paragraph'),
        studyButton: document.getElementById('study-deck-button'),
        totalCardsStat: document.getElementById('total-cards-stat'),
        reviewCardsStat: document.getElementById('review-cards-stat'),
        masteredCardsStat: document.getElementById('mastered-cards-stat'),
        // Lista de Flashcards
        flashcardsContainer: document.getElementById('flashcards-container'),
        addCardManualBtn: document.getElementById('add-card-manual-btn'),
        // Gerador IA
        generateForm: document.getElementById('generate-cards-form'),
        generateButton: document.getElementById('generate-button'),
        processingFeedback: document.getElementById('processing-feedback'),
        modeSelector: document.querySelector('.input-mode-selector'),
        textInputArea: document.getElementById('text-input-area'),
        fileInputArea: document.getElementById('file-input-area'),
        youtubeInputArea: document.getElementById('youtube-input-area'),
        // Modais
        editModal: document.getElementById('edit-flashcard-modal'),
        shareModal: document.getElementById('share-deck-modal'),
        editModalTitle: document.getElementById('modal-title'),
        editForm: document.getElementById('edit-flashcard-form'),
        shareButton: document.getElementById('share-deck-button'),
        copyLinkButton: document.getElementById('copy-link-button'),
    };
}

/**
 * Carrega todos os dados necessários da API e os armazena no objeto de estado.
 */
async function loadPageData() {
    // Busca os dados em paralelo para otimizar o carregamento
    const [allDecks, flashcards, reviewCards] = await Promise.all([
        fetchDecks(),
        fetchFlashcards(pageState.deckId),
        fetchReviewCards(pageState.deckId)
    ]);

    pageState.currentDeck = allDecks.find(deck => deck.id === pageState.deckId) || {};
    pageState.flashcards = flashcards || [];
    pageState.reviewCards = reviewCards || [];
}

/**
 * Renderiza o cabeçalho da página com o título e a descrição do baralho.
 */
function renderDeckHeader({ deckTitle, deckDescription, studyButton }) {
    deckTitle.textContent = pageState.currentDeck.title || 'Baralho não encontrado';
    deckDescription.textContent = pageState.currentDeck.description || 'Sem descrição.';
    studyButton.href = `study.html?deckId=${pageState.deckId}`;
}

/**
 * Renderiza a barra de estatísticas com os dados do baralho.
 */
function renderDeckStats({ totalCardsStat, reviewCardsStat, masteredCardsStat }) {
    totalCardsStat.textContent = pageState.flashcards.length;
    reviewCardsStat.textContent = pageState.reviewCards.length;
    // Lógica para 'dominados' pode ser implementada futuramente no backend
    const masteredCount = pageState.flashcards.filter(c => c.interval > 21).length;
    masteredCardsStat.textContent = masteredCount;
}

/**
 * Renderiza a lista de flashcards na tela.
 * @param {object} elements - Referências do DOM.
 * @param {number} previousCardCount - O número de cards antes de uma nova geração.
 */
function renderFlashcards({ flashcardsContainer }, previousCardCount = -1) {
    flashcardsContainer.innerHTML = ''; // Limpa o container

    if (pageState.flashcards.length === 0) {
        flashcardsContainer.innerHTML = '<p class="empty-state">Este baralho ainda não tem flashcards. Adicione um manualmente ou gere com a IA!</p>';
        return;
    }

    pageState.flashcards.forEach((card, index) => {
        const cardElement = document.createElement('div');
        cardElement.className = 'flashcard-revamped';
        cardElement.dataset.cardId = card.id;

        // Adiciona uma classe para animar novos cards
        if (previousCardCount !== -1 && index >= previousCardCount) {
            cardElement.classList.add('new-card-animation');
        }

        cardElement.innerHTML = `
            <div class="flashcard-section">
                <div class="label">Pergunta</div>
                <p class="content">${card.question}</p>
            </div>
            <div class="flashcard-section">
                <div class="label">Resposta</div>
                <p class="content">${card.answer}</p>
            </div>
            <div class="flashcard-actions-revamped">
                <button class="action-btn edit-btn" title="Editar card"><i data-feather="edit-2" style="width:16px; height:16px;"></i></button>
                <button class="action-btn delete-btn" title="Excluir card"><i data-feather="trash-2" style="width:16px; height:16px;"></i></button>
            </div>
        `;
        flashcardsContainer.appendChild(cardElement);
    });

    feather.replace(); // Re-ativa os ícones

    // Rola a tela para o primeiro novo card gerado
    if (previousCardCount !== -1 && pageState.flashcards.length > previousCardCount) {
        const firstNewCard = flashcardsContainer.querySelector('.new-card-animation');
        if (firstNewCard) {
            firstNewCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}

/**
 * Configura todos os event listeners da página.
 */
function bindEventListeners(elements) {
    // Ações na lista de flashcards (editar/excluir)
    elements.flashcardsContainer.addEventListener('click', (e) => {
        const editButton = e.target.closest('.edit-btn');
        const deleteButton = e.target.closest('.delete-btn');
        const cardId = e.target.closest('.flashcard-revamped')?.dataset.cardId;

        if (editButton) openModal(elements, 'edit', cardId);
        if (deleteButton) handleDeleteFlashcard(elements, cardId);
    });

    // Adicionar card manualmente
    elements.addCardManualBtn.addEventListener('click', () => openModal(elements, 'create'));

    // Geração por IA
    elements.generateForm.addEventListener('submit', (e) => handleAIGeneration(e, elements));
    elements.modeSelector.addEventListener('click', (e) => {
        const button = e.target.closest('.input-mode-btn');
        if (button) {
            switchAIGeneratorMode(elements, button.dataset.mode);
        }
    });

    // Modais
    elements.editForm.addEventListener('submit', (e) => handleModalFormSubmit(e, elements));
    elements.shareButton.addEventListener('click', () => handleShareDeck(elements));
    elements.copyLinkButton.addEventListener('click', copyShareLink);
    
    // Listeners para fechar modais
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.getAttribute('data-close-modal');
            document.getElementById(modalId)?.classList.remove('visible');
        });
    });
}

/**
 * Gerencia a abertura e o estado do modal de edição/criação.
 */
function openModal({ editModal, editForm, editModalTitle }, mode, cardId = null) {
    editForm.reset();
    editForm.dataset.mode = mode;
    editForm.dataset.cardId = cardId || '';

    if (mode === 'edit') {
        const card = pageState.flashcards.find(c => c.id === cardId);
        if (card) {
            editModalTitle.textContent = 'Editar Flashcard';
            editForm.querySelector('#edit-question').value = card.question;
            editForm.querySelector('#edit-answer').value = card.answer;
        }
    } else {
        editModalTitle.textContent = 'Adicionar Novo Card';
    }
    
    editModal.classList.add('visible');
}

/**
 * Lida com a submissão do formulário do modal (criar ou atualizar).
 */
async function handleModalFormSubmit(event, elements) {
    event.preventDefault();
    const form = event.target;
    const { mode, cardId } = form.dataset;
    const question = form.querySelector('#edit-question').value.trim();
    const answer = form.querySelector('#edit-answer').value.trim();

    if (!question || !answer) {
        showToast('Pergunta e resposta são obrigatórias.', 'error');
        return;
    }

    let success = false;
    if (mode === 'create') {
        const result = await createFlashcard(pageState.deckId, { question, answer });
        if (result) {
            showToast('Flashcard criado com sucesso!', 'success');
            success = true;
        }
    } else {
        const result = await updateFlashcard(cardId, { question, answer });
        if (result) {
            showToast('Flashcard atualizado com sucesso!', 'success');
            success = true;
        }
    }
    
    if (success) {
        elements.editModal.classList.remove('visible');
        await loadPageData(); // Recarrega todos os dados
        renderFlashcards(elements);
        renderDeckStats(elements);
    }
}

/**
 * Lida com a exclusão de um flashcard.
 */
async function handleDeleteFlashcard(elements, cardId) {
    if (confirm('Tem certeza de que deseja excluir este flashcard?')) {
        const result = await deleteFlashcard(cardId);
        if (result) {
            showToast('Flashcard excluído.', 'success');
            await loadPageData();
            renderFlashcards(elements);
            renderDeckStats(elements);
        }
    }
}

/**
 * Lida com a submissão do formulário de geração por IA.
 */
async function handleAIGeneration(event, elements) {
    event.preventDefault();
    elements.generateButton.disabled = true;
    elements.generateButton.textContent = 'Gerando...';

    const { count, type } = {
        count: parseInt(document.getElementById('card-count').value, 10),
        type: document.getElementById('card-type').value,
    };
    
    let result;
    const currentMode = elements.modeSelector.querySelector('.active').dataset.mode;

    // Lógica para cada modo de entrada
    switch (currentMode) {
        case 'text':
            const textContent = document.getElementById('text-content').value.trim();
            if (!textContent) {
                showToast('Por favor, cole algum texto.', 'error');
                break;
            }
            result = await generateFlashcards(pageState.deckId, { textContent, count, type });
            break;
        case 'file':
            const file = document.getElementById('file-content').files[0];
            if (!file) {
                showToast('Por favor, selecione um ficheiro.', 'error');
                break;
            }
            const formData = new FormData();
            formData.append('file', file);
            formData.append('count', count);
            formData.append('type', type);
            result = await generateFlashcardsFromFile(pageState.deckId, formData);
            break;
        case 'youtube':
            const youtubeUrl = document.getElementById('youtube-url').value.trim();
            if (!youtubeUrl) {
                showToast('Por favor, insira um link do YouTube.', 'error');
                break;
            }
            result = await generateFlashcardsFromYouTube(pageState.deckId, { youtubeUrl, count, type });
            break;
    }

    if (result) {
        showToast(result.message, 'info');
        elements.generateForm.reset();
        elements.generateForm.style.display = 'none';
        elements.processingFeedback.classList.remove('hidden');
        
        const previousCardCount = pageState.flashcards.length;
        pollForNewCards(elements, previousCardCount);
    } else {
        elements.generateButton.disabled = false;
        elements.generateButton.textContent = 'Gerar Flashcards';
    }
}

/**
 * Verifica periodicamente se novos flashcards foram adicionados após uma solicitação à IA.
 */
function pollForNewCards(elements, previousCardCount) {
    const pollInterval = setInterval(async () => {
        const newCards = await fetchFlashcards(pageState.deckId);
        if (newCards && newCards.length > previousCardCount) {
            clearInterval(pollInterval);
            pageState.flashcards = newCards; // Atualiza o estado
            
            renderFlashcards(elements, previousCardCount);
            renderDeckStats(elements);

            elements.generateForm.style.display = 'block';
            elements.processingFeedback.classList.add('hidden');
            elements.generateButton.disabled = false;
            elements.generateButton.textContent = 'Gerar Flashcards';
            showToast(`${newCards.length - previousCardCount} novos cards foram adicionados!`, 'success');
        }
    }, 5000); // Verifica a cada 5 segundos
}

function switchAIGeneratorMode({ textInputArea, fileInputArea, youtubeInputArea, modeSelector }, mode) {
    modeSelector.querySelectorAll('.input-mode-btn').forEach(btn => btn.classList.remove('active'));
    modeSelector.querySelector(`[data-mode="${mode}"]`).classList.add('active');
    
    textInputArea.classList.toggle('hidden', mode !== 'text');
    fileInputArea.classList.toggle('hidden', mode !== 'file');
    youtubeInputArea.classList.toggle('hidden', mode !== 'youtube');
}

async function handleShareDeck({ shareModal }) {
    const result = await shareDeck(pageState.deckId);
    if (result && result.shareableId) {
        const shareLink = `${window.location.origin}/shared-deck.html?id=${result.shareableId}`;
        document.getElementById('shareable-link-input').value = shareLink;
        shareModal.classList.add('visible');
    }
}

function copyShareLink() {
    const linkInput = document.getElementById('shareable-link-input');
    navigator.clipboard.writeText(linkInput.value).then(() => {
        showToast('Link copiado para a área de transferência!', 'success');
    });
}