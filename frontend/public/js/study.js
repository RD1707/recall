document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const deckId = params.get('deckId');

    if (!deckId) {
        window.location.href = 'dashboard.html';
        return;
    }

    document.getElementById('deck-link').href = `deck.html?id=${deckId}`;

    const studySession = new StudySession(deckId);
    studySession.start();
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

        this.addEventListeners();
    }

    addEventListeners() {
        this.flipButton.addEventListener('click', () => this.flip());
        this.qualityButtons.addEventListener('click', (e) => {
            if (e.target.classList.contains('quality-btn')) {
                const quality = parseInt(e.target.dataset.quality, 10);
                this.submit(quality);
            }
        });
    }

    async start() {
        this.reviewCards = await fetchReviewCards(this.deckId);
        this.backToDeckLink.href = `deck.html?id=${this.deckId}`;
        if (this.reviewCards.length === 0) {
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
    }

    flip() {
        this.flipCard.classList.add('is-flipped');
        this.flipButton.classList.add('hidden');
        this.qualityButtons.classList.remove('hidden');
    }

    async submit(quality) {
        const card = this.reviewCards[this.currentCardIndex];
        await submitReview(card.id, quality);

        this.currentCardIndex++;
        this.displayCard();
    }

    showCompletion() {
        this.studySessionContainer.classList.add('hidden');
        this.completionMessage.classList.remove('hidden');
        updateProfileHeader();
    }
}