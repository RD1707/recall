const supabase = require('../config/supabaseClient');
const { generateFlashcardsFromText } = require('../services/cohereService');
const { z } = require('zod');
const logger = require('../config/logger'); // Importe o logger
const { flashcardGenerationQueue } = require('../config/queue');

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
    logger.error(`Error fetching decks for user ${userId}: ${error.message}`);
    res.status(500).json({ message: 'Erro ao buscar os baralhos.', code: 'INTERNAL_SERVER_ERROR' });
  }
};

const createDeck = async (req, res) => {
  const userId = req.user.id;
  try {
    const { title, description } = deckSchema.parse(req.body);

    const { data, error } = await supabase
      .from('decks')
      .insert([{ title, description, user_id: userId }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ message: 'Baralho criado com sucesso!', deck: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message, code: 'VALIDATION_ERROR' });
    }
    logger.error(`Error creating deck for user ${userId}: ${error.message}`);
    res.status(500).json({ message: 'Erro interno do servidor ao criar o baralho.', code: 'INTERNAL_SERVER_ERROR' });
  }
};

const updateDeck = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    try {
        const { title, description } = deckSchema.parse(req.body);

        const { data, error } = await supabase
            .from('decks')
            .update({ title, description })
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ message: 'Baralho não encontrado ou você não tem permissão para editá-lo.', code: 'NOT_FOUND' });

        res.status(200).json({ message: 'Baralho atualizado com sucesso!', deck: data });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: error.errors[0].message, code: 'VALIDATION_ERROR' });
        }
        logger.error(`Error updating deck ${id} for user ${userId}: ${error.message}`);
        res.status(500).json({ message: 'Erro interno do servidor ao atualizar o baralho.', code: 'INTERNAL_SERVER_ERROR' });
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
    logger.error(`Error deleting deck ${id} for user ${userId}: ${error.message}`);
    res.status(500).json({ message: 'Erro interno do servidor ao deletar o baralho.', code: 'INTERNAL_SERVER_ERROR' });
  }
};

const generateCardsForDeck = async (req, res) => {
    const { id: deckId } = req.params;
    const userId = req.user.id;
    try {
        const { textContent, count, type } = generateSchema.parse(req.body);

        // Verifica se o baralho pertence ao utilizador
        const { data: deck, error: deckError } = await supabase
            .from('decks').select('id').eq('id', deckId).eq('user_id', userId).single();

        if (deckError || !deck) {
            return res.status(404).json({ message: 'Baralho não encontrado ou acesso negado.', code: 'NOT_FOUND' });
        }

        // Adiciona a tarefa à fila
        await flashcardGenerationQueue.add('generate', {
            deckId,
            userId,
            textContent,
            count,
            type
        });

        // Responde imediatamente ao utilizador
        res.status(202).json({ message: 'Pedido de geração recebido! Os flashcards estão a ser criados em segundo plano.' });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: error.errors[0].message, code: 'VALIDATION_ERROR' });
        }
        // Substitua console.error por logger.error se tiver implementado a Fase 1
        console.error(`Erro ao adicionar tarefa à fila para o baralho ${deckId}: ${error.message}`);
        res.status(500).json({ message: 'Erro ao iniciar a geração dos flashcards.', code: 'QUEUE_ERROR' });
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
            return res.status(404).json({ message: 'Baralho não encontrado ou acesso negado.', code: 'NOT_FOUND' });
        }

        const { data, error } = await supabase
            .from('flashcards')
            .select('*')
            .eq('deck_id', deckId)
            .lte('due_date', today);

        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        logger.error(`Error fetching review cards for deck ${deckId}: ${error.message}`);
        res.status(500).json({ message: 'Erro ao buscar os flashcards para revisão.', code: 'INTERNAL_SERVER_ERROR' });
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