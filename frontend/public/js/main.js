const SUPABASE_URL = 'https://khofqsjwyunicxdxapih.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtob2Zxc2p3eXVuaWN4ZHhhcGloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMjM2NDksImV4cCI6MjA3MTY5OTY0OX0.3Fr8b6u3b6dqoh84qx0ulcddb-vj4gGqlOQvAI2weGE'; // <-- COLE SUA CHAVE ANON AQUI

const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function renderDeck(deck) {
    const listItem = document.createElement('li');
    listItem.classList.add('deck-list-item');

    const link = document.createElement('a');
    link.href = `deck.html?id=${deck.id}`;
    link.classList.add('deck-card-link');

    const deckCard = document.createElement('div');
    deckCard.classList.add('deck-card');
    deckCard.innerHTML = `
        <h4>${deck.title}</h4>
        <p>${deck.description || 'Sem descrição'}</p>
    `;

    link.appendChild(deckCard);
    listItem.appendChild(link);

    return listItem;
}

async function loadDecks() {
    const decksContainer = document.getElementById('decks-container');
    if (!decksContainer) return;

    // 1. Exibir os skeleton loaders
    decksContainer.innerHTML = ''; // Limpa a área
    for (let i = 0; i < 3; i++) { // Mostra 3 skeletons como placeholder
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

    // 2. Buscar os dados da API
    const decks = await fetchDecks(); 

    // 3. Renderizar o conteúdo real
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

/* recall/frontend/public/js/main.js */
function handleCreateDeckForm() {
    const createDeckForm = document.getElementById('create-deck-form');
    if (!createDeckForm) return;

    createDeckForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const titleInput = document.getElementById('deck-title');
        const descriptionInput = document.getElementById('deck-description');
        const submitButton = createDeckForm.querySelector('button[type="submit"]');

        const title = titleInput.value.trim();
        const description = descriptionInput.value.trim();

        if (!title) {
            alert('O título é obrigatório.');
            return;
        }

        // Desabilitar botão antes da chamada
        submitButton.disabled = true;
        submitButton.textContent = 'A Criar...';

        try {
            const newDeckData = await createDeck(title, description);
            if (newDeckData) {
                titleInput.value = '';
                descriptionInput.value = '';
                loadDecks();
            } else {
                alert('Ocorreu um erro ao criar o baralho. Tente novamente.');
            }
        } finally {
            // Reabilitar botão após a chamada
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
    const isAuthPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/';

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

document.addEventListener('DOMContentLoaded', () => {
    routeGuard();
});