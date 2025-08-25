// Variável para armazenar os flashcards carregados na página
let currentFlashcards = [];

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const deckId = params.get('id');

    if (!deckId) {
        alert('ID do baralho não encontrado.');
        window.location.href = 'dashboard.html';
        return;
    }

    document.getElementById('study-deck-button').href = `study.html?deckId=${deckId}`;

    loadPageData(deckId);
    handleGenerateForm(deckId);
    setupEventListeners(deckId);
});

async function loadPageData(deckId) {
    const allDecks = await fetchDecks(); 
    const currentDeck = allDecks.find(deck => deck.id === deckId);

    if (currentDeck) {
        document.getElementById('deck-title-heading').textContent = currentDeck.title;
        document.getElementById('deck-description-paragraph').textContent = currentDeck.description;
    }

    await loadAndRenderFlashcards(deckId);
}

async function loadAndRenderFlashcards(deckId) {
    const container = document.getElementById('flashcards-container');

    // 1. Exibir os skeleton loaders
    container.innerHTML = '';
    for (let i = 0; i < 4; i++) { // Mostra 4 skeletons como placeholder
        const skeletonItem = document.createElement('li');
        skeletonItem.innerHTML = `
            <div class="flashcard-skeleton">
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text"></div>
            </div>
        `;
        container.appendChild(skeletonItem);
    }

    // 2. Buscar os dados da API
    currentFlashcards = await fetchFlashcards(deckId);

    // 3. Renderizar o conteúdo real
    container.innerHTML = ''; 

    if (!currentFlashcards || currentFlashcards.length === 0) {
        container.innerHTML = '<li><p>Este baralho ainda não tem flashcards. Gere novos com a IA!</p></li>';
    } else {
        currentFlashcards.forEach(card => {
            const listItem = document.createElement('li');
            listItem.classList.add('flashcard-list-item');
            listItem.setAttribute('data-card-id', card.id);

            listItem.innerHTML = `
                <div class="flashcard">
                    <p class="question">${card.question}</p>
                    <p class="answer">${card.answer}</p>
                </div>
                <div class="flashcard-actions">
                    <button class="action-btn edit-btn" title="Editar card">Editar</button>
                    <button class="action-btn delete-btn" title="Excluir card">Excluir</button>
                </div>
            `;
            container.appendChild(listItem);
        });
    }
}

function handleGenerateForm(deckId) {
    const form = document.getElementById('generate-cards-form');
    const button = document.getElementById('generate-button');
    const textarea = document.getElementById('text-content');
    const cardCountInput = document.getElementById('card-count');
    const cardTypeSelect = document.getElementById('card-type');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const textContent = textarea.value.trim();
        if (!textContent) return;
        
        const generationParams = {
            textContent,
            count: parseInt(cardCountInput.value, 10),
            type: cardTypeSelect.value,
        };

        button.disabled = true;
        button.textContent = 'A Enviar...';

        try {
            const result = await generateFlashcards(deckId, generationParams);

            if (result) {
                // A API respondeu 202 (Accepted)
                textarea.value = '';
                alert('Os flashcards estão a ser gerados! A lista será atualizada em breve.');
                
                // Esconde o formulário e mostra uma mensagem de processamento
                form.style.display = 'none';
                const processingMessage = document.createElement('p');
                processingMessage.id = 'processing-msg';
                processingMessage.textContent = 'A processar... por favor, aguarde.';
                form.parentElement.appendChild(processingMessage);

                // Inicia o "polling": verifica a cada 5 segundos se os flashcards chegaram
                const initialCardCount = currentFlashcards.length;
                const pollInterval = setInterval(async () => {
                    await loadAndRenderFlashcards(deckId);
                    if (currentFlashcards.length > initialCardCount) {
                        clearInterval(pollInterval); // Para de verificar
                        // Restaura o formulário
                        form.style.display = 'block';
                        document.getElementById('processing-msg').remove();
                        button.disabled = false;
                        button.textContent = 'Gerar Flashcards';
                    }
                }, 5000); // 5 segundos
            } else {
                 // Se a API falhou ao adicionar à fila
                button.disabled = false;
                button.textContent = 'Gerar Flashcards';
            }
        } catch (error) {
            button.disabled = false;
            button.textContent = 'Gerar Flashcards';
        }
    });
}

// --- Lógica do Modal e Ações CRUD ---

function setupEventListeners(deckId) {
    const flashcardsContainer = document.getElementById('flashcards-container');
    const modal = document.getElementById('edit-flashcard-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelBtn = document.getElementById('cancel-edit-btn');
    const editForm = document.getElementById('edit-flashcard-form');

    // Delegação de eventos para os botões de editar e excluir
    flashcardsContainer.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('edit-btn')) {
            const cardId = target.closest('.flashcard-list-item').dataset.cardId;
            openEditModal(cardId);
        }
        if (target.classList.contains('delete-btn')) {
            const cardId = target.closest('.flashcard-list-item').dataset.cardId;
            handleDeleteFlashcard(cardId, deckId);
        }
    });

    // Eventos para fechar o modal
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeEditModal(); // Fecha se clicar fora do conteúdo
    });
    closeModalBtn.addEventListener('click', closeEditModal);
    cancelBtn.addEventListener('click', closeEditModal);
    
    // Evento para submeter o formulário de edição
    editForm.addEventListener('submit', (e) => handleEditFormSubmit(e, deckId));
}

function openEditModal(cardId) {
    const card = currentFlashcards.find(c => c.id === cardId);
    if (!card) return;

    document.getElementById('edit-card-id').value = card.id;
    document.getElementById('edit-question').value = card.question;
    document.getElementById('edit-answer').value = card.answer;

    document.getElementById('edit-flashcard-modal').classList.add('visible');
}

function closeEditModal() {
    document.getElementById('edit-flashcard-modal').classList.remove('visible');
    document.getElementById('edit-flashcard-form').reset();
}

async function handleDeleteFlashcard(cardId, deckId) {
    if (confirm('Tem a certeza de que deseja excluir este flashcard? Esta ação não pode ser desfeita.')) {
        const result = await deleteFlashcard(cardId);
        if (result) {
            await loadAndRenderFlashcards(deckId); // Recarrega a lista
        }
    }
}

async function handleEditFormSubmit(event, deckId) {
    event.preventDefault();
    const form = event.target;
    const cardId = form.querySelector('#edit-card-id').value;
    const question = form.querySelector('#edit-question').value.trim();
    const answer = form.querySelector('#edit-answer').value.trim();
    const submitButton = form.querySelector('button[type="submit"]');

    if (!question || !answer) {
        alert('A pergunta e a resposta não podem estar vazias.');
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'A Salvar...';

    try {
        const result = await updateFlashcard(cardId, { question, answer });
        if (result) {
            closeEditModal();
            await loadAndRenderFlashcards(deckId);
        }
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Salvar Alterações';
    }
}