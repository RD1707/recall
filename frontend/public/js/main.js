// --- CONFIGURAÇÃO INICIAL DO SUPABASE ---
const SUPABASE_URL = 'https://khofqsjwyunicxdxapih.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtob2Zxc2p3eXVuaWN4ZHhhcGloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMjM2NDksImV4cCI6MjA3MTY5OTY0OX0.3Fr8b6u3b6dqoh84qx0ulcddb-vj4gGqlOQvAI2weGE';

const {
    createClient
} = supabase;
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
        setupSearchAndFilter(); // Renomeado para incluir filtro
    }
}


// --- FUNÇÕES DE LÓGICA DA PÁGINA (Dashboard) ---

/**
 * Configura todos os event listeners da página do dashboard.
 */
function setupEventListeners() {
    // Modais de Deck
    const createDeckBtn = document.getElementById('create-deck-btn');
    const createDeckModal = document.getElementById('create-deck-modal');

    if (createDeckBtn) {
        createDeckBtn.addEventListener('click', () => showModal(createDeckModal));
    }

    // Submissão de formulários de Deck
    const createDeckForm = document.getElementById('create-deck-form');
    if (createDeckForm) {
        createDeckForm.addEventListener('submit', handleCreateDeck);
    }

    const editDeckForm = document.getElementById('edit-deck-form');
    if (editDeckForm) {
        editDeckForm.addEventListener('submit', handleEditDeck);
    }

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
        option.addEventListener('click', (e) => selectColor(e.target.closest('.color-option')));
    });

    // --- Novos Listeners para Header e Modais ---
    const userMenuButton = document.getElementById('user-menu-button');
    if (userMenuButton) {
        userMenuButton.addEventListener('click', toggleUserMenu);
    }

    const profileLink = document.getElementById('profile-link');
    if (profileLink) {
        profileLink.addEventListener('click', (e) => {
            e.preventDefault();
            showModal(document.getElementById('profile-modal'));
            toggleUserMenu(); // Fecha o dropdown
        });
    }

    const settingsLink = document.getElementById('settings-link');
    if (settingsLink) {
        settingsLink.addEventListener('click', (e) => {
            e.preventDefault();
            showModal(document.getElementById('settings-modal'));
            toggleUserMenu(); // Fecha o dropdown
        });
    }

    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            await _supabase.auth.signOut();
            window.location.href = 'index.html';
        });
    }

    // Listener para fechar todos os modais
    document.querySelectorAll('.close-modal-btn, .modal-overlay').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) { // Garante que o clique no overlay não propague dos filhos
                const modalId = e.target.dataset.modalId || e.target.closest('.modal-overlay')?.id;
                if (modalId) {
                    hideModal(document.getElementById(modalId));
                }
            }
        });
    });
}


/**
 * Configura a funcionalidade de busca e filtro.
 */
function setupSearchAndFilter() {
    // Lógica da Busca
    const searchInput = document.getElementById('deck-search');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                filterAndRenderDecks();
            }, 300);
        });
    }

    // Lógica do Filtro
    const filterBtn = document.getElementById('filter-btn');
    const filterMenu = document.getElementById('filter-menu');
    if (filterBtn && filterMenu) {
        filterBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            filterMenu.classList.toggle('visible');
        });

        filterMenu.addEventListener('click', (e) => {
            e.preventDefault();
            const filterType = e.target.dataset.filter;
            if (filterType) {
                // Remove a classe 'active' de todos os itens e adiciona ao clicado
                filterMenu.querySelectorAll('.dropdown-item').forEach(item => item.classList.remove('active'));
                e.target.classList.add('active');

                filterAndRenderDecks();
                filterMenu.classList.remove('visible');
            }
        });

        // Fecha o menu de filtro ao clicar fora
        document.addEventListener('click', () => {
            filterMenu.classList.remove('visible');
        });
    }
}


// --- FUNÇÕES DE RENDERIZAÇÃO E UI/UX ---

/**
 * Mostra um modal específico.
 * @param {HTMLElement} modal - O elemento do modal a ser exibido.
 */
function showModal(modal) {
    if (!modal) return;
    modal.classList.add('visible');
    document.body.style.overflow = 'hidden';
}

/**
 * Esconde um modal específico.
 * @param {HTMLElement} modal - O elemento do modal a ser escondido.
 */
function hideModal(modal) {
    if (!modal) return;
    modal.classList.remove('visible');
    document.body.style.overflow = '';
}


function toggleUserMenu() {
    const dropdown = document.getElementById('user-dropdown');
    dropdown?.classList.toggle('visible');
}

/**
 * Filtra e ordena os baralhos com base nos inputs de busca e filtro, e depois renderiza.
 */
function filterAndRenderDecks() {
    const searchTerm = document.getElementById('deck-search').value.toLowerCase().trim();
    const activeFilter = document.querySelector('#filter-menu .dropdown-item.active')?.dataset.filter || 'all';

    let decksToRender = [...allDecks];

    // 1. Aplica o filtro de busca
    if (searchTerm) {
        decksToRender = decksToRender.filter(deck =>
            deck.title.toLowerCase().includes(searchTerm) ||
            (deck.description && deck.description.toLowerCase().includes(searchTerm))
        );
    }

    // 2. Aplica o filtro de ordenação
    if (activeFilter === 'recent') {
        decksToRender.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (activeFilter === 'oldest') {
        decksToRender.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }
    // 'all' não precisa de ordenação específica, mantém a padrão da API.

    renderDecks(decksToRender);
}


function selectColor(colorElement) {
    document.querySelectorAll('.color-option').forEach(option => {
        option.classList.remove('selected');
    });
    colorElement.classList.add('selected');
    selectedDeckColor = colorElement.dataset.color;
}


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


function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}


// --- LÓGICA DE DADOS (CARREGAMENTO E RENDERIZAÇÃO) ---

async function loadUserProfile() {
    const {
        data: {
            user
        }
    } = await _supabase.auth.getUser();
    currentUser = user;

    if (user?.email) {
        const userEmailElement = document.getElementById('user-email');
        if (userEmailElement) userEmailElement.textContent = user.email;

        const initial = user.email.charAt(0).toUpperCase();
        document.querySelectorAll('#user-avatar-text, #dropdown-avatar-text').forEach(el => {
            el.textContent = initial;
        });
    }

    const profile = await fetchProfile();
    if (profile) {
        document.getElementById('user-points').textContent = profile.points || 0;
        document.getElementById('user-streak').textContent = profile.current_streak || 0;
    }
}


async function loadDecks() {
    const decksContainer = document.getElementById('decks-grid');
    const emptyStateContainer = document.getElementById('empty-state');
    if (!decksContainer) return;

    emptyStateContainer.classList.add('hidden');
    decksContainer.innerHTML = `
        <div class="skeleton-deck"></div>
        <div class="skeleton-deck"></div>
        <div class="skeleton-deck"></div>
    `;

    const decks = await fetchDecks();
    allDecks = decks || [];

    renderDecks(allDecks);
    updateDashboardStats();
}


function renderDecks(decks) {
    const decksContainer = document.getElementById('decks-grid');
    const emptyStateContainer = document.getElementById('empty-state');

    decksContainer.innerHTML = '';

    if (!decks || decks.length === 0) {
        emptyStateContainer.classList.remove('hidden');
        const createFirstDeckBtn = emptyStateContainer.querySelector('button');
        if (createFirstDeckBtn) {
            createFirstDeckBtn.addEventListener('click', () => {
                showModal(document.getElementById('create-deck-modal'));
            });
        }
    } else {
        emptyStateContainer.classList.add('hidden');
        decks.forEach((deck, index) => {
            decksContainer.appendChild(renderSingleDeck(deck, index));
        });
        decksContainer.appendChild(createNewDeckCard());
    }
}

/**
 * **FUNÇÃO CORRIGIDA**
 * Cria o HTML para um card de baralho, sem o botão de opções.
 */
function renderSingleDeck(deck, index) {
    const card = document.createElement('div');
    card.className = 'deck-card';
    card.style.animationDelay = `${index * 50}ms`;

    const deckColor = deck.color || '#4f46e5';

    // O botão de menu foi removido desta versão.
    card.innerHTML = `
        <div class="deck-card-inner" data-deck-id="${deck.id}">
            <div class="deck-card-header" style="background-color: ${deckColor};">
                </div>
            <div class="deck-card-body">
                <h3>${escapeHtml(deck.title)}</h3>
                <p>${deck.description ? escapeHtml(deck.description) : 'Sem descrição'}</p>
            </div>
            <div class="deck-card-footer">
                <span class="btn btn-primary-static">Abrir Baralho</span>
            </div>
        </div>
    `;

    // O card inteiro agora é um link. Clicar em qualquer lugar leva para a página do baralho.
    card.addEventListener('click', () => {
        window.location.href = `deck.html?id=${deck.id}`;
    });

    return card;
}


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


function updateDashboardStats() {
    const totalDecks = allDecks.length;
    const totalCards = allDecks.reduce((sum, deck) => sum + (deck.card_count || 0), 0);
    const dueCards = allDecks.reduce((sum, deck) => sum + (deck.due_count || 0), 0);

    document.getElementById('total-decks').textContent = totalDecks;
    document.getElementById('total-cards').textContent = totalCards;
    document.getElementById('due-cards').textContent = dueCards;
}


// --- HANDLERS DE EVENTOS DE FORMULÁRIO ---

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

async function handleDeleteDeck() {
    const deckId = document.getElementById('edit-deck-id').value;
    const deck = allDecks.find(d => d.id === deckId);
    if (!deck) return;

    if (confirm(`Tem certeza que deseja excluir o baralho "${deck.title}"?`)) {
        const result = await deleteDeck(deckId);
        if (result) {
            showToast('Baralho excluído com sucesso.', 'success');
            hideModal(document.getElementById('edit-deck-modal'));
            await loadDecks();
        }
    }
}


// --- FUNÇÕES DE VALIDAÇÃO E UTILITÁRIOS ---

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

function setButtonLoading(button, text = 'Aguarde...') {
    button.disabled = true;
    button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
}

function setButtonIdle(button, text) {
    button.disabled = false;
    button.innerHTML = text;
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return str.replace(/[&<>"']/g, (match) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    } [match]));
}

function openEditDeckModal(deck) {
    const modal = document.getElementById('edit-deck-modal');
    if (!modal) return;

    modal.querySelector('#edit-deck-id').value = deck.id;
    modal.querySelector('#edit-deck-title').value = deck.title;
    modal.querySelector('#edit-deck-description').value = deck.description || '';

    const colorToSelect = deck.color || '#4f46e5';
    const colorOption = modal.querySelector(`.color-option[data-color="${colorToSelect}"]`);
    if (colorOption) {
        selectColor(colorOption);
    }

    showModal(modal);
}

// --- GUARDA DE ROTAS E AUTENTICAÇÃO ---

async function routeGuard() {
    const {
        data: {
            session
        }
    } = await _supabase.auth.getSession();
    const isAuthPage = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('login.html') || window.location.pathname === '/';

    if (session) {
        if (isAuthPage) {
            window.location.href = 'dashboard.html';
        }
    } else {
        if (!isAuthPage) {
            window.location.href = 'login.html';
        }
    }
}


// --- FUNÇÕES DE API ---
async function apiCall(endpoint, method = 'GET', body = null) {
    const {
        data: {
            session
        }
    } = await _supabase.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return null;
    }

    const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
    };
    const config = {
        method,
        headers
    };
    if (body) config.body = JSON.stringify(body);

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({
                message: `Erro ${response.status}`
            }));
            throw new Error(errorData.message);
        }
        return response.status === 204 ? {
            success: true
        } : await response.json();
    } catch (error) {
        console.error(`API Error on ${method} ${endpoint}:`, error);
        showToast(error.message || 'Ocorreu um erro de comunicação.', 'error');
        return null;
    }
}

function fetchDecks() {
    return apiCall('/decks');
}

function createDeck(title, description, color) {
    return apiCall('/decks', 'POST', {
        title,
        description,
        color
    });
}

function updateDeck(deckId, title, description, color) {
    return apiCall(`/decks/${deckId}`, 'PUT', {
        title,
        description,
        color
    });
}

function deleteDeck(deckId) {
    return apiCall(`/decks/${deckId}`, 'DELETE');
}

function fetchProfile() {
    return apiCall('/profile');
}