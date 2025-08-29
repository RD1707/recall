const CONFIG = {
    ANIMATION_DURATION: 300,
    FEEDBACK_DURATION: 600,
    AUTO_FLIP_DELAY: 800,
    PREVIEW_CARDS: 3,
    MIN_SWIPE_DISTANCE: 50,
    VIBRATION_PATTERNS: {
        success: [50, 100, 50],
        error: [100, 50, 100, 50, 100],
        warning: [75, 75, 75]
    },
    SOUNDS: {
        flip: '/sounds/flip.mp3',
        correct: '/sounds/correct.mp3',
        wrong: '/sounds/wrong.mp3',
        complete: '/sounds/complete.mp3',
        achievement: '/sounds/achievement.mp3'
    },
    ACHIEVEMENT_THRESHOLDS: {
        speedDemon: { cards: 10, minutes: 2 },
        perfectStreak: { streak: 10 },
        marathoner: { minutes: 30 },
        accuracy: { percentage: 95, minimum: 20 }
    },
    QUALITY_INTERVALS: {
        1: '<1min',
        2: '~6min',
        3: '~10min',
        4: '~4dias'
    }
};

class StudySessionPro {
    constructor(deckId) {
        this.deckId = deckId;
        this.state = {
            cards: [],
            currentIndex: 0,
            isFlipped: false,
            isTransitioning: false,
            sessionActive: true,
            mode: 'normal',
            startTime: Date.now(),
            stats: {
                correct: 0,
                wrong: 0,
                hard: 0,
                easy: 0,
                totalTime: 0,
                cardTimes: [],
                streak: 0,
                maxStreak: 0
            },
            filters: {
                onlyMistakes: false,
                onlyFlagged: false,
                difficulty: 'all'
            },
            achievements: new Set(),
            userPreferences: this.loadPreferences()
        };

        this.init();
    }

    async init() {
        try {
            this.setupDOM();
            this.bindEvents();
            this.initializeAudio();
            this.setupKeyboardShortcuts();
            this.setupTouchGestures();
            this.applyUserPreferences();

            await this.loadSession();

            this.startTimer();
            this.render();
            this.preloadNextCards();

            this.analytics.sessionStart();

        } catch (error) {
            console.error('Erro na inicialização:', error);
            this.handleError(error);
        }
    }

    setupDOM() {
        this.dom = {
            loadingState: document.getElementById('loading-state'),
            studyContainer: document.getElementById('study-container'),
            completionContainer: document.getElementById('completion-container'),

            deckTitle: document.getElementById('deck-title'),
            timer: document.getElementById('timer'),
            totalCards: document.getElementById('total-cards'),
            streakCount: document.getElementById('streak-count'),

            currentCard: document.getElementById('current-card'),
            totalReview: document.getElementById('total-review'),
            progressFill: document.getElementById('global-progress-fill'),
            correctCount: document.getElementById('correct-count'),
            hardCount: document.getElementById('hard-count'),
            wrongCount: document.getElementById('wrong-count'),

            flipCard: document.getElementById('flip-card'),
            cardQuestion: document.getElementById('card-question'),
            cardAnswer: document.getElementById('card-answer'),
            hintSection: document.getElementById('hint-section'),
            hintContent: document.getElementById('hint-content'),
            explanationSection: document.getElementById('explanation-section'),
            explanationContent: document.getElementById('explanation-content'),

            prevCard: document.getElementById('prev-card'),
            nextCard: document.getElementById('next-card'),
            flipBtn: document.getElementById('flip-btn'),
            qualityButtons: document.getElementById('quality-buttons'),

            feedbackOverlay: document.getElementById('feedback-overlay'),

            cardsPerMinute: document.getElementById('cards-per-minute'),
            accuracyRate: document.getElementById('accuracy-rate'),
            retentionScore: document.getElementById('retention-score'),

            shortcutsModal: document.getElementById('shortcuts-modal'),
            settingsModal: document.getElementById('settings-modal'),
            notesModal: document.getElementById('notes-modal'),

            bookmarkBtn: document.getElementById('bookmark-btn'),
            flagBtn: document.getElementById('flag-btn'),
            notesBtn: document.getElementById('notes-btn'),
            fullscreenBtn: document.getElementById('fullscreen-btn'),

            modeBtns: document.querySelectorAll('.mode-btn'),

            cardIndicators: document.querySelector('.card-indicators')
        };
    }

    bindEvents() {
        this.dom.flipBtn?.addEventListener('click', () => this.flipCard());
        this.dom.prevCard?.addEventListener('click', () => this.navigateCard('prev'));
        this.dom.nextCard?.addEventListener('click', () => this.navigateCard('next'));

        this.dom.qualityButtons?.addEventListener('click', (e) => {
            const btn = e.target.closest('.quality-btn');
            if (btn) {
                this.submitAnswer(parseInt(btn.dataset.quality));
            }
        });

        this.dom.modeBtns.forEach(btn => {
            btn.addEventListener('click', () => this.changeMode(btn.dataset.mode));
        });

        this.dom.bookmarkBtn?.addEventListener('click', () => this.toggleBookmark());
        this.dom.flagBtn?.addEventListener('click', () => this.toggleFlag());
        this.dom.notesBtn?.addEventListener('click', () => this.openNotesModal());
        this.dom.fullscreenBtn?.addEventListener('click', () => this.toggleFullscreen());

        document.getElementById('shortcuts-btn')?.addEventListener('click', () => {
            this.dom.shortcutsModal.showModal();
        });

        document.getElementById('settings-btn')?.addEventListener('click', () => {
            this.dom.settingsModal.showModal();
        });

        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('dialog').close();
            });
        });

        document.getElementById('show-hint')?.addEventListener('click', () => this.toggleHint());

        document.getElementById('back-btn')?.addEventListener('click', () => {
            if (confirm('Tem certeza que deseja sair? Seu progresso será salvo.')) {
                this.endSession();
            }
        });

        document.getElementById('review-mistakes')?.addEventListener('click', () => {
            this.reviewMistakes();
        });

        document.getElementById('continue-studying')?.addEventListener('click', () => {
            this.continueStudying();
        });

        document.getElementById('font-size')?.addEventListener('input', (e) => {
            this.updateFontSize(e.target.value);
        });

        document.querySelectorAll('.toggle-option').forEach(btn => {
            btn.addEventListener('click', () => {
                const group = btn.parentElement;
                group.querySelectorAll('.toggle-option').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                if (btn.dataset.theme) {
                    this.changeTheme(btn.dataset.theme);
                }
            });
        });

        document.getElementById('auto-flip')?.addEventListener('change', (e) => {
            this.state.userPreferences.autoFlip = e.target.checked;
            this.savePreferences();
        });

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseTimer();
            } else {
                this.resumeTimer();
            }
        });

        window.addEventListener('beforeunload', (e) => {
            if (this.state.sessionActive && this.state.cards.length > 0) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }

    setupKeyboardShortcuts() {
        const shortcuts = {
            ' ': () => this.handleSpacebar(),
            'Enter': () => this.handleSpacebar(),
            'ArrowLeft': () => this.navigateCard('prev'),
            'ArrowRight': () => this.navigateCard('next'),
            '1': () => this.quickAnswer(1),
            '2': () => this.quickAnswer(2),
            '3': () => this.quickAnswer(3),
            '4': () => this.quickAnswer(4),
            'h': () => this.toggleHint(),
            'b': () => this.toggleBookmark(),
            'f': () => this.toggleFlag(),
            'n': () => this.openNotesModal(),
            'Escape': () => this.handleEscape(),
            'F11': () => this.toggleFullscreen(),
            's': () => this.dom.settingsModal.showModal(),
            '?': () => this.dom.shortcutsModal.showModal()
        };

        document.addEventListener('keydown', (e) => {
            if (e.target.matches('input, textarea')) return;

            const handler = shortcuts[e.key];
            if (handler) {
                e.preventDefault();
                handler();
            }
        });
    }

    setupTouchGestures() {
        if (!('ontouchstart' in window)) return;

        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let touchEndY = 0;

        const cardElement = this.dom.flipCard;
        if (!cardElement) return;

        cardElement.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });

        cardElement.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;
            this.handleSwipe(touchStartX, touchStartY, touchEndX, touchEndY);
        }, { passive: true });

        let lastTap = 0;
        cardElement.addEventListener('touchend', (e) => {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            if (tapLength < 500 && tapLength > 0) {
                e.preventDefault();
                this.flipCard();
            }
            lastTap = currentTime;
        });
    }

    handleSwipe(startX, startY, endX, endY) {
        const diffX = endX - startX;
        const diffY = endY - startY;

        if (Math.abs(diffX) > Math.abs(diffY)) {
            if (Math.abs(diffX) > CONFIG.MIN_SWIPE_DISTANCE) {
                if (diffX > 0) {
                    this.navigateCard('prev');
                } else {
                    this.navigateCard('next');
                }
            }
        }
    }

    async loadSession() {
        try {
            this.showLoading('Carregando flashcards...');

            const [cards, deckInfo, userStats] = await Promise.all([
                fetchReviewCards(this.deckId),
                this.fetchDeckInfo(),
                this.fetchUserStats()
            ]);

            if (!cards || cards.length === 0) {
                this.showEmptyState();
                return;
            }

            this.state.cards = this.processCards(cards);

            this.updateDeckInfo(deckInfo);
            this.updateUserStats(userStats);

            this.createCardIndicators();

            this.hideLoading();

        } catch (error) {
            console.error('Erro ao carregar sessão:', error);
            this.showError('Não foi possível carregar os flashcards. Por favor, tente novamente.');
        }
    }

    processCards(cards) {
        return cards.map((card, index) => ({
            ...card,
            index,
            studied: false,
            flagged: false,
            bookmarked: false,
            timeSpent: 0,
            attempts: 0,
            lastQuality: null,
            notes: [],
            hint: card.hint || null,
            explanation: card.explanation || null,
            tags: card.tags || [],
            difficulty: this.calculateDifficulty(card),
            nextReview: this.calculateNextReview(card)
        }));
    }

    calculateDifficulty(card) {
        const successRate = card.success_count / (card.total_reviews || 1);
        if (successRate > 0.8) return 'easy';
        if (successRate > 0.5) return 'medium';
        return 'hard';
    }

    calculateNextReview(card) {
        const intervals = [1, 6, 10, 30, 90, 180, 365];
        const index = Math.min(card.review_count || 0, intervals.length - 1);
        return intervals[index];
    }

    async fetchDeckInfo() {
        try {
            const decks = await fetchDecks();
            return decks.find(d => d.id === this.deckId);
        } catch (error) {
            console.error('Erro ao buscar informações do deck:', error);
            return null;
        }
    }

    async fetchUserStats() {
        try {
            const profile = await fetchProfile();
            return {
                streak: profile?.current_streak || 0,
                totalPoints: profile?.points || 0
            };
        } catch (error) {
            console.error('Erro ao buscar estatísticas do usuário:', error);
            return { streak: 0, totalPoints: 0 };
        }
    }


    render() {
    const card = this.getCurrentCard();
    if (!card) return;

    // Reset card state when rendering a new card
    this.dom.flipCard.classList.remove('is-flipped');
    this.state.isFlipped = false;
    
    this.renderCard(card);
    this.updateProgress();
    this.updateStats();
    this.updateNavigation();
    this.updateIndicators();

    if (this.state.userPreferences.showPreviews) {
        this.renderPreviews();
    }
}

    renderCard(card) {
        this.dom.flipCard.classList.remove('is-flipped');
        this.state.isFlipped = false;

        this.dom.cardQuestion.textContent = card.question;
        this.dom.cardAnswer.textContent = card.answer;

        this.updateCardDifficulty(card.difficulty);
        this.updateCardTags(card.tags);

        if (card.hint) {
            this.dom.hintSection.classList.remove('hidden');
            this.dom.hintContent.textContent = card.hint;
        } else {
            this.dom.hintSection.classList.add('hidden');
        }

        if (card.explanation) {
            this.dom.explanationSection.classList.remove('hidden');
            this.dom.explanationContent.textContent = card.explanation;
        } else {
            this.dom.explanationSection.classList.add('hidden');
        }

        this.updateActionButtons(card);

        this.dom.flipBtn.classList.remove('hidden');
        this.dom.qualityButtons.classList.add('hidden');

        this.animateCardEntry();

        card.startTime = Date.now();
    }

    updateCardDifficulty(difficulty) {
        const difficultyElement = document.querySelector('.card-difficulty');
        if (difficultyElement) {
            difficultyElement.dataset.level = difficulty;
            difficultyElement.querySelector('.difficulty-label').textContent =
                difficulty === 'easy' ? 'Fácil' :
                    difficulty === 'medium' ? 'Médio' : 'Difícil';
        }
    }

    updateCardTags(tags) {
        const tagsContainer = document.querySelector('.card-tags');
        if (tagsContainer) {
            tagsContainer.innerHTML = tags.map(tag =>
                `<span class="tag">${tag}</span>`
            ).join('');
        }
    }

    updateActionButtons(card) {
        if (card.bookmarked) {
            this.dom.bookmarkBtn.classList.add('active');
            this.dom.bookmarkBtn.querySelector('i').className = 'fas fa-bookmark';
        } else {
            this.dom.bookmarkBtn.classList.remove('active');
            this.dom.bookmarkBtn.querySelector('i').className = 'far fa-bookmark';
        }

        if (card.flagged) {
            this.dom.flagBtn.classList.add('active');
            this.dom.flagBtn.querySelector('i').className = 'fas fa-flag';
        } else {
            this.dom.flagBtn.classList.remove('active');
            this.dom.flagBtn.querySelector('i').className = 'far fa-flag';
        }

        if (card.notes.length > 0) {
            this.dom.notesBtn.classList.add('has-notes');
        } else {
            this.dom.notesBtn.classList.remove('has-notes');
        }
    }

    renderPreviews() {
        const prevPreview = document.getElementById('prev-preview');
        const nextPreview = document.getElementById('next-preview');

        if (this.state.currentIndex > 0) {
            const prevCard = this.state.cards[this.state.currentIndex - 1];
            prevPreview.querySelector('.preview-text').textContent =
                this.truncateText(prevCard.question, 50);
            prevPreview.classList.remove('hidden');
        } else {
            prevPreview.classList.add('hidden');
        }

        if (this.state.currentIndex < this.state.cards.length - 1) {
            const nextCard = this.state.cards[this.state.currentIndex + 1];
            nextPreview.querySelector('.preview-text').textContent =
                this.truncateText(nextCard.question, 50);
            nextPreview.classList.remove('hidden');
        } else {
            nextPreview.classList.add('hidden');
        }
    }

    flipCard() {
        if (this.state.isTransitioning) return;
        if (this.state.isFlipped) return;

        this.state.isFlipped = true;
        this.dom.flipCard.classList.add('is-flipped');

        if (this.state.userPreferences.soundEffects) {
            this.playSound('flip');
        }

        if (this.state.userPreferences.vibration && 'vibrate' in navigator) {
            navigator.vibrate(50);
        }

        setTimeout(() => {
            this.dom.flipBtn.classList.add('hidden');
            this.dom.qualityButtons.classList.remove('hidden');
        }, CONFIG.ANIMATION_DURATION);

        this.analytics.cardFlipped(this.getCurrentCard());
    }

    navigateCard(direction) {
    if (this.state.isTransitioning) return;

    const newIndex = direction === 'prev' ?
        this.state.currentIndex - 1 :
        this.state.currentIndex + 1;

    if (newIndex < 0 || newIndex >= this.state.cards.length) return;

    this.state.isTransitioning = true;

    const currentCard = this.getCurrentCard();
    if (currentCard) {
        currentCard.timeSpent += Date.now() - currentCard.startTime;
    }

    this.animateCardExit(direction);

    setTimeout(() => {
        this.state.currentIndex = newIndex;
        // Reset flip state when navigating to a new card
        this.state.isFlipped = false; // ← Adicione esta linha
        this.render();
        this.state.isTransitioning = false;
    }, CONFIG.ANIMATION_DURATION);
}

    async submitAnswer(quality) {
    if (this.state.isTransitioning) return;

    const card = this.getCurrentCard();
    if (!card) return;

    this.state.isTransitioning = true;

    card.lastQuality = quality;
    card.attempts++;
    card.studied = true;
    card.timeSpent += Date.now() - card.startTime;

    this.updateStatsForAnswer(quality);

    try {
        submitReview(card.id, quality);
    } catch (error) {
        console.error('Erro ao enviar revisão:', error);
    }
    this.checkAchievements();

    await this.showFeedback(quality);

    // Reset flip state for the next card
    this.state.isFlipped = false; // ← Adicione esta linha

    if (this.state.currentIndex < this.state.cards.length - 1) {
        this.state.currentIndex++;
        this.render();
        this.state.isTransitioning = false;
    } else {
        this.completeSession();
        this.state.isTransitioning = false;
    }
}

    updateStatsForAnswer(quality) {
        if (quality === 1) {
            this.state.stats.wrong++;
            this.state.stats.streak = 0;
        } else if (quality === 2) {
            this.state.stats.hard++;
            this.state.stats.streak++;
        } else if (quality === 3) {
            this.state.stats.correct++;
            this.state.stats.streak++;
        } else if (quality === 4) {
            this.state.stats.easy++;
            this.state.stats.correct++;
            this.state.stats.streak++;
        }

        if (this.state.stats.streak > this.state.stats.maxStreak) {
            this.state.stats.maxStreak = this.state.stats.streak;
        }

        const card = this.getCurrentCard();
        this.state.stats.cardTimes.push(card.timeSpent);
    }

    async showFeedback(quality) {
        const feedbackMap = {
            1: {
                icon: '😔',
                text: 'Não se preocupe!',
                subtitle: 'Vamos revisar em breve',
                class: 'error',
                sound: 'wrong'
            },
            2: {
                icon: '🤔',
                text: 'Foi difícil',
                subtitle: 'Mas você conseguiu!',
                class: 'warning',
                sound: 'correct'
            },
            3: {
                icon: '😊',
                text: 'Muito bem!',
                subtitle: 'Continue assim',
                class: 'success',
                sound: 'correct'
            },
            4: {
                icon: '🎉',
                text: 'Excelente!',
                subtitle: 'Você dominou este card',
                class: 'perfect',
                sound: 'correct'
            }
        };

        const feedback = feedbackMap[quality];
        const overlay = this.dom.feedbackOverlay;

        overlay.querySelector('.feedback-icon').textContent = feedback.icon;
        overlay.querySelector('.feedback-text').textContent = feedback.text;
        overlay.querySelector('.feedback-subtitle').textContent = feedback.subtitle;

        overlay.className = `feedback-overlay ${feedback.class}`;

        overlay.classList.add('active');

        if (this.state.userPreferences.soundEffects) {
            this.playSound(feedback.sound);
        }

        if (this.state.userPreferences.vibration && 'vibrate' in navigator) {
            navigator.vibrate(quality === 1 ? CONFIG.VIBRATION_PATTERNS.error : CONFIG.VIBRATION_PATTERNS.success);
        }

        return new Promise(resolve => {
            setTimeout(() => {
                overlay.classList.remove('active');
                resolve();
            }, CONFIG.FEEDBACK_DURATION);
        });
    }

    autoAdvance() {
        if (this.state.currentIndex < this.state.cards.length - 1) {
            this.navigateCard('next');
        } else {
            this.completeSession();
        }
    }


    toggleBookmark() {
        const card = this.getCurrentCard();
        if (!card) return;

        card.bookmarked = !card.bookmarked;
        this.updateActionButtons(card);

        this.showQuickFeedback(card.bookmarked ? 'Marcado!' : 'Desmarcado');

    }

    toggleFlag() {
        const card = this.getCurrentCard();
        if (!card) return;

        card.flagged = !card.flagged;
        this.updateActionButtons(card);

        this.showQuickFeedback(card.flagged ? 'Sinalizado para revisão' : 'Sinalização removida');
    }

    toggleHint() {
        const hintContent = this.dom.hintContent;
        const showHintBtn = document.getElementById('show-hint');

        if (hintContent.classList.contains('hidden')) {
            hintContent.classList.remove('hidden');
            showHintBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Ocultar dica';

            const card = this.getCurrentCard();
            if (card) {
                card.usedHint = true;
            }
        } else {
            hintContent.classList.add('hidden');
            showHintBtn.innerHTML = '<i class="fas fa-lightbulb"></i> Mostrar dica';
        }
    }

    openNotesModal() {
        const card = this.getCurrentCard();
        if (!card) return;

        const modal = this.dom.notesModal;
        const noteContent = document.getElementById('note-content');

        if (card.notes.length > 0) {
            noteContent.value = card.notes[card.notes.length - 1].content;
        } else {
            noteContent.value = '';
        }

        modal.showModal();

        const saveHandler = () => {
            const content = noteContent.value.trim();
            if (content) {
                card.notes.push({
                    content,
                    timestamp: Date.now()
                });
                this.updateActionButtons(card);
                this.showQuickFeedback('Nota salva!');
            }
            modal.close();
        };

        const saveBtn = modal.querySelector('[data-action="save"]');
        saveBtn.onclick = saveHandler;
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            this.dom.fullscreenBtn.querySelector('i').className = 'fas fa-compress';
        } else {
            document.exitFullscreen();
            this.dom.fullscreenBtn.querySelector('i').className = 'fas fa-expand';
        }
    }

    changeMode(mode) {
        this.state.mode = mode;

        this.dom.modeBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
            btn.setAttribute('aria-checked', btn.dataset.mode === mode);
        });

        switch (mode) {
            case 'speed':
                this.state.userPreferences.autoFlip = true;
                CONFIG.AUTO_FLIP_DELAY = 500;
                this.showQuickFeedback('Modo Rápido ativado!');
                break;
            case 'hard':
                this.filterHardCards();
                this.showQuickFeedback('Modo Difícil ativado!');
                break;
            default:
                this.state.userPreferences.autoFlip = false;
                CONFIG.AUTO_FLIP_DELAY = 800;
                this.showQuickFeedback('Modo Normal ativado');
        }
    }

    filterHardCards() {
        const hardCards = this.state.cards.filter(card =>
            card.difficulty === 'hard' || card.lastQuality === 1
        );

        if (hardCards.length > 0) {
            this.state.cards = hardCards;
            this.state.currentIndex = 0;
            this.render();
        } else {
            this.showQuickFeedback('Não há cards difíceis para revisar!');
        }
    }

    changeTheme(theme) {
        document.body.dataset.theme = theme;
        this.state.userPreferences.theme = theme;
        this.savePreferences();

        if (theme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.body.dataset.theme = prefersDark ? 'dark' : 'light';
        }
    }

    updateFontSize(size) {
        document.body.style.setProperty('--card-font-size', `${size}px`);
        document.getElementById('font-size-value').textContent = `${size}px`;
        this.state.userPreferences.fontSize = size;
        this.savePreferences();
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.state.startTime) / 1000);
            this.state.stats.totalTime = elapsed;

            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            this.dom.timer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            this.updateLiveStats();
        }, 1000);
    }

    pauseTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.pausedTime = Date.now();
        }
    }

    resumeTimer() {
        if (this.pausedTime) {
            const pauseDuration = Date.now() - this.pausedTime;
            this.state.startTime += pauseDuration;
            this.startTimer();
            this.pausedTime = null;
        }
    }

    updateLiveStats() {
        const minutes = this.state.stats.totalTime / 60;
        const studiedCards = this.state.cards.filter(c => c.studied).length;

        if (minutes > 0) {
            const cpm = (studiedCards / minutes).toFixed(1);
            this.dom.cardsPerMinute.textContent = cpm;
        }

        const total = this.state.stats.correct + this.state.stats.wrong + this.state.stats.hard;
        if (total > 0) {
            const accuracy = ((this.state.stats.correct / total) * 100).toFixed(0);
            this.dom.accuracyRate.textContent = `${accuracy}%`;
        }

        const retentionScore = this.calculateRetentionScore();
        this.dom.retentionScore.textContent = retentionScore;
    }

    calculateRetentionScore() {
        const weights = {
            accuracy: 0.4,
            streak: 0.3,
            speed: 0.2,
            consistency: 0.1
        };

        const total = this.state.stats.correct + this.state.stats.wrong + this.state.stats.hard;
        const accuracy = total > 0 ? (this.state.stats.correct / total) : 0;
        const streakBonus = Math.min(this.state.stats.maxStreak / 10, 1);
        const speedBonus = this.state.stats.cardTimes.length > 0 ?
            Math.min(30 / (this.state.stats.cardTimes.reduce((a, b) => a + b, 0) / this.state.stats.cardTimes.length / 1000), 1) : 0;
        const consistency = 1 - (this.state.stats.hard / (total || 1));

        const score = (
            accuracy * weights.accuracy +
            streakBonus * weights.streak +
            speedBonus * weights.speed +
            consistency * weights.consistency
        ) * 100;

        return Math.round(score);
    }

    checkAchievements() {
        const achievements = [];
        const stats = this.state.stats;
        const thresholds = CONFIG.ACHIEVEMENT_THRESHOLDS;

        if (stats.cardTimes.length >= thresholds.speedDemon.cards) {
            const avgTime = stats.cardTimes.slice(-10).reduce((a, b) => a + b, 0) / 10 / 1000;
            if (avgTime < thresholds.speedDemon.minutes * 60) {
                achievements.push({
                    id: 'speed-demon',
                    title: 'Velocista',
                    description: '10 cards em menos de 2 minutos',
                    icon: '⚡'
                });
            }
        }

        if (stats.streak >= thresholds.perfectStreak.streak) {
            achievements.push({
                id: 'perfect-streak',
                title: 'Sequência Perfeita',
                description: `${stats.streak} acertos seguidos!`,
                icon: '🔥'
            });
        }

        if (stats.totalTime >= thresholds.marathoner.minutes * 60) {
            achievements.push({
                id: 'marathoner',
                title: 'Maratonista',
                description: 'Estudou por mais de 30 minutos',
                icon: '🏃'
            });
        }

        const total = stats.correct + stats.wrong + stats.hard;
        if (total >= thresholds.accuracy.minimum) {
            const accuracy = (stats.correct / total) * 100;
            if (accuracy >= thresholds.accuracy.percentage) {
                achievements.push({
                    id: 'high-accuracy',
                    title: 'Precisão Impecável',
                    description: `${accuracy.toFixed(0)}% de acerto`,
                    icon: '🎯'
                });
            }
        }

        achievements.forEach(achievement => {
            if (!this.state.achievements.has(achievement.id)) {
                this.state.achievements.add(achievement.id);
                this.showAchievement(achievement);
            }
        });
    }

    showAchievement(achievement) {
        const achievementEl = document.createElement('div');
        achievementEl.className = 'achievement-popup';
        achievementEl.innerHTML = `
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-content">
                <h4>${achievement.title}</h4>
                <p>${achievement.description}</p>
            </div>
        `;

        document.body.appendChild(achievementEl);

        if (this.state.userPreferences.soundEffects) {
            this.playSound('achievement');
        }

        setTimeout(() => {
            achievementEl.classList.add('show');
        }, 100);

        setTimeout(() => {
            achievementEl.classList.remove('show');
            setTimeout(() => {
                achievementEl.remove();
            }, 300);
        }, 3000);
    }


    completeSession() {
        this.state.sessionActive = false;
        clearInterval(this.timerInterval);

        const sessionData = this.calculateSessionStats();

        this.showCompletionScreen(sessionData);

        this.saveSessionData(sessionData);

        this.analytics.sessionComplete(sessionData);
    }

    calculateSessionStats() {
        const stats = this.state.stats;
        const total = stats.correct + stats.wrong + stats.hard + stats.easy;

        return {
            duration: stats.totalTime,
            cardsStudied: total,
            correct: stats.correct,
            wrong: stats.wrong,
            hard: stats.hard,
            easy: stats.easy,
            accuracy: total > 0 ? (stats.correct / total * 100).toFixed(1) : 0,
            avgTime: stats.cardTimes.length > 0 ?
                (stats.cardTimes.reduce((a, b) => a + b, 0) / stats.cardTimes.length / 1000).toFixed(1) : 0,
            maxStreak: stats.maxStreak,
            achievements: Array.from(this.state.achievements),
            retentionScore: this.calculateRetentionScore()
        };
    }

    showCompletionScreen(data) {
        this.dom.studyContainer.classList.add('hidden');

        this.dom.completionContainer.classList.remove('hidden');

        document.getElementById('final-time').textContent = this.formatTime(data.duration);
        document.getElementById('final-cards').textContent = data.cardsStudied;
        document.getElementById('final-speed').textContent = (data.cardsStudied / (data.duration / 60)).toFixed(1);
        document.getElementById('final-accuracy').textContent = `${data.accuracy}%`;

        this.renderPerformanceChart(data);

        if (data.achievements.length > 0) {
            this.renderAchievements(data.achievements);
        }

        this.generateInsights(data);

        if (data.accuracy >= 90) {
            this.celebrateSuccess();
        }

        if (this.state.userPreferences.soundEffects) {
            this.playSound('complete');
        }
    }

    renderPerformanceChart(data) {
        const ctx = document.getElementById('performance-chart');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Fácil', 'Bom', 'Difícil', 'Errado'],
                datasets: [{
                    data: [data.easy, data.correct, data.hard, data.wrong],
                    backgroundColor: [
                        '#10b981',
                        '#3b82f6',
                        '#f59e0b',
                        '#ef4444'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    renderAchievements(achievementIds) {
        const container = document.getElementById('achievements');
        if (!container) return;

        container.classList.remove('hidden');
        const grid = container.querySelector('.achievements-grid');

        const achievementsMap = {
            'speed-demon': { title: 'Velocista', icon: '⚡', description: 'Completou cards rapidamente' },
            'perfect-streak': { title: 'Sequência Perfeita', icon: '🔥', description: 'Múltiplos acertos seguidos' },
            'marathoner': { title: 'Maratonista', icon: '🏃', description: 'Longa sessão de estudo' },
            'high-accuracy': { title: 'Precisão Impecável', icon: '🎯', description: 'Alta taxa de acerto' }
        };

        achievementIds.forEach(id => {
            const achievement = achievementsMap[id];
            if (achievement) {
                const el = document.createElement('div');
                el.className = 'achievement-badge';
                el.innerHTML = `
                    <div class="badge-icon">${achievement.icon}</div>
                    <div class="badge-title">${achievement.title}</div>
                `;
                grid.appendChild(el);
            }
        });
    }

    generateInsights(data) {
        const insights = [];

        if (data.avgTime < 10) {
            insights.push({
                icon: '⚡',
                text: 'Você está respondendo muito rápido! Velocidade média de ' + data.avgTime + 's por card.'
            });
        } else if (data.avgTime > 30) {
            insights.push({
                icon: '🐢',
                text: 'Tome seu tempo, mas tente ser mais rápido. Média de ' + data.avgTime + 's por card.'
            });
        }

        if (data.accuracy >= 90) {
            insights.push({
                icon: '🎯',
                text: 'Excelente precisão! Você domina este conteúdo.'
            });
        } else if (data.accuracy < 60) {
            insights.push({
                icon: '📚',
                text: 'Considere revisar o material antes da próxima sessão.'
            });
        }

        if (data.maxStreak >= 10) {
            insights.push({
                icon: '🔥',
                text: 'Ótima sequência de ' + data.maxStreak + ' acertos! Mantenha o foco.'
            });
        }

        const container = document.querySelector('.insights-list');
        if (container) {
            container.innerHTML = insights.map(insight => `
                <div class="insight-item">
                    <span class="insight-icon">${insight.icon}</span>
                    <span class="insight-text">${insight.text}</span>
                </div>
            `).join('');
        }
    }

    reviewMistakes() {
        const mistakes = this.state.cards.filter(card => card.lastQuality === 1);

        if (mistakes.length === 0) {
            this.showQuickFeedback('Não há erros para revisar!');
            return;
        }

        this.state.cards = mistakes;
        this.state.currentIndex = 0;
        this.state.sessionActive = true;
        this.resetStats();

        this.dom.completionContainer.classList.add('hidden');
        this.dom.studyContainer.classList.remove('hidden');

        this.render();
        this.startTimer();

        this.showQuickFeedback(`Revisando ${mistakes.length} cards errados`);
    }

    continueStudying() {
        this.state.currentIndex = 0;
        this.state.cards.forEach(card => {
            card.studied = false;
            card.lastQuality = null;
        });

        this.resetStats();
        this.state.sessionActive = true;

        this.dom.completionContainer.classList.add('hidden');
        this.dom.studyContainer.classList.remove('hidden');

        this.render();
        this.startTimer();
    }

    resetStats() {
        this.state.stats = {
            correct: 0,
            wrong: 0,
            hard: 0,
            easy: 0,
            totalTime: 0,
            cardTimes: [],
            streak: 0,
            maxStreak: 0
        };
        this.state.startTime = Date.now();
    }


    getCurrentCard() {
        return this.state.cards[this.state.currentIndex];
    }

    updateProgress() {
        const current = this.state.currentIndex + 1;
        const total = this.state.cards.length;
        const progress = (current / total) * 100;

        this.dom.currentCard.textContent = current;
        this.dom.totalReview.textContent = total;
        this.dom.progressFill.style.width = `${progress}%`;

        this.dom.correctCount.textContent = this.state.stats.correct;
        this.dom.hardCount.textContent = this.state.stats.hard;
        this.dom.wrongCount.textContent = this.state.stats.wrong;
    }


    updateNavigation() {
        this.dom.prevCard.disabled = this.state.currentIndex === 0;
        this.dom.nextCard.disabled = this.state.currentIndex === this.state.cards.length - 1;
    }

    updateIndicators() {
        const indicators = this.dom.cardIndicators.querySelectorAll('.indicator-dot');
        indicators.forEach((dot, index) => {
            dot.classList.toggle('active', index === this.state.currentIndex);
            dot.classList.toggle('studied', this.state.cards[index]?.studied);
        });
    }

    createCardIndicators() {
        const container = this.dom.cardIndicators;
        container.innerHTML = '';

        const maxIndicators = 20;
        const showIndicators = Math.min(this.state.cards.length, maxIndicators);

        for (let i = 0; i < showIndicators; i++) {
            const dot = document.createElement('button');
            dot.className = 'indicator-dot';
            dot.dataset.card = i;
            dot.setAttribute('aria-label', `Card ${i + 1}`);

            dot.addEventListener('click', () => {
                this.state.currentIndex = i;
                this.render();
            });

            container.appendChild(dot);
        }

        if (this.state.cards.length > maxIndicators) {
            const more = document.createElement('span');
            more.className = 'indicator-more';
            more.textContent = `+${this.state.cards.length - maxIndicators}`;
            container.appendChild(more);
        }
    }

    updateDeckInfo(deckInfo) {
        if (!deckInfo) return;

        this.dom.deckTitle.textContent = deckInfo.title;
        this.dom.totalCards.textContent = deckInfo.card_count || 0;
    }

    updateUserStats(stats) {
        if (!stats) return;

        this.dom.streakCount.textContent = stats.streak;
    }

    animateCardEntry() {
        const card = this.dom.flipCard;
        card.style.animation = 'cardEntry 0.3s ease-out';

        setTimeout(() => {
            card.style.animation = '';
        }, 300);
    }

    animateCardExit(direction) {
        const card = this.dom.flipCard;
        card.style.animation = direction === 'prev' ?
            'slideOutRight 0.3s ease-out' :
            'slideOutLeft 0.3s ease-out';
    }

    initializeAudio() {
        this.sounds = {};

        if (this.state.userPreferences.soundEffects) {
            Object.entries(CONFIG.SOUNDS).forEach(([key, url]) => {
                const audio = new Audio(url);
                audio.preload = 'auto';
                this.sounds[key] = audio;
            });
        }
    }

    playSound(soundName) {
        const sound = this.sounds[soundName];
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(e => console.log('Erro ao tocar som:', e));
        }
    }

    loadPreferences() {
        const defaults = {
            theme: 'light',
            fontSize: 16,
            autoFlip: false,
            soundEffects: false,
            vibration: false,
            showTimer: true,
            showPreviews: true,
            showHints: true,
            reviewOrder: 'due'
        };

        try {
            const saved = localStorage.getItem('studyPreferences');
            return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
        } catch (error) {
            console.error('Erro ao carregar preferências:', error);
            return defaults;
        }
    }

    savePreferences() {
        try {
            localStorage.setItem('studyPreferences', JSON.stringify(this.state.userPreferences));
        } catch (error) {
            console.error('Erro ao salvar preferências:', error);
        }
    }

    applyUserPreferences() {
        const prefs = this.state.userPreferences;

        document.body.dataset.theme = prefs.theme;

        document.body.style.setProperty('--card-font-size', `${prefs.fontSize}px`);

        document.getElementById('auto-flip').checked = prefs.autoFlip;
        document.getElementById('sound-effects').checked = prefs.soundEffects;
        document.getElementById('vibration').checked = prefs.vibration;
        document.getElementById('show-timer').checked = prefs.showTimer;
        document.getElementById('show-hints').checked = prefs.showHints;

        document.getElementById('review-order').value = prefs.reviewOrder;
    }


    analytics = {
        sessionStart: () => {
            console.log('Sessão iniciada');
        },

        cardFlipped: (card) => {
            console.log('Card virado:', card.id);
        },

        sessionComplete: (data) => {
            console.log('Sessão completa:', data);
        }
    };


    handleError(error) {
        console.error('Erro na sessão:', error);

        this.showError('Ocorreu um erro. Por favor, recarregue a página.');

    }

    showError(message) {
        const loadingState = this.dom.loadingState;
        loadingState.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h2>Ops!</h2>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="location.reload()">
                    Recarregar Página
                </button>
            </div>
        `;
    }

    showEmptyState() {
        const loadingState = this.dom.loadingState;
        loadingState.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-check-circle"></i>
                <h2>Tudo em dia!</h2>
                <p>Você não tem cards para revisar neste momento.</p>
                <a href="deck.html?id=${this.deckId}" class="btn btn-primary">
                    Voltar ao Baralho
                </a>
            </div>
        `;
    }

    showLoading(message = 'Carregando...') {
        const loadingMessage = document.getElementById('loading-message');
        if (loadingMessage) {
            loadingMessage.textContent = message;
        }
        this.dom.loadingState.classList.remove('hidden');
    }

    hideLoading() {
        this.dom.loadingState.classList.add('hidden');
        this.dom.studyContainer.classList.remove('hidden');
    }


    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    showQuickFeedback(message) {
        if (typeof showToast === 'function') {
            showToast(message, 'info');
        } else {
            console.log(message);
        }
    }

    handleSpacebar() {
        if (!this.state.isFlipped) {
            this.flipCard();
        } else if (this.state.currentIndex < this.state.cards.length - 1) {
            // This part is likely not needed if autoAdvance is working correctly
            // but we can leave it as a fallback.
            // this.navigateCard('next');
        }
    }

    quickAnswer(quality) {
        if (this.state.isFlipped && !this.dom.qualityButtons.classList.contains('hidden')) {
            this.submitAnswer(quality);
        }
    }

    handleEscape() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            const openModal = document.querySelector('dialog[open]');
            if (openModal) {
                openModal.close();
            }
        }
    }

    endSession() {
        this.state.sessionActive = false;
        this.saveSessionData(this.calculateSessionStats());
        window.location.href = `deck.html?id=${this.deckId}`;
    }

    async saveSessionData(data) {
        try {
            localStorage.setItem(`session_${this.deckId}_${Date.now()}`, JSON.stringify(data));
        } catch (error) {
            console.error('Erro ao salvar dados da sessão:', error);
        }
    }

    async preloadNextCards() {
        const nextIndex = this.state.currentIndex + 1;
        const preloadCount = Math.min(3, this.state.cards.length - nextIndex);

        for (let i = 0; i < preloadCount; i++) {
            const card = this.state.cards[nextIndex + i];
            if (card && card.image) {
                const img = new Image();
                img.src = card.image;
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const deckId = params.get('deckId');

    if (!deckId) {
        showToast('Baralho não especificado', 'error');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);
        return;
    }

    window.studySession = new StudySessionPro(deckId);
});

const animationStyles = `
@keyframes cardEntry {
    from {
        opacity: 0;
        transform: scale(0.9) translateY(20px);
    }
    to {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
}

@keyframes slideOutLeft {
    to {
        opacity: 0;
        transform: translateX(-100%);
    }
}

@keyframes slideOutRight {
    to {
        opacity: 0;
        transform: translateX(100%);
    }
}

@keyframes confetti {
    0% {
        transform: translateY(0) rotateZ(0);
        opacity: 1;
    }
    100% {
        transform: translateY(100vh) rotateZ(720deg);
        opacity: 0;
    }
}
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = animationStyles;
document.head.appendChild(styleSheet);