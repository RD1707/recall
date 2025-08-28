// A inicialização do Supabase foi movida para api.js

let allDecks = [];
let currentUser = null;
let selectedDeckColor = '#4f46e5'; // Cor padrão

// --- INICIALIZAÇÃO DA APLICAÇÃO ---

document.addEventListener('DOMContentLoaded', initApp);

/**
 * Ponto de entrada: Inicializa a aplicação quando o DOM estiver pronto.
 */
async function initApp() {
    // A função routeGuard está em auth.js e depende do _supabase definido em api.js
    // Garanta que api.js e auth.js sejam carregados antes de main.js no dashboard.html
    await routeGuard(); 
    
    // O restante desta função só deve rodar no dashboard
    if (document.body.id === 'dashboard-page') {
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
        }, 300);
    });
}


// --- FUNÇÕES DE RENDERIZAÇÃO E UI/UX ---

function showModal(modal) {
    if (!modal) return;
    modal.classList.add('visible');
    document.body.style.overflow = 'hidden';
}

function hideModal(modal) {
    if (!modal) return;
    modal.classList.remove('visible');
    document.body.style.overflow = '';
}

function toggleUserMenu() {
    const dropdown = document.getElementById('user-dropdown');
    dropdown?.classList.toggle('visible');
}

function filterDecks(searchTerm) {
    const normalizedSearch = searchTerm.toLowerCase().trim();
    if (!normalizedSearch) {
        renderDecks(allDecks);
        return;
    }

    const filtered = allDecks.filter(deck =>
        deck.title.toLowerCase().includes(normalizedSearch) ||
        (deck.description && deck.description.toLowerCase().includes(normalizedSearch))
    );

    renderDecks(filtered);
}

function selectColor(colorElement) {
    const parent = colorElement.closest('.color-picker');
    parent.querySelectorAll('.color-option').forEach(option => {
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
}


// --- LÓGICA DE DADOS (CARREGAMENTO E RENDERIZAÇÃO) ---

async function loadUserProfile() {
    const { data: { user } } = await _supabase.auth.getUser();
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
    if (!decksContainer) return;

    decksContainer.innerHTML = Array(3).fill('<div class="skeleton-deck"></div>').join('');
    
    // As funções fetchDecks e fetchAnalyticsSummary vêm de api.js
    const [decks, summary] = await Promise.all([fetchDecks(), fetchAnalyticsSummary()]);
    
    allDecks = decks || [];

    renderDecks(allDecks);
    updateDashboardStats(allDecks, summary);
}

function renderDecks(decks) {
    const decksContainer = document.getElementById('decks-grid');
    const emptyStateContainer = document.getElementById('empty-state');
    
    decksContainer.innerHTML = ''; 

    if (!decks || decks.length === 0) {
        emptyStateContainer.classList.remove('hidden');
        const createBtn = emptyStateContainer.querySelector('button');
        if (createBtn) {
            createBtn.onclick = () => showModal(document.getElementById('create-deck-modal'));
        }
    } else {
        emptyStateContainer.classList.add('hidden');
        decks.forEach((deck, index) => {
            decksContainer.appendChild(renderSingleDeck(deck, index));
        });
        decksContainer.prepend(createNewDeckCard()); // Adiciona no início
    }
}

function renderSingleDeck(deck, index) {
    const card = document.createElement('div');
    card.className = 'deck-card';
    card.style.animationDelay = `${index * 50}ms`;
    card.style.cursor = 'pointer';

    card.innerHTML = `
        <div class="deck-card-inner">
            <div class="deck-card-header" style="background-color: ${deck.color || '#4f46e5'};">
                <button class="deck-menu-btn" aria-label="Opções do baralho">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
            </div>
            <div class="deck-card-body">
                <h3>${escapeHtml(deck.title)}</h3>
                <p>${deck.description ? escapeHtml(deck.description) : 'Sem descrição'}</p>
            </div>
            <div class="deck-card-footer">
                <span class="btn btn-primary-static">Abrir Baralho</span>
            </div>
        </div>`;

    card.addEventListener('click', (e) => {
        if (!e.target.closest('.deck-menu-btn')) {
            window.location.href = `deck.html?id=${deck.id}`;
        }
    });

    const menuBtn = card.querySelector('.deck-menu-btn');
    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditDeckModal(deck);
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
        </div>`;
    card.addEventListener('click', () => {
        showModal(document.getElementById('create-deck-modal'));
    });
    return card;
}

function updateDashboardStats(decks, summary) {
    document.getElementById('total-decks').textContent = decks.length;
    document.getElementById('total-cards').textContent = summary?.total_cards || 0;
    document.getElementById('due-cards').textContent = summary?.due_cards || 0;
}


// --- HANDLERS DE FORMULÁRIO ---

async function handleCreateDeck(e) {
    e.preventDefault();
    const form = e.target;
    const title = form.querySelector('#deck-title').value.trim();
    const description = form.querySelector('#deck-description').value.trim();

    if (!validateDeckTitle(title, 'title-error')) return;

    setButtonLoading(form.querySelector('button[type="submit"]'), 'Criando...');
    
    const newDeck = await createDeck(title, description, selectedDeckColor);
    if (newDeck) {
        showToast('Baralho criado com sucesso!', 'success');
        hideModal(document.getElementById('create-deck-modal'));
        form.reset();
        await loadDecks();
    }
    
    setButtonIdle(form.querySelector('button[type="submit"]'), 'Criar Baralho');
}

async function handleEditDeck(e) {
    e.preventDefault();
    const form = e.target;
    const deckId = form.querySelector('#edit-deck-id').value;
    const title = form.querySelector('#edit-deck-title').value.trim();
    const description = form.querySelector('#edit-deck-description').value.trim();

    if (!validateDeckTitle(title, 'edit-title-error')) return;

    setButtonLoading(form.querySelector('button[type="submit"]'), 'Salvando...');
    
    const updatedDeck = await updateDeck(deckId, title, description, selectedDeckColor);
    if (updatedDeck) {
        showToast('Baralho atualizado!', 'success');
        hideModal(document.getElementById('edit-deck-modal'));
        await loadDecks();
    }
    
    setButtonIdle(form.querySelector('button[type="submit"]'), 'Salvar Alterações');
}

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


// --- FUNÇÕES UTILITÁRIAS ---

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
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[match]));
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