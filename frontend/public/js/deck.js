/**
 * Arquivo: deck-revamped.js
 * Descrição: Lógica moderna e profissional para a página de visualização de baralho
 * Gestão de estado, tratamento de erros robusto e padrões de código limpo
 */

// --- CONSTANTES E CONFIGURAÇÕES ---
const POLLING_INTERVAL = 5000; // 5 segundos
const MAX_POLLING_ATTEMPTS = 12; // Máximo de 1 minuto de polling

// --- ESTADO DA APLICAÇÃO ---
const AppState = {
    deckId: null,
    currentFlashcards: [],
    deckDetails: null,
    pollingAttempts: 0,
    isGenerating: false
};

// --- INICIALIZAÇÃO DA APLICAÇÃO ---
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initializeApplication();
        setupEventListeners();
        await loadPageData();
    } catch (error) {
        console.error('Falha na inicialização da aplicação:', error);
        showToast('Erro ao carregar a página. Por favor, recarregue.', 'error');
    }
});

/**
 * Inicializa a aplicação obtendo o ID do baralho da URL
 */
async function initializeApplication() {
    const params = new URLSearchParams(window.location.search);
    AppState.deckId = params.get('id');

    if (!AppState.deckId) {
        showToast('ID do baralho não encontrado. Redirecionando...', 'error');
        setTimeout(() => window.location.href = 'dashboard.html', 2000);
        throw new Error('Deck ID não encontrado na URL');
    }
}

/**
 * Configura todos os event listeners da aplicação
 */
function setupEventListeners() {
    // Formulário de geração com IA
    const generateForm = document.getElementById('generate-cards-form');
    generateForm.addEventListener('submit', handleGenerateSubmit);

    // Seletor de modo de entrada
    const modeSelector = document.querySelector('.input-mode-selector');
    modeSelector.addEventListener('click', handleInputModeChange);

    // Controles de número de cards
    document.querySelectorAll('.number-btn').forEach(btn => {
        btn.addEventListener('click', handleNumberInput);
    });

    // Ações nos flashcards (delegação de eventos)
    const flashcardsContainer = document.getElementById('flashcards-container');
    flashcardsContainer.addEventListener('click', handleFlashcardActions);

    // Modal de Edição
    setupModalEventListeners('edit-flashcard-modal', closeEditModal);
    document.getElementById('edit-flashcard-form').addEventListener('submit', handleEditFormSubmit);

    // Modal de Compartilhamento
    setupModalEventListeners('share-deck-modal', closeShareModal);
    document.getElementById('share-deck-button').addEventListener('click', handleShareDeck);
    document.getElementById('copy-link-button').addEventListener('click', copyShareLink);

    // Drag and drop para arquivos
    setupFileDropZone();
}

/**
 * Carrega os dados iniciais da página
 */
async function loadPageData() {
    try {
        await Promise.all([loadDeckDetails(), loadFlashcards()]);
        updateDeckStats();
    } catch (error) {
        console.error('Erro ao carregar dados da página:', error);
        showToast('Erro ao carregar os dados do baralho', 'error');
    }
}

/**
 * Carrega os detalhes do baralho
 */
async function loadDeckDetails() {
    try {
        const allDecks = await fetchDecks();
        if (!allDecks) return;

        AppState.deckDetails = allDecks.find(deck => deck.id === AppState.deckId);

        if (AppState.deckDetails) {
            renderDeckHeader(AppState.deckDetails);
        } else {
            showToast('Baralho não encontrado.', 'error');
        }
    } catch (error) {
        console.error('Erro ao carregar detalhes do baralho:', error);
        throw error;
    }
}

/**
 * Carrega e renderiza os flashcards do baralho
 * @param {number} previousCardCount - Número de cards antes da geração (para animação)
 */
async function loadFlashcards(previousCardCount = -1) {
    const container = document.getElementById('flashcards-container');
    
    // Mostra estado de carregamento
    showLoadingState(container);
    
    try {
        AppState.currentFlashcards = await fetchFlashcards(AppState.deckId);
        renderFlashcards(container, AppState.currentFlashcards, previousCardCount);
    } catch (error) {
        console.error('Erro ao carregar flashcards:', error);
        showErrorState(container, 'Erro ao carregar flashcards');
        throw error;
    }
}

/**
 * Atualiza as estatísticas do baralho na UI
 */
function updateDeckStats() {
    // Esta função precisará ser implementada conforme a API disponível
    // Placeholder para demonstração
    document.getElementById('total-cards-stat').textContent = AppState.currentFlashcards.length;
    document.getElementById('review-cards-stat').textContent = '0';
    document.getElementById('mastered-cards-stat').textContent = '0';
}

// --- RENDERIZAÇÃO DA UI ---

/**
 * Renderiza o cabeçalho do baralho
 * @param {Object} deck - Objeto do baralho
 */
function renderDeckHeader(deck) {
    document.getElementById('deck-title-heading').textContent = deck.title;
    document.getElementById('deck-description-paragraph').textContent = deck.description || 'Sem descrição.';
    document.getElementById('study-deck-button').href = `study.html?deckId=${deck.id}`;
}

/**
 * Renderiza a lista de flashcards
 * @param {HTMLElement} container - Container onde os cards serão renderizados
 * @param {Array} flashcards - Array de flashcards
 * @param {number} previousCardCount - Número anterior de cards (para animar os novos)
 */
function renderFlashcards(container, flashcards, previousCardCount = -1) {
    if (!flashcards || flashcards.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-feather="book-open" class="empty-state-icon"></i>
                <h3>Nenhum flashcard ainda</h3>
                <p>Use o gerador com IA para criar seus primeiros flashcards!</p>
            </div>
        `;
        feather.replace();
        return;
    }

    container.innerHTML = '';
    flashcards.forEach((card, index) => {
        const isNew = previousCardCount !== -1 && index >= previousCardCount;
        const cardElement = createFlashcardElement(card, isNew);
        container.appendChild(cardElement);
    });

    // Anima a entrada dos novos cards
    if (previousCardCount !== -1 && flashcards.length > previousCardCount) {
        animateNewCards(container, previousCardCount);
    }
}

/**
 * Cria o elemento HTML para um flashcard
 * @param {Object} card - Objeto do flashcard
 * @param {boolean} isNew - Se é um card novo (para animação)
 * @returns {HTMLElement} Elemento do flashcard
 */
function createFlashcardElement(card, isNew = false) {
    const cardElement = document.createElement('div');
    cardElement.className = `flashcard-item ${isNew ? 'new-card' : ''}`;
    cardElement.dataset.cardId = card.id;

    cardElement.innerHTML = `
        <div class="flashcard-content">
            <h3 class="flashcard-question">${escapeHtml(card.question)}</h3>
            <p class="flashcard-answer">${escapeHtml(card.answer)}</p>
        </div>
        <div class="flashcard-actions">
            <button class="action-btn edit-btn" title="Editar Card">
                <i data-feather="edit-2"></i>
            </button>
            <button class="action-btn delete-btn" title="Excluir Card">
                <i data-feather="trash-2"></i>
            </button>
        </div>
    `;

    return cardElement;
}

/**
 * Mostra estado de carregamento
 * @param {HTMLElement} container - Container onde mostrar o estado
 */
function showLoadingState(container) {
    container.innerHTML = `
        <div class="card-skeleton">
            <div class="skeleton-line skeleton-title"></div>
            <div class="skeleton-line skeleton-content"></div>
            <div class="skeleton-line skeleton-content"></div>
        </div>
        <div class="card-skeleton">
            <div class="skeleton-line skeleton-title"></div>
            <div class="skeleton-line skeleton-content"></div>
            <div class="skeleton-line skeleton-content"></div>
        </div>
    `;
}

/**
 * Mostra estado de erro
 * @param {HTMLElement} container - Container onde mostrar o erro
 * @param {string} message - Mensagem de erro
 */
function showErrorState(container, message) {
    container.innerHTML = `
        <div class="error-state">
            <i data-feather="alert-circle" class="error-state-icon"></i>
            <p>${message}</p>
            <button class="btn btn-secondary" id="retry-loading">Tentar Novamente</button>
        </div>
    `;
    
    document.getElementById('retry-loading').addEventListener('click', () => {
        loadFlashcards();
    });
    
    feather.replace();
}

// --- HANDLERS DE EVENTOS ---

/**
 * Manipula o envio do formulário de geração de flashcards
 * @param {Event} e - Evento de submit
 */
async function handleGenerateSubmit(e) {
    e.preventDefault();
    
    if (AppState.isGenerating) return;
    
    const form = e.target;
    const button = document.getElementById('generate-button');
    const processingFeedback = document.getElementById('processing-feedback');
    const currentMode = form.querySelector('.input-mode-btn.active').dataset.mode;

    // Validação dos dados de entrada
    if (!validateGenerationInput(currentMode)) {
        return;
    }

    AppState.isGenerating = true;
    button.disabled = true;
    button.innerHTML = '<i data-feather="loader" class="spinning"></i> Gerando...';
    feather.replace();

    try {
        const result = await processGeneration(currentMode);
        
        if (result) {
            showToast('Flashcards estão sendo gerados...', 'info');
            form.reset();
            form.classList.add('hidden');
            processingFeedback.classList.remove('hidden');
            AppState.pollingAttempts = 0;
            startPollingForNewFlashcards();
        }
    } catch (error) {
        console.error('Erro na geração de flashcards:', error);
        showToast(error.message || 'Erro ao gerar flashcards', 'error');
    } finally {
        AppState.isGenerating = false;
        button.disabled = false;
        button.innerHTML = '<i data-feather="zap"></i> Gerar Flashcards';
        feather.replace();
    }
}

/**
 * Valida os dados de entrada para geração
 * @param {string} mode - Modo de geração (text, file, youtube)
 * @returns {boolean} True se a validação passou
 */
function validateGenerationInput(mode) {
    switch (mode) {
        case 'text':
            const textContent = document.getElementById('text-content').value.trim();
            if (!textContent) {
                showToast('Por favor, insira algum texto.', 'error');
                return false;
            }
            if (textContent.length < 50) {
                showToast('O texto precisa ter pelo menos 50 caracteres para uma geração eficaz.', 'warning');
            }
            return true;
            
        case 'file':
            const fileInput = document.getElementById('file-content');
            if (!fileInput.files || fileInput.files.length === 0) {
                showToast('Por favor, selecione um arquivo.', 'error');
                return false;
            }
            return true;
            
        case 'youtube':
            const youtubeUrl = document.getElementById('youtube-url').value.trim();
            if (!youtubeUrl || (!youtubeUrl.includes('youtube.com') && !youtubeUrl.includes('youtu.be'))) {
                showToast('Por favor, insira um link válido do YouTube.', 'error');
                return false;
            }
            return true;
            
        default:
            showToast('Modo de geração inválido.', 'error');
            return false;
    }
}

/**
 * Processa a geração com base no modo selecionado
 * @param {string} mode - Modo de geração
 * @returns {Promise} Resultado da geração
 */
async function processGeneration(mode) {
    const commonParams = {
        count: parseInt(document.getElementById('card-count').value, 10),
        type: document.getElementById('card-type').value,
    };

    switch (mode) {
        case 'text':
            const textContent = document.getElementById('text-content').value.trim();
            return await generateFlashcards(AppState.deckId, { ...commonParams, textContent });
            
        case 'file':
            const fileInput = document.getElementById('file-content');
            const file = fileInput.files[0];
            const formData = new FormData();
            formData.append('file', file);
            formData.append('count', commonParams.count);
            formData.append('type', commonParams.type);
            return await generateFlashcardsFromFile(AppState.deckId, formData);
            
        case 'youtube':
            const youtubeUrl = document.getElementById('youtube-url').value.trim();
            return await generateFlashcardsFromYouTube(AppState.deckId, { ...commonParams, youtubeUrl });
    }
}

/**
 * Inicia o polling para verificar novos flashcards
 */
function startPollingForNewFlashcards() {
    const initialCardCount = AppState.currentFlashcards.length;
    const pollInterval = setInterval(async () => {
        if (AppState.pollingAttempts >= MAX_POLLING_ATTEMPTS) {
            clearInterval(pollInterval);
            showToast('Tempo esgotado para geração de flashcards.', 'error');
            resetGenerationUI();
            return;
        }

        AppState.pollingAttempts++;
        
        try {
            const newCardsList = await fetchFlashcards(AppState.deckId);
            
            if (newCardsList && newCardsList.length > initialCardCount) {
                clearInterval(pollInterval);
                await loadFlashcards(initialCardCount);
                showToast('Flashcards gerados com sucesso!', 'success');
                resetGenerationUI();
            }
        } catch (error) {
            console.error('Erro durante polling:', error);
            // Não mostrar erro ao usuário para evitar spam
        }
    }, POLLING_INTERVAL);
}

/**
 * Reseta a UI de geração para o estado inicial
 */
function resetGenerationUI() {
    document.getElementById('generate-cards-form').classList.remove('hidden');
    document.getElementById('processing-feedback').classList.add('hidden');
    AppState.isGenerating = false;
}

/**
 * Manipula a mudança de modo de entrada
 * @param {Event} e - Evento de clique
 */
function handleInputModeChange(e) {
    const button = e.target.closest('.input-mode-btn');
    if (!button) return;

    const currentMode = button.dataset.mode;

    // Atualiza UI
    document.querySelectorAll('.input-mode-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    button.classList.add('active');

    // Mostra área de input correta
    document.getElementById('text-input-area').classList.toggle('hidden', currentMode !== 'text');
    document.getElementById('file-input-area').classList.toggle('hidden', currentMode !== 'file');
    document.getElementById('youtube-input-area').classList.toggle('hidden', currentMode !== 'youtube');
}

/**
 * Manipula os botões de incremento/decremento do número de cards
 * @param {Event} e - Evento de clique
 */
function handleNumberInput(e) {
    const button = e.target.closest('.number-btn');
    if (!button) return;

    const action = button.dataset.action;
    const input = document.getElementById('card-count');
    let value = parseInt(input.value, 10);

    if (action === 'increase' && value < 15) {
        input.value = value + 1;
    } else if (action === 'decrease' && value > 1) {
        input.value = value - 1;
    }
}

/**
 * Configura a zona de drag and drop para arquivos
 */
function setupFileDropZone() {
    const dropZone = document.querySelector('.file-drop-zone');
    if (!dropZone) return;

    const fileInput = document.getElementById('file-content');
    
    // Eventos para drag and drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Efeitos visuais durante drag
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        dropZone.classList.add('highlight');
    }

    function unhighlight() {
        dropZone.classList.remove('highlight');
    }

    // Manipula o drop de arquivos
    dropZone.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            fileInput.files = files;
            showToast('Arquivo selecionado: ' + files[0].name, 'success');
        }
    }

    // Click para selecionar arquivo
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    // Atualiza UI quando arquivo é selecionado
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            showToast('Arquivo selecionado: ' + fileInput.files[0].name, 'success');
        }
    });
}

/**
 * Manipula as ações nos flashcards (editar/excluir)
 * @param {Event} e - Evento de clique
 */
function handleFlashcardActions(e) {
    const cardElement = e.target.closest('.flashcard-item');
    if (!cardElement) return;

    const cardId = cardElement.dataset.cardId;
    
    if (e.target.closest('.edit-btn')) {
        openEditModal(cardId);
    } else if (e.target.closest('.delete-btn')) {
        handleDeleteFlashcard(cardId, cardElement);
    }
}

/**
 * Abre o modal de edição para um flashcard
 * @param {string} cardId - ID do flashcard
 */
function openEditModal(cardId) {
    const card = AppState.currentFlashcards.find(c => c.id === cardId);
    if (!card) return;

    document.getElementById('edit-card-id').value = card.id;
    document.getElementById('edit-question').value = card.question;
    document.getElementById('edit-answer').value = card.answer;
    
    showModal('edit-flashcard-modal');
}

/**
 * Fecha o modal de edição
 */
function closeEditModal() {
    hideModal('edit-flashcard-modal');
    document.getElementById('edit-flashcard-form').reset();
}

/**
 * Manipula a exclusão de um flashcard
 * @param {string} cardId - ID do flashcard
 * @param {HTMLElement} cardElement - Elemento do flashcard na DOM
 */
async function handleDeleteFlashcard(cardId, cardElement) {
    // Confirmação com SweetAlert2 ou similar seria ideal aqui
    if (!confirm('Tem certeza que deseja excluir este flashcard?')) return;

    try {
        const result = await deleteFlashcard(cardId);
        if (result) {
            showToast('Flashcard excluído com sucesso.', 'success');
            
            // Animação de remoção
            cardElement.style.opacity = '0';
            cardElement.style.transform = 'translateX(30px)';
            setTimeout(() => {
                cardElement.remove();
            }, 300);
            
            // Atualiza estado local
            AppState.currentFlashcards = AppState.currentFlashcards.filter(c => c.id !== cardId);
            updateDeckStats();
        }
    } catch (error) {
        console.error('Erro ao excluir flashcard:', error);
        showToast('Erro ao excluir flashcard.', 'error');
    }
}

/**
 * Manipula o envio do formulário de edição
 * @param {Event} e - Evento de submit
 */
async function handleEditFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const cardId = form.querySelector('#edit-card-id').value;
    const question = form.querySelector('#edit-question').value.trim();
    const answer = form.querySelector('#edit-answer').value.trim();

    // Validação
    if (!question || !answer) {
        showToast('Pergunta e resposta não podem estar vazios.', 'error');
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Salvando...';

    try {
        const result = await updateFlashcard(cardId, { question, answer });
        if (result) {
            showToast('Flashcard atualizado com sucesso!', 'success');
            closeEditModal();
            await loadFlashcards(); // Recarrega a lista
        }
    } catch (error) {
        console.error('Erro ao atualizar flashcard:', error);
        showToast('Erro ao atualizar flashcard.', 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Salvar Alterações';
    }
}

/**
 * Manipula o compartilhamento do baralho
 */
async function handleShareDeck() {
    try {
        const result = await shareDeck(AppState.deckId);
        if (result && result.shareableId) {
            const shareLink = `${window.location.origin}/shared-deck.html?id=${result.shareableId}`;
            document.getElementById('shareable-link-input').value = shareLink;
            showModal('share-deck-modal');
        }
    } catch (error) {
        console.error('Erro ao compartilhar baralho:', error);
        showToast('Erro ao compartilhar baralho.', 'error');
    }
}

/**
 * Fecha o modal de compartilhamento
 */
function closeShareModal() {
    hideModal('share-deck-modal');
}

/**
 * Copia o link de compartilhamento para a área de transferência
 */
async function copyShareLink() {
    const linkInput = document.getElementById('shareable-link-input');
    const copyButton = document.getElementById('copy-link-button');
    
    try {
        await navigator.clipboard.writeText(linkInput.value);
        
        // Feedback visual
        const originalText = copyButton.innerHTML;
        copyButton.innerHTML = '<i data-feather="check"></i> Copiado!';
        feather.replace();
        
        setTimeout(() => {
            copyButton.innerHTML = originalText;
            feather.replace();
        }, 2000);
    } catch (error) {
        console.error('Erro ao copiar link:', error);
        showToast('Erro ao copiar link.', 'error');
    }
}

// --- FUNÇÕES UTILITÁRIAS ---

/**
 * Mostra um modal
 * @param {string} modalId - ID do modal
 */
function showModal(modalId) {
    document.getElementById(modalId).classList.add('visible');
}

/**
 * Esconde um modal
 * @param {string} modalId - ID do modal
 */
function hideModal(modalId) {
    document.getElementById(modalId).classList.remove('visible');
}

/**
 * Configura os event listeners para um modal
 * @param {string} modalId - ID do modal
 * @param {Function} closeFn - Função para fechar o modal
 */
function setupModalEventListeners(modalId, closeFn) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    modal.querySelectorAll('[data-close-modal], .close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            closeFn();
        });
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeFn();
        }
    });
}

/**
 * Anima a entrada de novos cards
 * @param {HTMLElement} container - Container dos flashcards
 * @param {number} previousCardCount - Número de cards antes da geração
 */
function animateNewCards(container, previousCardCount) {
    const newCards = Array.from(container.children).slice(previousCardCount);
    
    newCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
    
    // Rola para o primeiro novo card
    if (newCards.length > 0) {
        setTimeout(() => {
            newCards[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 300);
    }
}

/**
 * Escapa HTML para prevenir XSS
 * @param {string} text - Texto a ser escapado
 * @returns {string} Texto escapado
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// --- POLYFILLS E COMPATIBILIDADE ---
// Garante que feather icons sejam atualizados após manipulações da DOM
const originalAppendChild = Element.prototype.appendChild;
Element.prototype.appendChild = function() {
    const result = originalAppendChild.apply(this, arguments);
    feather.replace();
    return result;
};

const originalInsertAdjacentHTML = Element.prototype.insertAdjacentHTML;
Element.prototype.insertAdjacentHTML = function() {
    const result = originalInsertAdjacentHTML.apply(this, arguments);
    feather.replace();
    return result;
};