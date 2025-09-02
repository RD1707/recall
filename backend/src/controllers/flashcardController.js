// backend/src/controllers/flashcardController.js

const supabase = require('../config/supabaseClient');
const logger = require('../config/logger');

/**
 * Busca todos os flashcards de um baralho específico.
 */
const getFlashcardsByDeck = async (req, res) => {
    const { deckId } = req.params;
    const userId = req.user.id;

    try {
        // Primeiro, verifica se o baralho pertence ao usuário
        const { data: deck, error: deckError } = await supabase
            .from('decks')
            .select('id')
            .eq('id', deckId)
            .eq('user_id', userId)
            .single();

        if (deckError || !deck) {
            logger.warn(`User ${userId} failed to access deck ${deckId}.`);
            return res.status(404).json({ message: 'Baralho não encontrado ou não pertence ao usuário.' });
        }

        // Se o baralho for do usuário, busca os flashcards
        const { data, error } = await supabase
            .from('flashcards')
            .select('*')
            .eq('deck_id', deckId)
            .order('created_at', { ascending: true });

        if (error) {
            throw error;
        }

        res.status(200).json(data);
    } catch (error) {
        logger.error(`Error fetching flashcards for deck ${deckId}: ${error.message}`);
        res.status(500).json({ message: 'Erro interno do servidor ao buscar os flashcards.' });
    }
};

/**
 * Cria um novo flashcard em um baralho.
 */
const createFlashcard = async (req, res) => {
    const { deckId } = req.params;
    const { question, answer } = req.body;
    const userId = req.user.id;

    if (!question || !answer) {
        return res.status(400).json({ message: 'Pergunta e resposta são obrigatórias.' });
    }

    try {
        // Verifica se o baralho pertence ao usuário antes de adicionar o card
        const { data: deck, error: deckError } = await supabase
            .from('decks')
            .select('id')
            .eq('id', deckId)
            .eq('user_id', userId)
            .single();

        if (deckError || !deck) {
            return res.status(404).json({ message: 'Não é possível adicionar card a um baralho que não é seu.' });
        }

        const { data, error } = await supabase
            .from('flashcards')
            .insert([{
                deck_id: deckId,
                question,
                answer,
                card_type: 'Pergunta e Resposta', // <-- CORREÇÃO APLICADA AQUI
            }])
            .select()
            .single();

        if (error) {
            logger.error(`Error creating flashcard in deck ${deckId}: ${error.message}`);
            throw error;
        }

        res.status(201).json(data);
    } catch (error) {
        // O log de erro já ocorre na cláusula if(error) acima
        res.status(500).json({ message: 'Erro interno do servidor ao criar o flashcard.' });
    }
};

/**
 * Atualiza um flashcard existente.
 */
const updateFlashcard = async (req, res) => {
    const { cardId } = req.params;
    const { question, answer } = req.body;
    const userId = req.user.id;

    if (!question || !answer) {
        return res.status(400).json({ message: 'Pergunta e resposta não podem ser vazias.' });
    }

    try {
        // Verifica se o flashcard pertence a um baralho do usuário
        const { data: ownerCheck, error: ownerError } = await supabase
            .from('flashcards')
            .select('decks(user_id)')
            .eq('id', cardId)
            .single();

        if (ownerError || !ownerCheck || ownerCheck.decks.user_id !== userId) {
            return res.status(404).json({ message: 'Flashcard não encontrado ou não pertence ao usuário.' });
        }

        const { data, error } = await supabase
            .from('flashcards')
            .update({ question, answer })
            .eq('id', cardId)
            .select()
            .single();

        if (error) {
            throw error;
        }

        res.status(200).json(data);
    } catch (error) {
        logger.error(`Error updating flashcard ${cardId}: ${error.message}`);
        res.status(500).json({ message: 'Erro interno do servidor ao atualizar o flashcard.' });
    }
};

/**
 * Exclui um flashcard.
 */
const deleteFlashcard = async (req, res) => {
    const { cardId } = req.params;
    const userId = req.user.id;

    try {
        // Verifica se o flashcard pertence a um baralho do usuário
        const { data: ownerCheck, error: ownerError } = await supabase
            .from('flashcards')
            .select('id, decks(user_id)')
            .eq('id', cardId)
            .single();

        if (ownerError || !ownerCheck || ownerCheck.decks.user_id !== userId) {
            return res.status(404).json({ message: 'Flashcard não encontrado ou não pertence ao usuário.' });
        }

        const { error } = await supabase
            .from('flashcards')
            .delete()
            .eq('id', cardId);

        if (error) {
            throw error;
        }

        res.status(204).send(); // 204 No Content para sucesso na exclusão
    } catch (error) {
        logger.error(`Error deleting flashcard ${cardId}: ${error.message}`);
        res.status(500).json({ message: 'Erro interno do servidor ao excluir o flashcard.' });
    }
};

/**
 * Processa a revisão de um flashcard.
 */
const reviewFlashcard = async (req, res) => {
    const { cardId } = req.params;
    const { quality } = req.body;
    const userId = req.user.id;
  
    if (quality === undefined || quality < 0 || quality > 5) {
      return res.status(400).json({ message: 'Qualidade da revisão inválida. Deve ser um número entre 0 e 5.' });
    }
  
    try {
        // Validação se o card pertence ao usuário pode ser adicionada aqui
        const { data: card, error: cardError } = await supabase
            .from('flashcards')
            .select('*')
            .eq('id', cardId)
            .single();

        if (cardError || !card) {
            return res.status(404).json({ message: 'Flashcard não encontrado.' });
        }

        // Lógica de SRS (Spaced Repetition System)
        // Esta é uma implementação SM-2 simplificada
        let { repetitions, ease_factor, interval } = card;

        if (quality >= 3) {
            if (repetitions === 0) {
                interval = 1;
            } else if (repetitions === 1) {
                interval = 6;
            } else {
                interval = Math.round(interval * ease_factor);
            }
            repetitions += 1;
        } else {
            repetitions = 0;
            interval = 1;
        }

        ease_factor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
        if (ease_factor < 1.3) {
            ease_factor = 1.3;
        }

        const next_review_date = new Date();
        next_review_date.setDate(next_review_date.getDate() + interval);

        const { data: updatedCard, error: updateError } = await supabase
            .from('flashcards')
            .update({
                repetitions,
                ease_factor,
                interval,
                next_review_date: next_review_date.toISOString(),
                last_reviewed_at: new Date().toISOString()
            })
            .eq('id', cardId)
            .select()
            .single();

        if (updateError) {
            throw updateError;
        }

        res.status(200).json(updatedCard);

    } catch (error) {
      logger.error(`Error processing review for card ${cardId}: ${error.message}`);
      res.status(500).json({ message: 'Erro ao processar a revisão do flashcard.' });
    }
};


module.exports = {
    getFlashcardsByDeck,
    createFlashcard,
    updateFlashcard,
    deleteFlashcard,
    reviewFlashcard
};