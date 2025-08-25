require('dotenv').config();
const { Worker } = require('bullmq');
const supabase = require('./config/supabaseClient');
const { generateFlashcardsFromText } = require('./services/cohereService');
const { connection } = require('./config/queue');

const queueName = 'flashcardGeneration';

console.log(`🚀 Worker para a fila "${queueName}" a iniciar...`);

const worker = new Worker(queueName, async (job) => {
    const { deckId, userId, textContent, count, type } = job.data;
    console.log(`A processar tarefa ${job.id} para o baralho ${deckId}`);

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

        console.log(`Tarefa ${job.id} concluída com sucesso. ${savedFlashcards.length} flashcards guardados.`);
        // TODO: Futuramente, podemos adicionar aqui uma notificação para o frontend (via WebSockets)

        return { success: true, count: savedFlashcards.length };

    } catch (error) {
        console.error(`Tarefa ${job.id} falhou para o baralho ${deckId}: ${error.message}`);
        throw error; // Lança o erro para que o BullMQ marque a tarefa como 'failed'
    }
}, { connection });

worker.on('failed', (job, err) => {
  console.error(`Tarefa ${job.id} falhou com o erro: ${err.message}`);
});