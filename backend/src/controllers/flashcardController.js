const supabase = require('../config/supabaseClient');
const { calculateSm2 } = require('../services/srsService');
const { z } = require('zod');
const logger = require('../config/logger'); 
const { getExplanationForFlashcard } = require('../services/cohereService');

const flashcardSchema = z.object({
    question: z.string().min(1, 'A pergunta é obrigatória.'),
    answer: z.string().min(1, 'A resposta é obrigatória.'),
    card_type: z.string().optional(),
    options: z.any().optional()
});

const reviewSchema = z.object({
    quality: z.number({ required_error: 'A qualidade da resposta é obrigatória.' }).int().min(0).max(5),
});

const checkDeckOwnership = async (deckId, userId) => {
    const { data, error } = await supabase
        .from('decks')
        .select('id')
        .eq('id', deckId)
        .eq('user_id', userId)
        .single();
    return !error && data;
};

const getFlashcardsInDeck = async (req, res) => {
    const { deckId } = req.params;
    const userId = req.user.id;

    try {
        const isOwner = await checkDeckOwnership(deckId, userId);
        if (!isOwner) {
            return res.status(404).json({ message: 'Baralho não encontrado ou acesso negado.', code: 'NOT_FOUND' });
        }

        const { data, error } = await supabase
            .from('flashcards')
            .select('*')
            .eq('deck_id', deckId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        logger.error(`Error fetching flashcards for deck ${deckId}: ${error.message}`);
        res.status(500).json({ message: 'Erro ao buscar os flashcards.', code: 'INTERNAL_SERVER_ERROR' });
    }
};

const createFlashcard = async (req, res) => {
    const { deckId } = req.params;
    const userId = req.user.id;
    try {
        const { question, answer, card_type, options } = flashcardSchema.parse(req.body);

        const isOwner = await checkDeckOwnership(deckId, userId);
        if (!isOwner) {
            return res.status(404).json({ message: 'Baralho não encontrado ou acesso negado.', code: 'NOT_FOUND' });
        }

        const { data, error } = await supabase
            .from('flashcards')
            .insert([{ deck_id: deckId, question, answer, card_type, options }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json({ message: 'Flashcard criado com sucesso!', flashcard: data });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: error.errors[0].message, code: 'VALIDATION_ERROR' });
        }
        logger.error(`Error creating flashcard in deck ${deckId}: ${error.message}`);
        res.status(500).json({ message: 'Erro interno do servidor ao criar o flashcard.', code: 'INTERNAL_SERVER_ERROR' });
    }
};

const updateFlashcard = async (req, res) => {
    const { cardId } = req.params;
    const userId = req.user.id;
    try {
        const { question, answer, options } = flashcardSchema.partial().parse(req.body);

        const { data: cardData, error: cardError } = await supabase
            .from('flashcards').select('*, decks(user_id)').eq('id', cardId).single();

        if (cardError || !cardData) {
            return res.status(404).json({ message: 'Flashcard não encontrado.', code: 'NOT_FOUND' });
        }
        if (cardData.decks.user_id !== userId) {
            return res.status(403).json({ message: 'Acesso negado.', code: 'FORBIDDEN' });
        }

        const { data, error } = await supabase
            .from('flashcards')
            .update({ question, answer, options })
            .eq('id', cardId)
            .select()
            .single();

        if (error) throw error;
        res.status(200).json({ message: 'Flashcard atualizado com sucesso!', flashcard: data });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: error.errors[0].message, code: 'VALIDATION_ERROR' });
        }
        logger.error(`Error updating flashcard ${cardId}: ${error.message}`);
        res.status(500).json({ message: 'Erro interno do servidor ao atualizar o flashcard.', code: 'INTERNAL_SERVER_ERROR' });
    }
};

const deleteFlashcard = async (req, res) => {
    const { cardId } = req.params;
    const userId = req.user.id;

    try {
        const { data: cardData, error: cardError } = await supabase
            .from('flashcards').select('*, decks(user_id)').eq('id', cardId).single();

        if (cardError || !cardData) {
            return res.status(404).json({ message: 'Flashcard não encontrado.', code: 'NOT_FOUND' });
        }
        if (cardData.decks.user_id !== userId) {
            return res.status(403).json({ message: 'Acesso negado.', code: 'FORBIDDEN' });
        }

        const { error } = await supabase.from('flashcards').delete().eq('id', cardId);

        if (error) throw error;
        res.status(200).json({ message: 'Flashcard deletado com sucesso!' });
    } catch (error) {
        logger.error(`Error deleting flashcard ${cardId}: ${error.message}`);
        res.status(500).json({ message: 'Erro interno do servidor ao deletar o flashcard.', code: 'INTERNAL_SERVER_ERROR' });
    }
};

const reviewFlashcard = async (req, res) => {
    const { cardId } = req.params;
    const userId = req.user.id;
    try {
        const { quality } = reviewSchema.parse(req.body);

        const { data: currentCard, error: fetchError } = await supabase
            .from('flashcards').select('*, decks(id, user_id)').eq('id', cardId).single();

        if (fetchError || !currentCard) {
            return res.status(404).json({ message: 'Flashcard não encontrado.', code: 'NOT_FOUND' });
        }
        if (currentCard.decks.user_id !== userId) {
            return res.status(403).json({ message: 'Acesso negado.', code: 'FORBIDDEN' });
        }

        const newSrsData = calculateSm2(currentCard, quality);

        const { data: updatedCard, error: updateError } = await supabase
            .from('flashcards').update(newSrsData).eq('id', cardId).select().single();

        if (updateError || !updatedCard) {
            throw updateError || new Error('Falha ao atualizar o flashcard.');
        }

        const { error: historyError } = await supabase
            .from('review_history')
            .insert({
                user_id: userId,
                card_id: cardId,
                deck_id: currentCard.deck_id, 
                quality: quality
            });

        if (historyError) {
            logger.error(`Falha ao guardar no histórico de revisões: ${historyError.message}`);
        }


        if (quality >= 3) {
            try {
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('points, current_streak, last_studied_at')
                    .eq('id', userId)
                    .single();

                if (profileError) throw profileError;

                const pointsToAdd = 10;
                const newPoints = profile.points + pointsToAdd;

                let newStreak = profile.current_streak;
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                if (profile.last_studied_at) {
                    const lastStudied = new Date(profile.last_studied_at);
                    lastStudied.setHours(0, 0, 0, 0);

                    const diffTime = today - lastStudied;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays === 1) {
                        newStreak += 1; 
                    } else if (diffDays > 1) {
                        newStreak = 1; 
                    }
                } else {
                    newStreak = 1;
                }

                await supabase
                    .from('profiles')
                    .update({
                        points: newPoints,
                        current_streak: newStreak,
                        last_studied_at: new Date().toISOString()
                    })
                    .eq('id', userId);

            } catch (gamificationError) {
                console.error('Erro na lógica de gamificação:', gamificationError);
                logger.error(`Gamification error for user ${userId} on card ${cardId}: ${gamificationError.message}`);
            }
        }

        res.status(200).json({ message: 'Flashcard revisado com sucesso!', flashcard: updatedCard });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: error.errors[0].message, code: 'VALIDATION_ERROR' });
        }
        logger.error(`Error reviewing flashcard ${cardId} for user ${userId}: ${error.message}`);
        res.status(500).json({ message: 'Erro interno do servidor ao revisar o flashcard.', code: 'INTERNAL_SERVER_ERROR' });
    }
};

const getExplanation = async (req, res) => {
    const { cardId } = req.params;
    const userId = req.user.id;
    try {
        const { data: card, error: fetchError } = await supabase
            .from('flashcards').select('question, answer, decks(user_id)').eq('id', cardId).single();

        if (fetchError || !card) {
            return res.status(404).json({ message: 'Flashcard não encontrado.', code: 'NOT_FOUND' });
        }
        if (card.decks.user_id !== userId) {
            return res.status(403).json({ message: 'Acesso negado.', code: 'FORBIDDEN' });
        }

        const explanation = await getExplanationForFlashcard(card.question, card.answer);

        if (!explanation) {
            return res.status(500).json({ message: 'Não foi possível gerar a explicação no momento.', code: 'IA_SERVICE_ERROR' });
        }

        res.status(200).json({ explanation });

    } catch (error) {
        logger.error(`Erro ao obter explicação para o card ${cardId}: ${error.message}`);
        res.status(500).json({ message: 'Erro interno do servidor.', code: 'INTERNAL_SERVER_ERROR' });
    }
};

module.exports = {
    getFlashcardsInDeck,
    createFlashcard,
    updateFlashcard,
    deleteFlashcard,
    reviewFlashcard,
    getExplanation
};