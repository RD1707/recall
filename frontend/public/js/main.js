// --- CONFIGURAÇÃO INICIAL DO SUPABASE ---
const SUPABASE_URL = 'https://khofqsjwyunicxdxapih.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtob2Zxc2p3eXVuaWN4ZHhhcGloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMjM2NDksImV4cCI6MjA3MTY5OTY0OX0.3Fr8b6u3b6dqoh84qx0ulcddb-vj4gGqlOQvAI2weGE';

const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


/**
 * Renderiza um único card de baralho na UI.
 * @param {object} deck - O objeto do baralho vindo da API.
 * @returns {HTMLLIElement} O elemento <li> pronto para ser inserido no DOM.
 */
function renderDeck(deck) {
    const listItem = document.createElement('li');
    listItem.classList.add('deck-list-item');
    // Armazena os dados do baralho no próprio elemento para fácil acesso (ex: no modal de edição)
    listItem.dataset.deck = JSON.stringify(deck);

    listItem.innerHTML = `
        <div class="deck-card">
            <a href="deck.html?id=${deck.id}" class="deck-card-link">
                <h4>${deck.title}</h4>
                <p>${deck.description || 'Sem descrição'}</p>
            </a>
            <div class="deck-card-actions">
                <button class="action-btn edit-deck-btn" title="Editar baralho">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                </button>
            </div>
        </div>
    `;

    return listItem;
}

/**
 * Busca os baralhos do usuário na API e os renderiza na página.
 * Mostra um esqueleto de carregamento enquanto os dados são buscados.
 */
async function loadDecks() {
    const decksContainer = document.getElementById('decks-container');
    if (!decksContainer) return;

    // --- REFORMULADO: Mostra o novo skeleton loader ---
    decksContainer.innerHTML = `
        <li id="loading-decks">
            <div class="deck-card-skeleton">
                <div class="skeleton skeleton-text-large"></div>
                <div class="skeleton skeleton-text-small"></div>
            </div>
            <div class="deck-card-skeleton">
                <div class="skeleton skeleton-text-large"></div>
                <div class="skeleton skeleton-text-small"></div>
            </div>
            <div class="deck-card-skeleton">
                <div class="skeleton skeleton-text-large"></div>
                <div class="skeleton skeleton-text-small"></div>
            </div>
        </li>
    `;

    const decks = await fetchDecks();

    decksContainer.innerHTML = ''; // Limpa o container após a busca

    if (!decks || decks.length === 0) {
        decksContainer.innerHTML = '<li><p>Você ainda não tem baralhos. Crie um novo para começar!</p></li>';
    } else {
        decks.forEach(deck => {
            const deckElement = renderDeck(deck);
            decksContainer.appendChild(deckElement);
        });
    }
}

/**
 * Gerencia o formulário de criação de baralhos, incluindo validação e submissão.
 */
function handleCreateDeckForm() {
    const createDeckForm = document.getElementById('create-deck-form');
    if (!createDeckForm) return;

    const titleInput = document.getElementById('deck-title');
    const descriptionInput = document.getElementById('deck-description');
    const submitButton = createDeckForm.querySelector('button[type="submit"]');
    const titleError = document.getElementById('title-error');

    // Função de validação em tempo real
    const validateTitle = () => {
        const title = titleInput.value.trim();
        if (title.length < 3 || title.length > 50) {
            titleInput.classList.add('is-invalid');
            titleError.textContent = 'O título deve ter entre 3 e 50 caracteres.';
            titleError.style.display = 'block';
            return false;
        }
        titleInput.classList.remove('is-invalid');
        titleError.style.display = 'none';
        return true;
    };

    titleInput.addEventListener('input', validateTitle);

    createDeckForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!validateTitle()) return;

        const title = titleInput.value.trim();
        const description = descriptionInput.value.trim();

        submitButton.disabled = true;
        submitButton.textContent = 'Criando...';

        try {
            const newDeckData = await createDeck(title, description);
            if (newDeckData) {
                showToast('Baralho criado com sucesso!', 'success');
                createDeckForm.reset(); // Limpa o formulário
                loadDecks(); // Recarrega a lista de baralhos
            }
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Criar Baralho';
        }
    });
}

/**
 * Gerencia a lógica do modal de edição de baralhos.
 */
function handleEditDeckModal() {
    const decksContainer = document.getElementById('decks-container');
    const modal = document.getElementById('edit-deck-modal');
    if (!modal || !decksContainer) return;

    const form = document.getElementById('edit-deck-form');
    const titleInput = document.getElementById('edit-deck-title');
    const descriptionInput = document.getElementById('edit-deck-description');
    const deckIdInput = document.getElementById('edit-deck-id');
    const titleError = document.getElementById('edit-title-error');
    const closeModalBtn = document.getElementById('close-edit-deck-modal-btn');
    const cancelBtn = document.getElementById('cancel-edit-deck-btn');

    const openModal = (deck) => {
        deckIdInput.value = deck.id;
        titleInput.value = deck.title;
        descriptionInput.value = deck.description || '';
        modal.classList.add('visible');
    };

    const closeModal = () => {
        modal.classList.remove('visible');
        form.reset();
        titleInput.classList.remove('is-invalid');
        titleError.style.display = 'none';
    };

    // Event listener no container para capturar cliques nos botões de editar
    decksContainer.addEventListener('click', (e) => {
        const editButton = e.target.closest('.edit-deck-btn');
        if (editButton) {
            const listItem = editButton.closest('.deck-list-item');
            const deckData = JSON.parse(listItem.dataset.deck);
            openModal(deckData);
        }
    });

    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        // Lógica de validação e submissão...
        const deckId = deckIdInput.value;
        const title = titleInput.value.trim();
        const description = descriptionInput.value.trim();
        const submitButton = form.querySelector('button[type="submit"]');

        submitButton.disabled = true;
        submitButton.textContent = 'Salvando...';

        try {
            const result = await updateDeck(deckId, title, description);
            if (result) {
                showToast('Baralho atualizado com sucesso!', 'success');
                closeModal();
                loadDecks(); 
            }
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Salvar Alterações';
        }
    });
}

/**
 * Atualiza as informações do usuário no cabeçalho (pontos e streak).
 */
async function updateProfileHeader() {
    const profile = await fetchProfile();
    if (profile) {
        document.getElementById('user-points').textContent = profile.points || 0;
        document.getElementById('user-streak').textContent = profile.current_streak || 0;
    }
}

/**
 * Guarda de rota: verifica se o usuário está logado e o redireciona
 * para a página correta (dashboard ou login).
 */
async function routeGuard() {
    const { data: { session } } = await _supabase.auth.getSession();
    const isAuthPage = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('login.html') || window.location.pathname === '/';

    if (session) {
        // Se o usuário está logado
        updateProfileHeader();
        const userEmailElement = document.getElementById('user-email');
        if (userEmailElement) {
            userEmailElement.textContent = session.user.email;
        }
        
        if (isAuthPage) {
            window.location.href = 'dashboard.html';
        }
    } else {
        // Se o usuário NÃO está logado
        if (!isAuthPage) {
            window.location.href = 'login.html';
        }
    }
}

/**
 * Ponto de entrada principal do script da página.
 * Garante que o DOM esteja carregado antes de executar o código.
 */
document.addEventListener('DOMContentLoaded', () => {
    routeGuard();

    // Executa funções específicas da página do dashboard
    if (window.location.pathname.endsWith('dashboard.html')) {
        loadDecks();
        handleCreateDeckForm();
        handleEditDeckModal();
    }
});