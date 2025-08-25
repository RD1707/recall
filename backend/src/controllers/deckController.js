const supabase = require('../config/supabaseClient');
const { generateFlashcardsFromText } = require('../services/cohereService');
const { z } = require('zod'); // Biblioteca de validação

// --- Schemas de Validação ---

const deckSchema = z.object({
  title: z.string({ required_error: 'O título é obrigatório.' }).min(1, 'O título não pode estar vazio.'),
  description: z.string().optional(),
});

const generateSchema = z.object({
    textContent: z.string().min(1, 'O conteúdo de texto é obrigatório.'),
    count: z.number().int().min(1).max(15),
    type: z.enum(['Pergunta e Resposta', 'Múltipla Escolha'])
});


// --- Funções do Controller ---

const getDecks = async (req, res) => {
  const userId = req.user.id;
  try {
    const { data, error } = await supabase
      .from('decks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createDeck = async (req, res) => {
  try {
    const { title, description } = deckSchema.parse(req.body);
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('decks')
      .insert([{ title, description, user_id: userId }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ message: 'Baralho criado com sucesso!', deck: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: error.message });
  }
};

const updateDeck = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description } = deckSchema.parse(req.body);
        const userId = req.user.id;

        const { data, error } = await supabase
            .from('decks')
            .update({ title, description })
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Baralho não encontrado ou você não tem permissão para editá-lo.' });

        res.status(200).json({ message: 'Baralho atualizado com sucesso!', deck: data });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.errors[0].message });
        }
        res.status(500).json({ error: error.message });
    }
};

const deleteDeck = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    const { error } = await supabase
      .from('decks')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
    res.status(200).json({ message: 'Baralho deletado com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const generateCardsForDeck = async (req, res) => {
    try {
        const { id: deckId } = req.params;
        const userId = req.user.id;
        const { textContent, count, type } = generateSchema.parse(req.body);

        const { data: deck, error: deckError } = await supabase
            .from('decks').select('id').eq('id', deckId).eq('user_id', userId).single();

        if (deckError || !deck) {
            return res.status(404).json({ error: 'Baralho não encontrado ou acesso negado.' });
        }

        const generatedFlashcards = await generateFlashcardsFromText(textContent, count, type);
        if (!generatedFlashcards) {
            return res.status(500).json({ error: 'Falha ao gerar flashcards com a IA.' });
        }

        const flashcardsToSave = generatedFlashcards.map(card => ({
            deck_id: deckId,
            question: card.question,
            answer: card.answer,
            options: card.options, // Inclui as opções, se existirem
            card_type: type,
        }));

        const { data: savedFlashcards, error: saveError } = await supabase
            .from('flashcards')
            .insert(flashcardsToSave)
            .select();

        if (saveError) throw saveError;

        res.status(201).json({ message: 'Flashcards gerados e salvos com sucesso!', flashcards: savedFlashcards });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.errors[0].message });
        }
        res.status(500).json({ error: error.message });
    }
};

const getReviewCardsForDeck = async (req, res) => {
    const { id: deckId } = req.params;
    const userId = req.user.id;
    const today = new Date().toISOString();
    try {
         const { data: deck, error: deckError } = await supabase
            .from('decks').select('id').eq('id', deckId).eq('user_id', userId).single();

        if (deckError || !deck) {
            return res.status(404).json({ error: 'Baralho não encontrado ou acesso negado.' });
        }

        const { data, error } = await supabase
            .from('flashcards')
            .select('*')
            .eq('deck_id', deckId)
            .lte('due_date', today);

        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
  getDecks,
  createDeck,
  updateDeck,
  deleteDeck,
  generateCardsForDeck,
  getReviewCardsForDeck
};