// --- CONFIGURAÇÃO INICIAL DO SUPABASE ---
const SUPABASE_URL = 'https://khofqsjwyunicxdxapih.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtob2Zxc2p3eXVuaWN4ZHhhcGloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMjM2NDksImV4cCI6MjA3MTY5OTY0OX0.3Fr8b6u3b6dqoh84qx0ulcddb-vj4gGqlOQvAI2weGE';

const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- VARIÁVEIS GLOBAIS ---
const API_BASE_URL = '/api';
let allDecks = [];
let currentUser = null;
let selectedDeckColor = '#4f46e5'; // Cor padrão

// --- INICIALIZAÇÃO DA APLICAÇÃO ---

document.addEventListener('DOMContentLoaded', initApp);

/**
 * Ponto de entrada: Inicializa a aplicação quando o DOM estiver pronto.
 */
async function initApp() {
    await routeGuard(); // Primeiro, verifica se o usuário está logado

    // Se estamos no dashboard, carrega os dados e configura os eventos
    if (window.location.pathname.endsWith('dashboard.html')) {
        await loadUserProfile();
        await loadDecks();
        setupEventListeners();
        setupSearchFunctionality();
    }
}


// --- FUNÇÕES DE LÓGICA DA PÁGINA (Dashboard) ---

/**
 * Configura todos os event listeners da página do dashboard.
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

    // Submissão de formulários
    const createDeckForm = document.getElementById('create-deck-form');
    if (createDeckForm) {
        createDeckForm.addEventListener('submit', handleCreateDeck);
    }

    const editDeckForm = document.getElementById('edit-deck-form');
    if (editDeckForm) {
        editDeckForm.addEventListener('submit', handleEditDeck);
    }

    // Ação de deletar baralho no modal de edição
    const deleteDeckBtn = document.getElementById('delete-deck-btn');
    if (deleteDeckBtn) {
        deleteDeckBtn.addEventListener('click', () => handleDeleteDeck());
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
            selectColor(e.target.closest('.color-option'));
        });
    });

    // Menu dropdown do usuário
    const userMenuButton = document.getElementById('user-menu-button');
    if (userMenuButton) {
        userMenuButton.addEventListener('click', toggleUserMenu);
    }
    
    // Card de "Criar Novo Baralho"
    // Esta função será chamada dentro de `renderDecks` para adicionar o listener
}

/**
 * Configura a funcionalidade de busca em tempo real.
 */
function setupSearchFunctionality() {
    const searchInput = document.getElementById('deck-search');
    if (!searchInput) return;

    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            filterDecks(e.target.value);
        }, 300); // Debounce de 300ms para evitar buscas a cada tecla
    });
}


// --- FUNÇÕES DE RENDERIZAÇÃO E UI/UX ---

/**
 * Mostra um modal específico.
 * @param {HTMLElement} modal - O elemento do modal a ser exibido.
 */
function showModal(modal) {
    if (!modal) return;
    modal.classList.add('visible');
    document.body.style.overflow = 'hidden'; // Impede o scroll do fundo
}

/**
 * Esconde um modal específico.
 * @param {HTMLElement} modal - O elemento do modal a ser escondido.
 */
function hideModal(modal) {
    if (!modal) return;
    modal.classList.remove('visible');
    document.body.style.overflow = ''; // Restaura o scroll
}

/**
 * Alterna a visibilidade do menu dropdown do usuário.
 */
function toggleUserMenu() {
    const dropdown = document.getElementById('user-dropdown');
    dropdown?.classList.toggle('visible');
}

/**
 * Filtra os baralhos exibidos na UI com base em um termo de busca.
 * @param {string} searchTerm - O texto a ser usado para o filtro.
 */
function filterDecks(searchTerm) {
    const normalizedSearch = searchTerm.toLowerCase().trim();
    if (!normalizedSearch) {
        renderDecks(allDecks); // Mostra todos se a busca estiver vazia
        return;
    }

    const filtered = allDecks.filter(deck =>
        deck.title.toLowerCase().includes(normalizedSearch) ||
        (deck.description && deck.description.toLowerCase().includes(normalizedSearch))
    );

    renderDecks(filtered);
}

/**
 * Seleciona uma cor no seletor de cores do modal.
 * @param {HTMLElement} colorElement - O elemento da cor que foi clicado.
 */
function selectColor(colorElement) {
    document.querySelectorAll('.color-option').forEach(option => {
        option.classList.remove('selected');
    });
    colorElement.classList.add('selected');
    selectedDeckColor = colorElement.dataset.color;
}

/**
 * Controla a visibilidade do botão "Voltar ao Topo".
 */
function toggleScrollToTopButton() {
    const btn = document.getElementById('scroll-to-top');
    if (window.scrollY > 300) {
        btn.style.opacity = '1';
        btn.style.visibility = 'visible';
    } else {
        btn.style.opacity = '0';
        btn.style.visibility = 'hidden';
    }
}

/**
 * Rola a página suavemente para o topo.
 */
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}


// --- LÓGICA DE DADOS (CARREGAMENTO E RENDERIZAÇÃO) ---

/**
 * Busca os dados do perfil do usuário e atualiza o cabeçalho.
 */
async function loadUserProfile() {
    const { data: { user } } = await _supabase.auth.getUser();
    currentUser = user;

    if (user?.email) {
        const userEmailElement = document.getElementById('user-email');
        if (userEmailElement) userEmailElement.textContent = user.email;

        // Atualiza as iniciais nos avatares
        const initial = user.email.charAt(0).toUpperCase();
        document.querySelectorAll('.user-avatar-text').forEach(el => {
            el.textContent = initial;
        });
    }

    await updateProfileHeader(); // Busca pontos e streak
}

/**
 * Busca os baralhos do usuário e os renderiza na página.
 */
async function loadDecks() {
    const decksContainer = document.getElementById('decks-grid');
    if (!decksContainer) return;

    // Exibe o estado de carregamento (skeleton)
    decksContainer.innerHTML = Array(3).fill('<div class="skeleton-deck"></div>').join('');

    const decks = await fetchDecks();
    allDecks = decks || [];

    renderDecks(allDecks);
    updateDashboardStats();
}

/**
 * Renderiza a grade de baralhos na UI.
 * @param {Array} decks - A lista de baralhos a ser renderizada.
 */
function renderDecks(decks) {
    const decksContainer = document.getElementById('decks-grid');
    const emptyStateContainer = document.getElementById('empty-state');
    
    decksContainer.innerHTML = ''; // Limpa o conteúdo atual

    if (decks.length === 0) {
        emptyStateContainer.classList.remove('hidden');
        decksContainer.appendChild(createNewDeckCard()); // Mostra o card de criar mesmo vazio
    } else {
        emptyStateContainer.classList.add('hidden');
        decksContainer.appendChild(createNewDeckCard());
        decks.forEach((deck, index) => {
            decksContainer.appendChild(renderSingleDeck(deck, index));
        });
    }
}

/**
 * Cria e retorna o HTML para um único card de baralho.
 * @param {object} deck - O objeto do baralho.
 * @param {number} index - O índice do baralho para animação.
 * @returns {HTMLElement} O elemento do card de baralho.
 */
function renderSingleDeck(deck, index) {
    const card = document.createElement('div');
    card.className = 'deck-card';
    card.style.animationDelay = `${index * 50}ms`;

    const deckColor = deck.color || '#4f46e5';

    card.innerHTML = `
        <div class="deck-card-inner">
            <div class="deck-card-header" style="background-color: ${deckColor}">
                <a href="deck.html?id=${deck.id}" class="deck-card-link"></a>
                <button class="deck-menu-btn" data-deck-id="${deck.id}" aria-label="Opções do baralho">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
            </div>
            <div class="deck-card-body">
                <h3>${escapeHtml(deck.title)}</h3>
                <p>${deck.description ? escapeHtml(deck.description) : 'Sem descrição'}</p>
            </div>
            <div class="deck-card-footer">
                <a href="deck.html?id=${deck.id}" class="btn btn-primary">Estudar Agora</a>
            </div>
        </div>
    `;

    // Adiciona evento ao botão de menu do card
    const menuBtn = card.querySelector('.deck-menu-btn');
    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Impede que o clique propague para o link do card
        const clickedDeck = allDecks.find(d => d.id === deck.id);
        openEditDeckModal(clickedDeck);
    });

    return card;
}

/**
 * Cria e retorna o card especial "Criar Novo".
 * @returns {HTMLElement} O elemento do card.
 */
function createNewDeckCard() {
    const card = document.createElement('div');
    card.className = 'deck-card create-new';
    card.innerHTML = `
        <div class="deck-card-inner">
            <div class="create-icon"><i class="fas fa-plus"></i></div>
            <h3>Criar Novo Baralho</h3>
        </div>
    `;
    card.addEventListener('click', () => {
        showModal(document.getElementById('create-deck-modal'));
    });
    return card;
}

/**
 * Exibe o estado de "sem baralhos" na UI.
 */
function showEmptyState() {
    document.getElementById('decks-grid').innerHTML = '';
    const emptyState = document.getElementById('empty-state');
    emptyState.classList.remove('hidden');

    const createBtn = emptyState.querySelector('button');
    createBtn.addEventListener('click', () => {
        showModal(document.getElementById('create-deck-modal'));
    });
}

/**
 * Atualiza os contadores de estatísticas no topo do dashboard.
 */
function updateDashboardStats() {
    const totalDecks = allDecks.length;
    const totalCards = allDecks.reduce((sum, deck) => sum + (deck.card_count || 0), 0);
    const dueCards = allDecks.reduce((sum, deck) => sum + (deck.due_count || 0), 0);

    document.getElementById('total-decks').textContent = totalDecks;
    document.getElementById('total-cards').textContent = totalCards;
    document.getElementById('due-cards').textContent = dueCards;
}


// --- HANDLERS DE EVENTOS DE FORMULÁRIO ---

/**
 * Manipula a submissão do formulário de criação de baralho.
 * @param {Event} e - O evento de submit.
 */
async function handleCreateDeck(e) {
    e.preventDefault();
    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const title = form.querySelector('#deck-title').value.trim();
    const description = form.querySelector('#deck-description').value.trim();

    if (!validateDeckTitle(title, 'title-error')) return;

    setButtonLoading(submitButton, 'Criando...');
    try {
        const newDeck = await createDeck(title, description, selectedDeckColor);
        if (newDeck) {
            showToast('Baralho criado com sucesso!', 'success');
            hideModal(document.getElementById('create-deck-modal'));
            form.reset();
            await loadDecks();
        }
    } finally {
        setButtonIdle(submitButton, 'Criar Baralho');
    }
}

/**
 * Manipula a submissão do formulário de edição de baralho.
 * @param {Event} e - O evento de submit.
 */
async function handleEditDeck(e) {
    e.preventDefault();
    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const deckId = form.querySelector('#edit-deck-id').value;
    const title = form.querySelector('#edit-deck-title').value.trim();
    const description = form.querySelector('#edit-deck-description').value.trim();

    if (!validateDeckTitle(title, 'edit-title-error')) return;

    setButtonLoading(submitButton, 'Salvando...');
    try {
        const updatedDeck = await updateDeck(deckId, title, description, selectedDeckColor);
        if (updatedDeck) {
            showToast('Baralho atualizado!', 'success');
            hideModal(document.getElementById('edit-deck-modal'));
            await loadDecks();
        }
    } finally {
        setButtonIdle(submitButton, 'Salvar Alterações');
    }
}

/**
 * Manipula a exclusão de um baralho a partir do modal de edição.
 */
async function handleDeleteDeck() {
    const deckId = document.getElementById('edit-deck-id').value;
    const deck = allDecks.find(d => d.id === deckId);

    if (!deck) return;

    if (confirm(`Tem certeza que deseja excluir o baralho "${deck.title}"?`)) {
        await deleteDeck(deckId);
        showToast('Baralho excluído com sucesso.', 'success');
        hideModal(document.getElementById('edit-deck-modal'));
        await loadDecks();
    }
}


// --- FUNÇÕES DE VALIDAÇÃO E UTILITÁRIOS ---

/**
 * Valida o título do baralho e exibe uma mensagem de erro se necessário.
 * @param {string} title - O título a ser validado.
 * @param {string} errorElementId - O ID do elemento onde o erro será exibido.
 * @returns {boolean} - Retorna true se o título for válido.
 */
function validateDeckTitle(title, errorElementId) {
    const errorElement = document.getElementById(errorElementId);
    if (title.length < 3 || title.length > 50) {
        errorElement.textContent = 'O título deve ter entre 3 e 50 caracteres.';
        errorElement.style.display = 'block';
        return false;
    }
    errorElement.style.display = 'none';
    return true;
}

/**
 * Define o estado de um botão para "carregando".
 * @param {HTMLButtonElement} button - O botão a ser modificado.
 * @param {string} text - O texto a ser exibido no botão.
 */
function setButtonLoading(button, text = 'Aguarde...') {
    button.disabled = true;
    button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
}

/**
 * Restaura um botão para o seu estado normal.
 * @param {HTMLButtonElement} button - O botão a ser restaurado.
 * @param {string} text - O texto original do botão.
 */
function setButtonIdle(button, text) {
    button.disabled = false;
    button.innerHTML = text;
}

/**
 * Escapa caracteres HTML para prevenir injeção de XSS.
 * @param {string} str - A string a ser escapada.
 * @returns {string} - A string segura.
 */
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return str.replace(/[&<>"']/g, (match) => {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[match];
    });
}

/**
 * Abre o modal de edição e preenche com os dados do baralho.
 * @param {object} deck - O objeto do baralho a ser editado.
 */
function openEditDeckModal(deck) {
    const modal = document.getElementById('edit-deck-modal');
    if (!modal) return;
    
    // Preenche os campos do formulário
    modal.querySelector('#edit-deck-id').value = deck.id;
    modal.querySelector('#edit-deck-title').value = deck.title;
    modal.querySelector('#edit-deck-description').value = deck.description || '';
    
    // Seleciona a cor correta
    const colorToSelect = deck.color || '#4f46e5';
    const colorOption = modal.querySelector(`.color-option[data-color="${colorToSelect}"]`);
    if (colorOption) {
        selectColor(colorOption);
    }
    
    showModal(modal);
}

// --- GUARDA DE ROTAS E AUTENTICAÇÃO ---

/**
 * Verifica se o usuário está logado e redireciona se necessário.
 */
async function routeGuard() {
    const { data: { session } } = await _supabase.auth.getSession();
    const isAuthPage = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('login.html') || window.location.pathname === '/';

    if (session) { // Usuário está logado
        if (isAuthPage) {
            window.location.href = 'dashboard.html';
        }
    } else { // Usuário NÃO está logado
        if (!isAuthPage) {
            window.location.href = 'login.html';
        }
    }
}


// --- FUNÇÕES DE API (Integradas para cumprir o pedido) ---

/**
 * Função base para todas as chamadas à API.
 * @param {string} endpoint - O endpoint da API (ex: '/decks').
 * @param {string} method - O método HTTP (GET, POST, PUT, DELETE).
 * @param {object|null} body - O corpo da requisição para POST/PUT.
 * @returns {Promise<any|null>} - Os dados da resposta ou null em caso de erro.
 */
async function apiCall(endpoint, method = 'GET', body = null) {
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return null;
    }

    const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
    };

    const config = { method, headers };
    if (body) {
        config.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: `Erro ${response.status}` }));
            throw new Error(errorData.message);
        }
        // Retorna um objeto para DELETE para indicar sucesso
        return response.status === 204 ? { success: true } : await response.json();
    } catch (error) {
        console.error(`API Error on ${method} ${endpoint}:`, error);
        showToast(error.message || 'Ocorreu um erro de comunicação.', 'error');
        return null;
    }
}

function fetchDecks() { return apiCall('/decks'); }
function createDeck(title, description, color) { return apiCall('/decks', 'POST', { title, description, color }); }
function updateDeck(deckId, title, description, color) { return apiCall(`/decks/${deckId}`, 'PUT', { title, description, color }); }
function deleteDeck(deckId) { return apiCall(`/decks/${deckId}`, 'DELETE'); }
function fetchProfile() { return apiCall('/profile'); }


// --- FUNÇÃO DE NOTIFICAÇÃO (Toast) ---

/**
 * Exibe uma notificação toast na tela.
 * @param {string} message - A mensagem a ser exibida.
 * @param {'info'|'success'|'error'} type - O tipo de notificação.
 */
function showToast(message, type = 'info') {
    const backgroundColor = {
        success: 'linear-gradient(to right, #00b09b, #96c93d)',
        error: 'linear-gradient(to right, #ff5f6d, #ffc371)',
        info: 'linear-gradient(to right, #6a11cb, #2575fc)'
    }[type];

    Toastify({
        text: message,
        duration: 3000,
        close: true,
        gravity: "top",
        position: "right",
        stopOnFocus: true,
        style: { background: backgroundColor },
    }).showToast();
}