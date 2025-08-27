document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const deckId = params.get('deckId');

    if (!deckId) {
        showToast('ID do baralho não encontrado.', 'error');
        window.location.href = 'dashboard.html';
        return;
    }

    // Inicia a sessão de estudo
    new StudySession(deckId);
});

/**
 * Classe que gerencia toda a lógica de uma sessão de estudo.
 */
class StudySession {
    constructor(deckId) {
        this.deckId = deckId;
        this.reviewCards = [];
        this.currentCardIndex = 0;
        this.isCardFlipped = false;
        this.isSubmitting = false; // Previne cliques duplos
        this.sessionStats = { 1: 0, 3: 0, 4: 0, 5: 0 };

        this.getDOMElements();
        this.addEventListeners();
        this.start();
    }

    /**
     * Seleciona e armazena as referências para os elementos do DOM.
     */
    getDOMElements() {
        this.studyContainer = document.getElementById('study-container');
        this.completionContainer = document.getElementById('completion-container');

        this.deckLink = document.getElementById('deck-link');
        this.progressBar = document.getElementById('progress-bar');
        this.progressIndicator = document.getElementById('progress-indicator');
        
        this.flipCard = document.getElementById('flip-card');
        this.cardQuestion = document.getElementById('card-question');
        this.cardAnswer = document.getElementById('card-answer');
        
        this.flipButton = document.getElementById('flip-button');
        this.qualityButtonsContainer = document.getElementById('quality-buttons');
        
        this.feedbackOverlay = document.getElementById('card-feedback-overlay');
        this.feedbackText = document.getElementById('feedback-text');

        this.backToDeckLink2 = document.getElementById('back-to-deck-link-2');
        this.sessionSummary = document.getElementById('session-summary');
        
        this.explainButton = document.getElementById('explain-button');
        this.explanationModal = document.getElementById('explanation-modal');
        this.explanationContent = document.getElementById('explanation-content');
        this.closeExplanationModalBtn = document.getElementById('close-explanation-modal-btn');
    }

    /**
     * Adiciona todos os event listeners necessários.
     */
    addEventListeners() {
        this.flipButton.addEventListener('click', () => this.flip());
        this.qualityButtonsContainer.addEventListener('click', (e) => {
            const qualityButton = e.target.closest('.quality-btn');
            if (qualityButton) {
                this.submitReview(parseInt(qualityButton.dataset.quality, 10));
            }
        });

        this.explainButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleExplainClick();
        });
        
        this.closeExplanationModalBtn.addEventListener('click', () => this.closeExplanationModal());
        this.explanationModal.addEventListener('click', (e) => {
            if (e.target === this.explanationModal) this.closeExplanationModal();
        });
        
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
    }

    /**
     * Inicia a sessão: busca os cards e exibe o primeiro.
     */
    async start() {
        this.reviewCards = await fetchReviewCards(this.deckId);
        
        this.deckLink.href = `deck.html?id=${this.deckId}`;
        this.backToDeckLink2.href = `deck.html?id=${this.deckId}`;

        if (!this.reviewCards || this.reviewCards.length === 0) {
            this.showCompletionScreen();
            return;
        }
        
        this.currentCardIndex = 0;
        this.displayCard();
    }

    /**
     * Exibe o card atual na tela e atualiza a UI.
     */
    displayCard() {
        // Verifica se a sessão terminou
        if (this.currentCardIndex >= this.reviewCards.length) {
            this.showCompletionScreen();
            return;
        }

        const card = this.reviewCards[this.currentCardIndex];
        this.cardQuestion.textContent = card.question;
        this.cardAnswer.textContent = card.answer;
        
        // Garante que a rolagem do texto comece do topo
        this.cardQuestion.parentElement.scrollTop = 0;
        this.cardAnswer.parentElement.scrollTop = 0;

        this.updateProgress();

        this.isCardFlipped = false;
        this.isSubmitting = false;
        this.flipCard.classList.remove('is-flipped');
        this.flipButton.classList.remove('hidden');
        this.qualityButtonsContainer.classList.add('hidden');
    }

    /**
     * Vira o card para mostrar a resposta.
     */
    flip() {
        if (this.isCardFlipped) return;
        
        this.isCardFlipped = true;
        this.flipCard.classList.add('is-flipped');
        this.flipButton.classList.add('hidden');
        this.qualityButtonsContainer.classList.remove('hidden');
    }

    /**
     * Envia a avaliação, mostra o feedback e avança para o próximo card.
     * @param {number} quality - A avaliação do usuário (1, 3, 4, ou 5).
     */
    async submitReview(quality) {
        if (!this.isCardFlipped || this.isSubmitting) return;
        this.isSubmitting = true;

        const card = this.reviewCards[this.currentCardIndex];
        this.sessionStats[quality]++;

        // Envia a avaliação para a API em segundo plano
        submitReview(card.id, quality);

        // Mostra o feedback visual
        this.showFeedback(quality);

        // Atraso para o usuário ver o feedback antes de avançar
        setTimeout(() => {
            this.hideFeedback();
            this.currentCardIndex++;
            this.displayCard();
        }, 800); // 0.8 segundos de feedback
    }

    /**
     * Mostra o overlay de feedback no card.
     * @param {number} quality 
     */
    showFeedback(quality) {
        const feedbackMap = {
            1: { text: 'Errei', className: 'errado' },
            3: { text: 'Difícil', className: 'dificil' },
            4: { text: 'Bom', className: 'bom' },
            5: { text: 'Fácil', className: 'facil' }
        };
        const { text, className } = feedbackMap[quality];

        this.feedbackText.textContent = text;
        this.feedbackOverlay.className = `card-feedback-overlay ${className} visible`;
    }

    /**
     * Esconde o overlay de feedback.
     */
    hideFeedback() {
        this.feedbackOverlay.className = 'card-feedback-overlay';
    }
    
    /**
     * Lida com os atalhos do teclado.
     * @param {KeyboardEvent} e - O evento do teclado.
     */
    handleKeyPress(e) {
        if (this.explanationModal.classList.contains('visible')) return;

        if (e.code === 'Space' && !this.isCardFlipped) {
            e.preventDefault();
            this.flip();
        }

        if (this.isCardFlipped) {
            switch (e.key) {
                case '1': this.submitReview(1); break;
                case '2': this.submitReview(3); break;
                case '3': this.submitReview(4); break;
                case '4': this.submitReview(5); break;
            }
        }
    }

    /**
     * Atualiza a barra de progresso.
     */
    updateProgress() {
        const totalCards = this.reviewCards.length;
        // Garante que o número atual não exceda o total na UI
        const currentCardNumber = Math.min(this.currentCardIndex + 1, totalCards);
        const progressPercentage = totalCards > 0 ? (currentCardNumber / totalCards) * 100 : 0;

        this.progressBar.style.width = `${progressPercentage}%`;
        this.progressIndicator.textContent = `${currentCardNumber} de ${totalCards}`;
    }

    /**
     * Exibe a tela de conclusão da sessão.
     */
    showCompletionScreen() {
        this.studyContainer.classList.add('hidden');
        this.completionContainer.classList.remove('hidden');
        this.renderSessionSummary();
        updateProfileHeader();
    }

    /**
     * Renderiza o resumo da sessão.
     */
    renderSessionSummary() {
        const totalReviewed = this.reviewCards.length;
        if (totalReviewed > 0) {
            this.sessionSummary.innerHTML = `
                <ul>
                    <li><span>Fácil</span> <strong>${this.sessionStats[5]}</strong></li>
                    <li><span>Bom</span> <strong>${this.sessionStats[4]}</strong></li>
                    <li><span>Difícil</span> <strong>${this.sessionStats[3]}</strong></li>
                    <li><span>Errei</span> <strong>${this.sessionStats[1]}</strong></li>
                </ul>
            `;
        } else {
             this.sessionSummary.innerHTML = `<p>Você não tinha cards para revisar hoje. Crie mais ou volte amanhã!</p>`
        }
    }

    /**
     * Busca e exibe a explicação da IA.
     */
    async handleExplainClick() {
        const skeletonHTML = `
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text"></div>`;
        this.explanationContent.innerHTML = skeletonHTML;
        this.explanationModal.classList.add('visible');

        const card = this.reviewCards[this.currentCardIndex];
        const result = await fetchExplanation(card.id);

        if (result && result.explanation) {
            this.explanationContent.textContent = result.explanation;
        } else {
            this.explanationContent.textContent = 'Não foi possível carregar a explicação no momento. Tente novamente.';
        }
    }

    /**
     * Fecha o modal de explicação.
     */
    closeExplanationModal() {
        this.explanationModal.classList.remove('visible');
    }
}