const express = require('express');
const router = express.Router();
const { 
    getProfile, 
    updateProfile, 
    getProfileByUsername, 
    getLeaderboard 
} = require('../controllers/profileController');
const authMiddleware = require('../middleware/authMiddleware');

// Rota pública para o leaderboard
router.get('/leaderboard', getLeaderboard);

// Rota pública para buscar perfil por username
router.get('/user/:username', getProfileByUsername);

// Rotas protegidas (requerem autenticação)
router.use(authMiddleware.authenticateToken);

router.get('/', getProfile);

router.put('/', updateProfile);

module.exports = router;