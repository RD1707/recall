const { Queue } = require('bullmq');
const IORedis = require('ioredis');

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null, 
});

const flashcardGenerationQueue = new Queue('flashcardGeneration', { connection });

module.exports = {
    flashcardGenerationQueue,
    connection 
};