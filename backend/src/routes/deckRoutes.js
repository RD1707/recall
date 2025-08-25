const express = require('express');
const router = express.Router();
const deckController = require('../controllers/deckController');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');

const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, 
});

router.use(authMiddleware);

router.get('/', deckController.getDecks);          
router.post('/', deckController.createDeck);        
router.put('/:id', deckController.updateDeck);      
router.delete('/:id', deckController.deleteDeck);  
router.post('/:id/generate', deckController.generateCardsForDeck);
router.get('/:id/review', deckController.getReviewCardsForDeck);

router.post('/:id/generate-from-file', upload.single('file'), deckController.generateCardsFromFile);
router.post('/:id/share', deckController.shareDeck);

module.exports = router;