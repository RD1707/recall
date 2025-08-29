/**
 * Arquivo: study.js (Versão Profissional)
 * Descrição: Gerencia a lógica da página de estudo usando uma abordagem baseada em classes
 * para melhor organização, manutenibilidade e robustez.
 */

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const deckId = params.get('deckId');

    if (!deckId) {
        showToast('ID do baralho não encontrado. Redirecionando...', 'error');
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 2000);
        return;
    }

    // Inicia a sessão de estudo com a nova classe
    new StudySessionPro(deckId);
});

/**
 * Classe que encapsula toda a lógica e estado de uma sessão de estudo.
 */
class StudySessionPro {
    constructor(deckId) {
        this.deckId = deckId;
        this.reviewCards = [];
        this.currentCardIndex = 0;
        this.isCardFlipped = false;
        this.isSubmitting = false;
        this.sessionStats = { correct: 0, incorrect: 0 };
        this.sessionTimer = null;
        this.sessionDuration = 0;
        
        // Carrega as configurações (a ser implementado no futuro)
        this.settings = this.loadSettings();

        this.getDOMElements();
        this.initializeSession();
    }

    /**
     * Carrega as configurações do usuário do localStorage.
     */
    loadSettings() {
        const defaultSettings = { fontSize: 'medium', darkMode: false };
        try {
            const saved = localStorage.getItem('recall-study-settings');
            return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
        } catch (e) {
            console.error('Erro ao carregar configurações:', e);
            return defaultSettings;
        }
    }

    /**
     * Mapeia todos os elementos do DOM para propriedades da classe para fácil acesso.
     */
    getDOMElements() {
        this.dom = {
            loadingState: document.getElementById('loading-state'),
            studyContainer: document.getElementById('study-container'),
            completionContainer: document.getElementById('completion-container'),
            headerDeckTitle: document.getElementById('header-deck-title'),
            deckLink: document.getElementById('deck-link'),
            backToDeckLink2: document.getElementById('back-to-deck-link-2'),
            sessionTimer: document.getElementById('session-timer').querySelector('span'),
            progressIndicator: document.getElementById('progress-indicator'),
            statsCorrect: document.getElementById('stats-correct'),
            statsIncorrect: document.getElementById('stats-incorrect'),
            progressBar: document.getElementById('progress-bar'),
            prevCardBtn: document.getElementById('prev-card'),
            nextCardBtn: document.getElementById('next-card'),
            flipCard: document.getElementById('flip-card'),
            cardQuestion: document.getElementById('card-question'),
            cardAnswer: document.getElementById('card-answer'),
            cardPosition: document.getElementById('card-position'),
            flipButton: document.getElementById('flip-button'),
            qualityButtonsContainer: document.getElementById('quality-buttons'),
            feedbackOverlay: document.getElementById('card-feedback-overlay'),
            feedbackText: document.getElementById('feedback-text'),
            feedbackEmoji: document.querySelector('.feedback-emoji'),
            completionHeading: document.getElementById('completion-heading'),
            completionMessage: document.getElementById('completion-message'),
            sessionSummary: document.getElementById('session-summary'),
            restartSessionBtn: document.getElementById('restart-session-btn'),
        };
    }

    /**
     * Inicia a sessão, buscando dados e configurando a UI.
     */
    async initializeSession() {
        this.addEventListeners();
        this.dom.deckLink.href = `deck.html?id=${this.deckId}`;
        this.dom.backToDeckLink2.href = `deck.html?id=${this.deckId}`;

        try {
            this.showLoadingState();
            
            // Busca os cards e os detalhes do baralho em paralelo
            const [cards, decks] = await Promise.all([
                fetchReviewCards(this.deckId),
                fetchDecks() 
            ]);

            this.reviewCards = cards || [];
            
            const currentDeck = decks.find(d => d.id === this.deckId);
            if (currentDeck) {
                this.dom.headerDeckTitle.textContent = currentDeck.title;
            }

            if (this.reviewCards.length === 0) {
                this.showCompletionScreen(true); // true indica que não havia cards para revisar
                return;
            }

            this.startTimer();
            this.displayCard();
            this.hideLoadingState();

        } catch (error) {
            console.error('Erro ao iniciar a sessão:', error);
            showToast('Falha ao carregar a sessão de estudo.', 'error');
            this.showErrorState();
        }
    }

    /**
     * Centraliza a configuração de todos os event listeners.
     */
    addEventListeners() {
        this.dom.flipButton.addEventListener('click', () => this.flip());
        this.dom.prevCardBtn.addEventListener('click', () => this.navigateCard('prev'));
        this.dom.nextCardBtn.addEventListener('click', () => this.navigateCard('next'));
        this.dom.restartSessionBtn.addEventListener('click', () => this.initializeSession());
        
        this.dom.qualityButtonsContainer.addEventListener('click', (e) => {
            const qualityButton = e.target.closest('.quality-btn');
            if (qualityButton) {
                this.submitReview(parseInt(qualityButton.dataset.quality, 10));
            }
        });

        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
    }

    // --- MÉTODOS DE CONTROLE DA SESSÃO ---

    startTimer() {
        if (this.sessionTimer) clearInterval(this.sessionTimer);
        this.sessionTimer = setInterval(() => {
            this.sessionDuration++;
            const minutes = Math.floor(this.sessionDuration / 60).toString().padStart(2, '0');
            const seconds = (this.sessionDuration % 60).toString().padStart(2, '0');
            this.dom.sessionTimer.textContent = `${minutes}:${seconds}`;
        }, 1000);
    }

    displayCard() {
        if (this.currentCardIndex >= this.reviewCards.length) {
            this.showCompletionScreen();
            return;
        }

        const card = this.reviewCards[this.currentCardIndex];
        this.dom.cardQuestion.textContent = card.question;
        this.dom.cardAnswer.textContent = card.answer;
        
        this.resetCardState();
        this.updateProgress();
    }

    navigateCard(direction) {
        if (direction === 'prev' && this.currentCardIndex > 0) {
            this.currentCardIndex--;
        } else if (direction === 'next' && this.currentCardIndex < this.reviewCards.length - 1) {
            this.currentCardIndex++;
        }
        this.displayCard();
    }

    flip() {
        if (this.isCardFlipped) return;
        this.isCardFlipped = true;
        this.dom.flipCard.classList.add('is-flipped');
        this.dom.flipButton.classList.add('hidden');
        this.dom.qualityButtonsContainer.classList.remove('hidden');
    }

    async submitReview(quality) {
        if (this.isSubmitting) return;
        this.isSubmitting = true;

        const card = this.reviewCards[this.currentCardIndex];
        
        if (quality < 3) {
            this.sessionStats.incorrect++;
        } else {
            this.sessionStats.correct++;
        }

        this.showFeedback(quality);
        await submitReview(card.id, quality);

        setTimeout(() => {
            this.currentCardIndex++;
            this.displayCard();
        }, 800);
    }

    handleKeyPress(e) {
        if (e.code === 'Space' && !this.isCardFlipped) {
            e.preventDefault();
            this.flip();
        }
        if (this.isCardFlipped) {
            const keyMap = { '1': 1, '2': 3, '3': 4, '4': 5 };
            if (keyMap[e.key]) this.submitReview(keyMap[e.key]);
        }
    }

    // --- MÉTODOS DE ATUALIZAÇÃO DA UI ---

    updateProgress() {
        const total = this.reviewCards.length;
        const current = this.currentCardIndex + 1;
        const progress = total > 0 ? (current / total) * 100 : 0;

        this.dom.progressBar.style.width = `${progress}%`;
        this.dom.progressIndicator.textContent = `${current} de ${total}`;
        this.dom.cardPosition.textContent = `${current}/${total}`;
        this.dom.statsCorrect.textContent = this.sessionStats.correct;
        this.dom.statsIncorrect.textContent = this.sessionStats.incorrect;

        this.dom.prevCardBtn.disabled = this.currentCardIndex === 0;
        this.dom.nextCardBtn.disabled = this.currentCardIndex >= total - 1;
    }

    resetCardState() {
        this.isCardFlipped = false;
        this.isSubmitting = false;
        this.dom.flipCard.classList.remove('is-flipped');
        this.dom.flipButton.classList.remove('hidden');
        this.dom.qualityButtonsContainer.classList.add('hidden');
        this.dom.feedbackOverlay.classList.remove('visible');
    }

    showFeedback(quality) {
        const feedbackMap = {
            1: { text: 'Errei', className: 'errado', emoji: '😞' },
            3: { text: 'Difícil', className: 'dificil', emoji: '🧠' },
            4: { text: 'Bom', className: 'bom', emoji: '🙂' },
            5: { text: 'Fácil', className: 'facil', emoji: '😎' }
        };
        const { text, className, emoji } = feedbackMap[quality];

        this.dom.feedbackText.textContent = text;
        this.dom.feedbackEmoji.textContent = emoji;
        this.dom.feedbackOverlay.className = `card-feedback-overlay ${className} visible`;
    }

    showLoadingState() {
        this.dom.studyContainer.classList.add('hidden');
        this.dom.completionContainer.classList.add('hidden');
        this.dom.loadingState.classList.remove('hidden');
    }

    hideLoadingState() {
        this.dom.loadingState.classList.add('hidden');
        this.dom.studyContainer.classList.remove('hidden');
    }

    showErrorState() {
        this.dom.loadingState.innerHTML = `<p style="color: var(--color-danger);">Não foi possível carregar a sessão. Tente novamente.</p>`;
    }
    
    showCompletionScreen(noCards = false) {
        clearInterval(this.sessionTimer);
        this.hideLoadingState();
        this.dom.studyContainer.classList.add('hidden');
        this.dom.completionContainer.classList.remove('hidden');

        if (noCards) {
            this.dom.completionHeading.textContent = "Tudo em dia!";
            this.dom.completionMessage.textContent = "Você não tem nenhum card para revisar hoje. Excelente trabalho!";
            this.dom.sessionSummary.innerHTML = "";
            this.dom.restartSessionBtn.classList.add('hidden');
        } else {
            const total = this.reviewCards.length;
            const accuracy = total > 0 ? Math.round((this.sessionStats.correct / total) * 100) : 0;
            const time = this.dom.sessionTimer.textContent;

            this.dom.completionHeading.textContent = "Sessão Concluída!";
            this.dom.completionMessage.textContent = "Você revisou todos os cards agendados. Continue assim!";
            this.dom.sessionSummary.innerHTML = `
                <div class="summary-stats">
                    <div class="stat-box">
                        <div class="stat-value">${total}</div>
                        <div class="stat-label">Cards revisados</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">${this.sessionStats.correct}</div>
                        <div class="stat-label">Acertos</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">${time}</div>
                        <div class="stat-label">Tempo Total</div>
                    </div>
                </div>
                <div class="accuracy-meter">
                    <div class="accuracy-label">Taxa de acerto</div>
                    <div class="accuracy-bar">
                        <div class="accuracy-fill" style="width: ${accuracy}%;"></div>
                    </div>
                    <div class="accuracy-percentage">${accuracy}%</div>
                </div>
            `;
            this.dom.restartSessionBtn.classList.remove('hidden');
        }
    }
}