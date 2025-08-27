const API_BASE_URL = '/api';

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
            const errorData = await response.json().catch(() => ({
                message: `O servidor respondeu com um erro (Status: ${response.status})`
            }));
            throw new Error(errorData.message || `Falha na requisição para ${endpoint}`);
        }
        return response.status !== 204 ? await response.json() : { success: true };
    } catch (error) {
        console.error(`Erro na chamada à API para ${endpoint}:`, error.message);
        showToast(error.message || 'Ocorreu um erro desconhecido. Por favor, tente novamente.', 'error');
        return null;
    }
}

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

async function generateFlashcardsFromFile(deckId, formData) {
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) {
        window.location.href = 'index.html';
        return null;
    }

    const headers = {
        'Authorization': `Bearer ${session.access_token}`
    };

    const config = {
        method: 'POST',
        headers,
        body: formData
    };

    try {
        const response = await fetch(`${API_BASE_URL}/decks/${deckId}/generate-from-file`, config);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: `Erro no servidor (Status: ${response.status})` }));
            throw new Error(errorData.message || `Falha ao carregar o ficheiro.`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Erro na chamada à API de upload:`, error.message);
        alert(error.message || 'Ocorreu um erro desconhecido. Por favor, tente novamente.');
        return null;
    }
}

async function fetchLast7DaysReviews() {
    return apiCall('/analytics/reviews-last-7-days');
}

async function shareDeck(deckId) {
    return apiCall(`/decks/${deckId}/share`, 'POST');
}

async function updateDeck(deckId, title, description) {
    return apiCall(`/decks/${deckId}`, 'PUT', { title, description });
}

async function fetchExplanation(cardId) {
    return apiCall(`/flashcards/${cardId}/explain`, 'POST');
}

async function generateFlashcardsFromYouTube(deckId, params) {
    return apiCall(`/decks/${deckId}/generate-from-youtube`, 'POST', params);
}

async function fetchPerformanceInsights() {
    return apiCall('/analytics/insights');
}

async function fetchAnalyticsSummary() {
    return apiCall('/analytics/summary');
}