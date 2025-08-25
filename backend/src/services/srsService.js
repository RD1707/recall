function calculateSm2(flashcard, quality) {
    if (quality < 0 || quality > 5) {
        throw new Error('A qualidade deve ser um número entre 0 e 5.');
    }

    let { repetition, ease_factor, interval } = flashcard;

    if (quality < 3) {
        repetition = 0;
        interval = 1;
    } else {
        ease_factor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
        if (ease_factor < 1.3) {
            ease_factor = 1.3;
        }

        if (repetition === 0) {
            interval = 1;
        } else if (repetition === 1) {
            interval = 6;
        } else {
            interval = Math.ceil(interval * ease_factor);
        }
        repetition += 1;
    }

    const now = new Date();
    const dueDate = new Date(now.setDate(now.getDate() + interval));

    return {
        repetition,
        ease_factor,
        interval,
        due_date: dueDate.toISOString(),
    };
}

module.exports = {
    calculateSm2,
};