// Estado Global da Aplicação
const AppState = {
    deckId: null,
    currentFlashcards: [],
    deckDetails: null,
    pollingAttempts: 0,
    isGenerating: false,
    selectedFile: null,
    currentTab: 'text',
    processingStep: 0,
    autoSaveTimer: null,
    undoStack: [],
    redoStack: [],
    POLLING_INTERVAL: 3000,
    MAX_POLLING_ATTEMPTS: 20,
    AUTOSAVE_DELAY: 2000,
    cache: new Map(),
    observers: new Map()
};

// Mensagens de progresso para cada etapa
const PROCESSING_MESSAGES = {
    1: [
        'Analisando a estrutura do conteúdo...',
        'Identificando conceitos principais...',
        'Extraindo informações relevantes...'
    ],
    2: [
        'Gerando perguntas inteligentes...',
        'Criando respostas detalhadas...',
        'Aplicando técnicas de aprendizagem...'
    ],
    3: [
        'Finalizando seus flashcards...',
        'Organizando o conteúdo...',
        'Preparando para estudo...'
    ]
};

// Sistema de Cache
class CacheManager {
    static set(key, data, ttl = 300000) { // 5 minutos padrão
        AppState.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl
        });
    }

    static get(key) {
        const cached = AppState.cache.get(key);
        if (!cached) return null;
        
        if (Date.now() - cached.timestamp > cached.ttl) {
            AppState.cache.delete(key);
            return null;
        }
        
        return cached.data;
    }

    static clear() {
        AppState.cache.clear();
    }
}

// Inicialização Principal
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initializeApplication();
        setupEventListeners();
        setupKeyboardShortcuts();
        setupAutoSave();
        await loadPageData();
    } catch (error) {
        console.error('Falha na inicialização:', error);
        handleInitializationError(error);
    }
});

// Inicialização da Aplicação
async function initializeApplication() {
    updateLoadingState('Inicializando', 'Verificando parâmetros...');
    
    const params = new URLSearchParams(window.location.search);
    AppState.deckId = params.get('id');

    if (!AppState.deckId) {
        throw new Error('ID do baralho não encontrado');
    }

    // Restaurar estado salvo localmente
    restoreLocalState();
}

// Setup de Event Listeners
function setupEventListeners() {
    // Sistema de abas
    document.querySelectorAll('.input-tab').forEach(tab => {
        tab.addEventListener('click', handleTabSwitch);
    });

    // Formulário de geração
    const generateForm = document.getElementById('generate-cards-form');
    generateForm.addEventListener('submit', handleGenerateSubmit);

    // Input de número
    document.querySelectorAll('.number-btn').forEach(btn => {
        btn.addEventListener('click', handleNumberInput);
    });

    // Container de flashcards
    const flashcardsContainer = document.getElementById('flashcards-container');
    flashcardsContainer.addEventListener('click', handleFlashcardActions);

    // File upload melhorado
    setupAdvancedFileUpload();

    // Modais
    setupModalSystem();

    // Botão de adicionar card manual
    document.getElementById('add-card-manual-btn').addEventListener('click', openAddCardModal);

    // Compartilhamento
    document.getElementById('share-deck-button').addEventListener('click', handleShareDeck);
    document.getElementById('copy-link-button').addEventListener('click', copyShareLink);

    // Compartilhamento social
    document.querySelectorAll('.social-btn').forEach(btn => {
        btn.addEventListener('click', handleSocialShare);
    });

    // Auto-resize para textareas
    document.querySelectorAll('textarea').forEach(textarea => {
        textarea.addEventListener('input', autoResizeTextarea);
    });
}

// Sistema de Abas Melhorado
function handleTabSwitch(e) {
    const tab = e.currentTarget;
    const tabName = tab.dataset.tab;
    
    if (tabName === AppState.currentTab) return;
    
    // Animar transição
    animateTabTransition(AppState.currentTab, tabName);
    
    // Atualizar estado
    AppState.currentTab = tabName;
    
    // Atualizar UI
    document.querySelectorAll('.input-tab').forEach(t => {
        t.classList.remove('active');
    });
    tab.classList.add('active');
    
    // Trocar conteúdo
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Focar no input apropriado
    focusTabInput(tabName);
}

function animateTabTransition(from, to) {
    const fromPane = document.getElementById(`${from}-tab`);
    const toPane = document.getElementById(`${to}-tab`);
    
    fromPane.style.animation = 'fadeOut 0.2s ease-out';
    setTimeout(() => {
        fromPane.classList.remove('active');
        toPane.classList.add('active');
        toPane.style.animation = 'fadeIn 0.3s ease-out';
    }, 200);
}

function focusTabInput(tabName) {
    setTimeout(() => {
        if (tabName === 'text') {
            document.getElementById('text-content').focus();
        } else if (tabName === 'youtube') {
            document.getElementById('youtube-url').focus();
        }
    }, 300);
}

// Sistema Avançado de Upload de Arquivo
function setupAdvancedFileUpload() {
    const dropZone = document.querySelector('.file-drop-zone');
    const fileInput = document.getElementById('file-content');
    const removeBtn = document.querySelector('.remove-file-btn');
    
    if (!dropZone || !fileInput) return;

    // Eventos de drag and drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Visual feedback
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('drag-over');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('drag-over');
        });
    });

    // Handle drop
    dropZone.addEventListener('drop', handleFileDrop);
    fileInput.addEventListener('change', handleFileSelect);
    
    if (removeBtn) {
        removeBtn.addEventListener('click', removeSelectedFile);
    }
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleFileDrop(e) {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        processFile(file);
    }
}

function processFile(file) {
    // Validar arquivo
    const validTypes = ['text/plain', 'text/markdown', 'application/pdf'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(txt|md|pdf)$/i)) {
        showToast('Formato de arquivo não suportado. Use PDF, TXT ou MD.', 'error');
        return;
    }
    
    if (file.size > maxSize) {
        showToast('Arquivo muito grande. Máximo: 10MB', 'error');
        return;
    }
    
    // Salvar arquivo no estado
    AppState.selectedFile = file;
    
    // Atualizar UI
    displaySelectedFile(file);
}

function displaySelectedFile(file) {
    const selectedFileDiv = document.getElementById('selected-file');
    const dropZone = document.querySelector('.file-drop-zone');
    
    if (!selectedFileDiv) return;
    
    // Formatar tamanho do arquivo
    const fileSize = formatFileSize(file.size);
    
    // Atualizar informações
    selectedFileDiv.querySelector('.file-name').textContent = file.name;
    selectedFileDiv.querySelector('.file-size').textContent = fileSize;
    
    // Mostrar/esconder elementos
    selectedFileDiv.classList.remove('hidden');
    dropZone.style.display = 'none';
    
    // Animar entrada
    selectedFileDiv.style.animation = 'slideInUp 0.3s ease-out';
}

function removeSelectedFile() {
    AppState.selectedFile = null;
    
    const selectedFileDiv = document.getElementById('selected-file');
    const dropZone = document.querySelector('.file-drop-zone');
    const fileInput = document.getElementById('file-content');
    
    // Animar saída
    selectedFileDiv.style.animation = 'fadeOut 0.2s ease-out';
    
    setTimeout(() => {
        selectedFileDiv.classList.add('hidden');
        dropZone.style.display = 'block';
        fileInput.value = '';
    }, 200);
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Geração de Flashcards Melhorada
async function handleGenerateSubmit(e) {
    e.preventDefault();
    
    if (AppState.isGenerating) return;
    
    const currentTab = AppState.currentTab;
    
    // Validar entrada
    if (!validateGenerationInput(currentTab)) return;
    
    // Preparar geração
    AppState.isGenerating = true;
    AppState.processingStep = 0;
    
    // UI feedback
    const button = document.getElementById('generate-button');
    const form = document.getElementById('generate-cards-form');
    const processingDiv = document.getElementById('processing-feedback');
    
    setButtonLoading(button, true);
    
    try {
        // Iniciar processo de geração
        form.style.display = 'none';
        processingDiv.classList.remove('hidden');
        
        // Animar progresso
        startProcessingAnimation();
        
        // Processar geração
        const result = await processGeneration(currentTab);
        
        if (result) {
            showToast('Gerando seus flashcards! 🚀', 'success');
            
            // Iniciar polling
            AppState.pollingAttempts = 0;
            startPollingForNewFlashcards();
        } else {
            throw new Error('Falha ao iniciar geração');
        }
    } catch (error) {
        console.error('Erro na geração:', error);
        showToast(error.message || 'Erro ao gerar flashcards', 'error');
        resetGenerationUI(true);
    }
}

function startProcessingAnimation() {
    const steps = document.querySelectorAll('.step');
    const title = document.getElementById('processing-title');
    const message = document.getElementById('processing-message');
    
    // Função para atualizar etapa
    const updateStep = (stepNum) => {
        // Atualizar classes das etapas
        steps.forEach((step, index) => {
            step.classList.remove('active', 'completed');
            if (index < stepNum - 1) {
                step.classList.add('completed');
            } else if (index === stepNum - 1) {
                step.classList.add('active');
            }
        });
        
        // Atualizar mensagem
        const messages = PROCESSING_MESSAGES[stepNum];
        if (messages) {
            const randomMessage = messages[Math.floor(Math.random() * messages.length)];
            message.textContent = randomMessage;
            
            // Atualizar título baseado na etapa
            switch(stepNum) {
                case 1:
                    title.textContent = 'Analisando Conteúdo';
                    break;
                case 2:
                    title.textContent = 'Criando Flashcards';
                    break;
                case 3:
                    title.textContent = 'Finalizando';
                    break;
            }
        }
    };
    
    // Simular progresso
    updateStep(1);
    setTimeout(() => updateStep(2), 3000);
    setTimeout(() => updateStep(3), 6000);
}

function validateGenerationInput(mode) {
    let isValid = false;
    let errorMessage = '';
    
    switch(mode) {
        case 'text':
            const textContent = document.getElementById('text-content').value.trim();
            isValid = textContent.length >= 50; // Mínimo 50 caracteres
            if (!isValid) {
                errorMessage = textContent.length === 0 
                    ? 'Por favor, insira algum texto.' 
                    : 'Texto muito curto. Mínimo: 50 caracteres.';
            }
            break;
            
        case 'file':
            isValid = AppState.selectedFile !== null;
            if (!isValid) {
                errorMessage = 'Por favor, selecione um arquivo.';
            }
            break;
            
        case 'youtube':
            const url = document.getElementById('youtube-url').value.trim();
            isValid = isValidYouTubeUrl(url);
            if (!isValid) {
                errorMessage = url.length === 0 
                    ? 'Por favor, insira uma URL do YouTube.' 
                    : 'URL do YouTube inválida.';
            }
            break;
    }
    
    if (!isValid) {
        showToast(errorMessage, 'error');
        shakeElement(document.querySelector('.tab-pane.active'));
    }
    
    return isValid;
}

function isValidYouTubeUrl(url) {
    const patterns = [
        /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
        /^https?:\/\/youtu\.be\/[\w-]+/,
        /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+/
    ];
    return patterns.some(pattern => pattern.test(url));
}

function shakeElement(element) {
    element.style.animation = 'shake 0.5s ease-in-out';
    setTimeout(() => {
        element.style.animation = '';
    }, 500);
}

async function processGeneration(mode) {
    const params = {
        count: parseInt(document.getElementById('card-count').value, 10),
        difficulty: document.getElementById('card-difficulty').value,
    };
    
    try {
        switch(mode) {
            case 'text':
                return await generateFlashcards(AppState.deckId, {
                    ...params,
                    textContent: document.getElementById('text-content').value.trim()
                });
                
            case 'file':
                const formData = new FormData();
                formData.append('file', AppState.selectedFile);
                formData.append('count', params.count);
                formData.append('difficulty', params.difficulty);
                return await generateFlashcardsFromFile(AppState.deckId, formData);
                
            case 'youtube':
                return await generateFlashcardsFromYouTube(AppState.deckId, {
                    ...params,
                    youtubeUrl: document.getElementById('youtube-url').value.trim()
                });
        }
    } catch (error) {
        console.error('Erro no processamento:', error);
        throw error;
    }
}

// Polling Otimizado
function startPollingForNewFlashcards() {
    const initialCount = AppState.currentFlashcards.length;
    let consecutiveFailures = 0;
    
    const pollInterval = setInterval(async () => {
        AppState.pollingAttempts++;
        
        // Verificar limite de tentativas
        if (AppState.pollingAttempts > AppState.MAX_POLLING_ATTEMPTS) {
            clearInterval(pollInterval);
            showToast('A geração está demorando mais que o esperado. Tente novamente.', 'warning');
            resetGenerationUI();
            return;
        }
        
        try {
            const newCards = await fetchFlashcards(AppState.deckId);
            
            if (newCards && newCards.length > initialCount) {
                // Sucesso!
                clearInterval(pollInterval);
                
                // Completar animação de progresso
                completeProcessingAnimation();
                
                setTimeout(() => {
                    showToast(`✨ ${newCards.length - initialCount} novos flashcards criados!`, 'success');
                    
                    // Atualizar UI
                    AppState.currentFlashcards = newCards;
                    renderFlashcards(
                        document.getElementById('flashcards-container'),
                        newCards,
                        initialCount
                    );
                    updateDeckStats();
                    resetGenerationUI();
                    
                    // Scroll suave para os novos cards
                    scrollToNewCards();
                }, 1000);
            }
            
            consecutiveFailures = 0;
        } catch (error) {
            consecutiveFailures++;
            
            if (consecutiveFailures >= 3) {
                clearInterval(pollInterval);
                showToast('Erro ao verificar novos cards. Tente recarregar a página.', 'error');
                resetGenerationUI();
            }
        }
    }, AppState.POLLING_INTERVAL);
}

function completeProcessingAnimation() {
    const steps = document.querySelectorAll('.step');
    const title = document.getElementById('processing-title');
    const message = document.getElementById('processing-message');
    
    steps.forEach(step => {
        step.classList.remove('active');
        step.classList.add('completed');
    });
    
    title.textContent = 'Concluído!';
    message.textContent = 'Seus flashcards estão prontos para estudo.';
}

function scrollToNewCards() {
    const container = document.getElementById('flashcards-container');
    const newCards = container.querySelectorAll('.flashcard-item.new-card');
    
    if (newCards.length > 0) {
        newCards[0].scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }
}

// Renderização de Flashcards
function renderFlashcards(container, flashcards, previousCount = -1) {
    container.innerHTML = '';
    
    if (!flashcards || flashcards.length === 0) {
        renderEmptyState(container);
        return;
    }
    
    flashcards.forEach((card, index) => {
        const isNew = previousCount !== -1 && index >= previousCount;
        const cardElement = createFlashcardElement(card, isNew);
        container.appendChild(cardElement);
    });
    
    // Animar novos cards
    if (previousCount !== -1 && flashcards.length > previousCount) {
        animateNewCards(container, previousCount);
    }
    
    feather.replace();
}

function renderEmptyState(container) {
    container.innerHTML = `
        <div class="empty-state">
            <i data-feather="book-open" class="empty-state-icon"></i>
            <h3>Nenhum flashcard ainda</h3>
            <p>Use o gerador com IA para criar seus primeiros flashcards!</p>
        </div>`;
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
            <button class="action-btn edit-btn" title="Editar" aria-label="Editar flashcard">
                <i data-feather="edit-2"></i>
            </button>
            <button class="action-btn delete-btn" title="Excluir" aria-label="Excluir flashcard">
                <i data-feather="trash-2"></i>
            </button>
        </div>`;
    
    return cardElement;
}

function animateNewCards(container, startIndex) {
    const newCards = Array.from(container.children).slice(startIndex);
    
    newCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.5s ease-out';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// Ações de Flashcard
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

async function handleDeleteFlashcard(cardId, cardElement) {
    // Confirmação melhorada
    const confirmed = await showConfirmDialog(
        'Excluir Flashcard',
        'Tem certeza que deseja excluir este flashcard? Esta ação não pode ser desfeita.',
        'Excluir',
        'danger'
    );
    
    if (!confirmed) return;
    
    try {
        // Salvar para undo
        saveToUndoStack('delete', { 
            card: AppState.currentFlashcards.find(c => c.id === cardId) 
        });
        
        // Animar saída
        cardElement.style.animation = 'fadeOut 0.3s ease-out';
        
        await deleteFlashcard(cardId);
        
        setTimeout(() => {
            cardElement.remove();
            AppState.currentFlashcards = AppState.currentFlashcards.filter(c => c.id !== cardId);
            updateDeckStats();
            showToast('Flashcard excluído', 'success', { 
                action: 'Desfazer',
                onAction: () => undoLastAction()
            });
        }, 300);
    } catch (error) {
        console.error('Erro ao excluir:', error);
        showToast('Erro ao excluir o flashcard', 'error');
    }
}

// Sistema de Modal Melhorado
function setupModalSystem() {
    // Edit Modal
    const editModal = document.getElementById('edit-flashcard-modal');
    setupModal(editModal, 'edit-flashcard-form', handleEditFormSubmit);
    
    // Add Modal
    const addModal = document.getElementById('add-flashcard-modal');
    setupModal(addModal, 'add-flashcard-form', handleAddFormSubmit);
    
    // Share Modal
    const shareModal = document.getElementById('share-deck-modal');
    setupModal(shareModal);
}

function setupModal(modal, formId = null, submitHandler = null) {
    if (!modal) return;
    
    // Close buttons
    modal.querySelectorAll('[data-close-modal], .close-btn').forEach(btn => {
        btn.addEventListener('click', () => closeModal(modal.id));
    });
    
    // Click outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal(modal.id);
        }
    });
    
    // Form submit
    if (formId && submitHandler) {
        const form = document.getElementById(formId);
        if (form) {
            form.addEventListener('submit', submitHandler);
        }
    }
    
    // ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('visible')) {
            closeModal(modal.id);
        }
    });
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    modal.classList.add('visible');
    document.body.style.overflow = 'hidden';
    
    // Focus first input
    setTimeout(() => {
        const firstInput = modal.querySelector('input:not([type="hidden"]), textarea');
        if (firstInput) firstInput.focus();
    }, 100);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    modal.classList.remove('visible');
    document.body.style.overflow = '';
    
    // Reset form if exists
    const form = modal.querySelector('form');
    if (form) form.reset();
}

// CRUD de Flashcards
function openEditModal(cardId) {
    const card = AppState.currentFlashcards.find(c => c.id === cardId);
    if (!card) return;
    
    document.getElementById('edit-card-id').value = card.id;
    document.getElementById('edit-question').value = card.question;
    document.getElementById('edit-answer').value = card.answer;
    
    openModal('edit-flashcard-modal');
}

async function handleEditFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const button = form.querySelector('button[type="submit"]');
    const cardId = document.getElementById('edit-card-id').value;
    const question = document.getElementById('edit-question').value.trim();
    const answer = document.getElementById('edit-answer').value.trim();
    
    if (!validateFlashcardForm(question, answer)) return;
    
    setButtonLoading(button, true, 'Salvando...');
    
    try {
        // Salvar para undo
        const oldCard = AppState.currentFlashcards.find(c => c.id === cardId);
        saveToUndoStack('edit', { cardId, oldCard, newCard: { question, answer } });
        
        await updateFlashcard(cardId, { question, answer });
        
        showToast('Flashcard atualizado!', 'success');
        closeModal('edit-flashcard-modal');
        
        // Atualizar local
        const cardIndex = AppState.currentFlashcards.findIndex(c => c.id === cardId);
        if (cardIndex !== -1) {
            AppState.currentFlashcards[cardIndex] = {
                ...AppState.currentFlashcards[cardIndex],
                question,
                answer
            };
            renderFlashcards(document.getElementById('flashcards-container'), AppState.currentFlashcards);
        }
    } catch (error) {
        console.error('Erro ao atualizar:', error);
        showToast('Erro ao atualizar flashcard', 'error');
    } finally {
        setButtonLoading(button, false, 'Salvar Alterações');
    }
}

function openAddCardModal() {
    openModal('add-flashcard-modal');
}

async function handleAddFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const button = form.querySelector('button[type="submit"]');
    const question = document.getElementById('add-question').value.trim();
    const answer = document.getElementById('add-answer').value.trim();
    
    if (!validateFlashcardForm(question, answer)) return;
    
    setButtonLoading(button, true, 'Adicionando...');
    
    try {
        const newCard = await createFlashcard(AppState.deckId, { question, answer });
        
        if (newCard) {
            AppState.currentFlashcards.push(newCard);
            showToast('Flashcard adicionado!', 'success');
            closeModal('add-flashcard-modal');
            
            renderFlashcards(
                document.getElementById('flashcards-container'),
                AppState.currentFlashcards,
                AppState.currentFlashcards.length - 1
            );
            updateDeckStats();
            scrollToNewCards();
        }
    } catch (error) {
        console.error('Erro ao adicionar:', error);
        showToast('Erro ao adicionar flashcard', 'error');
    } finally {
        setButtonLoading(button, false, 'Adicionar Card');
    }
}

function validateFlashcardForm(question, answer) {
    if (!question || question.length < 5) {
        showToast('A pergunta deve ter pelo menos 5 caracteres', 'error');
        return false;
    }
    
    if (!answer || answer.length < 2) {
        showToast('A resposta deve ter pelo menos 2 caracteres', 'error');
        return false;
    }
    
    return true;
}

// Compartilhamento
async function handleShareDeck() {
    try {
        const result = await shareDeck(AppState.deckId);
        
        if (result && result.shareableId) {
            const shareUrl = `${window.location.origin}/shared-deck.html?id=${result.shareableId}`;
            document.getElementById('shareable-link-input').value = shareUrl;
            openModal('share-deck-modal');
        }
    } catch (error) {
        console.error('Erro ao compartilhar:', error);
        showToast('Erro ao gerar link de compartilhamento', 'error');
    }
}

async function copyShareLink() {
    const input = document.getElementById('shareable-link-input');
    const button = document.getElementById('copy-link-button');
    
    try {
        await navigator.clipboard.writeText(input.value);
        
        // Feedback visual
        const originalHTML = button.innerHTML;
        button.innerHTML = '<i data-feather="check"></i> Copiado!';
        button.classList.add('success');
        feather.replace();
        
        setTimeout(() => {
            button.innerHTML = originalHTML;
            button.classList.remove('success');
            feather.replace();
        }, 2000);
        
        showToast('Link copiado!', 'success');
    } catch (error) {
        showToast('Erro ao copiar link', 'error');
    }
}

function handleSocialShare(e) {
    const button = e.currentTarget;
    const platform = button.dataset.share;
    const shareUrl = document.getElementById('shareable-link-input').value;
    const deckTitle = AppState.deckDetails?.title || 'Baralho de Flashcards';
    const text = `Confira meu baralho "${deckTitle}" no Recall!`;
    
    let url;
    switch(platform) {
        case 'whatsapp':
            url = `https://wa.me/?text=${encodeURIComponent(text + ' ' + shareUrl)}`;
            break;
        case 'telegram':
            url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
            break;
        case 'email':
            url = `mailto:?subject=${encodeURIComponent(deckTitle)}&body=${encodeURIComponent(text + '\n\n' + shareUrl)}`;
            break;
    }
    
    if (url) {
        window.open(url, '_blank');
    }
}

// Atalhos de Teclado
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + G: Gerar flashcards
        if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
            e.preventDefault();
            document.getElementById('generate-button').click();
        }
        
        // Ctrl/Cmd + N: Novo card
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            openAddCardModal();
        }
        
        // Ctrl/Cmd + S: Compartilhar
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            document.getElementById('share-deck-button').click();
        }
        
        // Ctrl/Cmd + Z: Desfazer
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            undoLastAction();
        }
        
        // Ctrl/Cmd + Shift + Z: Refazer
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
            e.preventDefault();
            redoLastAction();
        }
    });
}

// Sistema de Undo/Redo
function saveToUndoStack(action, data) {
    AppState.undoStack.push({ action, data, timestamp: Date.now() });
    AppState.redoStack = []; // Limpar redo ao fazer nova ação
    
    // Limitar tamanho da pilha
    if (AppState.undoStack.length > 50) {
        AppState.undoStack.shift();
    }
}

async function undoLastAction() {
    if (AppState.undoStack.length === 0) {
        showToast('Nada para desfazer', 'info');
        return;
    }
    
    const lastAction = AppState.undoStack.pop();
    AppState.redoStack.push(lastAction);
    
    try {
        switch(lastAction.action) {
            case 'delete':
                // Restaurar card deletado
                const restoredCard = await createFlashcard(AppState.deckId, lastAction.data.card);
                if (restoredCard) {
                    AppState.currentFlashcards.push(restoredCard);
                    renderFlashcards(document.getElementById('flashcards-container'), AppState.currentFlashcards);
                    updateDeckStats();
                    showToast('Card restaurado', 'success');
                }
                break;
                
            case 'edit':
                // Reverter edição
                await updateFlashcard(lastAction.data.cardId, lastAction.data.oldCard);
                const index = AppState.currentFlashcards.findIndex(c => c.id === lastAction.data.cardId);
                if (index !== -1) {
                    AppState.currentFlashcards[index] = {
                        ...AppState.currentFlashcards[index],
                        ...lastAction.data.oldCard
                    };
                    renderFlashcards(document.getElementById('flashcards-container'), AppState.currentFlashcards);
                    showToast('Edição desfeita', 'success');
                }
                break;
        }
    } catch (error) {
        console.error('Erro ao desfazer:', error);
        showToast('Erro ao desfazer ação', 'error');
    }
}

async function redoLastAction() {
    if (AppState.redoStack.length === 0) {
        showToast('Nada para refazer', 'info');
        return;
    }
    
    const action = AppState.redoStack.pop();
    AppState.undoStack.push(action);
    
    // Implementar lógica de redo similar ao undo
    // ...
}

// Auto-save
function setupAutoSave() {
    // Salvar rascunhos de texto enquanto digita
    const textContent = document.getElementById('text-content');
    const youtubeUrl = document.getElementById('youtube-url');
    
    [textContent, youtubeUrl].forEach(input => {
        if (!input) return;
        
        input.addEventListener('input', () => {
            clearTimeout(AppState.autoSaveTimer);
            AppState.autoSaveTimer = setTimeout(() => {
                saveLocalState();
                showToast('Rascunho salvo', 'info', { duration: 1000 });
            }, AppState.AUTOSAVE_DELAY);
        });
    });
}

function saveLocalState() {
    const state = {
        textContent: document.getElementById('text-content')?.value || '',
        youtubeUrl: document.getElementById('youtube-url')?.value || '',
        cardCount: document.getElementById('card-count')?.value || '5',
        difficulty: document.getElementById('card-difficulty')?.value || 'medio',
        currentTab: AppState.currentTab
    };
    
    localStorage.setItem(`deck-state-${AppState.deckId}`, JSON.stringify(state));
}

function restoreLocalState() {
    const savedState = localStorage.getItem(`deck-state-${AppState.deckId}`);
    if (!savedState) return;
    
    try {
        const state = JSON.parse(savedState);
        
        // Restaurar valores
        if (state.textContent) {
            const textEl = document.getElementById('text-content');
            if (textEl) textEl.value = state.textContent;
        }
        
        if (state.youtubeUrl) {
            const urlEl = document.getElementById('youtube-url');
            if (urlEl) urlEl.value = state.youtubeUrl;
        }
        
        if (state.cardCount) {
            const countEl = document.getElementById('card-count');
            if (countEl) countEl.value = state.cardCount;
        }
        
        if (state.difficulty) {
            const diffEl = document.getElementById('card-difficulty');
            if (diffEl) diffEl.value = state.difficulty;
        }
        
        // Restaurar aba ativa
        if (state.currentTab && state.currentTab !== 'text') {
            const tab = document.querySelector(`.input-tab[data-tab="${state.currentTab}"]`);
            if (tab) tab.click();
        }
    } catch (error) {
        console.error('Erro ao restaurar estado:', error);
    }
}

// Carregamento de Dados
async function loadPageData() {
    try {
        updateLoadingState('Carregando Baralho', 'Buscando informações...');
        
        await loadDeckDetails();
        
        updateLoadingState('Carregando Flashcards', 'Preparando seus cards...');
        
        await loadFlashcards();
        
        updateLoadingState('Pronto!', 'Tudo carregado com sucesso');
        
        setTimeout(() => {
            if (typeof hideLoading === 'function') {
                hideLoading();
            }
        }, 500);
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        handleLoadingError(error);
    }
}

async function loadDeckDetails() {
    // Verificar cache primeiro
    const cached = CacheManager.get(`deck-${AppState.deckId}`);
    if (cached) {
        AppState.deckDetails = cached;
        renderDeckHeader(cached);
        return;
    }
    
    const allDecks = await fetchDecks();
    if (!allDecks) throw new Error('Não foi possível carregar baralhos');
    
    AppState.deckDetails = allDecks.find(deck => deck.id === AppState.deckId);
    
    if (AppState.deckDetails) {
        CacheManager.set(`deck-${AppState.deckId}`, AppState.deckDetails);
        renderDeckHeader(AppState.deckDetails);
    } else {
        throw new Error('Baralho não encontrado');
    }
}

async function loadFlashcards() {
    const container = document.getElementById('flashcards-container');
    
    try {
        AppState.currentFlashcards = await fetchFlashcards(AppState.deckId);
        renderFlashcards(container, AppState.currentFlashcards);
        updateDeckStats();
    } catch (error) {
        console.error('Erro ao carregar flashcards:', error);
        renderErrorState(container, 'Não foi possível carregar os flashcards.');
    }
}

function renderDeckHeader(deck) {
    document.getElementById('deck-title-heading').textContent = deck.title;
    document.getElementById('deck-description-paragraph').textContent = 
        deck.description || 'Sem descrição disponível.';
    document.getElementById('study-deck-button').href = `study.html?deckId=${deck.id}`;
    
    // Atualizar título da página
    document.title = `${deck.title} - Recall`;
}

function updateDeckStats() {
    const total = AppState.currentFlashcards.length;
    const toReview = Math.floor(total * 0.3); // Simulação
    const mastered = Math.floor(total * 0.1); // Simulação
    
    animateNumber('total-cards-stat', total);
    animateNumber('review-cards-stat', toReview);
    animateNumber('mastered-cards-stat', mastered);
}

function animateNumber(elementId, targetValue) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const startValue = parseInt(element.textContent) || 0;
    const duration = 1000;
    const startTime = performance.now();
    
    const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOutQuart);
        
        element.textContent = currentValue;
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    };
    
    requestAnimationFrame(animate);
}

function renderErrorState(container, message) {
    container.innerHTML = `
        <div class="error-state">
            <i data-feather="alert-circle" class="error-state-icon"></i>
            <p>${message}</p>
            <button class="btn btn-secondary" onclick="location.reload()">
                Recarregar Página
            </button>
        </div>`;
    feather.replace();
}

// Utilities
function setButtonLoading(button, isLoading, text = null) {
    button.disabled = isLoading;
    
    if (isLoading) {
        button.dataset.originalText = button.innerHTML;
        button.innerHTML = `
            <i data-feather="loader" class="spinning"></i>
            ${text || 'Processando...'}
        `;
    } else {
        button.innerHTML = button.dataset.originalText || text || 'Enviar';
    }
    
    feather.replace();
}

function resetGenerationUI(isError = false) {
    const form = document.getElementById('generate-cards-form');
    const processingDiv = document.getElementById('processing-feedback');
    const button = document.getElementById('generate-button');
    
    form.style.display = 'block';
    processingDiv.classList.add('hidden');
    
    if (!isError) {
        form.reset();
        removeSelectedFile();
    }
    
    setButtonLoading(button, false, '<i data-feather="zap"></i> Gerar Flashcards');
    AppState.isGenerating = false;
}

function handleNumberInput(e) {
    const button = e.currentTarget;
    const input = document.getElementById('card-count');
    let value = parseInt(input.value, 10);
    
    if (button.dataset.action === 'increase' && value < 15) {
        input.value = value + 1;
    } else if (button.dataset.action === 'decrease' && value > 1) {
        input.value = value - 1;
    }
    
    // Animar mudança
    input.style.transform = 'scale(1.1)';
    setTimeout(() => {
        input.style.transform = 'scale(1)';
    }, 200);
}

function autoResizeTextarea(e) {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

function escapeHtml(text) {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function showConfirmDialog(title, message, confirmText = 'Confirmar', type = 'warning') {
    // Implementação simples - pode ser substituída por uma biblioteca de diálogos
    return confirm(`${title}\n\n${message}`);
}

function updateLoadingState(title, message) {
    if (typeof updateLoadingMessage === 'function') {
        updateLoadingMessage(title, message);
    }
}

function handleInitializationError(error) {
    updateLoadingState('Erro', error.message || 'Não foi possível carregar o baralho');
    
    setTimeout(() => {
        if (typeof hideLoading === 'function') {
            hideLoading();
        }
        
        if (error.message === 'ID do baralho não encontrado') {
            showToast('Baralho não encontrado. Redirecionando...', 'error');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
        } else {
            showToast('Erro ao carregar a página. Tente novamente.', 'error');
        }
    }, 1000);
}

function handleLoadingError(error) {
    updateLoadingState('Erro', 'Não foi possível carregar os dados');
    
    setTimeout(() => {
        if (typeof hideLoading === 'function') {
            hideLoading();
        }
        showToast(error.message || 'Erro ao carregar o baralho', 'error');
    }, 1000);
}

// Observer Pattern para mudanças de estado
class StateObserver {
    static subscribe(event, callback) {
        if (!AppState.observers.has(event)) {
            AppState.observers.set(event, []);
        }
        AppState.observers.get(event).push(callback);
    }
    
    static notify(event, data) {
        const callbacks = AppState.observers.get(event);
        if (callbacks) {
            callbacks.forEach(callback => callback(data));
        }
    }
}

// Exportar funções úteis para debug
window.AppDebug = {
    getState: () => AppState,
    clearCache: () => CacheManager.clear(),
    resetLocalState: () => localStorage.removeItem(`deck-state-${AppState.deckId}`),
    logPerformance: () => {
        console.log('Performance Metrics:', {
            flashcards: AppState.currentFlashcards.length,
            cacheSize: AppState.cache.size,
            undoStackSize: AppState.undoStack.length
        });
    }
};