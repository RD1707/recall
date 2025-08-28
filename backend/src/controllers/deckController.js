const supabase = require('../config/supabaseClient');
const { z } = require('zod');
const logger = require('../config/logger'); 
const pdf = require('pdf-parse');
const { YoutubeTranscript } = require('youtube-transcript');
const { flashcardGenerationQueue, isRedisConnected } = require('../config/queue');
const { processGenerationAndSave } = require('../services/generationService');

// Schema para validação, agora incluindo o campo 'color'
const deckSchema = z.object({
  title: z.string({ required_error: 'O título é obrigatório.' }).min(1, 'O título não pode estar vazio.'),
  description: z.string().optional(),
  color: z.string().optional(),
});

const generateSchema = z.object({
    textContent: z.string().min(1, 'O conteúdo de texto é obrigatório.'),
    count: z.number().int().min(1).max(15),
    type: z.enum(['Pergunta e Resposta', 'Múltipla Escolha'])
});

const getDecks = async (req, res) => {
  const userId = req.user.id;
  try {
    // A query agora busca a contagem de flashcards associados
    const { data, error } = await supabase
      .from('decks')
      .select('*, flashcards(count)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Simplifica a contagem de cards para o frontend
    const decksWithCount = data.map(deck => {
        const { flashcards, ...deckData } = deck;
        return {
            ...deckData,
            card_count: flashcards[0]?.count || 0
        };
    });

    res.status(200).json(decksWithCount);
  } catch (error) {
    logger.error(`Error fetching decks for user ${userId}: ${error.message}`);
    res.status(500).json({ message: 'Erro ao buscar os baralhos.', code: 'INTERNAL_SERVER_ERROR' });
  }
};

const createDeck = async (req, res) => {
  const userId = req.user.id;
  try {
    const { title, description, color } = deckSchema.parse(req.body);

    const { data, error } = await supabase
      .from('decks')
      .insert([{ title, description, user_id: userId, color }])
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
        const { title, description, color } = deckSchema.parse(req.body);

        const { data, error } = await supabase
            .from('decks')
            .update({ title, description, color })
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

        const { data: deck, error: deckError } = await supabase
            .from('decks').select('id').eq('id', deckId).eq('user_id', userId).single();

        if (deckError || !deck) {
            return res.status(404).json({ message: 'Baralho não encontrado ou acesso negado.', code: 'NOT_FOUND' });
        }

        const jobData = { deckId, textContent, count, type };

        if (isRedisConnected) {
            await flashcardGenerationQueue.add('generate-text', jobData);
            res.status(202).json({ processing: true, message: 'Pedido de geração recebido! Os flashcards estão a ser criados em segundo plano.' });
        } else {
            logger.info(`Modo síncrono: Gerando flashcards para o baralho ${deckId}`);
            const savedFlashcards = await processGenerationAndSave(jobData);
            res.status(201).json({ processing: false, message: 'Flashcards gerados com sucesso!', flashcards: savedFlashcards });
        }

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: error.errors[0].message, code: 'VALIDATION_ERROR' });
        }
        logger.error(`Erro na rota de geração para o baralho ${deckId}: ${error.message}`);
        res.status(500).json({ message: error.message || 'Erro ao iniciar a geração dos flashcards.', code: 'GENERATION_ERROR' });
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

const generateCardsFromFile = async (req, res) => {
    const { id: deckId } = req.params;
    const userId = req.user.id;

    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Nenhum ficheiro foi enviado.', code: 'VALIDATION_ERROR' });
        }

        let textContent;
        if (req.file.mimetype === 'application/pdf') {
            const data = await pdf(req.file.buffer);
            textContent = data.text;
        } else {
            textContent = req.file.buffer.toString('utf-8');
        }

        if (!textContent) {
             return res.status(400).json({ message: 'Não foi possível extrair texto do ficheiro.', code: 'TEXT_EXTRACTION_FAILED' });
        }

        const { count, type } = generateSchema.partial().parse(req.body);
        const jobData = {
            deckId,
            textContent,
            count: parseInt(count, 10) || 5,
            type: type || 'Pergunta e Resposta',
        };

        const { data: deck, error: deckError } = await supabase
            .from('decks').select('id').eq('id', deckId).eq('user_id', userId).single();

        if (deckError || !deck) {
            return res.status(404).json({ message: 'Baralho não encontrado ou acesso negado.', code: 'NOT_FOUND' });
        }

        if (isRedisConnected) {
            await flashcardGenerationQueue.add('generate-file', jobData);
            res.status(202).json({ processing: true, message: 'Ficheiro recebido! Os flashcards estão a ser criados em segundo plano.' });
        } else {
            logger.info(`Modo síncrono: Gerando flashcards a partir de ficheiro para o baralho ${deckId}`);
            const savedFlashcards = await processGenerationAndSave(jobData);
            res.status(201).json({ processing: false, message: 'Flashcards gerados com sucesso!', flashcards: savedFlashcards });
        }

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: error.errors[0].message, code: 'VALIDATION_ERROR' });
        }
        logger.error(`Erro ao processar ficheiro para o baralho ${deckId}: ${error.message}`);
        res.status(500).json({ message: 'Erro ao processar o ficheiro.', code: 'FILE_PROCESSING_ERROR' });
    }
};

const shareDeck = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const { data, error } = await supabase
            .from('decks')
            .update({ is_shared: true })
            .eq('id', id)
            .eq('user_id', userId)
            .select('shareable_id')
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ message: 'Baralho não encontrado.', code: 'NOT_FOUND' });

        res.status(200).json({ shareableId: data.shareable_id });

    } catch (error) {
        logger.error(`Erro ao compartilhar o baralho ${id} para o utilizador ${userId}: ${error.message}`);
        res.status(500).json({ message: 'Erro ao compartilhar o baralho.', code: 'INTERNAL_SERVER_ERROR' });
    }
};

const generateCardsFromYouTube = async (req, res) => {
    const { id: deckId } = req.params;
    const userId = req.user.id;
    const { youtubeUrl, count, type } = req.body;

    try {
        if (!youtubeUrl) {
            return res.status(400).json({ message: 'O URL do YouTube é obrigatório.', code: 'VALIDATION_ERROR' });
        }

        const { data: deck, error: deckError } = await supabase
            .from('decks').select('id').eq('id', deckId).eq('user_id', userId).single();

        if (deckError || !deck) {
            return res.status(404).json({ message: 'Baralho não encontrado ou acesso negado.', code: 'NOT_FOUND' });
        }

        const transcript = await YoutubeTranscript.fetchTranscript(youtubeUrl);
        if (!transcript || transcript.length === 0) {
            return res.status(400).json({ message: 'Não foi possível encontrar uma transcrição para este vídeo. Tente um vídeo com legendas ativadas.', code: 'TRANSCRIPT_NOT_FOUND' });
        }

        const textContent = transcript.map(item => item.text).join(' ');
        const jobData = {
            deckId,
            textContent,
            count: parseInt(count, 10) || 10,
            type: type || 'Pergunta e Resposta',
        };

        if (isRedisConnected) {
            await flashcardGenerationQueue.add('generate-youtube', jobData);
            res.status(202).json({ processing: true, message: 'Vídeo recebido! Os flashcards estão a ser extraídos da transcrição.' });
        } else {
            logger.info(`Modo síncrono: Gerando flashcards a partir do YouTube para o baralho ${deckId}`);
            const savedFlashcards = await processGenerationAndSave(jobData);
            res.status(201).json({ processing: false, message: 'Flashcards gerados com sucesso!', flashcards: savedFlashcards });
        }

    } catch (error) {
        logger.error(`Erro ao processar URL do YouTube para o baralho ${deckId}: ${error.message}`);
        if (error.message.includes('subtitles not available')) {
             return res.status(400).json({ message: 'Não há legendas disponíveis para este vídeo.', code: 'TRANSCRIPT_NOT_FOUND' });
        }
        res.status(500).json({ message: 'Erro ao processar o vídeo do YouTube.', code: 'YOUTUBE_PROCESSING_ERROR' });
    }
};

module.exports = {
  getDecks,
  createDeck,
  updateDeck,
  deleteDeck,
  generateCardsForDeck,
  getReviewCardsForDeck,
  generateCardsFromFile,
  generateCardsFromYouTube,
  shareDeck  
};
