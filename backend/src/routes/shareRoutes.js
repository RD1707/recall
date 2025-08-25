const express = require('express');
const router = express.Router();
const { getSharedDeck } = require('../controllers/shareController');

router.get('/shared/:shareableId', getSharedDeck);

module.exports = router;