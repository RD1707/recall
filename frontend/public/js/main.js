let allDecks = [];
let selectedDeckColor = '#4f46e5'; 
-
document.addEventListener('DOMContentLoaded', initDashboard);

async function initDashboard() {
    await loadDecks();
    setupEventListeners();
    setupSearchAndFilter();
}

function setupEventListeners() {
    document.getElementById('create-deck-btn').addEventListener('click', () => {
        showModal(document.getElementById('create-deck-modal'));
    });

    document.getElementById('create-deck-form').addEventListener('submit', handleCreateDeck);
    document.getElementById('edit-deck-form').addEventListener('submit', handleEditDeck);
    document.getElementById('delete-deck-btn').addEventListener('click', () => handleDeleteDeck());

    const scrollToTopBtn = document.getElementById('scroll-to-top');
    scrollToTopBtn.addEventListener('click', scrollToTop);
    window.addEventListener('scroll', toggleScrollToTopButton);

    document.querySelectorAll('.color-picker').forEach(picker => {
        picker.addEventListener('click', (e) => {
            const colorOption = e.target.closest('.color-option');
            if (colorOption) {
                picker.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
                colorOption.classList.add('selected');
                selectedDeckColor = colorOption.dataset.color;
            }
        });
    });

    document.querySelectorAll('.close-modal-btn, [data-close-modal]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal-overlay');
            if (modal) hideModal(modal);
        });
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) hideModal(overlay);
        });
    });
}

function setupSearchAndFilter() {
    const searchInput = document.getElementById('deck-search');
    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(filterAndRenderDecks, 300);
    });

    const filterBtn = document.getElementById('filter-btn');
    const filterMenu = document.getElementById('filter-menu');
    filterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        filterMenu.classList.toggle('visible');
    });

    filterMenu.addEventListener('click', (e) => {
        e.preventDefault();
        const filterType = e.target.dataset.filter;
        if (filterType) {
            filterMenu.querySelectorAll('.dropdown-item').forEach(item => item.classList.remove('active'));
            e.target.classList.add('active');
            filterAndRenderDecks();
            filterMenu.classList.remove('visible');
        }
    });

    document.addEventListener('click', () => {
        filterMenu.classList.remove('visible');
    });
}


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

function filterAndRenderDecks() {
    const searchTerm = document.getElementById('deck-search').value.toLowerCase().trim();
    const activeFilter = document.querySelector('#filter-menu .dropdown-item.active')?.dataset.filter || 'all';

    let decksToRender = [...allDecks];

    if (searchTerm) {
        decksToRender = decksToRender.filter(deck =>
            deck.title.toLowerCase().includes(searchTerm) ||
            (deck.description && deck.description.toLowerCase().includes(searchTerm))
        );
    }

    if (activeFilter === 'recent') {
        decksToRender.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (activeFilter === 'oldest') {
        decksToRender.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }

    renderDecks(decksToRender);
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

async function loadDecks() {
    const decksContainer = document.getElementById('decks-grid');
    const emptyStateContainer = document.getElementById('empty-state');
    
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
        emptyStateContainer.querySelector('button').addEventListener('click', () => {
            showModal(document.getElementById('create-deck-modal'));
        });
    } else {
        emptyStateContainer.classList.add('hidden');
        decks.forEach((deck, index) => {
            decksContainer.appendChild(renderSingleDeck(deck, index));
        });
        decksContainer.appendChild(createNewDeckCard());
    }
}

function renderSingleDeck(deck, index) {
    const card = document.createElement('div');
    card.className = 'deck-card';
    card.style.animationDelay = `${index * 50}ms`;

    const deckColor = deck.color || '#4f46e5';

    card.innerHTML = `
        <div class="deck-card-header" style="border-left-color: ${deckColor};">
            <h3>${escapeHtml(deck.title)}</h3>
            <button class="deck-options-btn" aria-label="Opções do baralho">
                <i class="fas fa-ellipsis-v"></i>
            </button>
        </div>
        <div class="deck-card-body">
            <p>${deck.description ? escapeHtml(deck.description) : 'Sem descrição'}</p>
        </div>
        <div class="deck-card-footer">
            <span>${deck.card_count || 0} cards</span>
            <a href="deck.html?id=${deck.id}" class="btn btn-primary-static">Estudar</a>
        </div>
    `;

    card.querySelector('.deck-options-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        openEditDeckModal(deck);
    });
    
    card.addEventListener('click', (e) => {
        if (!e.target.closest('.deck-options-btn')) {
            window.location.href = `deck.html?id=${deck.id}`;
        }
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
    
    document.getElementById('total-decks').textContent = totalDecks;
    document.getElementById('total-cards').textContent = totalCards;
    document.getElementById('due-cards').textContent = '0'; 
}

async function handleCreateDeck(e) {
    e.preventDefault();
    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const title = form.querySelector('#deck-title').value.trim();
    const description = form.querySelector('#deck-description').value.trim();

    if (!title) return showToast('O título é obrigatório.', 'error');

    setButtonLoading(submitButton, 'Criando...');
    try {
        const result = await createDeck(title, description, selectedDeckColor);
        if (result) {
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

    if (!title) return showToast('O título é obrigatório.', 'error');

    setButtonLoading(submitButton, 'Salvando...');
    try {
        const result = await updateDeck(deckId, title, description, selectedDeckColor);
        if (result) {
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
    if (confirm(`Tem certeza que deseja excluir este baralho?`)) {
        const result = await deleteDeck(deckId);
        if (result) {
            showToast('Baralho excluído.', 'success');
            hideModal(document.getElementById('edit-deck-modal'));
            await loadDecks();
        }
    }
}

function openEditDeckModal(deck) {
    const modal = document.getElementById('edit-deck-modal');
    modal.querySelector('#edit-deck-id').value = deck.id;
    modal.querySelector('#edit-deck-title').value = deck.title;
    modal.querySelector('#edit-deck-description').value = deck.description || '';

    const colorToSelect = deck.color || '#4f46e5';
    const picker = modal.querySelector('.color-picker');
    picker.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
    picker.querySelector(`.color-option[data-color="${colorToSelect}"]`)?.classList.add('selected');
    selectedDeckColor = colorToSelect;
    
    showModal(modal);
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
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}