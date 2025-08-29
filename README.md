# 🧠 Recall - Flashcards Inteligentes com IA

<p align="center">
  <strong>Estude menos, memorize mais. IA + repetição espaçada.</strong>
</p>

---

## 📌 Info Rápida

- **Usuários**: Estudantes e professores  
- **Linguagens**: JS (Vanilla), HTML, CSS, Node.js  
- **Banco de dados**: PostgreSQL (via Supabase)  
- **IA**: Cohere  
- **Cache/Queue**: Redis + BullMQ  
- **Upload**: txt, md, pdf  
- **Frontend**: Chart.js, Toastify.js, Feather Icons  
- **Backend**: Express.js, Zod, Multer, youtube-transcript, pdf-parse  

---

## ✨ Funcionalidades

- Gerar flashcards de qualquer conteúdo (texto, arquivo, YouTube)  
- Repetição espaçada inteligente (SM-2)  
- Gamificação (pontos, streaks, gráficos)  
- Explicações da IA para erros  
- Edição e compartilhamento de baralhos  

### 🔥 Steak 1: Flashcard Quiz
O Recall gera:
- [ ] Resumos  
- [x] Flashcards  
- [ ] Slides  
- [ ] Artigos  

---

## 🚀 Como Funciona

1. Adicione conteúdo  
2. IA gera flashcards  
3. Estude com repetição espaçada  

### 🔥 Steak 2: Conteúdo Aceito
- [x] Texto, arquivo, link de vídeo  
- [ ] Apenas PDF  
- [ ] Apenas YouTube  
- [ ] Somente texto  

---

## 🛠️ Setup Local

```bash
# Backend
cd backend
npm install
# .env: PORT, SUPABASE_URL/KEYS, COHERE_API_KEY, REDIS_URL
npm start
npm run worker

# Frontend
abrir index.html ou via Live Server
