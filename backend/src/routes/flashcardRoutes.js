// backend/src/routes/flashcardRoutes.js

const express = require('express');
const router = express.Router();

// Correction Part 1: Import the entire controller object instead of destructuring.
// This matches the pattern used in other files (e.g., deckRoutes.js) and is more robust.
const flashcardController = require('../controllers/flashcardController');
const authMiddleware = require('../middleware/authMiddleware');

// The GET route for a single flashcard remains commented out because the function
// 'getFlashcardById' is not exported from the controller, which would cause a different crash.
// router.get('/:cardId', authMiddleware, flashcardController.getFlashcardById);

// Correction Part 2: Access the controller functions as properties of the imported object.
// This ensures that Express receives the actual function it needs to handle the route.
router.put('/:cardId', authMiddleware, flashcardController.updateFlashcard);
router.delete('/:cardId', authMiddleware, flashcardController.deleteFlashcard);
router.post('/:cardId/review', authMiddleware, flashcardController.reviewFlashcard);

module.exports = router;