const supabase = require('../config/supabaseClient');
const logger = require('../config/logger');

// Obtém um baralho compartilhado e os seus flashcards
const getSharedDeck = async (req, res) => {
    const { shareableId } = req.params;

    try {
        // Passo 1: Encontra o baralho e obtém o seu ID, título e descrição numa só chamada
        const { data: deck, error: deckError } = await supabase
            .from('decks')
            .select('id, title, description') // Pede logo o ID aqui
            .eq('shareable_id', shareableId)
            .eq('is_shared', true)
            .single();

        if (deckError || !deck) {
            return res.status(404).json({ message: 'Baralho compartilhado não encontrado ou o acesso foi revogado.', code: 'NOT_FOUND' });
        }

        // Passo 2: Usa o ID do baralho para buscar os seus flashcards
        const { data: flashcards, error: flashcardsError } = await supabase
            .from('flashcards')
            .select('question, answer')
            .eq('deck_id', deck.id) // Usa o ID obtido na primeira chamada
            .order('created_at', { ascending: true });

        if (flashcardsError) throw flashcardsError;

        const responsePayload = {
            title: deck.title,
            description: deck.description,
            flashcards: flashcards
        };

        res.status(200).json(responsePayload);

    } catch (error) {
        logger.error(`Erro ao obter baralho compartilhado ${shareableId}: ${error.message}`);
        res.status(500).json({ message: 'Erro interno ao obter o baralho.', code: 'INTERNAL_SERVER_ERROR' });
    }
};

module.exports = { getSharedDeck };