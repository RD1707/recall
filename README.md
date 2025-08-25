# Recall - Estudo Inteligente com Flashcards de IA

O Recall é uma plataforma de estudos inovadora que transforma qualquer conteúdo em flashcards inteligentes usando o poder da Inteligência Artificial. O objetivo é simples: ajudar você a estudar menos e aprender mais, otimizando a memorização e a revisão de qualquer assunto.

## Funcionalidades Principais

  * **Geração Mágica com IA**: Cole textos, envie PDFs ou insira links de vídeos do YouTube, e nossa IA criará flashcards relevantes e precisos em segundos.
  * **Repetição Espaçada (Spaced Repetition)**: Utiliza um algoritmo inteligente baseado no SM-2 para agendar revisões no momento exato em que você estaria prestes a esquecer, maximizando a retenção do conteúdo.
  * **Gamificação Motivadora**: Ganhe pontos, mantenha sua sequência de estudos (streak) e acompanhe seu progresso com gráficos para se manter sempre motivado.
  * **Tutor com IA**: Quando errar um card, a IA pode fornecer explicações detalhadas para ajudar a solidificar o conhecimento.
  * **Personalização Completa**: Edite os flashcards gerados pela IA ou crie os seus do zero.
  * **Compartilhamento de Baralhos**: Compartilhe seus baralhos com amigos e colegas de estudo através de um link público.

## Como Funciona

1.  **Adicione seu Conteúdo**: Crie um novo baralho e adicione o material de estudo. Você pode:
      * Colar um texto diretamente.
      * Fazer o upload de um arquivo (`.txt`, `.md`, `.pdf`).
      * Inserir um link de um vídeo do YouTube com legendas.
2.  **Gere com um Clique**: A IA do Recall analisará o conteúdo e criará um conjunto de flashcards para você, que podem ser de "Pergunta e Resposta" ou "Múltipla Escolha".
3.  **Estude e Memorize**: Inicie uma sessão de estudos. O sistema de repetição espaçada cuidará de mostrar os cards certos na hora certa para otimizar seu aprendizado.

## Tecnologias Utilizadas

O projeto é dividido em duas partes principais: o `frontend`, que é a interface com o usuário, e o `backend`, que cuida de toda a lógica de negócio e integrações.

### Frontend

  * **HTML5, CSS3 e JavaScript**: A base da aplicação web.
  * **Supabase.js**: Para autenticação e comunicação em tempo real com o backend.
  * **Chart.js**: Para a visualização de gráficos na página de progresso.
  * **Toastify.js**: Para notificações e alertas amigáveis ao usuário.

### Backend

  * **Node.js com Express**: Para a construção da API REST.
  * **Supabase**: Utilizado como o principal serviço de backend, incluindo:
      * **PostgreSQL**: Banco de dados para armazenar usuários, baralhos e flashcards.
      * **Autenticação**: Gerenciamento de logins, registros e segurança.
  * **Cohere AI**: Motor de Inteligência Artificial para a geração de flashcards e explicações.
  * **BullMQ e Redis**: Para gerenciar filas de tarefas em segundo plano (como a geração de flashcards), garantindo que a aplicação continue responsiva.
  * **Multer**: Para o upload de arquivos.
  * **youtube-transcript**: Para extrair transcrições de vídeos do YouTube.
  * **Zod**: Para validação de esquemas e garantia da integridade dos dados que chegam à API.

## Como Executar o Projeto Localmente

Para executar o projeto em sua máquina, você precisará ter o Node.js e o npm (ou Yarn) instalados.

### Pré-requisitos

  * **Node.js** (versão 18 ou superior)
  * Uma conta na **Supabase** para criar seu banco de dados e obter as chaves de API.
  * Uma chave de API da **Cohere AI**.
  * Uma instância do **Redis** (pode ser local ou na nuvem).

### Configuração do Backend

1.  Navegue até a pasta `backend`:
    ```bash
    cd backend
    ```
2.  Instale as dependências:
    ```bash
    npm install
    ```
3.  Crie um arquivo `.env` na raiz da pasta `backend` e adicione as seguintes variáveis de ambiente:
    ```env
    PORT=3000
    SUPABASE_URL=URL_DO_SEU_PROJETO_SUPABASE
    SUPABASE_ANON_KEY=SUA_CHAVE_ANON_SUPABASE
    COHERE_API_KEY=SUA_CHAVE_DA_COHERE_AI
    REDIS_URL=URL_DA_SUA_INSTANCIA_REDIS
    ```
4.  Inicie o servidor principal:
    ```bash
    npm start
    ```
5.  Em um novo terminal, inicie o worker da fila:
    ```bash
    npm run worker
    ```

### Configuração do Frontend

1.  Navegue até a pasta `frontend/public/js` e abra o arquivo `main.js`.
2.  Substitua as constantes `SUPABASE_URL` e `SUPABASE_ANON_KEY` pelas suas credenciais da Supabase.
3.  Abra o arquivo `frontend/public/index.html` em seu navegador. A forma mais fácil é usar uma extensão como o "Live Server" no VS Code.

## Estrutura do Projeto

```
/
├── backend/
│   ├── src/
│   │   ├── config/         # Configurações (Supabase, BullMQ, Logger)
│   │   ├── controllers/    # Lógica das rotas (decks, flashcards, auth)
│   │   ├── middleware/     # Middleware de autenticação
│   │   ├── routes/         # Definição das rotas da API
│   │   ├── services/       # Integração com serviços externos (Cohere, SRS)
│   │   └── worker.js       # Processador da fila de tarefas
│   ├── .env.example        # Exemplo de variáveis de ambiente
│   ├── package.json
│   └── server.js           # Ponto de entrada do backend
└── frontend/
    └── public/
        ├── css/
        ├── js/
        └── *.html          # Páginas da aplicação
```

## Licença

Este projeto está licenciado sob a Licença MIT. Veja o arquivo `LICENSE` para mais detalhes.