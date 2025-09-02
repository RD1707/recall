// backend/src/routes/flashcardRoutes.js

const express = require('express');
const router = express.Router();

// Para evitar qualquer chance de conflito de nome, vamos renomear a variável
const controller = require('../controllers/flashcardController');
const authMiddleware = require('../middleware/authMiddleware');

// Verificação final para garantir que a função existe antes de criar a rota
if (typeof controller.updateFlashcard !== 'function' || typeof controller.deleteFlashcard !== 'function') {
    // Se isso acontecer, o problema está no arquivo do controller
    throw new Error('As funções do flashcardController não foram exportadas corretamente.');
}

// ------ NOVA ESTRUTURA ------
// Agrupa as rotas que compartilham o mesmo caminho '/:cardId'
router.route('/:cardId')
    .put(authMiddleware, controller.updateFlashcard)
    .delete(authMiddleware, controller.deleteFlashcard);

// A rota de review continua separada, pois o caminho é diferente
router.post('/:cardId/review', authMiddleware, controller.reviewFlashcard);


module.exports = router;