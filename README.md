# 🧠 Recall - Estudo Inteligente com Flashcards de IA

<p align="center">
  <strong>Estude menos, aprenda mais. Transforme qualquer conteúdo em flashcards inteligentes com o poder da Inteligência Artificial.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express.js">
  <img src="https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase">
  <img src="https://img.shields.io/badge/Cohere-4A35A8?style=for-the-badge&logo=cohere&logoColor=white" alt="Cohere AI">
  <img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript">
</p>

<p align="center">
  <em>(Sugestão: Grave um GIF mostrando o app em ação e coloque aqui!)</em>
  <br>
  <img src="https://i.imgur.com/link-para-seu-gif.gif" alt="Demonstração do Recall App" width="800"/>
</p>

---

### 📋 Índice

- [✨ Funcionalidades Principais](#-funcionalidades-principais)
- [🚀 Como Funciona](#-como-funciona)
- [🛠️ Tecnologias Utilizadas](#️-tecnologias-utilizadas)
- [🔧 Configuração e Execução Local](#-configuração-e-execução-local)
- [📂 Estrutura do Projeto](#-estrutura-do-projeto)
- [📄 Licença](#-licença)

---

## ✨ Funcionalidades Principais

-   **🪄 Geração Mágica com IA**: Cole textos, envie arquivos (`.txt`, `.md`, `.pdf`) ou insira links de vídeos do YouTube. Nossa IA criará flashcards relevantes e precisos em segundos.
-   **🗓️ Repetição Espaçada Inteligente**: Utiliza um algoritmo robusto (baseado no SM-2) para agendar revisões no momento exato, maximizando a retenção do conteúdo a longo prazo.
-   **🏆 Gamificação Motivadora**: Ganhe pontos, mantenha sua sequência de estudos (*streak*) e acompanhe seu progresso com gráficos detalhados para se manter sempre motivado.
-   **🤖 Tutor com IA**: Errou um card? A IA pode fornecer explicações detalhadas para ajudar a solidificar o conhecimento (funcionalidade de backend pronta para ser integrada no frontend).
-   **✍️ Personalização Completa**: Edite os flashcards gerados pela IA, adicione novos manualmente ou crie seus próprios baralhos do zero.
-   **🔗 Compartilhamento de Baralhos**: Compartilhe seus baralhos com amigos e colegas de estudo através de um link público e exclusivo.
-   **📊 Análise de Desempenho**: Uma página de progresso completa que mostra sua atividade, precisão, baralhos com dificuldade e insights gerados por IA.

## 🚀 Como Funciona

1.  **Adicione seu Conteúdo**: Crie um baralho e adicione o material de estudo da forma que preferir: texto, arquivo ou link do YouTube.
2.  **Gere com um Clique**: A IA do Recall analisará o conteúdo e criará um conjunto de flashcards para você, que podem ser de "Pergunta e Resposta" ou "Múltipla Escolha".
3.  **Estude e Memorize**: Inicie uma sessão de estudos. O sistema de repetição espaçada cuidará de mostrar os cards certos na hora certa para otimizar seu aprendizado.

## 🛠️ Tecnologias Utilizadas

O projeto é um monorepo com duas aplicações principais: o `frontend`, a interface com o usuário, e o `backend`, que cuida de toda a lógica de negócio e integrações.

### Frontend

-   **Linguagens**: HTML5, CSS3, JavaScript (Vanilla JS)
-   **Bibliotecas**:
    -   **Supabase.js**: Para autenticação e comunicação em tempo real com o backend.
    -   **Chart.js**: Para a visualização de gráficos na página de progresso.
    -   **Toastify.js**: Para notificações e alertas amigáveis ao usuário.
    -   **Feather Icons**: Para uma iconografia limpa e moderna.

### Backend

-   **Runtime/Framework**: Node.js com Express.js
-   **Validação**: Zod para validação de esquemas, garantindo a integridade dos dados na API.
-   **Filas e Jobs**: BullMQ para gerenciar tarefas assíncronas (como a geração de flashcards), garantindo que a aplicação continue responsiva.
-   **Upload de Arquivos**: Multer para o upload de arquivos de texto e PDF.
-   **Extração de Conteúdo**: `youtube-transcript` para extrair transcrições de vídeos e `pdf-parse` para PDFs.
-   **Logging**: Winston para um sistema de logs robusto, separado por níveis (info, error).

### Infraestrutura e Serviços

-   **Backend-as-a-Service**: Supabase
    -   **Banco de Dados**: PostgreSQL para armazenar usuários, perfis, baralhos e flashcards.
    -   **Autenticação**: Gerenciamento completo de usuários, logins e segurança de rotas.
-   **Inteligência Artificial**: Cohere AI como motor para a geração de flashcards e explicações.
-   **Cache/Broker de Mensagens**: Redis (utilizado pelo BullMQ para a gestão da fila).

## 🔧 Configuração e Execução Local

Para executar o projeto em sua máquina, você precisará do Node.js e de uma instância do Redis.

### Pré-requisitos

-   **Node.js** (versão 18 ou superior)
-   Uma conta na **Supabase** para criar seu projeto e obter as chaves de API.
-   Uma chave de API da **Cohere AI**.
-   Uma instância do **Redis** (pode ser local ou em um serviço como o Upstash).

### Configuração do Backend

1.  Navegue até a pasta `backend`:
    ```bash
    cd backend
    ```
2.  Instale as dependências:
    ```bash
    npm install
    ```
3.  Crie um arquivo `.env` na raiz da pasta `backend` e preencha com suas credenciais:
    ```env
    PORT=3001
    SUPABASE_URL=SUA_URL_SUPABASE
    SUPABASE_SERVICE_ROLE_KEY=SUA_CHAVE_SERVICE_ROLE_SUPABASE
    SUPABASE_ANON_KEY=SUA_CHAVE_ANON_SUPABASE
    COHERE_API_KEY=SUA_CHAVE_COHERE_AI
    REDIS_URL=sua_url_de_conexao_redis # Ex: redis://usuario:senha@host:porta
    ```
4.  Inicie o servidor principal da API:
    ```bash
    npm start
    ```
5.  Em um **novo terminal**, inicie o worker da fila:
    ```bash
    npm run worker
    ```

### Configuração do Frontend

1.  Navegue até a pasta `frontend/public/js` e abra o arquivo **`api.js`**.
2.  Substitua as constantes `SUPABASE_URL` e `SUPABASE_ANON_KEY` pelas suas credenciais (as mesmas que você colocou no arquivo `.env` do backend).
3.  Abra o arquivo `frontend/public/index.html` em seu navegador. A forma mais fácil é usar uma extensão como o **Live Server** no VS Code.

## 📂 Estrutura do Projeto

```
/
├── backend/
│   ├── src/
│   │   ├── config/         # Configurações (Supabase, BullMQ, Logger)
│   │   ├── controllers/    # Lógica de negócio das rotas (controllers)
│   │   ├── middleware/     # Middleware de autenticação de rotas
│   │   ├── routes/         # Definição dos endpoints da API
│   │   ├── services/       # Integração com serviços (Cohere, SRS)
│   │   └── worker.js       # Processador da fila de tarefas assíncronas
│   ├── .env                # Variáveis de ambiente (local)
│   ├── package.json
│   └── server.js           # Ponto de entrada do backend (Express)
└── frontend/
    └── public/
        ├── css/            # Folhas de estilo
        ├── js/             # Scripts JavaScript
        └── *.html          # Páginas da aplicação
```

## 📄 Licença

Este projeto está licenciado sob a Licença MIT.