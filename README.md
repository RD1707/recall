# Recall

Uma plataforma de estudos inteligente, potencializada por IA, para otimizar a memorização e o aprendizado através de flashcards e repetição espaçada.

## Descrição

O Recall foi desenvolvido para resolver um problema central no aprendizado: a curva do esquecimento. Estudantes e aprendizes de todas as áreas frequentemente lutam para reter grandes volumes de informação a longo prazo. Ferramentas tradicionais de flashcards exigem a criação manual de conteúdo, um processo lento e tedioso.

Este projeto ataca esse problema de frente, utilizando um modelo de linguagem de IA (Cohere) para gerar automaticamente flashcards de alta qualidade a partir de qualquer material de estudo fornecido pelo usuário — seja um texto, um PDF ou uma transcrição. Combinado com um sistema de repetição espaçada baseado no algoritmo SM-2, o Recall garante que o usuário revise o conteúdo no momento exato em que estaria prestes a esquecê-lo, tornando o processo de estudo exponencialmente mais eficiente.

## Funcionalidades Principais

* **Geração de Flashcards com IA:** Converta automaticamente qualquer texto em um baralho de flashcards completo e bem estruturado com um único clique.
* **Sistema de Repetição Espaçada (SRS):** Um algoritmo inteligente calcula o intervalo ótimo para a revisão de cada card, maximizando a retenção de conhecimento.
* **Gamificação:** Um sistema de pontos e streaks diários mantém o usuário engajado e motivado a manter uma rotina de estudos consistente.
* **Interface Moderna e Responsiva:** O design focado e minimalista foi construído para funcionar perfeitamente em desktops, tablets e dispositivos móveis.
* **Autenticação Segura:** Gerenciamento de contas de usuário seguro e robusto, com perfis individuais, utilizando a infraestrutura do Supabase.
* **Gerenciamento Completo:** Crie, edite e organize múltiplos baralhos para diferentes matérias ou tópicos de estudo.

## Tecnologias Utilizadas

A aplicação é construída como um monorepo, com uma clara separação entre o backend e o frontend.

| Categoria                | Tecnologia                                                                         |
| ------------------------ | ---------------------------------------------------------------------------------- |
| **Backend** | Node.js, Express.js                                                             |
| **Frontend** | HTML5, CSS3, JavaScript (Vanilla)                                          |
| **Banco de Dados** | PostgreSQL                                                                |
| **Inteligência Artificial** | Cohere API                                                          |
| **Infraestrutura & Auth** | Supabase                                                                           |

## Começando

Siga estas instruções para configurar e executar o projeto em seu ambiente local.

### Pré-requisitos

* Node.js (versão 18 ou superior)
* npm
* Uma conta no [Supabase](https://supabase.com/) para o banco de dados e autenticação.
* Uma chave de API da [Cohere](https://cohere.com/) para a funcionalidade de IA.

### Instalação e Configuração

1.  **Clone o repositório:**
    ```sh
    git clone [https://github.com/seu-usuario/recall.git](https://github.com/seu-usuario/recall.git)
    cd recall
    ```

2.  **Instale as dependências do Backend:**
    ```sh
    cd backend
    npm install
    ```

3.  **Configure as Variáveis de Ambiente:**
    * Navegue até a pasta `backend`.
    * Renomeie o arquivo `.env.example` (se houver) para `.env`.
    * Abra o arquivo `.env` e preencha com suas chaves do Supabase e Cohere:
        ```env
        SUPABASE_URL=SUA_URL_DO_SUPABASE
        SUPABASE_ANON_KEY=SUA_CHAVE_ANON_PUBLIC_DO_SUPABASE
        COHERE_API_KEY=SUA_CHAVE_DE_API_DO_COHERE
        ```

4.  **Configure o Banco de Dados:**
    * Acesse seu projeto no Supabase.
    * Navegue até o **SQL Editor**.
    * Execute o script SQL fornecido no projeto para criar as tabelas `decks`, `flashcards` e `profiles`, bem como o gatilho para a criação automática de perfis.

5.  **Inicie o Servidor Backend:**
    Ainda na pasta `backend`, execute:
    ```sh
    node server.js
    ```
    O servidor estará rodando em `http://localhost:3000`.

6.  **Acesse a Aplicação:**
    * Abra seu navegador e acesse `http://localhost:3000`.
    * O servidor Node.js já está configurado para servir os arquivos do frontend.

## Estrutura do Projeto

```
recall/
├── backend/
│   ├── src/
│   │   ├── config/         # Configuração do cliente Supabase
│   │   ├── controllers/    # Lógica de requisição/resposta (MVC)
│   │   ├── middleware/     # Middlewares (ex: autenticação)
│   │   ├── routes/         # Definição de rotas da API
│   │   └── services/       # Lógica de negócio (ex: IA, SRS)
│   ├── .env                # Variáveis de ambiente
│   ├── server.js           # Ponto de entrada do servidor Express
│   └── package.json
│
└── frontend/
    └── public/
        ├── css/            # Arquivos de estilo (base, landing, dashboard, etc.)
        ├── js/             # Scripts do lado do cliente (api, auth, main, etc.)
        ├── assets/         # Imagens e outros recursos
        └── *.html          # Páginas da aplicação (index, login, dashboard, etc.)
```

## Licença

Este projeto está licenciado sob a Licença MIT. 

## Autor

**[simple]**
