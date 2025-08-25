const express = require('express');
const router = express.Router();
const flashcardController = require('../controllers/flashcardController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.route('/decks/:deckId/flashcards')
    .get(flashcardController.getFlashcardsInDeck)
    .post(flashcardController.createFlashcard);

router.route('/flashcards/:cardId')
    .put(flashcardController.updateFlashcard)
    .delete(flashcardController.deleteFlashcard);

router.post('/flashcards/:cardId/review', flashcardController.reviewFlashcard);
router.post('/flashcards/:cardId/explain', flashcardController.getExplanation);

module.exports = router;