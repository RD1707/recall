// --- CONFIGURAÇÃO INICIAL DO SUPABASE (MOVIMOS PARA CÁ) ---
const SUPABASE_URL = 'https://khofqsjwyunicxdxapih.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtob2Zxc2p3eXVuaWN4ZHhhcGloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMjM2NDksImV4cCI6MjA3MTY5OTY0OX0.3Fr8b6u3b6dqoh84qx0ulcddb-vj4gGqlOQvAI2weGE';

const { createClient } = supabase;
// A variável _supabase agora é definida aqui e estará disponível para todos os scripts carregados depois deste.
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// --- FUNÇÕES DE API ---
const API_BASE_URL = '/api';

async function apiCall(endpoint, method = 'GET', body = null) {
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) {
        window.location.href = 'index.html';
        return null;
    }

    const headers = {
        'Authorization': `Bearer ${session.access_token}`,
    };
    
    const config = { method, headers };

    // Para FormData, não definimos 'Content-Type', o browser faz isso.
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
        return response.status !== 204 ? await response.json() : { success: true };
    } catch (error) {
        console.error(`Erro na chamada à API para ${endpoint}:`, error.message);
        showToast(error.message || 'Ocorreu um erro desconhecido. Por favor, tente novamente.', 'error');
        return null;
    }
}

// Funções de Baralhos (Decks)
function fetchDecks() { return apiCall('/decks'); }
function createDeck(title, description, color) { return apiCall('/decks', 'POST', { title, description, color }); }
function updateDeck(deckId, title, description, color) { return apiCall(`/decks/${deckId}`, 'PUT', { title, description, color }); }
function deleteDeck(deckId) { return apiCall(`/decks/${deckId}`, 'DELETE'); }
function shareDeck(deckId) { return apiCall(`/decks/${deckId}/share`, 'POST'); }

// Funções de Flashcards
function fetchFlashcards(deckId) { return apiCall(`/decks/${deckId}/flashcards`); }
function updateFlashcard(cardId, data) { return apiCall(`/flashcards/${cardId}`, 'PUT', data); }
function deleteFlashcard(cardId) { return apiCall(`/flashcards/${cardId}`, 'DELETE'); }
function fetchReviewCards(deckId) { return apiCall(`/decks/${deckId}/review`); }
function submitReview(cardId, quality) { return apiCall(`/flashcards/${cardId}/review`, 'POST', { quality }); }
function fetchExplanation(cardId) { return apiCall(`/flashcards/${cardId}/explain`, 'POST'); }

// Funções de Geração com IA
function generateFlashcards(deckId, params) { return apiCall(`/decks/${deckId}/generate`, 'POST', params); }
function generateFlashcardsFromFile(deckId, formData) { return apiCall(`/decks/${deckId}/generate-from-file`, 'POST', formData); }
function generateFlashcardsFromYouTube(deckId, params) { return apiCall(`/decks/${deckId}/generate-from-youtube`, 'POST', params); }

// Funções de Perfil e Análise
function fetchProfile() { return apiCall('/profile'); }
function fetchLast7DaysReviews() { return apiCall('/analytics/reviews-over-time'); }
function fetchPerformanceInsights() { return apiCall('/analytics/insights'); }
function fetchAnalyticsSummary() { return apiCall('/analytics/summary'); }