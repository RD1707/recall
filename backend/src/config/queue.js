const { Queue } = require('bullmq');
const IORedis = require('ioredis');
const logger = require('./logger');

let flashcardGenerationQueue = null;
let connection = null;
let isRedisConnected = false;

if (process.env.REDIS_URL && process.env.REDIS_URL !== 'DISABLED') {
  try {
    connection = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      connectTimeout: 5000, 
    });

    connection.on('connect', () => {
        logger.info('✅ Conectado ao Redis com sucesso.');
        isRedisConnected = true;
    });

    connection.on('error', (err) => {
        logger.error(`❌ Erro de conexão com o Redis: ${err.message}`);
        isRedisConnected = false;
    });

    flashcardGenerationQueue = new Queue('flashcardGeneration', { connection });

  } catch (error) {
    logger.error(`❌ Falha ao inicializar a conexão com o Redis: ${error.message}`);
  }
}

if (!flashcardGenerationQueue) {
  logger.warn('⚠️  Redis está desabilitado ou a conexão falhou. A geração de IA será síncrona.');
}

module.exports = {
  flashcardGenerationQueue,
  connection,
  get isRedisConnected() {
    return isRedisConnected && connection && connection.status === 'ready';
  }
};
