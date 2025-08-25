const express = require('express');
const router = express.Router();
const { getSharedDeck } = require('../controllers/shareController');

// Rota pública para obter um baralho através do seu ID de compartilhamento
router.get('/shared/:shareableId', getSharedDeck);

module.exports = router;