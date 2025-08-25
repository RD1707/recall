const express = require('express');
const router = express.Router();
const deckController = require('../controllers/deckController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', deckController.getDecks);          
router.post('/', deckController.createDeck);        
router.put('/:id', deckController.updateDeck);      
router.delete('/:id', deckController.deleteDeck);  
router.post('/:id/generate', deckController.generateCardsForDeck);
router.get('/:id/review', deckController.getReviewCardsForDeck);

module.exports = router;