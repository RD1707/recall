const supabase = require('../config/supabaseClient');
const logger = require('../config/logger');

// Obtém um baralho compartilhado e os seus flashcards
const getSharedDeck = async (req, res) => {
    const { shareableId } = req.params;

    try {
        // Primeiro, encontra o baralho que está compartilhado e tem o ID correspondente
        const { data: deck, error: deckError } = await supabase
            .from('decks')
            .select('title, description')
            .eq('shareable_id', shareableId)
            .eq('is_shared', true)
            .single();

        if (deckError || !deck) {
            return res.status(404).json({ message: 'Baralho compartilhado não encontrado ou o acesso foi revogado.', code: 'NOT_FOUND' });
        }

        // Se o baralho for encontrado, busca os seus flashcards
        const { data: flashcards, error: flashcardsError } = await supabase
            .from('flashcards')
            .select('question, answer')
            .eq('deck_id', deck.id) // O Supabase não nos dá o ID do deck, então precisamos de fazer isto noutro passo. Corrigindo...
            .order('created_at', { ascending: true });

        // Correção da lógica: precisamos do ID do baralho.
        const { data: deckWithId, error: deckIdError } = await supabase
            .from('decks')
            .select('id, title, description')
            .eq('shareable_id', shareableId)
            .eq('is_shared', true)
            .single();

        if (deckIdError || !deckWithId) {
             return res.status(404).json({ message: 'Baralho compartilhado não encontrado ou o acesso foi revogado.', code: 'NOT_FOUND' });
        }

        const { data: finalFlashcards, error: finalFlashcardsError } = await supabase
            .from('flashcards')
            .select('question, answer')
            .eq('deck_id', deckWithId.id)
            .order('created_at', { ascending: true });


        if (finalFlashcardsError) throw finalFlashcardsError;

        const responsePayload = {
            title: deckWithId.title,
            description: deckWithId.description,
            flashcards: finalFlashcards
        };

        res.status(200).json(responsePayload);

    } catch (error) {
        logger.error(`Erro ao obter baralho compartilhado ${shareableId}: ${error.message}`);
        res.status(500).json({ message: 'Erro interno ao obter o baralho.', code: 'INTERNAL_SERVER_ERROR' });
    }
};

module.exports = { getSharedDeck };