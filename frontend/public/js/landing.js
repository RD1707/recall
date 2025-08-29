/*************  ✨ Windsurf Command 🌟  *************/
/**
 * Arquivo: landing.js
 * Descrição: Adiciona interatividade e animações avançadas à landing page,
 * incluindo gerenciamento de estado, efeitos paralax, observadores de interseção
 * melhorados e funcionalidades de UI/UX profissionais.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Inicializa todas as funcionalidades da página
    initAppState();
    initScrollAnimations();
    initMobileNavigation();
    initPricingToggle();
    initFAQAccordion();
    initVideoModal();
    initScrollHeader();
    initSmoothScrolling();
    initInteractiveElements();
    initCountUpAnimation();
    initParallaxEffects();
    initFormValidation();
    initAOS();
    initServiceWorker();
});

/**
 * Gerencia o estado da aplicação
 */
function initAppState() {
    const state = {
        pricing: 'monthly',
        menuOpen: false,
        animations: {},
        observers: {}
    };

    // Expõe o estado globalmente para debug (remover em produção)
    window.appState = state;
    return state;
}

function initScrollAnimations() {
    const elementsToAnimate = document.querySelectorAll(
        '.feature-card, .step, .testimonial-card, .hero-text > *, .hero-image, ' +
        '.pricing-card, .faq-item, .demo-content > *, .client-item, .stat'
    );

    // Configuração avançada do observer
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const staggerObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                // Adiciona um atraso escalonado baseado na posição do elemento
                const delay = Math.min(index * 100, 800);
                
                setTimeout(() => {
                    entry.target.style.transitionDelay = `${delay}ms`;
                    entry.target.classList.add('is-visible');
                    
                    // Para elementos com animação de contagem
                    if (entry.target.classList.contains('stat-number')) {
                        animateValue(entry.target, 0, parseInt(entry.target.textContent), 1500);
                    }
                    
                    observer.unobserve(entry.target);
                }, 100);
            }
        });
    }, observerOptions);

    // Prepara os elementos para a animação
    elementsToAnimate.forEach((el, index) => {
        el.classList.add('animate-on-scroll');
        
        // Adiciona delay inicial baseado na posição para um efeito de onda
        el.style.setProperty('--animation-order', index);
        
        // Observa cada um dos elementos selecionados
        staggerObserver.observe(el);
    });

    // Animação para elementos com data-count
    const countElements = document.querySelectorAll('[data-count]');
    countElements.forEach(el => {
        el.classList.add('animate-on-scroll');
        staggerObserver.observe(el);
    });
}

/**
 * Controla a funcionalidade do menu de navegação em dispositivos móveis.
 */
function initMobileNavigation() {
    const mobileNavToggle = document.getElementById('mobile-nav-toggle');
    const mainNav = document.querySelector('.main-nav');
    const navLinks = document.querySelectorAll('.main-nav a');

    if (!mobileNavToggle || !mainNav) {
        console.error('Elementos de navegação mobile não encontrados.');
        return;
    }

    // Função para fechar o menu
    const closeMenu = () => {
        mainNav.classList.remove('is-open');
        mobileNavToggle.classList.remove('is-active');
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
    };

    // Alternar menu
    mobileNavToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        mainNav.classList.toggle('is-open');
        mobileNavToggle.classList.toggle('is-active');
        
        // Impede a rolagem do corpo da página quando o menu está aberto
        if (mainNav.classList.contains('is-open')) {
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        }
    });

    // Fechar menu ao clicar em um link
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            closeMenu();
        });
    });

    // Fechar menu ao clicar fora dele
    document.addEventListener('click', (e) => {
        if (mainNav.classList.contains('is-open') && 
            !mainNav.contains(e.target) && 
            e.target !== mobileNavToggle) {
            closeMenu();
        }
    });

    // Fechar menu ao pressionar a tecla Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && mainNav.classList.contains('is-open')) {
            closeMenu();
        }
    });
}

/**
 * Controla o toggle de preços (anual/mensal)
 */
function initPricingToggle() {
    const pricingToggle = document.getElementById('pricing-toggle');
    const monthlyPrices = document.querySelectorAll('.price.monthly');
    const annualPrices = document.querySelectorAll('.price.annual');
    
    if (!pricingToggle) return;

    pricingToggle.addEventListener('change', function() {
        if (this.checked) {
            // Mostrar preços anuais
            monthlyPrices.forEach(price => price.style.display = 'none');
            annualPrices.forEach(price => price.style.display = 'flex');
        } else {
            // Mostrar preços mensais
            monthlyPrices.forEach(price => price.style.display = 'flex');
            annualPrices.forEach(price => price.style.display = 'none');
        }
    });
}

/**
 * Implementa accordion para a seção FAQ
 */
function initFAQAccordion() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        
        question.addEventListener('click', () => {
            // Fecha outros itens abertos
            faqItems.forEach(otherItem => {
                if (otherItem !== item && otherItem.classList.contains('active')) {
                    otherItem.classList.remove('active');
                }
            });
            
            // Alterna o item atual
            item.classList.toggle('active');
        });
    });
}

/**
 * Controla o modal de vídeo de demonstração
 */
function initVideoModal() {
    const videoButtons = document.querySelectorAll('.play-button, .btn-video');
    const videoModal = document.createElement('div');
    videoModal.className = 'video-modal';
    videoModal.innerHTML = `
        <div class="video-modal-content">
            <span class="video-modal-close">&times;</span>
            <div class="video-container">
                <iframe width="560" height="315" src="about:blank" frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen></iframe>
            </div>
        </div>
    `;
    
    document.body.appendChild(videoModal);
    
    // Abrir modal
    videoButtons.forEach(button => {
        button.addEventListener('click', () => {
            const videoUrl = button.dataset.videoUrl || 'https://www.youtube.com/embed/dQw4w9WgXcQ'; // URL padrão
            videoModal.querySelector('iframe').src = videoUrl;
            videoModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    });
    
    // Fechar modal
    videoModal.querySelector('.video-modal-close').addEventListener('click', () => {
        videoModal.classList.remove('active');
        videoModal.querySelector('iframe').src = 'about:blank';
        document.body.style.overflow = '';
    });
    
    // Fechar ao clicar fora
    videoModal.addEventListener('click', (e) => {
        if (e.target === videoModal) {
            videoModal.classList.remove('active');
            videoModal.querySelector('iframe').src = 'about:blank';
            document.body.style.overflow = '';
        }
    });
}

/**
 * Adiciona efeito de header que muda ao scroll
 */
function initScrollHeader() {
    const header = document.querySelector('.landing-header');
    let lastScrollY = window.scrollY;
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 100) {
            header.classList.add('scrolled');
            
            // Header esconde/mostra baseado na direção do scroll
            if (window.scrollY > lastScrollY) {
                header.style.transform = 'translateY(-100%)';
            } else {
                header.style.transform = 'translateY(0)';
            }
        } else {
            header.classList.remove('scrolled');
            header.style.transform = 'translateY(0)';
        }
        
        lastScrollY = window.scrollY;
    });
}

/**
 * Melhora a rolagem suave para links âncora
 */
function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                const headerHeight = document.querySelector('.landing-header').offsetHeight;
                const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
                
                // Atualiza a URL sem recarregar a página
                history.pushState(null, null, targetId);
            }
        });
    });
}

/**
 * Adiciona interatividade a elementos diversos
 */
function initInteractiveElements() {
    // Efeito hover para cards
    const cards = document.querySelectorAll('.feature-card, .testimonial-card, .pricing-card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-8px)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
        });
    });
    
    // Efeito de digitação no hero (se aplicável)
    const heroTitle = document.querySelector('.hero-text h1');
    if (heroTitle && heroTitle.dataset.typed) {
        initTypingEffect(heroTitle, heroTitle.dataset.typedText || 'para sempre.');
    }
}

/**
 * Animação de contagem para estatísticas
 */
function initCountUpAnimation() {
    const counters = document.querySelectorAll('.stat-number, [data-count]');
    
    counters.forEach(counter => {
        const target = parseInt(counter.dataset.count || counter.textContent.replace(/\D/g, ''));
        counter.dataset.original = target;
        counter.textContent = '0';
        
        // Observador para iniciar a animação quando o elemento estiver visível
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateValue(entry.target, 0, parseInt(entry.target.dataset.original), 2000);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });
        
        observer.observe(counter);
    });
}

/**
 * Animação de valor (contagem)
 */
function animateValue(element, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        
        // Formata números com separadores de milhar
        const value = Math.floor(progress * (end - start) + start);
        element.textContent = value.toLocaleString();
        
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

/**
 * Efeitos parallax para elementos
 */
function initParallaxEffects() {
    const parallaxElements = document.querySelectorAll('[data-parallax]');
    
    if (parallaxElements.length > 0) {
        window.addEventListener('scroll', () => {
            const scrollTop = window.pageYOffset;
            
            parallaxElements.forEach(element => {
                const speed = parseFloat(element.dataset.parallaxSpeed) || 0.5;
                const yPos = -(scrollTop * speed);
                element.style.transform = `translateY(${yPos}px)`;
            });
        });
    }
}

/**
 * Efeito de digitação para texto
 */
function initTypingEffect(element, text) {
    let i = 0;
    const originalText = element.textContent;
    element.textContent = '';
    
    function typeWriter() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(typeWriter, 100);
        } else {
            // Restaura o texto original após a animação
            setTimeout(() => {
                element.textContent = originalText;
            }, 2000);
        }
    }
    
    typeWriter();
}

/**
 * Validação de formulários
 */
function initFormValidation() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
        form.addEventListener('submit', (e) => {
            let isValid = true;
            const inputs = form.querySelectorAll('input[required], textarea[required]');
            
            inputs.forEach(input => {
                if (!input.value.trim()) {
                    isValid = false;
                    highlightError(input);
                } else {
                    resetError(input);
                    
                    // Validação de email
                    if (input.type === 'email' && !isValidEmail(input.value)) {
                        isValid = false;
                        highlightError(input, 'Por favor, insira um email válido.');
                    }
                }
            });
            
            if (!isValid) {
                e.preventDefault();
                // Adiciona feedback visual
                form.classList.add('form-error');
                setTimeout(() => {
                    form.classList.remove('form-error');
                }, 1000);
            }
        });
    });
    
    function isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    function highlightError(input, message) {
        input.classList.add('input-error');
        
        // Mostra mensagem de erro
        let errorElement = input.nextElementSibling;
        if (!errorElement || !errorElement.classList.contains('error-message')) {
            errorElement = document.createElement('div');
            errorElement.className = 'error-message';
            input.parentNode.insertBefore(errorElement, input.nextSibling);
        }
        
        errorElement.textContent = message || 'Este campo é obrigatório.';
    }
    
    function resetError(input) {
        input.classList.remove('input-error');
        
        // Remove mensagem de erro
        const errorElement = input.nextElementSibling;
        if (errorElement && errorElement.classList.contains('error-message')) {
            errorElement.remove();
        }
    }
}

/**
 * Inicializa animações on scroll (AOS) personalizadas
 */
function initAOS() {
    // Esta função pode ser expandida para adicionar mais tipos de animações
    const aosElements = document.querySelectorAll('[data-aos]');
    
    const aosObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('aos-animate');
                aosObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    
    aosElements.forEach(el => {
        aosObserver.observe(el);
    });
}

/**
 * Registra Service Worker para funcionalidade offline
 */
function initServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('SW registered: ', registration);
                })
                .catch(registrationError => {
                    console.log('SW registration failed: ', registrationError);
                });
        });
    }
}

/**
 * Gerencia o desempenho e recursos
 */
function managePerformance() {
    // Lazy loading para imagens
    if ('IntersectionObserver' in window) {
        const lazyImages = document.querySelectorAll('img[data-src]');
        
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            });
        });
        
        lazyImages.forEach(img => {
            imageObserver.observe(img);
        });
    }
    
    // Otimização para conexões lentas
    if (navigator.connection) {
        if (navigator.connection.saveData === true) {
            // Implementar redução de recursos para save-data
            document.documentElement.classList.add('save-data');
        }
        
        if (navigator.connection.effectiveType.includes('2g') || 
            navigator.connection.effectiveType.includes('3g')) {
            // Reduzir animações para conexões mais lentas
            document.documentElement.classList.add('reduced-motion');
        }
    }
}

/**
 * Utilidades para manipulação do DOM
 */
const DOM = {
    // Verifica se um elemento está visível na viewport
    isInViewport: (element) => {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    },
    
    // Debounce function para eventos de redimensionamento/scroll
    debounce: (func, wait, immediate) => {
        let timeout;
        return function() {
            const context = this, args = arguments;
            const later = function() {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    },
    
    // Throttle function para eventos frequentes
    throttle: (func, limit) => {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
};

// Inicializa o gerenciamento de performance
managePerformance();

// Adiciona classes baseadas no suporte do navegador
if ('ontouchstart' in window) {
    document.documentElement.classList.add('touch');
} else {
    document.documentElement.classList.add('no-touch');
}

// Adiciona suporte para prefers-reduced-motion
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('reduced-motion');
}
/*******  6d0608ef-13eb-402f-8793-aba95c1461c0  *******/