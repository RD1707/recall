// --- CONFIGURAÇÃO INICIAL DO SUPABASE ---
const SUPABASE_URL = 'https://khofqsjwyunicxdxapih.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtob2Zxc2p3eXVuaWN4ZHhhcGloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMjM2NDksImV4cCI6MjA3MTY5OTY0OX0.3Fr8b6u3b6dqoh84qx0ulcddb-vj4gGqlOQvAI2weGE';

const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- VARIÁVEIS GLOBAIS ---
let allDecks = [];
let currentUser = null;
let selectedDeckColor = '#4f46e5';

// --- FUNÇÕES DE INICIALIZAÇÃO ---

/**
 * Inicializa a aplicação quando o DOM estiver pronto
 */
async function initApp() {
    await routeGuard();
    
    if (window.location.pathname.endsWith('dashboard.html')) {
        await loadUserProfile();
        await loadDecks();
        setupEventListeners();
        setupSearchFunctionality();
        updateDashboardStats();
    }
}

/**
 * Configura todos os event listeners da página
 */
function setupEventListeners() {
    // Modal de criação de baralho
    const createDeckBtn = document.getElementById('create-deck-btn');
    const createDeckModal = document.getElementById('create-deck-modal');
    const closeModalBtns = document.querySelectorAll('.close-modal-btn');
    
    if (createDeckBtn) {
        createDeckBtn.addEventListener('click', () => {
            showModal(createDeckModal);
        });
    }
    
    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal-overlay');
            hideModal(modal);
        });
    });
    
    // Formulários
    const createDeckForm = document.getElementById('create-deck-form');
    const editDeckForm = document.getElementById('edit-deck-form');
    
    if (createDeckForm) {
        createDeckForm.addEventListener('submit', handleCreateDeck);
    }
    
    if (editDeckForm) {
        editDeckForm.addEventListener('submit', handleEditDeck);
    }
    
    // Botão de deletar baralho
    const deleteDeckBtn = document.getElementById('delete-deck-btn');
    if (deleteDeckBtn) {
        deleteDeckBtn.addEventListener('click', handleDeleteDeck);
    }
    
    // Botão de scroll para o topo
    const scrollToTopBtn = document.getElementById('scroll-to-top');
    if (scrollToTopBtn) {
        scrollToTopBtn.addEventListener('click', scrollToTop);
        window.addEventListener('scroll', toggleScrollToTopButton);
    }
    
    // Color picker
    const colorOptions = document.querySelectorAll('.color-option');
    colorOptions.forEach(option => {
        option.addEventListener('click', (e) => {
            selectColor(e.target);
        });
    });
    
    // Menu de usuário
    const userMenuButton = document.getElementById('user-menu-button');
    if (userMenuButton) {
        userMenuButton.addEventListener('click', toggleUserMenu);
    }
    
    // Card de criação rápida
    const createNewCard = document.querySelector('.deck-card.create-new');
    if (createNewCard) {
        createNewCard.addEventListener('click', () => {
            showModal(createDeckModal);
        });
    }
}

/**
 * Configura a funcionalidade de busca em tempo real
 */
function setupSearchFunctionality() {
    const searchInput = document.getElementById('deck-search');
    if (!searchInput) return;
    
    let searchTimeout;
    
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            filterDecks(e.target.value);
        }, 300);
    });
}

// --- FUNÇÕES DE UI/UX ---

/**
 * Mostra um modal
 * @param {HTMLElement} modal - Elemento do modal a ser mostrado
 */
function showModal(modal) {
    if (!modal) return;
    modal.classList.add('visible');
    document.body.style.overflow = 'hidden';
}

/**
 * Esconde um modal
 * @param {HTMLElement} modal - Elemento do modal a ser escondido
 */
function hideModal(modal) {
    if (!modal) return;
    modal.classList.remove('visible');
    document.body.style.overflow = 'auto';
}

/**
 * Alterna a visibilidade do menu de usuário
 */
function toggleUserMenu() {
    const dropdown = document.getElementById('user-dropdown');
    if (!dropdown) return;
    
    dropdown.classList.toggle('visible');
}

/**
 * Filtra baralhos com base no termo de busca
 * @param {string} searchTerm - Termo para filtrar os baralhos
 */
function filterDecks(searchTerm) {
    if (!searchTerm.trim()) {
        renderDecks(allDecks);
        return;
    }
    
    const filteredDecks = allDecks.filter(deck => 
        deck.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (deck.description && deck.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    renderDecks(filteredDecks);
}

/**
 * Seleciona uma cor no color picker
 * @param {HTMLElement} colorElement - Elemento de cor clicado
 */
function selectColor(colorElement) {
    // Remove a seleção anterior
    document.querySelectorAll('.color-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Adiciona a seleção atual
    colorElement.classList.add('selected');
    selectedDeckColor = colorElement.dataset.color;
}

/**
 * Mostra/esconde o botão de scroll para o topo baseado na posição de scroll
 */
function toggleScrollToTopButton() {
    const scrollToTopBtn = document.getElementById('scroll-to-top');
    if (!scrollToTopBtn) return;
    
    if (window.scrollY > 300) {
        scrollToTopBtn.style.opacity = '1';
        scrollToTopBtn.style.visibility = 'visible';
    } else {
        scrollToTopBtn.style.opacity = '0';
        scrollToTopBtn.style.visibility = 'hidden';
    }
}

/**
 * Scroll suave para o topo da página
 */
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// --- FUNÇÕES DE DADOS E API ---

/**
 * Carrega o perfil do usuário e atualiza a UI
 */
async function loadUserProfile() {
    try {
        const { data: { user } } = await _supabase.auth.getUser();
        currentUser = user;
        
        // Atualiza o email do usuário
        const userEmailElement = document.getElementById('user-email');
        if (userEmailElement && user?.email) {
            userEmailElement.textContent = user.email;
        }
        
        // Atualiza o avatar do usuário
        const avatarTextElements = document.querySelectorAll('#user-avatar-text, #dropdown-avatar-text');
        avatarTextElements.forEach(element => {
            if (user?.email) {
                element.textContent = user.email.charAt(0).toUpperCase();
            }
        });
        
        // Carrega as estatísticas do perfil
        await updateProfileHeader();
    } catch (error) {
        console.error('Erro ao carregar perfil do usuário:', error);
    }
}

/**
 * Atualiza o header com as informações do perfil do usuário
 */
async function updateProfileHeader() {
    try {
        const profile = await fetchProfile();
        if (profile) {
            document.getElementById('user-points').textContent = profile.points || 0;
            document.getElementById('user-streak').textContent = profile.current_streak || 0;
        }
    } catch (error) {
        console.error('Erro ao atualizar header do perfil:', error);
    }
}

/**
 * Carrega todos os baralhos do usuário
 */
async function loadDecks() {
    const decksContainer = document.getElementById('decks-grid');
    if (!decksContainer) return;
    
    // Mostra skeleton loading
    decksContainer.innerHTML = `
        <div class="skeleton-deck">
            <div class="skeleton skeleton-image"></div>
            <div class="skeleton-content">
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-button"></div>
            </div>
        </div>
        <div class="skeleton-deck">
            <div class="skeleton skeleton-image"></div>
            <div class="skeleton-content">
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-button"></div>
            </div>
        </div>
        <div class="skeleton-deck">
            <div class="skeleton skeleton-image"></div>
            <div class="skeleton-content">
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-button"></div>
            </div>
        </div>
    `;
    
    try {
        const decks = await fetchDecks();
        allDecks = decks || [];
        
        if (allDecks.length === 0) {
            showEmptyState();
        } else {
            renderDecks(allDecks);
            updateDashboardStats();
        }
    } catch (error) {
        console.error('Erro ao carregar baralhos:', error);
        showToast('Erro ao carregar baralhos. Tente novamente.', 'error');
    }
}

/**
 * Renderiza a lista de baralhos na UI
 * @param {Array} decks - Array de baralhos para renderizar
 */
function renderDecks(decks) {
    const decksContainer = document.getElementById('decks-grid');
    if (!decksContainer) return;
    
    if (decks.length === 0) {
        showEmptyState();
        return;
    }
    
    // Esconde o empty state se estiver visível
    const emptyState = document.getElementById('empty-state');
    if (emptyState) {
        emptyState.classList.add('hidden');
    }
    
    decksContainer.innerHTML = '';
    
    // Adiciona o card de criação rápida
    decksContainer.appendChild(createNewDeckCard());
    
    // Adiciona os baralhos
    decks.forEach((deck, index) => {
        const deckElement = renderDeck(deck, index);
        decksContainer.appendChild(deckElement);
    });
}

/**
 * Cria o card de "Criar Novo Baralho"
 * @returns {HTMLElement} Elemento do card
 */
function createNewDeckCard() {
    const card = document.createElement('div');
    card.className = 'deck-card create-new';
    card.innerHTML = `
        <div class="deck-card-inner">
            <div class="create-icon">
                <i class="fas fa-plus"></i>
            </div>
            <h3>Criar Novo Baralho</h3>
            <p>Comece um novo conjunto de flashcards</p>
            <button class="btn btn-outline">Criar</button>
        </div>
    `;
    
    return card;
}

/**
 * Renderiza um único card de baralho
 * @param {Object} deck - Dados do baralho
 * @param {number} index - Índice para animação escalonada
 * @returns {HTMLElement} Elemento do card renderizado
 */
function renderDeck(deck, index) {
    const card = document.createElement('div');
    card.className = 'deck-card';
    card.style.animationDelay = `${index * 0.1}s`;
    
    // Cor personalizada do baralho (se disponível)
    const deckColor = deck.color || selectedDeckColor;
    
    card.innerHTML = `
        <div class="deck-card-inner">
            <div class="deck-card-header">
                <div class="deck-color" style="background-color: ${deckColor}"></div>
                <button class="deck-menu-btn">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
            </div>
            <h3>${escapeHtml(deck.title)}</h3>
            <p>${deck.description ? escapeHtml(deck.description) : 'Sem descrição'}</p>
            
            <div class="deck-stats">
                <div class="deck-stat">
                    <span class="deck-stat-value">${deck.card_count || 0}</span>
                    <span class="deck-stat-label">Cartões</span>
                </div>
                <div class="deck-stat">
                    <span class="deck-stat-value">${deck.due_count || 0}</span>
                    <span class="deck-stat-label">Para revisar</span>
                </div>
            </div>
            
            <div class="deck-card-actions">
                <a href="deck.html?id=${deck.id}" class="deck-action-btn btn-primary">
                    <i class="fas fa-play"></i> Estudar
                </a>
                <button class="deck-action-btn btn-outline edit-deck-btn" data-deck-id="${deck.id}">
                    <i class="fas fa-edit"></i> Editar
                </button>
            </div>
        </div>
    `;
    
    // Adiciona event listeners aos botões
    const editBtn = card.querySelector('.edit-deck-btn');
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            openEditDeckModal(deck);
        });
    }
    
    const menuBtn = card.querySelector('.deck-menu-btn');
    if (menuBtn) {
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showDeckContextMenu(e, deck);
        });
    }
    
    return card;
}

/**
 * Abre o modal de edição para um baralho
 * @param {Object} deck - Dados do baralho a ser editado
 */
function openEditDeckModal(deck) {
    const modal = document.getElementById('edit-deck-modal');
    if (!modal) return;
    
    // Preenche o formulário com os dados atuais
    document.getElementById('edit-deck-id').value = deck.id;
    document.getElementById('edit-deck-title').value = deck.title;
    document.getElementById('edit-deck-description').value = deck.description || '';
    
    // Seleciona a cor atual (se disponível)
    const deckColor = deck.color || selectedDeckColor;
    const colorOption = document.querySelector(`.color-option[data-color="${deckColor}"]`);
    if (colorOption) {
        selectColor(colorOption);
    }
    
    showModal(modal);
}

/**
 * Mostra o menu de contexto para um baralho
 * @param {Event} e - Evento de clique
 * @param {Object} deck - Dados do baralho
 */
function showDeckContextMenu(e, deck) {
    // Implementação simplificada - poderia ser um menu flutuante com mais opções
    const shouldDelete = confirm(`Tem certeza que deseja excluir o baralho "${deck.title}"?`);
    if (shouldDelete) {
        handleDeleteDeck(deck.id);
    }
}

/**
 * Mostra o estado vazio quando não há baralhos
 */
function showEmptyState() {
    const decksContainer = document.getElementById('decks-grid');
    const emptyState = document.getElementById('empty-state');
    
    if (decksContainer) {
        decksContainer.innerHTML = '';
        decksContainer.appendChild(createNewDeckCard());
    }
    
    if (emptyState) {
        emptyState.classList.remove('hidden');
        
        // Adiciona event listener ao botão do empty state
        const emptyStateButton = emptyState.querySelector('button');
        if (emptyStateButton) {
            emptyStateButton.addEventListener('click', () => {
                const modal = document.getElementById('create-deck-modal');
                showModal(modal);
            });
        }
    }
}

/**
 * Atualiza as estatísticas do dashboard
 */
function updateDashboardStats() {
    const totalDecks = allDecks.length;
    const totalCards = allDecks.reduce((sum, deck) => sum + (deck.card_count || 0), 0);
    const dueCards = allDecks.reduce((sum, deck) => sum + (deck.due_count || 0), 0);
    
    document.getElementById('total-decks').textContent = totalDecks;
    document.getElementById('total-cards').textContent = totalCards;
    document.getElementById('due-cards').textContent = dueCards;
}

// --- HANDLERS DE FORMULÁRIOS ---

/**
 * Manipula a criação de um novo baralho
 * @param {Event} e - Evento de submit do formulário
 */
async function handleCreateDeck(e) {
    e.preventDefault();
    
    const form = e.target;
    const titleInput = document.getElementById('deck-title');
    const descriptionInput = document.getElementById('deck-description');
    const submitButton = form.querySelector('button[type="submit"]');
    
    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();
    
    // Validação
    if (!validateDeckTitle(title)) return;
    
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Criando...';
    
    try {
        const newDeckData = await createDeck(title, description, selectedDeckColor);
        if (newDeckData) {
            showToast('Baralho criado com sucesso!', 'success');
            form.reset();
            hideModal(document.getElementById('create-deck-modal'));
            await loadDecks(); // Recarrega a lista
        }
    } catch (error) {
        console.error('Erro ao criar baralho:', error);
        showToast('Erro ao criar baralho. Tente novamente.', 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Criar Baralho';
    }
}

/**
 * Manipula a edição de um baralho existente
 * @param {Event} e - Evento de submit do formulário
 */
async function handleEditDeck(e) {
    e.preventDefault();
    
    const form = e.target;
    const deckId = document.getElementById('edit-deck-id').value;
    const titleInput = document.getElementById('edit-deck-title');
    const descriptionInput = document.getElementById('edit-deck-description');
    const submitButton = form.querySelector('button[type="submit"]');
    
    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();
    
    // Validação
    if (!validateDeckTitle(title)) return;
    
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
    
    try {
        const result = await updateDeck(deckId, title, description, selectedDeckColor);
        if (result) {
            showToast('Baralho atualizado com sucesso!', 'success');
            hideModal(document.getElementById('edit-deck-modal'));
            await loadDecks(); // Recarrega a lista
        }
    } catch (error) {
        console.error('Erro ao atualizar baralho:', error);
        showToast('Erro ao atualizar baralho. Tente novamente.', 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Salvar Alterações';
    }
}

/**
 * Manipula a exclusão de um baralho
 * @param {string} deckId - ID do baralho a ser excluído
 */
async function handleDeleteDeck(deckId) {
    if (!deckId) {
        // Se não foi passado um ID, tenta obter do formulário de edição
        deckId = document.getElementById('edit-deck-id').value;
    }
    
    if (!deckId) {
        showToast('ID do baralho não encontrado.', 'error');
        return;
    }
    
    const shouldDelete = confirm('Tem certeza que deseja excluir este baralho? Esta ação não pode ser desfeita.');
    if (!shouldDelete) return;
    
    try {
        // Como a função deleteDeck não existe no api.js original, vamos criar uma
        const result = await deleteDeck(deckId);
        if (result) {
            showToast('Baralho excluído com sucesso!', 'success');
            hideModal(document.getElementById('edit-deck-modal'));
            await loadDecks(); // Recarrega a lista
        }
    } catch (error) {
        console.error('Erro ao excluir baralho:', error);
        showToast('Erro ao excluir baralho. Tente novamente.', 'error');
    }
}

// --- FUNÇÕES AUXILIARES ---

/**
 * Valida o título de um baralho
 * @param {string} title - Título a ser validado
 * @returns {boolean} True se válido, False caso contrário
 */
function validateDeckTitle(title) {
    const titleError = document.getElementById('title-error');
    
    if (title.length < 3) {
        titleError.textContent = 'O título deve ter pelo menos 3 caracteres.';
        titleError.style.display = 'block';
        return false;
    }
    
    if (title.length > 50) {
        titleError.textContent = 'O título deve ter no máximo 50 caracteres.';
        titleError.style.display = 'block';
        return false;
    }
    
    titleError.style.display = 'none';
    return true;
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

/**
 * Função para deletar baralho (não existia no api.js original)
 * @param {string} deckId - ID do baralho a ser deletado
 * @returns {Promise} Resultado da operação
 */
async function deleteDeck(deckId) {
    return apiCall(`/decks/${deckId}`, 'DELETE');
}

/**
 * Função para criar baralho com cor
 * @param {string} title - Título do baralho
 * @param {string} description - Descrição do baralho
 * @param {string} color - Cor do baralho
 * @returns {Promise} Resultado da operação
 */
async function createDeck(title, description, color) {
    return apiCall('/decks', 'POST', { title, description, color });
}

/**
 * Função para atualizar baralho com cor
 * @param {string} deckId - ID do baralho
 * @param {string} title - Novo título do baralho
 * @param {string} description - Nova descrição do baralho
 * @param {string} color - Nova cor do baralho
 * @returns {Promise} Resultado da operação
 */
async function updateDeck(deckId, title, description, color) {
    return apiCall(`/decks/${deckId}`, 'PUT', { title, description, color });
}

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', initApp);