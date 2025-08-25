const API_BASE_URL = '/api';

/**
 * Função "Wrapper" Central para todas as chamadas à API.
 * Lida com a obtenção de tokens, configuração de cabeçalhos e tratamento básico de erros.
 * @param {string} endpoint - O endpoint da API a ser chamado (ex: '/decks').
 * @param {string} [method='GET'] - O método HTTP a ser usado (GET, POST, PUT, DELETE).
 * @param {object|null} [body=null] - O corpo da requisição para métodos como POST ou PUT.
 * @returns {Promise<object|null>} - Os dados da resposta em JSON ou nulo em caso de erro.
 */
async function apiCall(endpoint, method = 'GET', body = null) {
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) {
        // Redireciona para a página de login se não houver sessão ativa.
        window.location.href = 'index.html';
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

    if (body) {
        config.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Falha na requisição para ${endpoint}`);
        }
        // Retorna a resposta JSON se houver corpo, senão retorna um objeto de sucesso.
        return response.status !== 204 ? await response.json() : { success: true };
    } catch (error) {
        console.error(`Erro na chamada à API para ${endpoint}:`, error);
        // Exibe um alerta para o utilizador em caso de erro.
        alert('Ocorreu um erro. Por favor, tente novamente.');
        return null;
    }
}

// --- Funções da API Simplificadas ---
// Cada função agora simplesmente chama o wrapper central com os parâmetros corretos.

/**
 * Busca todos os baralhos do utilizador.
 * @returns {Promise<Array|null>}
 */
async function fetchDecks() {
    return apiCall('/decks');
}

/**
 * Cria um novo baralho.
 * @param {string} title - O título do baralho.
 * @param {string} description - A descrição do baralho.
 * @returns {Promise<object|null>}
 */
async function createDeck(title, description) {
    return apiCall('/decks', 'POST', { title, description });
}

/**
 * Busca todos os flashcards de um baralho específico.
 * @param {string} deckId - O ID do baralho.
 * @returns {Promise<Array|null>}
 */
async function fetchFlashcards(deckId) {
    return apiCall(`/decks/${deckId}/flashcards`);
}

/**
 * Gera novos flashcards usando IA.
 * @param {string} deckId - O ID do baralho.
 * @param {object} params - Parâmetros para a geração (textContent, count, type).
 * @returns {Promise<object|null>}
 */
async function generateFlashcards(deckId, params) {
    return apiCall(`/decks/${deckId}/generate`, 'POST', params);
}

/**
 * Busca os flashcards agendados para revisão.
 * @param {string} deckId - O ID do baralho.
 * @returns {Promise<Array|null>}
 */
async function fetchReviewCards(deckId) {
    return apiCall(`/decks/${deckId}/review`);
}

/**
 * Submete o resultado da revisão de um flashcard.
 * @param {string} cardId - O ID do flashcard.
 * @param {number} quality - A qualidade da resposta (0-5).
 * @returns {Promise<object|null>}
 */
async function submitReview(cardId, quality) {
    return apiCall(`/flashcards/${cardId}/review`, 'POST', { quality });
}

/**
 * Busca o perfil do utilizador (pontos e streak).
 * @returns {Promise<object|null>}
 */
async function fetchProfile() {
    const profile = await apiCall('/profile');
    // Retorna um perfil padrão se a chamada falhar, para evitar erros na interface.
    return profile || { points: 0, current_streak: 0 };
}