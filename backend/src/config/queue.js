const { Queue } = require('bullmq');
const IORedis = require('ioredis');

// Cria a conexão com o Redis a partir da URL no .env
const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null, // Necessário para o BullMQ
});

// Cria e exporta a fila de geração de flashcards
const flashcardGenerationQueue = new Queue('flashcardGeneration', { connection });

module.exports = {
    flashcardGenerationQueue,
    connection // Exportamos a conexão para o worker usar
};