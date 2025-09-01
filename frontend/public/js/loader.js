// frontend/public/js/loader.js

/**
 * Sistema Global de Loading para Recall - Versão Otimizada
 * Gerencia o estado de carregamento de forma centralizada e leve.
 */
class GlobalLoader {
    constructor() {
        this.overlay = document.getElementById('global-loading-overlay');
        this.mainContent = document.querySelector('main.deck-main');
        this.isVisible = this.overlay && !this.overlay.classList.contains('hidden');
        
        // Esconde o conteúdo principal ao iniciar
        if (this.mainContent) {
            this.mainContent.classList.add('hidden');
        }

        // Garante que o overlay existe, se não, cria um
        if (!this.overlay) {
            this.createOverlay();
        }
        
        // Auto-hide após 15 segundos como fallback
        setTimeout(() => {
            if (this.isVisible) {
                this.hide();
            }
        }, 2000);
    }

    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.id = 'global-loading-overlay';
        this.overlay.className = 'global-loading-overlay';
        this.overlay.innerHTML = `
            <div class="loading-container animate-in">
                <div class="loading-brand">
                    <i class="fas fa-brain"></i>
                    Recall
                </div>
                
                <div class="loading-spinner-wrapper">
                    <div class="loading-spinner"></div>
                </div>
                
                <div class="loading-dots">
                    <div class="loading-dot"></div>
                    <div class="loading-dot"></div>
                    <div class="loading-dot"></div>
                </div>
                
                <div class="loading-text">
                    <div class="loading-title">Carregando</div>
                    <div class="loading-subtitle">Aguarde um momento...</div>
                </div>
            </div>
        `;
        document.body.appendChild(this.overlay);
        this.isVisible = true;
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
        if (this.mainContent) {
            this.mainContent.classList.add('hidden');
        }
    }

    hide() {
        if (!this.overlay || !this.isVisible) return;

        this.overlay.classList.add('hidden');
        this.isVisible = false;
        document.body.style.overflow = '';
        if (this.mainContent) {
            this.mainContent.classList.remove('hidden');
        }

        // Remove o overlay após a animação de fade-out
        setTimeout(() => {
            if (this.overlay && this.overlay.parentNode) {
                this.overlay.parentNode.removeChild(this.overlay);
                this.overlay = null;
            }
        }, 200);
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
}

// Instância global
window.globalLoader = new GlobalLoader();

// Helpers globais para facilitar o uso
window.showLoading = (message) => window.globalLoader.show(message);
window.hideLoading = () => window.globalLoader.hide();
window.updateLoadingMessage = (title, subtitle) => window.globalLoader.updateMessage(title, subtitle);

// Exporta para uso em módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GlobalLoader;
}