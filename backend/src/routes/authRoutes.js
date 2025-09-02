const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// Rotas públicas
router.post('/signup', authController.signup);
router.post('/login', authController.login);

// Rotas protegidas para Google OAuth
router.post('/check-google-profile', authMiddleware.authenticateToken, authController.checkGoogleProfile);
router.post('/complete-google-profile', authMiddleware.authenticateToken, authController.completeGoogleProfile);

module.exports = router;