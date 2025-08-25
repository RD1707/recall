document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const deckId = params.get('deckId');

    if (!deckId) {
        window.location.href = 'dashboard.html';
        return;
    }

    document.getElementById('deck-link').href = `deck.html?id=${deckId}`;

    new StudySession(deckId);
});

class StudySession {
    constructor(deckId) {
        this.deckId = deckId;
        this.reviewCards = [];
        this.currentCardIndex = 0;

        this.progressIndicator = document.getElementById('progress-indicator');
        this.flipCard = document.getElementById('flip-card');
        this.cardQuestion = document.getElementById('card-question');
        this.cardAnswer = document.getElementById('card-answer');
        this.flipButton = document.getElementById('flip-button');
        this.qualityButtons = document.getElementById('quality-buttons');
        this.studySessionContainer = document.getElementById('study-session');
        this.completionMessage = document.getElementById('completion-message');
        this.backToDeckLink = document.getElementById('back-to-deck-link');

        this.explainButton = document.getElementById('explain-button');
        this.explanationModal = document.getElementById('explanation-modal');
        this.explanationContent = document.getElementById('explanation-content');
        this.closeExplanationModalBtn = document.getElementById('close-explanation-modal-btn');
        this.skeletonExplanation = `
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text"></div>
        `;

        this.addEventListeners();
        this.start();
    }

    addEventListeners() {
        this.flipButton.addEventListener('click', () => this.flip());
        
        this.qualityButtons.addEventListener('click', (e) => {
            if (e.target.classList.contains('quality-btn')) {
                const quality = parseInt(e.target.dataset.quality, 10);
                this.submit(quality);
            }
        });

        this.explainButton.addEventListener('click', () => this.handleExplainClick());
        this.closeExplanationModalBtn.addEventListener('click', () => this.closeExplanationModal());
        this.explanationModal.addEventListener('click', (e) => {
            if (e.target === this.explanationModal) this.closeExplanationModal();
        });
    }

    async start() {
        this.reviewCards = await fetchReviewCards(this.deckId);
        this.backToDeckLink.href = `deck.html?id=${this.deckId}`;
        if (!this.reviewCards || this.reviewCards.length === 0) {
            this.showCompletion();
            return;
        }
        this.currentCardIndex = 0;
        this.displayCard();
    }

    displayCard() {
        if (this.currentCardIndex >= this.reviewCards.length) {
            this.showCompletion();
            return;
        }

        const card = this.reviewCards[this.currentCardIndex];
        this.progressIndicator.textContent = `Card ${this.currentCardIndex + 1} de ${this.reviewCards.length}`;
        this.cardQuestion.textContent = card.question;
        this.cardAnswer.textContent = card.answer;

        this.flipCard.classList.remove('is-flipped');
        this.flipButton.classList.remove('hidden');
        this.qualityButtons.classList.add('hidden');
        this.explainButton.classList.add('hidden');
    }

    flip() {
        this.flipCard.classList.add('is-flipped');
        this.flipButton.classList.add('hidden');
        this.qualityButtons.classList.remove('hidden');
    }

    async submit(quality) {
        const card = this.reviewCards[this.currentCardIndex];

        if (quality < 3) {
            this.explainButton.classList.remove('hidden');
        }

        await submitReview(card.id, quality);

        setTimeout(() => {
            this.currentCardIndex++;
            this.displayCard();
        }, 800);
    }

    async handleExplainClick() {
        this.explanationContent.innerHTML = this.skeletonExplanation;
        this.explanationModal.classList.add('visible');

        const card = this.reviewCards[this.currentCardIndex];
        const result = await fetchExplanation(card.id);

        if (result && result.explanation) {
            this.explanationContent.textContent = result.explanation;
        } else {
            this.explanationContent.textContent = 'Não foi possível carregar a explicação. Por favor, tente novamente.';
        }
    }

    closeExplanationModal() {
        this.explanationModal.classList.remove('visible');
    }

    showCompletion() {
        this.studySessionContainer.classList.add('hidden');
        this.completionMessage.classList.remove('hidden');
        updateProfileHeader();
    }
}