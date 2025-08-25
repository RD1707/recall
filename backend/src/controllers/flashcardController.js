const supabase = require('../config/supabaseClient');
const { calculateSm2 } = require('../services/srsService');
const { z } = require('zod'); // Biblioteca de validação

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
      return res.status(404).json({ error: 'Baralho não encontrado ou acesso negado.' });
    }

    const { data, error } = await supabase
      .from('flashcards')
      .select('*')
      .eq('deck_id', deckId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createFlashcard = async (req, res) => {
  try {
    const { deckId } = req.params;
    const userId = req.user.id;
    const { question, answer, card_type, options } = flashcardSchema.parse(req.body);

    const isOwner = await checkDeckOwnership(deckId, userId);
    if (!isOwner) {
      return res.status(404).json({ error: 'Baralho não encontrado ou acesso negado.' });
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
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: error.message });
  }
};

const updateFlashcard = async (req, res) => {
    try {
        const { cardId } = req.params;
        const userId = req.user.id;
        const { question, answer, options } = flashcardSchema.partial().parse(req.body);

        const { data: cardData, error: cardError } = await supabase
            .from('flashcards').select('*, decks(user_id)').eq('id', cardId).single();

        if (cardError || !cardData) {
            return res.status(404).json({ error: 'Flashcard não encontrado.' });
        }
        if (cardData.decks.user_id !== userId) {
            return res.status(403).json({ error: 'Acesso negado.' });
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
            return res.status(400).json({ error: error.errors[0].message });
        }
        res.status(500).json({ error: error.message });
    }
};

const deleteFlashcard = async (req, res) => {
    const { cardId } = req.params;
    const userId = req.user.id;

    try {
        const { data: cardData, error: cardError } = await supabase
            .from('flashcards').select('*, decks(user_id)').eq('id', cardId).single();

        if (cardError || !cardData) {
            return res.status(404).json({ error: 'Flashcard não encontrado.' });
        }
        if (cardData.decks.user_id !== userId) {
            return res.status(403).json({ error: 'Acesso negado.' });
        }

        const { error } = await supabase.from('flashcards').delete().eq('id', cardId);

        if (error) throw error;
        res.status(200).json({ message: 'Flashcard deletado com sucesso!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const reviewFlashcard = async (req, res) => {
    try {
        const { cardId } = req.params;
        const userId = req.user.id;
        const { quality } = reviewSchema.parse(req.body);

        const { data: currentCard, error: fetchError } = await supabase
            .from('flashcards').select('*, decks(user_id)').eq('id', cardId).single();

        if (fetchError || !currentCard) {
            return res.status(404).json({ error: 'Flashcard não encontrado.' });
        }
        if (currentCard.decks.user_id !== userId) {
            return res.status(403).json({ error: 'Acesso negado.' });
        }

        const newSrsData = calculateSm2(currentCard, quality);

        const { data: updatedCard, error: updateError } = await supabase
            .from('flashcards').update(newSrsData).eq('id', cardId).select().single();

        if (updateError || !updatedCard) {
            return res.status(500).json({ error: updateError?.message || 'Falha ao atualizar o flashcard.' });
        }

        // Lógica de Gamificação Completa
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
                        newStreak += 1; // Continua o streak
                    } else if (diffDays > 1) {
                        newStreak = 1; // Reinicia o streak
                    }
                } else {
                    newStreak = 1; // Primeiro estudo
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
                // Não impede a resposta principal de ser enviada
            }
        }

        res.status(200).json({ message: 'Flashcard revisado com sucesso!', flashcard: updatedCard });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.errors[0].message });
        }
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
  getFlashcardsInDeck,
  createFlashcard,
  updateFlashcard,
  deleteFlashcard,
  reviewFlashcard
};