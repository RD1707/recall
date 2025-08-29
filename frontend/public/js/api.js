// frontend/public/js/api.js

// --- CONFIGURAÇÃO INICIAL DO SUPABASE ---
const SUPABASE_URL = 'https://khofqsjwyunicxdxapih.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtob2Zxc2p3eXVuaWN4ZHhhcGloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMjM2NDksImV4cCI6MjA3MTY5OTY0OX0.3Fr8b6u3b6dqoh84qx0ulcddb-vj4gGqlOQvAI2weGE';

const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// --- FUNÇÃO CENTRAL DE CHAMADA À API ---
const API_BASE_URL = '/api';

async function apiCall(endpoint, method = 'GET', body = null) {
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) {
        // Se não houver sessão, redireciona para a página de login, exceto se já estiver nela.
        if (!window.location.pathname.endsWith('login.html') && !window.location.pathname.endsWith('index.html')) {
            window.location.href = 'login.html';
        }
        return null;
    }

    const headers = {
        'Authorization': `Bearer ${session.access_token}`,
    };
    
    const config = { method, headers };

    // Para FormData, o browser define o 'Content-Type' automaticamente.
    if (body instanceof FormData) {
        config.body = body;
    } else if (body) {
        headers['Content-Type'] = 'application/json';
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
        // Retorna um objeto de sucesso para respostas sem conteúdo (ex: DELETE)
        return response.status !== 204 ? await response.json() : { success: true };
    } catch (error) {
        console.error(`Erro na chamada à API para ${endpoint}:`, error.message);
        showToast(error.message || 'Ocorreu um erro desconhecido. Por favor, tente novamente.', 'error');
        return null;
    }
}

// --- FUNÇÕES EXPORTADAS POR CATEGORIA ---

// Baralhos (Decks)
const fetchDecks = () => apiCall('/decks');
const createDeck = (title, description, color) => apiCall('/decks', 'POST', { title, description, color });
const updateDeck = (deckId, title, description, color) => apiCall(`/decks/${deckId}`, 'PUT', { title, description, color });
const deleteDeck = (deckId) => apiCall(`/decks/${deckId}`, 'DELETE');
const shareDeck = (deckId) => apiCall(`/decks/${deckId}/share`, 'POST');

// Flashcards
const fetchFlashcards = (deckId) => apiCall(`/decks/${deckId}/flashcards`);
const updateFlashcard = (cardId, data) => apiCall(`/flashcards/${cardId}`, 'PUT', data);
const deleteFlashcard = (cardId) => apiCall(`/flashcards/${cardId}`, 'DELETE');
const fetchReviewCards = (deckId) => apiCall(`/decks/${deckId}/review`);
const submitReview = (cardId, quality) => apiCall(`/flashcards/${cardId}/review`, 'POST', { quality });
// A função getExplanation foi removida pois não é usada no frontend.

// Geração com IA
const generateFlashcards = (deckId, params) => apiCall(`/decks/${deckId}/generate`, 'POST', params);
const generateFlashcardsFromFile = (deckId, formData) => apiCall(`/decks/${deckId}/generate-from-file`, 'POST', formData);
const generateFlashcardsFromYouTube = (deckId, params) => apiCall(`/decks/${deckId}/generate-from-youtube`, 'POST', params);

// Perfil e Análise
const fetchProfile = () => apiCall('/profile');
const updateProfile = (data) => apiCall('/profile', 'PUT', data);
const fetchReviewsOverTime = (range = 7) => apiCall(`/analytics/reviews-over-time?range=${range}`);
const fetchPerformanceInsights = () => apiCall('/analytics/insights');
const fetchAnalyticsSummary = () => apiCall('/analytics/summary');