const SUPABASE_URL = 'https://khofqsjwyunicxdxapih.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtob2Zxc2p3eXVuaWN4ZHhhcGloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMjM2NDksImV4cCI6MjA3MTY5OTY0OX0.3Fr8b6u3b6dqoh84qx0ulcddb-vj4gGqlOQvAI2weGE'; // <-- COLE SUA CHAVE ANON AQUI

const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function renderDeck(deck) {
    const listItem = document.createElement('li');
    listItem.classList.add('deck-list-item');
    listItem.dataset.deck = JSON.stringify(deck);

    const deckCard = document.createElement('div');
    deckCard.classList.add('deck-card');

    deckCard.innerHTML = `
        <a href="deck.html?id=${deck.id}" class="deck-card-link">
            <h4>${deck.title}</h4>
            <p>${deck.description || 'Sem descrição'}</p>
        </a>
        <div class="deck-card-actions">
            <button class="action-btn edit-deck-btn" title="Editar baralho">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
            </button>
        </div>
    `;

    listItem.appendChild(deckCard);
    return listItem;
}

async function loadDecks() {
    const decksContainer = document.getElementById('decks-container');
    if (!decksContainer) return;

    decksContainer.innerHTML = '';
    for (let i = 0; i < 3; i++) { 
        const skeletonItem = document.createElement('li');
        skeletonItem.classList.add('deck-list-item');
        skeletonItem.innerHTML = `
            <div class="deck-card-skeleton">
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text"></div>
            </div>
        `;
        decksContainer.appendChild(skeletonItem);
    }

    const decks = await fetchDecks();

    decksContainer.innerHTML = '';

    if (!decks || decks.length === 0) {
        decksContainer.innerHTML = '<li><p>Você ainda não tem baralhos. Crie um novo acima!</p></li>';
    } else {
        decks.forEach(deck => {
            const deckElement = renderDeck(deck);
            decksContainer.appendChild(deckElement);
        });
    }
}

function handleCreateDeckForm() {
    const createDeckForm = document.getElementById('create-deck-form');
    if (!createDeckForm) return;

    const titleInput = document.getElementById('deck-title');
    const descriptionInput = document.getElementById('deck-description');
    const submitButton = createDeckForm.querySelector('button[type="submit"]');
    const titleError = document.getElementById('title-error');

    const validateTitle = () => {
        const title = titleInput.value.trim();
        if (title.length < 3) {
            titleInput.classList.add('is-invalid');
            titleError.textContent = 'O título deve ter pelo menos 3 caracteres.';
            titleError.style.display = 'block';
            return false;
        } else if (title.length > 50) {
            titleInput.classList.add('is-invalid');
            titleError.textContent = 'O título deve ter no máximo 50 caracteres.';
            titleError.style.display = 'block';
            return false;
        } else {
            titleInput.classList.remove('is-invalid');
            titleError.style.display = 'none';
            return true;
        }
    };

    titleInput.addEventListener('input', validateTitle);

    createDeckForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!validateTitle()) {
            return;
        }

        const title = titleInput.value.trim();
        const description = descriptionInput.value.trim();

        submitButton.disabled = true;
        submitButton.textContent = 'A Criar...';

        try {
            const newDeckData = await createDeck(title, description);
            if (newDeckData) {
                showToast('Baralho criado com sucesso!', 'success'); // MUDANÇA
                titleInput.value = '';
                descriptionInput.value = '';
                loadDecks();
            }
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Criar Baralho';
        }
    });
}

async function updateProfileHeader() {
    const profile = await fetchProfile();
    if (profile) {
        document.getElementById('user-points').textContent = profile.points || 0;
        document.getElementById('user-streak').textContent = profile.current_streak || 0;
    }
}
async function routeGuard() {
    const { data: { session } } = await _supabase.auth.getSession();
    const isAuthPage = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('login.html') || window.location.pathname === '/';

    if (session) {

        updateProfileHeader();

        if (isAuthPage) {
            window.location.href = 'dashboard.html';
        }
        const userEmailElement = document.getElementById('user-email');
        if (userEmailElement) {
            userEmailElement.textContent = session.user.email;
        }
        if (window.location.pathname.endsWith('dashboard.html')) {
            loadDecks();
            handleCreateDeckForm();
        }
    } else {
        if (!isAuthPage) {
            window.location.href = 'index.html';
        }
    }
}

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
        if (e.target === modal) {
            closeModal();
        }
    });

    const validateEditTitle = () => {
        const title = titleInput.value.trim();
        if (title.length < 3) {
            titleInput.classList.add('is-invalid');
            titleError.textContent = 'O título deve ter pelo menos 3 caracteres.';
            titleError.style.display = 'block';
            return false;
        } else if (title.length > 50) {
            titleInput.classList.add('is-invalid');
            titleError.textContent = 'O título deve ter no máximo 50 caracteres.';
            titleError.style.display = 'block';
            return false;
        } else {
            titleInput.classList.remove('is-invalid');
            titleError.style.display = 'none';
            return true;
        }
    };
    
    titleInput.addEventListener('input', validateEditTitle);
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!validateEditTitle()) return;

        const deckId = deckIdInput.value;
        const title = titleInput.value.trim();
        const description = descriptionInput.value.trim();
        const submitButton = form.querySelector('button[type="submit"]');

        submitButton.disabled = true;
        submitButton.textContent = 'A Salvar...';

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

document.addEventListener('DOMContentLoaded', () => {
    routeGuard();
    if (window.location.pathname.endsWith('dashboard.html')) {
       handleEditDeckModal();
    }
});
