# 🧠 Recall - Estudo Inteligente com Flashcards de IA

<p align="center">
  <strong>Estude menos, aprenda mais. Transforme qualquer conteúdo em flashcards inteligentes com o poder da Inteligência Artificial.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white">
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white">
  <img src="https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white">
  <img src="https://img.shields.io/badge/Cohere-4A35A8?style=for-the-badge&logo=cohere&logoColor=white">
  <img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black">
</p>

<p align="center">
  <em>(Sugestão: Grave um GIF mostrando o app em ação e coloque aqui!)</em>
  <br>
  <img src="https://i.imgur.com/link-para-seu-gif.gif" alt="Demonstração do Recall App" width="800"/>
</p>

---

## 📋 Índice

- [✨ Funcionalidades Principais](#-funcionalidades-principais)
- [🚀 Como Funciona](#-como-funciona)
- [🛠️ Tecnologias Utilizadas](#️-tecnologias-utilizadas)
- [🔧 Configuração e Execução Local](#-configuração-e-execução-local)
- [📂 Estrutura do Projeto](#-estrutura-do-projeto)
- [📄 Licença](#-licença)

---

## ✨ Funcionalidades Principais

-   **🪄 Geração Mágica com IA**: Cole textos, envie arquivos (`.txt`, `.md`, `.pdf`) ou insira links de vídeos do YouTube. Nossa IA cria flashcards relevantes em segundos.
-   **🗓️ Repetição Espaçada Inteligente**: Baseada no algoritmo SM-2 (Anki), para revisar no momento certo.
-   **🏆 Gamificação Motivadora**: Pontos, streaks e gráficos para acompanhar progresso.
-   **🤖 Tutor com IA**: Explicações detalhadas quando errar um card.
-   **✍️ Personalização Completa**: Edite, crie e compartilhe seus flashcards e baralhos.
-   **🔗 Compartilhamento de Baralhos**: Links públicos para seus amigos estudarem junto.
-   **📊 Análise de Desempenho**: Insights e gráficos detalhados sobre seu aprendizado.

### 🔥 Steak Interativo 1

**Quiz Rápido:**  
O Recall gera com IA:

- [ ] Resumos  
- [x] Flashcards  
- [ ] Slides  
- [ ] Artigos  

> Dica: São cartões de estudo inteligentes.

---

## 🚀 Como Funciona

1. **Adicione seu Conteúdo**: Texto, arquivos ou link do YouTube.
2. **Gere com um Clique**: IA analisa e cria flashcards.
3. **Estude e Memorize**: Repetição espaçada mostra os cards certos na hora certa.

### 🔥 Steak Interativo 2

**Quiz Rápido:**  
Tipos de conteúdo aceitos pelo Recall:

- [x] Texto, arquivo, link de vídeo  
- [ ] Apenas PDF  
- [ ] Apenas YouTube  
- [ ] Somente texto  

> Dica: Qualquer tipo de conteúdo é aceito.

---

## 🛠️ Tecnologias Utilizadas

### Frontend

- **HTML5, CSS3, JS Vanilla**
- **Supabase.js** (autenticação e dados)
- **Chart.js** (gráficos)
- **Toastify.js** (notificações)
- **Feather Icons** (iconografia)

### Backend

- **Node.js + Express.js**
- **Zod** (validação de esquemas)
- **BullMQ** (filas assíncronas com Redis)
- **Multer** (upload de arquivos)
- **youtube-transcript, pdf-parse** (extração de conteúdo)
- **Winston** (logs avançados)

### Infraestrutura & Serviços

- **Supabase** (PostgreSQL + Auth)
- **Cohere AI** (geração de flashcards e explicações)
- **Redis** (cache e gerenciamento de filas)

### 🔥 Steak Interativo 3

**Quiz Rápido:**  
Qual biblioteca valida esquemas no backend?

- [ ] Joi  
- [ ] Yup  
- [x] Zod  
- [ ] Validator.js  

> Dica: Gosta de tipagem forte.

---

## 🔧 Configuração e Execução Local

1. Navegue até `backend` e instale dependências:
```bash
cd backend
npm install
