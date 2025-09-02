class GlobalLoader {
    constructor() {
        this.overlay = null;
        this.isVisible = false;
        this.defaultMessages = {
            dashboard: {
                title: "Carregando Dashboard",
                subtitle: "Preparando seus baralhos..."
            },
            deck: {
                title: "Carregando Baralho",
                subtitle: "Buscando seus flashcards..."
            },
            study: {
                title: "Iniciando Sessão",
                subtitle: "Preparando seus estudos..."
            },
            progress: {
                title: "Analisando Progresso",
                subtitle: "Calculando suas estatísticas..."
            },
            default: {
                title: "Carregando",
                subtitle: "Aguarde um momento..."
            }
        };
        this.currentPage = this.detectPage();
        this.init();
    }

    detectPage() {
        const path = window.location.pathname;
        const filename = path.split('/').pop().split('.')[0];
        
        if (filename === 'dashboard' || filename === 'index' || filename === '') {
            return 'dashboard';
        } else if (filename === 'deck') {
            return 'deck';
        } else if (filename === 'study') {
            return 'study';
        } else if (filename === 'progress') {
            return 'progress';
        } else {
            return 'default';
        }
    }

    init() {
        this.removePreloader();
        this.createOverlay();
        if (typeof window.pageLoadingComplete !== 'undefined') {
            this.waitForPageLoad();
        }
    }

    removePreloader() {
        const preloader = document.querySelector('.preloader');
        if (preloader) {
            preloader.remove();
        }
    }

    createOverlay() {
        if (this.overlay) return;

        const messages = this.defaultMessages[this.currentPage] || this.defaultMessages.default;
        
        this.overlay = document.createElement('div');
        this.overlay.className = 'global-loading-overlay';
        this.overlay.innerHTML = `
            <div class="loading-container animate-in">
                <div class="loading-brand">
                    <i class="fas fa-brain"></i>
                    Recall
                </div>
                
                <div class="loading-circle">
                    <div class="loading-circle-inner"></div>
                </div>
                
                <div class="loading-dots">
                    <div class="loading-dot"></div>
                    <div class="loading-dot"></div>
                    <div class="loading-dot"></div>
                </div>
                
                <div class="loading-text">
                    <div class="loading-title">${messages.title}</div>
                    <div class="loading-subtitle">${messages.subtitle}</div>
                </div>
                
                <div class="loading-progress">
                    <div class="loading-progress-bar"></div>
                </div>
            </div>
        `;

        document.body.appendChild(this.overlay);
        this.isVisible = true;

        setTimeout(() => {
            if (this.isVisible) {
                this.hide();
            }
        }, 10000);
    }

    show(customMessage = null) {
        if (!this.overlay) {
            this.createOverlay();
        }

        if (customMessage) {
            this.updateMessage(customMessage.title, customMessage.subtitle);
        }

        this.overlay.classList.remove('hidden');
        this.isVisible = true;
        document.body.style.overflow = 'hidden';
    }

    hide() {
        if (!this.overlay || !this.isVisible) return;

        this.overlay.classList.add('hidden');
        this.isVisible = false;
        document.body.style.overflow = '';

        setTimeout(() => {
            if (this.overlay && this.overlay.parentNode) {
                this.overlay.parentNode.removeChild(this.overlay);
                this.overlay = null;
            }
        }, 500);
    }

    updateMessage(title, subtitle = '') {
        if (!this.overlay) return;

        const titleEl = this.overlay.querySelector('.loading-title');
        const subtitleEl = this.overlay.querySelector('.loading-subtitle');
        
        if (titleEl && title) {
            titleEl.textContent = title;
        }
        if (subtitleEl && subtitle) {
            subtitleEl.textContent = subtitle;
        }
    }

    updateProgress(percentage) {
        if (!this.overlay) return;
        
        const progressBar = this.overlay.querySelector('.loading-progress-bar');
        if (progressBar) {
            progressBar.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
            progressBar.style.animation = 'none';
        }
    }

    waitForPageLoad() {
        const checkPageLoad = () => {
            if (window.pageLoadingComplete === true) {
                this.hide();
            } else {
                setTimeout(checkPageLoad, 100);
            }
        };
        checkPageLoad();
    }

    showWithSteps(steps = [], currentStep = 0) {
        if (steps.length === 0) {
            this.show();
            return;
        }

        const step = steps[currentStep] || steps[steps.length - 1];
        this.show(step);
        this.updateProgress((currentStep + 1) / steps.length * 100);
    }

    async wrapAsyncOperation(promise, message = null) {
        this.show(message);
        try {
            const result = await promise;
            this.hide();
            return result;
        } catch (error) {
            this.hide();
            throw error;
        }
    }
    async wrapMultipleOperations(operations = []) {
        this.show();
        
        for (let i = 0; i < operations.length; i++) {
            const { operation, message } = operations[i];
            
            if (message) {
                this.updateMessage(message.title, message.subtitle);
            }
            
            this.updateProgress((i / operations.length) * 100);
            
            try {
                await operation();
            } catch (error) {
                // Continue with other operations
            }
        }
        
        this.updateProgress(100);
        setTimeout(() => this.hide(), 500);
    }
}

window.globalLoader = new GlobalLoader();

window.showLoading = (message) => window.globalLoader.show(message);
window.hideLoading = () => window.globalLoader.hide();
window.updateLoadingMessage = (title, subtitle) => window.globalLoader.updateMessage(title, subtitle);
window.updateLoadingProgress = (percentage) => window.globalLoader.updateProgress(percentage);

window.addEventListener('load', () => {
    setTimeout(() => {
        if (window.globalLoader.isVisible && typeof window.pageLoadingComplete === 'undefined') {
            window.globalLoader.hide();
        }
    }, 1000);
});

window.addEventListener('error', () => {
    setTimeout(() => {
        if (window.globalLoader.isVisible) {
            window.globalLoader.hide();
        }
    }, 1000);
});

window.addEventListener('popstate', () => {
    window.globalLoader.currentPage = window.globalLoader.detectPage();
});

if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        document.body.dataset.theme = e.matches ? 'dark' : 'light';
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = GlobalLoader;
}