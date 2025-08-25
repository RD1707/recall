require('dotenv').config();
const { Worker } = require('bullmq');
const supabase = require('./config/supabaseClient');
const { generateFlashcardsFromText } = require('./services/cohereService');
const logger = require('./config/logger'); // Importar o logger
const { connection } = require('./config/queue');

const queueName = 'flashcardGeneration';

logger.info(`🚀 Worker para a fila "${queueName}" a iniciar...`);

const worker = new Worker(queueName, async (job) => {
    const { deckId, userId, textContent, count, type } = job.data;
    logger.info(`A processar tarefa ${job.id} para o baralho ${deckId}`);

    try {
        const generatedFlashcards = await generateFlashcardsFromText(textContent, count, type);
        if (!generatedFlashcards || generatedFlashcards.length === 0) {
            throw new Error('Serviço de IA falhou ao gerar flashcards.');
        }
        
        const flashcardsToSave = generatedFlashcards.map(card => ({
            deck_id: deckId,
            question: card.question,
            answer: card.answer,
            options: card.options,
            card_type: type,
        }));

        const { data: savedFlashcards, error: saveError } = await supabase
            .from('flashcards')
            .insert(flashcardsToSave)
            .select();

        if (saveError) throw saveError;

        logger.info(`Tarefa ${job.id} concluída com sucesso. ${savedFlashcards.length} flashcards guardados.`);

        return { success: true, count: savedFlashcards.length };

    } catch (error) {
        logger.error(`Tarefa ${job.id} falhou para o baralho ${deckId}: ${error.message}`);
        throw error; // Lança o erro para que o BullMQ marque a tarefa como 'failed'
    }
}, { connection });


worker.on('failed', (job, err) => {
  logger.error(`Tarefa ${job.id} falhou com o erro: ${err.message}`);
});