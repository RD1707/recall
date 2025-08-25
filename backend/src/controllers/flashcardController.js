const supabase = require('../config/supabaseClient');
const { calculateSm2 } = require('../services/srsService');
const { z } = require('zod');
const logger = require('../config/logger'); // Importe o logger

// --- Schemas de Validação ---

const flashcardSchema = z.object({
    question: z.string().min(1, 'A pergunta é obrigatória.'),
    answer: z.string().min(1, 'A resposta é obrigatória.'),
    card_type: z.string().optional(),
    options: z.any().optional()
});

const reviewSchema = z.object({
    quality: z.number({ required_error: 'A qualidade da resposta é obrigatória.' }).int().min(0).max(5),
});

// --- Funções Auxiliares ---

const checkDeckOwnership = async (deckId, userId) => {
  const { data, error } = await supabase
    .from('decks')
    .select('id')
    .eq('id', deckId)
    .eq('user_id', userId)
    .single();
  return !error && data;
};

// --- Funções do Controller ---

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

        // 1. Obter os dados atuais do cartão e do baralho a que pertence
        const { data: currentCard, error: fetchError } = await supabase
            .from('flashcards').select('*, decks(id, user_id)').eq('id', cardId).single();

        if (fetchError || !currentCard) {
            return res.status(404).json({ message: 'Flashcard não encontrado.', code: 'NOT_FOUND' });
        }
        if (currentCard.decks.user_id !== userId) {
            return res.status(403).json({ message: 'Acesso negado.', code: 'FORBIDDEN' });
        }

        // 2. Calcular os novos dados do SRS
        const newSrsData = calculateSm2(currentCard, quality);

        // 3. Atualizar o flashcard
        const { data: updatedCard, error: updateError } = await supabase
            .from('flashcards').update(newSrsData).eq('id', cardId).select().single();

        if (updateError || !updatedCard) {
            throw updateError || new Error('Falha ao atualizar o flashcard.');
        }

        // --- NOVA LÓGICA DE HISTÓRICO ---
        // 4. Inserir um registo na tabela de histórico
        const { error: historyError } = await supabase
            .from('review_history')
            .insert({
                user_id: userId,
                card_id: cardId,
                deck_id: currentCard.deck_id, // Usamos o ID do baralho que já obtivemos
                quality: quality
            });

        if (historyError) {
            // Se isto falhar, não paramos a operação, mas registamos o erro
            logger.error(`Falha ao guardar no histórico de revisões: ${historyError.message}`);
        }
        // --- FIM DA NOVA LÓGICA ---


        // Lógica de Gamificação (inalterada)
        if (quality >= 3) {
            // ... (o seu código de gamificação existente fica aqui) ...
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

module.exports = {
  getFlashcardsInDeck,
  createFlashcard,
  updateFlashcard,
  deleteFlashcard,
  reviewFlashcard
};