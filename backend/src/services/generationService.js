const supabase = require('../config/supabaseClient');
const { generateFlashcardsFromText } = require('./cohereService');
const logger = require('../config/logger');

async function processGenerationAndSave({ deckId, textContent, count, type }) {
  try {
    logger.info(`Iniciando geração de IA para o baralho ${deckId}`);
    const generatedFlashcards = await generateFlashcardsFromText(textContent, count, type);

    if (!generatedFlashcards || generatedFlashcards.length === 0) {
      throw new Error('O serviço de IA não conseguiu gerar flashcards a partir do conteúdo fornecido.');
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

    if (saveError) {
      throw saveError;
    }

    logger.info(`Geração para o baralho ${deckId} concluída. ${savedFlashcards.length} flashcards guardados.`);
    return savedFlashcards;

  } catch (error) {
    logger.error(`Falha no processo de geração para o baralho ${deckId}: ${error.message}`);
    throw error;
  }
}

module.exports = { processGenerationAndSave };