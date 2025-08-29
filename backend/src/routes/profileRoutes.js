const express = require('express');
const router = express.Router();
const { getProfile, updateProfile } = require('../controllers/profileController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// Rota para buscar o perfil
router.get('/', getProfile);

// ✅ NOVA ROTA: Rota para atualizar o perfil
router.put('/', updateProfile);

module.exports = router;