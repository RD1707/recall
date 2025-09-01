document.addEventListener('DOMContentLoaded', function() {
    // Mobile navigation toggle (se já não estiver lá)
    const mobileNavToggle = document.getElementById('mobile-nav-toggle');
    const mainNav = document.getElementById('main-nav');

    if (mobileNavToggle && mainNav) {
        mobileNavToggle.addEventListener('click', function() {
            mainNav.classList.toggle('active');
            mobileNavToggle.classList.toggle('active');
            // Adicionar/remover aria-expanded para acessibilidade
            const isExpanded = mobileNavToggle.classList.contains('active');
            mobileNavToggle.setAttribute('aria-expanded', isExpanded);
        });
    }

    // FAQ Accordion
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');

        question.addEventListener('click', () => {
            // Fecha todos os outros itens abertos
            faqItems.forEach(otherItem => {
                if (otherItem !== item && otherItem.classList.contains('active')) {
                    otherItem.classList.remove('active');
                    const otherAnswer = otherItem.querySelector('.faq-answer');
                    otherAnswer.style.maxHeight = null; // Remove o max-height para que o CSS faça a transição para 0
                }
            });

            // Alterna o item clicado
            item.classList.toggle('active');

            if (item.classList.contains('active')) {
                // Se está ativo, define max-height para a altura real do conteúdo
                answer.style.maxHeight = answer.scrollHeight + "px"; // Usamos scrollHeight para obter a altura total do conteúdo
            } else {
                // Se está inativo, remove max-height para que o CSS faça a transição para 0
                answer.style.maxHeight = null;
            }
        });
    });
});