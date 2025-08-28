document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const deckId = params.get('deckId');

    if (!deckId) {
        showToast('ID do baralho não encontrado.', 'error');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
        return;
    }

    // Inicia a sessão de estudo com todas as novas funcionalidades
    new StudySessionPro(deckId);
});

/**
 * Classe premium que gerencia toda a lógica de uma sessão de estudo avançada.
 * Inclui timer, modo foco, estatísticas em tempo real e muito mais.
 */
class StudySessionPro {
    /**
     * @param {string} deckId - O ID do baralho a ser estudado.
     */
    constructor(deckId) {
        this.deckId = deckId;
        this.reviewCards = [];
        this.currentCardIndex = 0;
        this.isCardFlipped = false;
        this.isSubmitting = false;
        this.sessionStats = { 1: 0, 3: 0, 4: 0, 5: 0 }; // Errei, Difícil, Bom, Fácil
        this.sessionStartTime = null;
        this.sessionTimer = null;
        this.sessionDuration = 0;
        this.settings = this.loadSettings();
        this.speechSynthesis = window.speechSynthesis;
        this.cardHistory = [];
        this.flaggedCards = new Set();

        this.getDOMElements();
        this.initializeSession();
        this.addEventListeners();
        this.startSession();
    }

    /**
     * Carrega as configurações do usuário do localStorage
     */
    loadSettings() {
        const defaultSettings = {
            autoFlip: 0,
            readAloud: false,
            fontSize: 'medium',
            darkMode: false
        };

        try {
            const savedSettings = localStorage.getItem('recall-study-settings');
            return savedSettings ? { ...defaultSettings, ...JSON.parse(savedSettings) } : defaultSettings;
        } catch (e) {
            console.error('Erro ao carregar configurações:', e);
            return defaultSettings;
        }
    }

    /**
     * Seleciona e armazena as referências para os elementos do DOM
     */
    getDOMElements() {
        // Containers principais
        this.studyContainer = document.getElementById('study-container');
        this.completionContainer = document.getElementById('completion-container');
        this.focusModeOverlay = document.getElementById('focus-mode-overlay');
        
        // Elementos de navegação
        this.deckLink = document.getElementById('deck-link');
        this.backToDeckLink2 = document.getElementById('back-to-deck-link-2');
        this.prevCardBtn = document.getElementById('prev-card');
        this.nextCardBtn = document.getElementById('next-card');
        
        // Elementos de progresso
        this.progressBar = document.getElementById('progress-bar');
        this.progressIndicator = document.getElementById('progress-indicator');
        this.cardPosition = document.getElementById('card-position');
        this.statsCorrect = document.getElementById('stats-correct');
        this.statsIncorrect = document.getElementById('stats-incorrect');
        
        // Elementos do card
        this.flipCard = document.getElementById('flip-card');
        this.cardQuestion = document.getElementById('card-question');
        this.cardAnswer = document.getElementById('card-answer');
        this.flipButton = document.getElementById('flip-button');
        
        // Controles de qualidade
        this.qualityButtonsContainer = document.getElementById('quality-buttons');
        this.feedbackOverlay = document.getElementById('card-feedback-overlay');
        this.feedbackText = document.getElementById('feedback-text');
        
        // Timer
        this.sessionTimerElement = document.getElementById('session-timer');
        
        // Elementos de conclusão
        this.sessionSummary = document.getElementById('session-summary');
        this.summaryTotal = document.getElementById('summary-total');
        this.summaryCorrect = document.getElementById('summary-correct');
        this.summaryTime = document.getElementById('summary-time');
        this.accuracyFill = document.getElementById('accuracy-fill');
        this.accuracyPercentage = document.getElementById('accuracy-percentage');
        
        // Botões e modais
        this.focusModeBtn = document.getElementById('focus-mode-btn');
        this.exitFocusModeBtn = document.getElementById('exit-focus-mode');
        this.settingsBtn = document.getElementById('session-settings-btn');
        this.restartSessionBtn = document.getElementById('restart-session-btn');
        this.readAloudBtn = document.getElementById('read-aloud-btn');
        this.explainButton = document.getElementById('explain-button');
        this.explanationModal = document.getElementById('explanation-modal');
        this.explanationContent = document.getElementById('explanation-content');
        this.closeExplanationModalBtn = document.getElementById('close-explanation-modal-btn');
        this.readExplanationBtn = document.getElementById('read-explanation-btn');
        this.settingsModal = document.getElementById('settings-modal');
        this.closeSettingsModalBtn = document.querySelector('.close-settings-modal');
        this.saveSettingsBtn = document.querySelector('.save-settings');
        
        // Ações do card
        this.cardActionsBtn = document.getElementById('card-actions-btn');
        this.cardActionsMenu = document.getElementById('card-actions-menu');
        this.editCardBtn = document.getElementById('edit-card-btn');
        this.flagCardBtn = document.getElementById('flag-card-btn');
        this.skipCardBtn = document.getElementById('skip-card-btn');
    }

    /**
     * Inicializa a sessão com as configurações do usuário
     */
    initializeSession() {
        // Aplica configurações de fonte
        document.documentElement.setAttribute('data-font-size', this.settings.fontSize);
        
        // Aplica modo escuro se habilitado
        if (this.settings.darkMode) {
            document.body.classList.add('dark-mode');
        }
        
        // Configura links de navegação
        this.deckLink.href = `deck.html?id=${this.deckId}`;
        this.backToDeckLink2.href = `deck.html?id=${this.deckId}`;
    }

    /**
     * Adiciona todos os event listeners necessários
     */
    addEventListeners() {
        // Navegação básica
        this.flipButton.addEventListener('click', () => this.flip());
        this.prevCardBtn.addEventListener('click', () => this.navigateCard('prev'));
        this.nextCardBtn.addEventListener('click', () => this.navigateCard('next'));
        
        // Botões de qualidade
        this.qualityButtonsContainer.addEventListener('click', (e) => {
            const qualityButton = e.target.closest('.quality-btn');
            if (qualityButton) {
                this.submitReview(parseInt(qualityButton.dataset.quality, 10));
            }
        });
        
        // Modo foco
        this.focusModeBtn.addEventListener('click', () => this.toggleFocusMode());
        this.exitFocusModeBtn.addEventListener('click', () => this.toggleFocusMode(false));
        
        // Leitura em voz alta
        this.readAloudBtn.addEventListener('click', () => this.readAloud('answer'));
        this.readExplanationBtn.addEventListener('click', () => this.readAloud('explanation'));
        
        // Explicação da IA
        this.explainButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleExplainClick();
        });
        this.closeExplanationModalBtn.addEventListener('click', () => this.closeExplanationModal());
        this.explanationModal.addEventListener('click', (e) => {
            if (e.target === this.explanationModal) this.closeExplanationModal();
        });
        
        // Configurações
        this.settingsBtn.addEventListener('click', () => this.openSettings());
        this.closeSettingsModalBtn.addEventListener('click', () => this.closeSettings());
        this.saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        
        // Ações do card
        this.cardActionsBtn.addEventListener('click', (e) => this.toggleCardActionsMenu(e));
        this.editCardBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.editCurrentCard();
        });
        this.flagCardBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleFlagCurrentCard();
        });
        this.skipCardBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.skipCurrentCard();
        });
        
        // Reiniciar sessão
        this.restartSessionBtn.addEventListener('click', () => this.restartSession());
        
        // Teclado
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // Fechar menu de ações ao clicar fora
        document.addEventListener('click', (e) => {
            if (this.cardActionsMenu && !this.cardActionsMenu.contains(e.target) && 
                e.target !== this.cardActionsBtn) {
                this.cardActionsMenu.classList.add('hidden');
            }
        });
        
        // Gerenciar o timer quando a página perde/ganha foco
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseTimer();
            } else {
                this.resumeTimer();
            }
        });
    }

    /**
     * Inicia a sessão: busca os cards para revisão e exibe o primeiro
     */
    async startSession() {
        try {
            this.showLoadingState();
            this.reviewCards = await fetchReviewCards(this.deckId);
            
            if (!this.reviewCards || this.reviewCards.length === 0) {
                this.showCompletionScreen(true);
                return;
            }
            
            this.currentCardIndex = 0;
            this.sessionStartTime = new Date();
            this.startTimer();
            this.displayCard();
            this.hideLoadingState();
        } catch (error) {
            console.error('Erro ao iniciar sessão:', error);
            showToast('Erro ao carregar os cards. Tente novamente.', 'error');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
        }
    }

    /**
     * Exibe o estado de carregamento
     */
        showLoadingState() {
        // Apenas esconde o conteúdo de estudo e mostra o de carregamento
        document.getElementById('study-content')?.classList.add('hidden');
        document.getElementById('loading-state')?.classList.remove('hidden');
    }

    /**
     * Remove o estado de carregamento
     */
    hideLoadingState() {
        // Esconde o carregamento e mostra o conteúdo de estudo
        document.getElementById('loading-state')?.classList.add('hidden');
        document.getElementById('study-content')?.classList.remove('hidden');
    }

    /**
     * Inicia o timer da sessão
     */
    startTimer() {
        this.sessionTimer = setInterval(() => {
            this.sessionDuration += 1;
            this.updateTimerDisplay();
        }, 1000);
    }

    /**
     * Pausa o timer da sessão
     */
    pauseTimer() {
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
            this.sessionTimer = null;
        }
    }

    /**
     * Retoma o timer da sessão
     */
    resumeTimer() {
        if (!this.sessionTimer) {
            this.startTimer();
        }
    }

    /**
     * Atualiza a exibição do timer
     */
    updateTimerDisplay() {
        if (!this.sessionTimerElement) return;
        
        const minutes = Math.floor(this.sessionDuration / 60);
        const seconds = this.sessionDuration % 60;
        this.sessionTimerElement.querySelector('span').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Exibe o card atual na tela
     */
    displayCard() {
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

        // Atualiza a UI
        this.updateProgress();
        this.updateCardPosition();
        this.updateNavigationButtons();
        this.resetCardState();

        // Configura o auto-flip se habilitado
        this.setupAutoFlip();

        // Adiciona ao histórico
        this.cardHistory.push({
            id: card.id,
            index: this.currentCardIndex,
            timestamp: new Date()
        });
    }

    /**
     * Configura o auto-flip baseado nas configurações do usuário
     */
    setupAutoFlip() {
        // Cancela qualquer auto-flip anterior
        if (this.autoFlipTimer) {
            clearTimeout(this.autoFlipTimer);
        }
        
        // Configura novo auto-flip se habilitado
        if (this.settings.autoFlip > 0 && !this.isCardFlipped) {
            this.autoFlipTimer = setTimeout(() => {
                this.flip();
            }, this.settings.autoFlip * 1000);
        }
    }

    /**
     * Reseta o estado do card para o padrão
     */
    resetCardState() {
        this.isCardFlipped = false;
        this.isSubmitting = false;
        this.flipCard.classList.remove('is-flipped');
        this.flipButton.classList.remove('hidden');
        this.qualityButtonsContainer.classList.add('hidden');
        this.hideFeedback();
    }

    /**
     * Atualiza os botões de navegação (anterior/próximo)
     */
    updateNavigationButtons() {
        this.prevCardBtn.disabled = this.currentCardIndex === 0;
        this.nextCardBtn.disabled = this.currentCardIndex === this.reviewCards.length - 1;
    }

    /**
     * Atualiza o indicador de posição do card
     */
    updateCardPosition() {
        this.cardPosition.textContent = `${this.currentCardIndex + 1}/${this.reviewCards.length}`;
    }

    /**
     * Navega para o card anterior ou próximo
     * @param {string} direction - 'prev' ou 'next'
     */
    navigateCard(direction) {
        if (direction === 'prev' && this.currentCardIndex > 0) {
            this.currentCardIndex--;
            this.displayCard();
        } else if (direction === 'next' && this.currentCardIndex < this.reviewCards.length - 1) {
            this.currentCardIndex++;
            this.displayCard();
        }
    }

    /**
     * Vira o card para mostrar a resposta
     */
    flip() {
        if (this.isCardFlipped) return;
        
        this.isCardFlipped = true;
        this.flipCard.classList.add('is-flipped');
        this.flipButton.classList.add('hidden');
        this.qualityButtonsContainer.classList.remove('hidden');
        
        // Se a leitura automática estiver ativada, ler a resposta
        if (this.settings.readAloud) {
            this.readAloud('answer');
        }
    }

    /**
     * Lê o conteúdo em voz alta
     * @param {string} type - 'question', 'answer' ou 'explanation'
     */
    readAloud(type) {
        if (this.speechSynthesis.speaking) {
            this.speechSynthesis.cancel();
            return;
        }

        let text = '';
        if (type === 'question') {
            text = this.cardQuestion.textContent;
        } else if (type === 'answer') {
            text = this.cardAnswer.textContent;
        } else if (type === 'explanation' && this.explanationContent.textContent) {
            text = this.explanationContent.textContent;
        }

        if (!text) return;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;

        // Adiciona indicador visual de que está lendo
        const targetElement = type === 'explanation' ? this.readExplanationBtn : this.readAloudBtn;
        targetElement.classList.add('reading');

        utterance.onend = () => {
            targetElement.classList.remove('reading');
        };

        utterance.onerror = () => {
            targetElement.classList.remove('reading');
            showToast('Erro ao ler o texto. Verifique sua configuração de voz.', 'error');
        };

        this.speechSynthesis.speak(utterance);
    }

    /**
     * Envia a avaliação do usuário para o card atual
     * @param {number} quality - A avaliação da resposta (1, 3, 4, ou 5)
     */
    async submitReview(quality) {
        if (!this.isCardFlipped || this.isSubmitting) return;
        this.isSubmitting = true;

        const card = this.reviewCards[this.currentCardIndex];
        this.sessionStats[quality]++;

        // Atualiza estatísticas em tempo real
        this.updateRealTimeStats(quality);

        // Envia a avaliação para a API (não bloqueia a UI)
        submitReview(card.id, quality).catch(error => {
            console.error('Erro ao enviar avaliação:', error);
            // Não mostra erro para o usuário para não interromper o fluxo
        });

        // Mostra feedback visual
        this.showFeedback(quality);

        // Avança para o próximo card após um breve delay
        setTimeout(() => {
            this.hideFeedback();
            this.currentCardIndex++;
            this.displayCard();
        }, 800);
    }

    /**
     * Atualiza as estatísticas em tempo real
     * @param {number} quality - A avaliação da resposta
     */
    updateRealTimeStats(quality) {
        // Atualiza contadores de acertos/erros
        if (quality === 1) {
            // Resposta errada
            this.statsIncorrect.textContent = parseInt(this.statsIncorrect.textContent || 0) + 1;
        } else {
            // Resposta correta (dificil, bom, facil)
            this.statsCorrect.textContent = parseInt(this.statsCorrect.textContent || 0) + 1;
        }
    }

    /**
     * Mostra o feedback visual para a avaliação
     * @param {number} quality - A avaliação que determina o feedback
     */
    showFeedback(quality) {
        const feedbackMap = {
            1: { text: 'Errei', className: 'errado', emoji: '😞' },
            3: { text: 'Difícil', className: 'dificil', emoji: '😅' },
            4: { text: 'Bom', className: 'bom', emoji: '🙂' },
            5: { text: 'Fácil', className: 'facil', emoji: '😎' }
        };
        const { text, className, emoji } = feedbackMap[quality];

        this.feedbackText.textContent = text;
        this.feedbackOverlay.querySelector('.feedback-emoji').textContent = emoji;
        this.feedbackOverlay.className = `card-feedback-overlay ${className} visible`;
    }

    /**
     * Esconde o feedback visual
     */
    hideFeedback() {
        this.feedbackOverlay.className = 'card-feedback-overlay';
    }

    /**
     * Gerencia o menu de ações do card
     * @param {Event} e - O evento de clique
     */
    toggleCardActionsMenu(e) {
        e.stopPropagation();
        this.cardActionsMenu.classList.toggle('hidden');
        
        // Posiciona o menu próximo ao botão
        const rect = this.cardActionsBtn.getBoundingClientRect();
        this.cardActionsMenu.style.top = `${rect.bottom + window.scrollY + 5}px`;
        this.cardActionsMenu.style.left = `${rect.left + window.scrollX}px`;
        
        // Atualiza o texto do botão de marcação baseado no estado atual
        const card = this.reviewCards[this.currentCardIndex];
        this.flagCardBtn.innerHTML = this.flaggedCards.has(card.id) ? 
            '<i class="fas fa-flag"></i> Desmarcar' : 
            '<i class="fas fa-flag"></i> Marcar para revisão';
    }

    /**
     * Alterna o estado de marcação do card atual
     */
    toggleFlagCurrentCard() {
        const card = this.reviewCards[this.currentCardIndex];
        if (this.flaggedCards.has(card.id)) {
            this.flaggedCards.delete(card.id);
            showToast('Card desmarcado.', 'info');
        } else {
            this.flaggedCards.add(card.id);
            showToast('Card marcado para revisão posterior.', 'success');
        }
        this.cardActionsMenu.classList.add('hidden');
    }

    /**
     * Abre a tela de edição para o card atual
     */
    editCurrentCard() {
        const card = this.reviewCards[this.currentCardIndex];
        showToast('Redirecionando para edição do card...', 'info');
        setTimeout(() => {
            window.location.href = `deck.html?id=${this.deckId}&editCard=${card.id}`;
        }, 1000);
    }

    /**
     * Pula o card atual e avança para o próximo
     */
    skipCurrentCard() {
        this.cardActionsMenu.classList.add('hidden');
        showToast('Card pulado.', 'info');
        this.currentCardIndex++;
        this.displayCard();
    }

    /**
     * Lida com os atalhos de teclado
     * @param {KeyboardEvent} e - O evento de teclado
     */
    handleKeyPress(e) {
        // Ignora atalhos se o modal de explicação ou configurações estiver aberto
        if (this.explanationModal.classList.contains('visible') || 
            this.settingsModal.classList.contains('visible')) {
            return;
        }

        // Atalho para virar o card
        if (e.code === 'Space' && !this.isCardFlipped) {
            e.preventDefault();
            this.flip();
        }

        // Atalhos para avaliação da resposta
        if (this.isCardFlipped) {
            switch (e.key) {
                case '1': this.submitReview(1); break;
                case '2': this.submitReview(3); break;
                case '3': this.submitReview(4); break;
                case '4': this.submitReview(5); break;
            }
        }

        // Navegação com setas
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            this.navigateCard('prev');
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            this.navigateCard('next');
        }

        // Modo foco (F)
        if (e.key === 'f' || e.key === 'F') {
            e.preventDefault();
            this.toggleFocusMode();
        }

        // Leitura em voz alta (R)
        if ((e.key === 'r' || e.key === 'R') && this.isCardFlipped) {
            e.preventDefault();
            this.readAloud('answer');
        }

        // Explicação da IA (E)
        if ((e.key === 'e' || e.key === 'E') && this.isCardFlipped) {
            e.preventDefault();
            this.handleExplainClick();
        }
    }

    /**
     * Alterna o modo foco (tela cheia com apenas o card)
     * @param {boolean} enable - Se true, ativa o modo foco; se false, desativa
     */
    toggleFocusMode(enable = null) {
        const shouldEnable = enable !== null ? enable : !this.focusModeOverlay.classList.contains('visible');
        
        if (shouldEnable) {
            this.focusModeOverlay.classList.add('visible');
            document.documentElement.style.overflow = 'hidden';
            
            // Mostra o conteúdo do card atual no modo foco
            const card = this.reviewCards[this.currentCardIndex];
            const text = this.isCardFlipped ? card.answer : card.question;
            document.getElementById('focus-text').textContent = text;
        } else {
            this.focusModeOverlay.classList.remove('visible');
            document.documentElement.style.overflow = '';
        }
    }

    /**
     * Busca e exibe a explicação da IA para o card atual
     */
    async handleExplainClick() {
        this.cardActionsMenu.classList.add('hidden');
        
        const card = this.reviewCards[this.currentCardIndex];
        
        // Mostra o modal com estado de carregamento
        this.explanationModal.classList.add('visible');
        this.explanationContent.innerHTML = `
            <div class="explanation-loading">
                <div class="loading-spinner"></div>
                <p>Gerando explicação personalizada...</p>
            </div>
        `;

        try {
            const result = await fetchExplanation(card.id);
            
            if (result && result.explanation) {
                this.explanationContent.innerHTML = '';
                const explanationParagraph = document.createElement('p');
                explanationParagraph.textContent = result.explanation;
                this.explanationContent.appendChild(explanationParagraph);
                
                // Se a leitura automática estiver ativada, ler a explicação
                if (this.settings.readAloud) {
                    setTimeout(() => this.readAloud('explanation'), 500);
                }
            } else {
                throw new Error('Explicação não disponível');
            }
        } catch (error) {
            console.error('Erro ao buscar explicação:', error);
            this.explanationContent.innerHTML = `
                <p class="error-message">Não foi possível carregar a explicação no momento. Tente novamente mais tarde.</p>
            `;
        }
    }

    /**
     * Fecha o modal de explicação da IA
     */
    closeExplanationModal() {
        this.explanationModal.classList.remove('visible');
        // Cancela a leitura em voz alto se estiver acontecendo
        if (this.speechSynthesis.speaking) {
            this.speechSynthesis.cancel();
        }
    }

    /**
     * Abre o modal de configurações
     */
    openSettings() {
        // Preenche o formulário com as configurações atuais
        document.getElementById('auto-flip').value = this.settings.autoFlip;
        document.getElementById('read-aloud').checked = this.settings.readAloud;
        document.getElementById('font-size').value = this.settings.fontSize;
        document.getElementById('dark-mode').checked = this.settings.darkMode;
        
        this.settingsModal.classList.add('visible');
    }

    /**
     * Fecha o modal de configurações
     */
    closeSettings() {
        this.settingsModal.classList.remove('visible');
    }

    /**
     * Salva as configurações do usuário
     */
    saveSettings() {
        this.settings = {
            autoFlip: parseInt(document.getElementById('auto-flip').value),
            readAloud: document.getElementById('read-aloud').checked,
            fontSize: document.getElementById('font-size').value,
            darkMode: document.getElementById('dark-mode').checked
        };
        
        // Aplica as novas configurações
        document.documentElement.setAttribute('data-font-size', this.settings.fontSize);
        
        if (this.settings.darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        
        // Salva no localStorage
        try {
            localStorage.setItem('recall-study-settings', JSON.stringify(this.settings));
            showToast('Configurações salvas com sucesso!', 'success');
        } catch (e) {
            console.error('Erro ao salvar configurações:', e);
            showToast('Erro ao salvar configurações.', 'error');
        }
        
        this.closeSettings();
    }

    /**
     * Atualiza a barra e o texto de progresso da sessão
     */
    updateProgress() {
        const totalCards = this.reviewCards.length;
        const currentCardNumber = Math.min(this.currentCardIndex + 1, totalCards);
        const progressPercentage = totalCards > 0 ? (currentCardNumber / totalCards) * 100 : 0;

        this.progressBar.style.width = `${progressPercentage}%`;
        this.progressIndicator.textContent = `${currentCardNumber} de ${totalCards}`;
    }

    /**
     * Exibe a tela de conclusão da sessão
     * @param {boolean} noCardsAtStart - Se verdadeiro, não havia cards para revisar
     */
    showCompletionScreen(noCardsAtStart = false) {
        // Para o timer
        this.pauseTimer();
        
        this.studyContainer.classList.add('hidden');
        this.completionContainer.classList.remove('hidden');
        
        this.renderSessionSummary(noCardsAtStart);
        this.updateProfileHeader();
        
        // Registra a sessão concluída
        this.recordSessionCompletion();
    }

    /**
     * Registra a conclusão da sessão para estatísticas
     */
    recordSessionCompletion() {
        const sessionData = {
            deckId: this.deckId,
            duration: this.sessionDuration,
            totalCards: this.reviewCards.length,
            stats: this.sessionStats,
            completedAt: new Date().toISOString()
        };
        
        // Salva no histórico local
        try {
            const sessionHistory = JSON.parse(localStorage.getItem('recall-session-history') || '[]');
            sessionHistory.unshift(sessionData);
            // Mantém apenas as 50 últimas sessões
            localStorage.setItem('recall-session-history', JSON.stringify(sessionHistory.slice(0, 50)));
        } catch (e) {
            console.error('Erro ao salvar histórico de sessão:', e);
        }
    }

    /**
     * Renderiza o resumo da sessão
     * @param {boolean} noCardsAtStart - Se verdadeiro, mostra mensagem específica
     */
    renderSessionSummary(noCardsAtStart) {
        if (noCardsAtStart) {
            document.getElementById('completion-heading').textContent = "Tudo em dia!";
            this.sessionSummary.innerHTML = `
                <p>Você não tem cards para revisar hoje. Ótimo trabalho por manter tudo atualizado!</p>
            `;
            return;
        }

        document.getElementById('completion-heading').textContent = "Sessão Concluída!";
        
        const totalCards = this.reviewCards.length;
        const correctAnswers = this.sessionStats[3] + this.sessionStats[4] + this.sessionStats[5];
        const accuracy = totalCards > 0 ? Math.round((correctAnswers / totalCards) * 100) : 0;
        
        // Formata o tempo de sessão
        const minutes = Math.floor(this.sessionDuration / 60);
        const seconds = this.sessionDuration % 60;
        const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Atualiza os elementos de resumo
        this.summaryTotal.textContent = totalCards;
        this.summaryCorrect.textContent = correctAnswers;
        this.summaryTime.textContent = formattedTime;
        this.accuracyFill.style.width = `${accuracy}%`;
        this.accuracyPercentage.textContent = `${accuracy}%`;
        
        // Gera o HTML do resumo
        this.sessionSummary.innerHTML = `
            <div class="summary-stats">
                <div class="stat-box">
                    <div class="stat-value" id="summary-total">${totalCards}</div>
                    <div class="stat-label">Cards revisados</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value" id="summary-correct">${correctAnswers}</div>
                    <div class="stat-label">Acertos</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value" id="summary-time">${formattedTime}</div>
                    <div class="stat-label">Tempo total</div>
                </div>
            </div>
            
            <div class="accuracy-meter">
                <div class="accuracy-label">Taxa de acerto</div>
                <div class="accuracy-bar">
                    <div class="accuracy-fill" id="accuracy-fill" style="width: ${accuracy}%"></div>
                </div>
                <div class="accuracy-percentage" id="accuracy-percentage">${accuracy}%</div>
            </div>
        `;
    }

    /**
     * Reinicia a sessão de estudo
     */
    restartSession() {
        this.completionContainer.classList.add('hidden');
        this.studyContainer.classList.remove('hidden');
        
        // Reseta o estado da sessão
        this.currentCardIndex = 0;
        this.sessionStats = { 1: 0, 3: 0, 4: 0, 5: 0 };
        this.sessionDuration = 0;
        this.sessionStartTime = new Date();
        this.cardHistory = [];
        
        // Atualiza a UI
        this.statsCorrect.textContent = '0';
        this.statsIncorrect.textContent = '0';
        this.updateTimerDisplay();
        
        // Reinicia o timer e exibe o primeiro card
        this.startTimer();
        this.displayCard();
    }

    /**
     * Atualiza o header com as informações do perfil
     */
    async updateProfileHeader() {
        try {
            const profile = await fetchProfile();
            if (profile) {
                document.getElementById('user-points').textContent = profile.points || 0;
                document.getElementById('user-streak').textContent = profile.current_streak || 0;
            }
        } catch (error) {
            console.error('Erro ao atualizar header do perfil:', error);
        }
    }
}