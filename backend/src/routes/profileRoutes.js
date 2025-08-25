const express = require('express');
const router = express.Router();
const { getProfile } = require('../controllers/profileController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', getProfile);

module.exports = router;