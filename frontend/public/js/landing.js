/**
 * Arquivo: landing.js
 * Descrição: Adiciona interatividade e animações à landing page,
 * incluindo animações de scroll e um menu de navegação mobile.
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // Inicializa todas as funcionalidades da página
    initScrollAnimations();
    initMobileNavigation();

});

/**
 * Anima os elementos quando eles entram na área visível da tela (viewport).
 * Utiliza a IntersectionObserver API para melhor performance.
 */
function initScrollAnimations() {
    const elementsToAnimate = document.querySelectorAll('.feature-card, .step, .testimonial-card, .hero-text > *, .hero-image');

    // Prepara os elementos para a animação, adicionando uma classe base
    elementsToAnimate.forEach(el => {
        el.classList.add('animate-on-scroll');
    });

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                // Adiciona um pequeno atraso em cada elemento para um efeito escalonado
                entry.target.style.transitionDelay = `${index * 50}ms`;
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target); // Deixa de observar o elemento após a animação
            }
        });
    }, {
        threshold: 0.1 // O elemento é considerado visível quando 10% dele estiver na tela
    });

    // Observa cada um dos elementos selecionados
    elementsToAnimate.forEach(el => {
        observer.observe(el);
    });
}

/**
 * Controla a funcionalidade do menu de navegação em dispositivos móveis.
 */
function initMobileNavigation() {
    const mobileNavToggle = document.getElementById('mobile-nav-toggle');
    const mainNav = document.querySelector('.main-nav');

    if (!mobileNavToggle || !mainNav) {
        console.error('Elementos de navegação mobile não encontrados.');
        return;
    }

    mobileNavToggle.addEventListener('click', () => {
        // Alterna a classe que mostra/esconde o menu
        mainNav.classList.toggle('is-open');
        mobileNavToggle.classList.toggle('is-active');
        
        // Impede a rolagem do corpo da página quando o menu está aberto
        document.body.style.overflow = mainNav.classList.contains('is-open') ? 'hidden' : '';
    });
}