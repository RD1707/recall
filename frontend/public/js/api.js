const API_BASE_URL = '/api';

/**
 * Função "Wrapper" Central para todas as chamadas à API.
 * Lida com a obtenção de tokens, configuração de cabeçalhos e tratamento de erros aprimorado.
 * @param {string} endpoint - O endpoint da API a ser chamado (ex: '/decks').
 * @param {string} [method='GET'] - O método HTTP a ser usado (GET, POST, PUT, DELETE).
 * @param {object|null} [body=null] - O corpo da requisição para métodos como POST ou PUT.
 * @returns {Promise<object|null>} - Os dados da resposta em JSON ou nulo em caso de erro.
 */
async function apiCall(endpoint, method = 'GET', body = null) {
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) {
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
            // Tenta extrair a mensagem de erro padronizada do corpo da resposta
            const errorData = await response.json().catch(() => ({ 
                message: `O servidor respondeu com um erro (Status: ${response.status})` 
            }));
            // Lança um erro com a mensagem específica da API
            throw new Error(errorData.message || `Falha na requisição para ${endpoint}`);
        }
        // Retorna a resposta JSON se houver corpo, senão retorna um objeto de sucesso.
        return response.status !== 204 ? await response.json() : { success: true };
    } catch (error) {
        console.error(`Erro na chamada à API para ${endpoint}:`, error.message);
        // Exibe um alerta mais específico para o utilizador.
        alert(error.message || 'Ocorreu um erro desconhecido. Por favor, tente novamente.');
        return null;
    }
}

// --- Funções da API Simplificadas ---

async function fetchDecks() {
    return apiCall('/decks');
}

async function createDeck(title, description) {
    return apiCall('/decks', 'POST', { title, description });
}

async function fetchFlashcards(deckId) {
    return apiCall(`/decks/${deckId}/flashcards`);
}

async function generateFlashcards(deckId, params) {
    return apiCall(`/decks/${deckId}/generate`, 'POST', params);
}

async function fetchReviewCards(deckId) {
    return apiCall(`/decks/${deckId}/review`);
}

async function submitReview(cardId, quality) {
    return apiCall(`/flashcards/${cardId}/review`, 'POST', { quality });
}

async function fetchProfile() {
    const profile = await apiCall('/profile');
    return profile || { points: 0, current_streak: 0 };
}

async function deleteFlashcard(cardId) {
    return apiCall(`/flashcards/${cardId}`, 'DELETE');
}