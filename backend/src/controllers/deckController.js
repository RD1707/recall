const supabase = require('../config/supabaseClient');
const { z } = require('zod');
const logger = require('../config/logger'); 
const pdf = require('pdf-parse');
const { YoutubeTranscript } = require('youtube-transcript');
const { flashcardGenerationQueue, isRedisConnected } = require('../config/queue');
const { processGenerationAndSave } = require('../services/generationService');

// NOVA IMPORTAÇÃO: Serviço de processamento de arquivos
const FileProcessingService = require('../services/fileProcessingService');

// CONSTANTE NECESSÁRIA: Tipos de arquivo suportados
const SUPPORTED_MIME_TYPES = {
    'text/plain': { extension: 'txt', category: 'text' },
    'text/markdown': { extension: 'md', category: 'text' },
    'application/pdf': { extension: 'pdf', category: 'document' },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { 
        extension: 'docx', 
        category: 'document' 
    },
    'image/jpeg': { extension: 'jpg', category: 'image' },
    'image/jpg': { extension: 'jpg', category: 'image' },
    'image/png': { extension: 'png', category: 'image' },
    'image/webp': { extension: 'webp', category: 'image' }
};

const deckSchema = z.object({
  title: z.string({ required_error: 'O título é obrigatório.' }).min(1, 'O título não pode estar vazio.'),
  description: z.string().optional(),
  color: z.string().optional(),
});

const generateSchema = z.object({
    textContent: z.string().min(1, 'O conteúdo de texto é obrigatório.'),
    count: z.coerce.number().int().min(1).max(15),
    type: z.enum(['Pergunta e Resposta', 'Múltipla Escolha'])
});

const getDecks = async (req, res) => {
  const userId = req.user.id;
  try {
    const { data, error } = await supabase
      .from('decks')
      .select('*, flashcards(count)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
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
        res.status(500).json({ message: 'Erro ao atualizar o baralho.', code: 'INTERNAL_SERVER_ERROR' });
    }
};

const deleteDeck = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    
    try {
        const { data: deck, error: deckError } = await supabase
            .from('decks')
            .select('id')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (deckError || !deck) {
            return res.status(404).json({ message: 'Baralho não encontrado.', code: 'NOT_FOUND' });
        }

        const { error } = await supabase
            .from('decks')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

        if (error) throw error;
        res.status(200).json({ message: 'Baralho excluído com sucesso!' });

    } catch (error) {
        logger.error(`Error deleting deck ${id}: ${error.message}`);
        res.status(500).json({ message: 'Erro ao excluir o baralho.', code: 'INTERNAL_SERVER_ERROR' });
    }
};

const generateCardsForDeck = async (req, res) => {
    const { id: deckId } = req.params;
    const userId = req.user.id;

    try {
        const { textContent, count, type } = generateSchema.parse(req.body);
        const jobData = { deckId, textContent, count, type };

        const { data: deck, error: deckError } = await supabase
            .from('decks').select('id').eq('id', deckId).eq('user_id', userId).single();

        if (deckError || !deck) {
            return res.status(404).json({ message: 'Baralho não encontrado.', code: 'NOT_FOUND' });
        }

        if (isRedisConnected) {
            await flashcardGenerationQueue.add('generate-text', jobData);
            res.status(202).json({ processing: true, message: 'Geração iniciada!' });
        } else {
            const savedFlashcards = await processGenerationAndSave(jobData);
            res.status(201).json({ message: 'Flashcards gerados!', flashcards: savedFlashcards });
        }

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: error.errors[0].message, code: 'VALIDATION_ERROR' });
        }
        logger.error(`Erro na geração: ${error.message}`);
        res.status(500).json({ message: 'Erro ao gerar flashcards.', code: 'GENERATION_ERROR' });
    }
};

// FUNÇÃO CORRIGIDA: generateCardsFromFile
const generateCardsFromFile = async (req, res) => {
    const { id: deckId } = req.params;
    const userId = req.user.id;

    try {
        if (!req.file) {
            return res.status(400).json({ 
                message: 'Nenhum arquivo foi enviado.', 
                code: 'VALIDATION_ERROR' 
            });
        }

        // Verificar se o tipo é suportado
        if (!SUPPORTED_MIME_TYPES[req.file.mimetype]) {
            const supportedTypes = Object.keys(SUPPORTED_MIME_TYPES)
                .map(type => SUPPORTED_MIME_TYPES[type].extension.toUpperCase())
                .join(', ');
            
            return res.status(400).json({ 
                message: `Tipo de arquivo não suportado. Suportados: ${supportedTypes}`, 
                code: 'UNSUPPORTED_FILE_TYPE' 
            });
        }

        // Verificar acesso ao deck
        const { data: deck, error: deckError } = await supabase
            .from('decks').select('id').eq('id', deckId).eq('user_id', userId).single();

        if (deckError || !deck) {
            return res.status(404).json({ 
                message: 'Baralho não encontrado.', 
                code: 'NOT_FOUND' 
            });
        }

        // Extrair texto do arquivo usando o novo serviço
        let extractionResult;
        try {
            extractionResult = await FileProcessingService.extractText(req.file);
        } catch (extractionError) {
            logger.error(`Erro na extração: ${extractionError.message}`);
            return res.status(400).json({ 
                message: extractionError.message, 
                code: 'TEXT_EXTRACTION_FAILED' 
            });
        }

        const { text: textContent, originalLength, wasOptimized, processingInfo } = extractionResult;

        const rawCount = req.body.count;
        const rawType = req.body.type;

        const count = rawCount ? parseInt(rawCount, 10) : 5;
        const type = rawType || 'Pergunta e Resposta';

        if (count < 1 || count > 15) {
            return res.status(400).json({ 
                message: 'Quantidade deve estar entre 1 e 15.', 
                code: 'VALIDATION_ERROR' 
            });
        }

        if (!['Pergunta e Resposta', 'Múltipla Escolha'].includes(type)) {
            return res.status(400).json({ 
                message: 'Tipo deve ser "Pergunta e Resposta" ou "Múltipla Escolha".', 
                code: 'VALIDATION_ERROR' 
            });
        }

        const jobData = {
            deckId,
            textContent,
            count,
            type,
            fileInfo: {
                ...processingInfo,
                originalLength,
                wasOptimized,
                category: SUPPORTED_MIME_TYPES[req.file.mimetype].category
            }
        };

        // Processar geração
        if (isRedisConnected) {
            await flashcardGenerationQueue.add('generate-file', jobData);
            
            const responseMessage = wasOptimized 
                ? `Arquivo processado! Texto otimizado de ${originalLength} para ${textContent.length} caracteres.`
                : 'Arquivo processado com sucesso!';

            res.status(202).json({ 
                processing: true, 
                message: responseMessage,
                fileInfo: jobData.fileInfo,
                textStats: {
                    extractedLength: originalLength,
                    finalLength: textContent.length,
                    wasOptimized
                }
            });
        } else {
            // Fallback para processamento síncrono
            const savedFlashcards = await processGenerationAndSave(jobData);
            res.status(201).json({ 
                message: 'Flashcards gerados com sucesso!', 
                flashcards: savedFlashcards,
                fileInfo: jobData.fileInfo,
                textStats: {
                    extractedLength: originalLength,
                    finalLength: textContent.length,
                    wasOptimized
                }
            });
        }

    } catch (error) {
        logger.error(`Erro na geração via arquivo: ${error.message}`);
        res.status(500).json({ 
            message: error.message || 'Erro ao gerar flashcards do arquivo.', 
            code: 'GENERATION_ERROR' 
        });
    }
};

const generateCardsFromYouTube = async (req, res) => {
    const { id: deckId } = req.params;
    const userId = req.user.id;

    try {
        const { youtubeUrl, count, type } = generateSchema.omit({ textContent: true })
            .extend({ youtubeUrl: z.string().url() })
            .parse(req.body);

        const { data: deck, error: deckError } = await supabase
            .from('decks').select('id').eq('id', deckId).eq('user_id', userId).single();

        if (deckError || !deck) {
            return res.status(404).json({ message: 'Baralho não encontrado.', code: 'NOT_FOUND' });
        }

        let transcript;
        try {
            const transcriptArray = await YoutubeTranscript.fetchTranscript(youtubeUrl, { lang: 'pt' });
            transcript = transcriptArray.map(item => item.text).join(' ');
        } catch (error) {
            return res.status(400).json({ 
                message: 'Não foi possível obter a transcrição do vídeo.', 
                code: 'YOUTUBE_TRANSCRIPT_ERROR' 
            });
        }

        if (!transcript || transcript.trim().length < 50) {
            return res.status(400).json({ 
                message: 'Transcrição muito curta para gerar flashcards.', 
                code: 'INSUFFICIENT_TRANSCRIPT_CONTENT' 
            });
        }

        const jobData = { deckId, textContent: transcript, count, type, source: 'youtube', sourceUrl: youtubeUrl };

        if (isRedisConnected) {
            await flashcardGenerationQueue.add('generate-youtube', jobData);
            res.status(202).json({ processing: true, message: 'Transcrição obtida! Gerando flashcards...' });
        } else {
            const savedFlashcards = await processGenerationAndSave(jobData);
            res.status(201).json({ message: 'Flashcards gerados!', flashcards: savedFlashcards });
        }

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: error.errors[0].message, code: 'VALIDATION_ERROR' });
        }
        logger.error(`Erro YouTube: ${error.message}`);
        res.status(500).json({ message: 'Erro ao gerar do YouTube.', code: 'GENERATION_ERROR' });
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
            return res.status(404).json({ message: 'Baralho não encontrado.', code: 'NOT_FOUND' });
        }

        const { data, error } = await supabase
            .from('flashcards')
            .select('*')
            .eq('deck_id', deckId)
            .or(`due_date.lte.${today},due_date.is.null`)
            .limit(20); 

        if (error) throw error;
        res.status(200).json(data);

    } catch (error) {
        logger.error(`Error fetching review cards: ${error.message}`);
        res.status(500).json({ message: 'Erro ao buscar flashcards.', code: 'INTERNAL_SERVER_ERROR' });
    }
};

const shareDeck = async (req, res) => {
    const { id: deckId } = req.params;
    const userId = req.user.id;

    try {
        const { data: deck, error: deckError } = await supabase
            .from('decks').select('*').eq('id', deckId).eq('user_id', userId).single();

        if (deckError || !deck) {
            return res.status(404).json({ message: 'Baralho não encontrado.', code: 'NOT_FOUND' });
        }

        const shareableLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/shared-deck/${deckId}`;

        res.status(200).json({ 
            message: 'Link gerado com sucesso!', 
            shareableLink,
            deck: { id: deck.id, title: deck.title, description: deck.description }
        });

    } catch (error) {
        logger.error(`Error sharing deck: ${error.message}`);
        res.status(500).json({ message: 'Erro ao compartilhar.', code: 'INTERNAL_SERVER_ERROR' });
    }
};

module.exports = {
    getDecks,
    createDeck,
    updateDeck,
    deleteDeck,
    generateCardsForDeck,
    generateCardsFromFile,
    generateCardsFromYouTube,
    getReviewCardsForDeck,
    shareDeck
};