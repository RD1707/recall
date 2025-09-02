/**
 * Módulo DashboardApp v2.0
 * Gerencia a interatividade e o estado do dashboard com foco em performance e legibilidade.
 */
const DashboardApp = {
    // 1. STATE: Centraliza os dados dinâmicos da aplicação.
    state: {
        allDecks: [],
        selectedDeckColor: '#4f46e5',
        searchTimeout: null,
    },

    // 2. ELEMENTS: Armazena referências aos elementos do DOM para acesso rápido.
    elements: {
        decksGrid: null,
        emptyState: null,
        searchInput: null,
        filterMenu: null,
        createDeckModal: null,
        editDeckModal: null,
        createDeckForm: null,
        editDeckForm: null,
        deleteDeckBtn: null,
        scrollToTopBtn: null,
    },

    /**
     * Ponto de entrada da aplicação.
     */
    init() {
        // Garante que o DOM está pronto antes de executar
        document.addEventListener('DOMContentLoaded', () => {
            this.cacheElements();
            this.registerEventListeners();
            this.loadInitialData();
        });
    },

    /**
     * Mapeia as referências dos elementos do DOM para o objeto 'elements'.
     */
    cacheElements() {
        this.elements.decksGrid = document.getElementById('decks-grid');
        this.elements.emptyState = document.getElementById('empty-state');
        this.elements.searchInput = document.getElementById('deck-search');
        this.elements.filterMenu = document.getElementById('filter-menu');
        this.elements.createDeckModal = document.getElementById('create-deck-modal');
        this.elements.editDeckModal = document.getElementById('edit-deck-modal');
        this.elements.createDeckForm = document.getElementById('create-deck-form');
        this.elements.editDeckForm = document.getElementById('edit-deck-form');
        this.elements.deleteDeckBtn = document.getElementById('delete-deck-btn');
        this.elements.scrollToTopBtn = document.getElementById('scroll-to-top');
    },

    /**
     * Configura todos os listeners de eventos da página de forma centralizada.
     */
    registerEventListeners() {
        document.getElementById('create-deck-btn').addEventListener('click', () => this.utils.showModal(this.elements.createDeckModal));
        this.elements.deleteDeckBtn.addEventListener('click', () => this.handlers.handleDeleteDeck());

        this.elements.createDeckForm.addEventListener('submit', (e) => this.handlers.handleCreateDeck(e));
        this.elements.editDeckForm.addEventListener('submit', (e) => this.handlers.handleEditDeck(e));

        this.elements.searchInput.addEventListener('input', () => this.handlers.handleSearch());
        document.getElementById('filter-btn').addEventListener('click', this.handlers.toggleFilterMenu);
        this.elements.filterMenu.addEventListener('click', (e) => this.handlers.handleFilterChange(e));

        document.querySelectorAll('.close-modal-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal-overlay');
                if (modal) this.utils.hideModal(modal);
            });
        });
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === e.currentTarget) this.utils.hideModal(overlay);
            });
        });

        document.querySelectorAll('.color-picker').forEach(picker => {
            picker.addEventListener('click', (e) => this.handlers.handleColorSelection(e));
        });

        this.elements.scrollToTopBtn.addEventListener('click', this.utils.scrollToTop);
        window.addEventListener('scroll', () => this.utils.toggleScrollToTopButton());
    },

    /**
     * Carrega os dados iniciais dos baralhos e atualiza a UI.
     */
    async loadInitialData() {
        this.render.renderLoadingState();
        try {
            const decks = await fetchDecks();
            this.state.allDecks = decks || [];
            this.render.filterAndRenderDecks();
        } catch (error) {
            console.error("Falha ao carregar os baralhos:", error);
            showToast("Não foi possível carregar seus baralhos.", "error");
            this.render.renderErrorState();
        }
    },

    // 3. HANDLERS: Funções que processam as interações do usuário.
    handlers: {
        async handleCreateDeck(event) {
            event.preventDefault();
            const form = event.target;
            const submitButton = form.querySelector('button[type="submit"]');
            const title = form.querySelector('#deck-title').value.trim();
            const description = form.querySelector('#deck-description').value.trim();

            if (!title) {
                return showToast('O título é obrigatório.', 'error');
            }

            DashboardApp.utils.setButtonLoading(submitButton, 'Criando...');
            try {
                const newDeck = await createDeck(title, description, DashboardApp.state.selectedDeckColor);
                if (newDeck) {
                    showToast('Baralho criado com sucesso!', 'success');
                    DashboardApp.utils.hideModal(DashboardApp.elements.createDeckModal);
                    form.reset();
                    // Recarrega os dados para mostrar o novo baralho
                    await DashboardApp.loadInitialData();
                }
            } catch (error) {
                showToast("Falha ao criar o baralho.", "error");
            } finally {
                DashboardApp.utils.setButtonIdle(submitButton, 'Criar Baralho');
            }
        },

        async handleEditDeck(event) {
            event.preventDefault();
            const form = event.target;
            const submitButton = form.querySelector('button[type="submit"]');
            const deckId = form.querySelector('#edit-deck-id').value;
            const title = form.querySelector('#edit-deck-title').value.trim();
            const description = form.querySelector('#edit-deck-description').value.trim();

            if (!title) {
                return showToast('O título é obrigatório.', 'error');
            }

            DashboardApp.utils.setButtonLoading(submitButton, 'Salvando...');
            try {
                const updatedDeck = await updateDeck(deckId, title, description, DashboardApp.state.selectedDeckColor);
                if (updatedDeck) {
                    showToast('Baralho atualizado!', 'success');
                    DashboardApp.utils.hideModal(DashboardApp.elements.editDeckModal);
                    await DashboardApp.loadInitialData();
                }
            } catch (error) {
                showToast("Falha ao atualizar o baralho.", "error");
            } finally {
                DashboardApp.utils.setButtonIdle(submitButton, 'Salvar Alterações');
            }
        },

        async handleDeleteDeck() {
            const deckId = DashboardApp.elements.editDeckForm.querySelector('#edit-deck-id').value;
            if (confirm('Tem certeza que deseja excluir este baralho? Esta ação não pode ser desfeita.')) {
                try {
                    await deleteDeck(deckId);
                    showToast('Baralho excluído.', 'success');
                    DashboardApp.utils.hideModal(DashboardApp.elements.editDeckModal);
                    await DashboardApp.loadInitialData();
                } catch (error) {
                    showToast("Falha ao excluir o baralho.", "error");
                }
            }
        },

        handleSearch() {
            clearTimeout(DashboardApp.state.searchTimeout);
            DashboardApp.state.searchTimeout = setTimeout(() => {
                DashboardApp.render.filterAndRenderDecks();
            }, 300); // Debounce de 300ms para performance
        },

        toggleFilterMenu(event) {
            event.stopPropagation();
            DashboardApp.elements.filterMenu.classList.toggle('visible');
        },

        handleFilterChange(event) {
            event.preventDefault();
            const filterType = event.target.dataset.filter;
            if (filterType) {
                DashboardApp.elements.filterMenu.querySelectorAll('.dropdown-item').forEach(item => item.classList.remove('active'));
                event.target.classList.add('active');
                DashboardApp.render.filterAndRenderDecks();
                DashboardApp.elements.filterMenu.classList.remove('visible');
            }
        },

        handleColorSelection(event) {
            const colorOption = event.target.closest('.color-option');
            if (colorOption) {
                const picker = colorOption.parentElement;
                picker.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
                colorOption.classList.add('selected');
                DashboardApp.state.selectedDeckColor = colorOption.dataset.color;
            }
        },
    },

    // 4. RENDER: Funções responsáveis por manipular o DOM.
    render: {
        filterAndRenderDecks() {
            const searchTerm = DashboardApp.elements.searchInput.value.toLowerCase().trim();
            const activeFilter = document.querySelector('#filter-menu .dropdown-item.active')?.dataset.filter || 'all';

            let decksToRender = [...DashboardApp.state.allDecks];

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

            this.renderDecks(decksToRender);
        },

        renderDecks(decks) {
            this.clearDecksGrid();
            if (!decks || decks.length === 0) {
                DashboardApp.elements.emptyState.classList.remove('hidden');
                DashboardApp.elements.emptyState.querySelector('button').onclick = () => DashboardApp.utils.showModal(DashboardApp.elements.createDeckModal);
            } else {
                DashboardApp.elements.emptyState.classList.add('hidden');
                
                // MELHORIA: Adiciona o card de ação no topo da grade
                DashboardApp.elements.decksGrid.appendChild(this.createActionCardElement());
                
                decks.forEach((deck, index) => {
                    DashboardApp.elements.decksGrid.appendChild(this.createSingleDeckElement(deck, index));
                });
                DashboardApp.elements.decksGrid.appendChild(this.createAddNewDeckElement());
            }
        },

        createActionCardElement() {
            const card = document.createElement('div');
            card.className = 'action-card';
            card.innerHTML = `
                <h2>O que você quer estudar hoje?</h2>
                <p>Crie um novo baralho com IA ou comece a revisar para fortalecer sua memória.</p>
                <button class="btn"><i class="fas fa-plus"></i> Criar Novo Baralho</button>
            `;
            card.querySelector('button').addEventListener('click', () => {
                DashboardApp.utils.showModal(DashboardApp.elements.createDeckModal);
            });
            return card;
        },
        
        createSingleDeckElement(deck, index) {
            const card = document.createElement('div');
            card.className = 'deck-card';
            card.style.animationDelay = `${index * 50}ms`;

            const deckColor = deck.color || '#4f46e5';
            const safeTitle = DashboardApp.utils.escapeHtml(deck.title);
            const safeDescription = deck.description ? DashboardApp.utils.escapeHtml(deck.description) : 'Sem descrição';

            card.innerHTML = `
                <div class="deck-card-header" style="border-left-color: ${deckColor};">
                    <h3>${safeTitle}</h3>
                    <button class="deck-options-btn" aria-label="Opções do baralho">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                </div>
                <div class="deck-card-body">
                    <p>${safeDescription}</p>
                </div>
                <div class="deck-card-footer">
                    <span>${deck.card_count || 0} cards</span>
                    <a href="deck.html?id=${deck.id}" class="btn btn-primary-static">Estudar</a>
                </div>
            `;

            card.querySelector('.deck-options-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                DashboardApp.utils.openEditDeckModal(deck);
            });
            
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.deck-options-btn, a')) {
                    window.location.href = `deck.html?id=${deck.id}`;
                }
            });

            return card;
        },

        createAddNewDeckElement() {
            const card = document.createElement('div');
            card.className = 'deck-card create-new';
            card.innerHTML = `
                <div class="deck-card-inner">
                    <div class="create-icon"><i class="fas fa-plus"></i></div>
                    <h3>Criar Novo Baralho</h3>
                </div>
            `;
            card.addEventListener('click', () => DashboardApp.utils.showModal(DashboardApp.elements.createDeckModal));
            return card;
        },
        
        renderLoadingState() {
            this.clearDecksGrid();
            DashboardApp.elements.emptyState.classList.add('hidden');
            const skeletonHTML = '<div class="skeleton-deck"></div>'.repeat(6);
            DashboardApp.elements.decksGrid.innerHTML = skeletonHTML;
        },
        
        renderErrorState() {
            this.clearDecksGrid();
            DashboardApp.elements.decksGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <h3><i class="fas fa-exclamation-triangle"></i> Oops! Algo deu errado.</h3>
                    <p>Não foi possível carregar seus baralhos. Por favor, tente recarregar a página.</p>
                </div>
            `;
        },

        clearDecksGrid() {
            DashboardApp.elements.decksGrid.innerHTML = '';
        }
    },

    // 5. UTILS: Funções de ajuda e utilitários.
    utils: {
        showModal(modal) {
            if (!modal) return;
            modal.classList.add('visible');
            document.body.style.overflow = 'hidden';
        },

        hideModal(modal) {
            if (!modal) return;
            modal.classList.remove('visible');
            document.body.style.overflow = '';
        },
        
        openEditDeckModal(deck) {
            const modal = DashboardApp.elements.editDeckModal;
            modal.querySelector('#edit-deck-id').value = deck.id;
            modal.querySelector('#edit-deck-title').value = deck.title;
            modal.querySelector('#edit-deck-description').value = deck.description || '';

            const colorToSelect = deck.color || '#4f46e5';
            const picker = modal.querySelector('.color-picker');
            picker.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
            picker.querySelector(`.color-option[data-color="${colorToSelect}"]`)?.classList.add('selected');
            DashboardApp.state.selectedDeckColor = colorToSelect;
            
            this.showModal(modal);
        },

        setButtonLoading(button, text = 'Aguarde...') {
            button.disabled = true;
            button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
        },

        setButtonIdle(button, text) {
            button.disabled = false;
            button.innerHTML = text;
        },

        escapeHtml(str) {
            if (str === null || str === undefined) return '';
            const p = document.createElement('p');
            p.textContent = str;
            return p.innerHTML;
        },
        
        toggleScrollToTopButton() {
            const btn = DashboardApp.elements.scrollToTopBtn;
            if (window.scrollY > 300) {
                btn.style.opacity = '1';
                btn.style.visibility = 'visible';
            } else {
                btn.style.opacity = '0';
                btn.style.visibility = 'hidden';
            }
        },

        scrollToTop() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
};

// Inicia a aplicação.
DashboardApp.init();