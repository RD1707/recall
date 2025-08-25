const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./src/routes/authRoutes');
const deckRoutes = require('./src/routes/deckRoutes');
const flashcardRoutes = require('./src/routes/flashcardRoutes');
const profileRoutes = require('./src/routes/profileRoutes');
const analyticsRoutes = require('./src/routes/analyticsRoutes');
const shareRoutes = require('./src/routes/shareRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, '../frontend/public')));
app.use(express.json());

app.get('/api', (req, res) => {
  res.json({ message: 'API do Recall está funcionando!' });
});

app.use('/api/auth', authRoutes);
app.use('/api/decks', deckRoutes);
app.use('/api', flashcardRoutes); 
app.use('/api/profile', profileRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api', shareRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});