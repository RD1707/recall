const AppState = {
    deckId: null,
    currentFlashcards: [],
    deckDetails: null,
    pollingAttempts: 0,
    isGenerating: false,
    POLLING_INTERVAL: 5000, 
    MAX_POLLING_ATTEMPTS: 12, 
};

//  ADICIONADO - Sistema de loading
window.pageLoadingComplete = false;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initializeApplication();
        setupEventListeners();
        await loadPageData();
    } catch (error) {
        console.error('Falha na inicialização da aplicação:', error);
        
        //  ADICIONADO - Tratamento de erro
        if (typeof updateLoadingMessage === 'function') {
            updateLoadingMessage('Erro', 'Não foi possível carregar o baralho');
        }
        
        setTimeout(() => {
            if (typeof hideLoading === 'function') {
                hideLoading();
            }
            showToast('Erro ao carregar a página. Por favor, recarregue.', 'error');
        }, 1000);
    }
});

async function initializeApplication() {
    //  ADICIONADO - Loading message
    if (typeof updateLoadingMessage === 'function') {
        updateLoadingMessage('Inicializando', 'Verificando parâmetros...');
    }
    
    const params = new URLSearchParams(window.location.search);
    AppState.deckId = params.get('id');

    if (!AppState.deckId) {
        if (typeof updateLoadingMessage === 'function') {
            updateLoadingMessage('Erro', 'Baralho não encontrado');
        }
        
        setTimeout(() => {
            if (typeof hideLoading === 'function') {
                hideLoading();
            }
            showToast('ID do baralho não encontrado. Redirecionando...', 'error');
            setTimeout(() => (window.location.href = 'dashboard.html'), 2000);
        }, 1000);
        throw new Error('Deck ID não encontrado na URL');
    }
}

function setupEventListeners() {
    document.getElementById('generate-cards-form').addEventListener('submit', handleGenerateSubmit);
    document.querySelector('.input-mode-selector').addEventListener('click', handleInputModeChange);
    document.querySelectorAll('.number-btn').forEach(btn => btn.addEventListener('click', handleNumberInput));
    document.getElementById('flashcards-container').addEventListener('click', handleFlashcardActions);

    setupModalEventListeners('edit-flashcard-modal', closeEditModal);
    document.getElementById('edit-flashcard-form').addEventListener('submit', handleEditFormSubmit);

    setupModalEventListeners('share-deck-modal', closeShareModal);
    document.getElementById('share-deck-button').addEventListener('click', handleShareDeck);
    document.getElementById('copy-link-button').addEventListener('click', copyShareLink);

    setupFileDropZone();
}

async function loadPageData() {
    try {
        //  ADICIONADO - Loading messages
        if (typeof updateLoadingMessage === 'function') {
            updateLoadingMessage('Carregando Baralho', 'Buscando informações...');
            updateLoadingProgress(25);
        }
        
        await loadDeckDetails();
        
        if (typeof updateLoadingMessage === 'function') {
            updateLoadingMessage('Carregando Baralho', 'Carregando flashcards...');
            updateLoadingProgress(75);
        }
        
        await loadFlashcards();
        
        if (typeof updateLoadingProgress === 'function') {
            updateLoadingProgress(100);
        }
        
        if (typeof updateLoadingMessage === 'function') {
            updateLoadingMessage('Pronto!', 'Baralho carregado com sucesso');
        }
        
        //  ADICIONADO - Finalizar loading
        setTimeout(() => {
            window.pageLoadingComplete = true;
            if (typeof hideLoading === 'function') {
                hideLoading();
            }
        }, 500);
        
    } catch (error) {
        console.error('Erro ao carregar dados da página:', error);
        
        //  ADICIONADO - Tratamento de erro
        if (typeof updateLoadingMessage === 'function') {
            updateLoadingMessage('Erro', 'Não foi possível carregar os dados');
        }
        
        setTimeout(() => {
            if (typeof hideLoading === 'function') {
                hideLoading();
            }
            showToast('Erro ao carregar os dados do baralho', 'error');
        }, 1000);
    }
}

async function loadDeckDetails() {
    const allDecks = await fetchDecks();
    if (!allDecks) return;

    AppState.deckDetails = allDecks.find(deck => deck.id === AppState.deckId);

    if (AppState.deckDetails) {
        renderDeckHeader(AppState.deckDetails);
    } else {
        showToast('Baralho não encontrado.', 'error');
        document.getElementById('deck-title-heading').textContent = 'Baralho não encontrado';
    }
}

async function loadFlashcards(previousCardCount = -1) {
    const container = document.getElementById('flashcards-container');
    
    // Se o loading global estiver ativo, não mostra loading local
    if (window.pageLoadingComplete !== false) {
        showLoadingState(container);
    }

    try {
        AppState.currentFlashcards = await fetchFlashcards(AppState.deckId);
        renderFlashcards(container, AppState.currentFlashcards, previousCardCount);
        updateDeckStats();
    } catch (error) {
        console.error('Erro ao carregar flashcards:', error);
        showErrorState(container, 'Não foi possível carregar os flashcards.');
    }
}

function updateDeckStats() {
    document.getElementById('total-cards-stat').textContent = AppState.currentFlashcards.length;
    document.getElementById('review-cards-stat').textContent = '--';
    document.getElementById('mastered-cards-stat').textContent = '--';
}

function renderDeckHeader(deck) {
    document.getElementById('deck-title-heading').textContent = deck.title;
    document.getElementById('deck-description-paragraph').textContent = deck.description || 'Sem descrição.';
    document.getElementById('study-deck-button').href = `study.html?deckId=${deck.id}`;
}

function renderFlashcards(container, flashcards, previousCardCount = -1) {
    container.innerHTML = '';

    if (!flashcards || flashcards.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-feather="book-open" class="empty-state-icon"></i>
                <h3>Nenhum flashcard ainda</h3>
                <p>Use o gerador com IA para criar seus primeiros flashcards!</p>
            </div>`;
    } else {
        flashcards.forEach((card, index) => {
            const isNew = previousCardCount !== -1 && index >= previousCardCount;
            container.appendChild(createFlashcardElement(card, isNew));
        });

        if (previousCardCount !== -1 && flashcards.length > previousCardCount) {
            animateNewCards(container, previousCardCount);
        }
    }
    feather.replace();
}

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
            <button class="action-btn edit-btn" title="Editar"><i data-feather="edit-2"></i></button>
            <button class="action-btn delete-btn" title="Excluir"><i data-feather="trash-2"></i></button>
        </div>`;

    return cardElement;
}

function showLoadingState(container) {
    container.innerHTML = Array(3).fill(`
        <div class="card-skeleton">
            <div class="skeleton-line skeleton-title"></div>
            <div class="skeleton-line skeleton-content"></div>
        </div>`).join('');
}

function showErrorState(container, message) {
    container.innerHTML = `
        <div class="error-state">
            <i data-feather="alert-circle" class="error-state-icon"></i>
            <p>${message}</p>
            <button class="btn btn-secondary" id="retry-loading">Tentar Novamente</button>
        </div>`;
    document.getElementById('retry-loading').addEventListener('click', () => loadFlashcards());
    feather.replace();
}

async function handleGenerateSubmit(e) {
    e.preventDefault();
    if (AppState.isGenerating) return;

    const form = e.target;
    const button = document.getElementById('generate-button');
    const processingFeedback = document.getElementById('processing-feedback');
    const currentMode = form.querySelector('.input-mode-btn.active').dataset.mode;

    if (!validateGenerationInput(currentMode)) return;

    AppState.isGenerating = true;
    setButtonLoading(button, 'Gerando...');

    try {
        // MODIFICADO - Usar loading global se disponível
        let result;
        if (window.globalLoader && typeof window.globalLoader.wrapAsyncOperation === 'function') {
            result = await window.globalLoader.wrapAsyncOperation(
                processGeneration(currentMode),
                { title: 'Gerando Flashcards', subtitle: 'A IA está analisando o conteúdo...' }
            );
        } else {
            result = await processGeneration(currentMode);
        }
        
        if (result) {
            showToast('Pedido de geração enviado! Seus cards aparecerão em breve.', 'info');
            form.style.display = 'none';
            processingFeedback.classList.remove('hidden');
            AppState.pollingAttempts = 0;
            startPollingForNewFlashcards();
        } else {
            resetGenerationUI(true); 
        }
    } catch (error) {
        showToast(error.message || 'Erro ao iniciar a geração', 'error');
        resetGenerationUI(true);
    }
}

function setButtonLoading(button, text) {
    button.disabled = true;
    button.innerHTML = `<i data-feather="loader" class="btn-icon spinning"></i> ${text}`;
    feather.replace();
}

function setButtonIdle(button, text) {
    button.disabled = false;
    button.innerHTML = `<i data-feather="zap" class="btn-icon"></i> ${text}`;
    feather.replace();
}

function validateGenerationInput(mode) {
    let isValid = false;
    if (mode === 'text') {
        isValid = !!document.getElementById('text-content').value.trim();
        if (!isValid) showToast('Por favor, insira algum texto.', 'error');
    } else if (mode === 'file') {
        isValid = document.getElementById('file-content').files.length > 0;
        if (!isValid) showToast('Por favor, selecione um arquivo.', 'error');
    } else if (mode === 'youtube') {
        const url = document.getElementById('youtube-url').value.trim();
        isValid = url && (url.includes('youtube.com') || url.includes('youtu.be'));
        if (!isValid) showToast('Por favor, insira um link válido do YouTube.', 'error');
    }
    return isValid;
}

async function processGeneration(mode) {
    const params = {
        count: parseInt(document.getElementById('card-count').value, 10),
        type: document.getElementById('card-type').value,
    };

    if (mode === 'text') {
        return generateFlashcards(AppState.deckId, { ...params, textContent: document.getElementById('text-content').value.trim() });
    }
    if (mode === 'file') {
        const formData = new FormData();
        formData.append('file', document.getElementById('file-content').files[0]);
        formData.append('count', params.count);
        formData.append('type', params.type);
        return generateFlashcardsFromFile(AppState.deckId, formData);
    }
    if (mode === 'youtube') {
        return generateFlashcardsFromYouTube(AppState.deckId, { ...params, youtubeUrl: document.getElementById('youtube-url').value.trim() });
    }
}

function startPollingForNewFlashcards() {
    const initialCardCount = AppState.currentFlashcards.length;
    const pollId = setInterval(async () => {
        AppState.pollingAttempts++;
        if (AppState.pollingAttempts > AppState.MAX_POLLING_ATTEMPTS) {
            clearInterval(pollId);
            showToast('A geração está demorando. Verifique novamente mais tarde.', 'error');
            resetGenerationUI();
            return;
        }

        const newCards = await fetchFlashcards(AppState.deckId);
        if (newCards && newCards.length > initialCardCount) {
            clearInterval(pollId);
            showToast('Novos flashcards chegaram!', 'success');
            renderFlashcards(document.getElementById('flashcards-container'), newCards, initialCardCount);
            updateDeckStats();
            resetGenerationUI();
        }
    }, AppState.POLLING_INTERVAL);
}

function resetGenerationUI(isError = false) {
    const form = document.getElementById('generate-cards-form');
    const processingFeedback = document.getElementById('processing-feedback');

    form.style.display = 'block';
    if (!isError) form.reset();

    processingFeedback.classList.add('hidden');
    setButtonIdle(document.getElementById('generate-button'), 'Gerar Flashcards');
    AppState.isGenerating = false;
}

function handleInputModeChange(e) {
    const button = e.target.closest('.input-mode-btn');
    if (!button) return;

    document.querySelectorAll('.input-mode-btn').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');

    document.querySelectorAll('.input-area').forEach(area => area.classList.add('hidden'));
    document.getElementById(`${button.dataset.mode}-input-area`).classList.remove('hidden');
}

function handleNumberInput(e) {
    const button = e.target.closest('.number-btn');
    if (!button) return;
    const input = document.getElementById('card-count');
    let value = parseInt(input.value, 10);
    if (button.dataset.action === 'increase' && value < 15) input.value = value + 1;
    if (button.dataset.action === 'decrease' && value > 1) input.value = value - 1;
}

function setupFileDropZone() {
    const dropZone = document.querySelector('.file-drop-zone');
    const fileInput = document.getElementById('file-content');
    if (!dropZone) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, e => { e.preventDefault(); e.stopPropagation(); });
    });
    ['dragenter', 'dragover'].forEach(eventName => dropZone.addEventListener(eventName, () => dropZone.classList.add('highlight')));
    ['dragleave', 'drop'].forEach(eventName => dropZone.addEventListener(eventName, () => dropZone.classList.remove('highlight')));

    dropZone.addEventListener('drop', e => {
        if (e.dataTransfer.files.length > 0) {
            fileInput.files = e.dataTransfer.files;
            showToast(`Arquivo selecionado: ${fileInput.files[0].name}`, 'info');
        }
    });
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) showToast(`Arquivo selecionado: ${fileInput.files[0].name}`, 'info');
    });
}

function handleFlashcardActions(e) {
    const cardElement = e.target.closest('.flashcard-item');
    if (!cardElement) return;
    if (e.target.closest('.edit-btn')) openEditModal(cardElement.dataset.cardId);
    if (e.target.closest('.delete-btn')) handleDeleteFlashcard(cardElement.dataset.cardId, cardElement);
}

async function handleDeleteFlashcard(cardId, cardElement) {
    if (!confirm('Tem certeza que deseja excluir este flashcard?')) return;
    try {
        await deleteFlashcard(cardId);
        showToast('Flashcard excluído.', 'success');
        cardElement.classList.add('removing');
        setTimeout(() => {
            cardElement.remove();
            AppState.currentFlashcards = AppState.currentFlashcards.filter(c => c.id !== cardId);
            updateDeckStats();
        }, 300);
    } catch (error) {
        showToast('Erro ao excluir o flashcard.', 'error');
    }
}

function openEditModal(cardId) {
    const card = AppState.currentFlashcards.find(c => c.id === cardId);
    if (!card) return;
    document.getElementById('edit-card-id').value = card.id;
    document.getElementById('edit-question').value = card.question;
    document.getElementById('edit-answer').value = card.answer;
    showModal('edit-flashcard-modal');
}

function closeEditModal() {
    hideModal('edit-flashcard-modal');
    document.getElementById('edit-flashcard-form').reset();
}

async function handleEditFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const button = form.querySelector('button[type="submit"]');
    const cardId = form.querySelector('#edit-card-id').value;
    const question = form.querySelector('#edit-question').value.trim();
    const answer = form.querySelector('#edit-answer').value.trim();

    if (!question || !answer) return showToast('Pergunta e resposta são obrigatórios.', 'error');

    button.disabled = true;
    button.textContent = 'Salvando...';

    try {
        await updateFlashcard(cardId, { question, answer });
        showToast('Flashcard atualizado!', 'success');
        closeEditModal();
        await loadFlashcards(); 
    } catch (error) {
        showToast('Erro ao atualizar.', 'error');
    } finally {
        button.disabled = false;
        button.textContent = 'Salvar Alterações';
    }
}

async function handleShareDeck() {
    try {
        const result = await shareDeck(AppState.deckId);
        if (result && result.shareableId) {
            document.getElementById('shareable-link-input').value = `${window.location.origin}/shared-deck.html?id=${result.shareableId}`;
            showModal('share-deck-modal');
        }
    } catch (error) {
        showToast('Erro ao gerar link de compartilhamento.', 'error');
    }
}

function closeShareModal() {
    hideModal('share-deck-modal');
}

async function copyShareLink() {
    const input = document.getElementById('shareable-link-input');
    await navigator.clipboard.writeText(input.value);
    showToast('Link copiado para a área de transferência!', 'success');
}

function showModal(modalId) { document.getElementById(modalId)?.classList.add('visible'); }
function hideModal(modalId) { document.getElementById(modalId)?.classList.remove('visible'); }

function setupModalEventListeners(modalId, closeFn) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.querySelectorAll('[data-close-modal], .close-btn').forEach(btn => btn.addEventListener('click', closeFn));
    modal.addEventListener('click', e => { if (e.target === modal) closeFn(); });
}

function animateNewCards(container, startIndex) {
    const newCards = Array.from(container.children).slice(startIndex);
    newCards.forEach((card, index) => card.style.animation = `fadeIn 0.5s ease-out ${index * 100}ms forwards`);
    if (newCards.length > 0) {
        setTimeout(() => newCards[0].scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
    }
}

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}