/**
 * Arquivo: progress.js
 * Descrição: Gerencia toda a lógica da página de progresso, incluindo a busca de
 * dados analíticos do backend, a renderização de gráficos interativos e a exibição de insights.
 * VERSÃO OTIMIZADA E COMPLETA.
 */

// Objeto para armazenar o estado da página, como a instância do gráfico.
const pageState = {
    reviewsChart: null,
};

document.addEventListener('DOMContentLoaded', () => {
    // Carrega os dados iniciais com o filtro padrão de 7 dias.
    loadAllProgressData(7);
    setupEventListeners();
});

/**
 * Função principal que orquestra o carregamento de todos os dados necessários do backend.
 * @param {number} range - O período de dias para buscar os dados do gráfico (ex: 7, 30, 90).
 */
async function loadAllProgressData(range = 7) {
    // Mostra os skeletons de carregamento para uma melhor experiência do usuário.
    renderSkeletons();

    // Busca todos os dados necessários em paralelo para otimizar o tempo de carregamento.
    // Utiliza as funções do api.js centralizado.
    const [chartData, insightsData, summaryData] = await Promise.all([
        fetchReviewsOverTime(range), // Busca dados do gráfico para o período especificado.
        fetchPerformanceInsights(),  // Busca insights e baralhos difíceis.
        fetchAnalyticsSummary()      // Busca os cards de resumo (total, precisão, etc.).
    ]);

    // Atualiza os componentes da UI com os dados recebidos.
    updateStatCards(summaryData);
    renderReviewsChart(chartData);
    renderInsights(insightsData);
}

/**
 * Configura os event listeners para os botões de filtro de período do gráfico.
 */
function setupEventListeners() {
    const timeRangeSelector = document.querySelector('.time-range-selector');
    if (!timeRangeSelector) return;

    timeRangeSelector.addEventListener('click', (e) => {
        const button = e.target.closest('.time-range-btn');
        // Verifica se o botão clicado não é o que já está ativo.
        if (button && !button.classList.contains('active')) {
            const range = parseInt(button.dataset.range, 10);
            
            // Remove a classe 'active' do botão anterior e a adiciona ao clicado.
            timeRangeSelector.querySelector('.active')?.classList.remove('active');
            button.classList.add('active');
            
            // Recarrega apenas os dados do gráfico com o novo período.
            loadAndRenderChart(range);
        }
    });
}

/**
 * Função otimizada para buscar e renderizar apenas os dados do gráfico quando o filtro de tempo muda.
 * @param {number} range - O período em dias (7, 30, ou 90).
 */
async function loadAndRenderChart(range) {
    // Mostra um feedback visual no gráfico enquanto carrega
    document.querySelector('.chart-container').style.opacity = '0.5';
    
    const chartData = await fetchReviewsOverTime(range);
    renderReviewsChart(chartData);

    document.querySelector('.chart-container').style.opacity = '1';
}


// --- FUNÇÕES DE RENDERIZAÇÃO ---

/**
 * Preenche os cards de métricas chave com os dados recebidos do endpoint de resumo.
 * @param {object} summary - Objeto contendo as métricas de performance.
 */
function updateStatCards(summary) {
    if (!summary) return; // Proteção caso a chamada de API falhe.
    document.getElementById('total-reviews-stat').textContent = summary.total_reviews || 0;
    document.getElementById('accuracy-stat').textContent = `${Math.round(summary.average_accuracy || 0)}%`;
    document.getElementById('max-streak-stat').textContent = `${summary.max_streak || 0} dias`;
    document.getElementById('mastered-cards-stat').textContent = summary.mastered_cards || 0;
}

/**
 * Renderiza ou atualiza o gráfico de revisões com os dados do backend.
 * @param {object} chartData - Objeto com 'labels' e 'counts' para o gráfico.
 */
function renderReviewsChart(chartData) {
    const ctx = document.getElementById('reviewsChart').getContext('2d');
    const chartContainer = document.querySelector('.chart-container');

    // Destrói a instância anterior do gráfico para evitar sobreposições e bugs de tooltip.
    if (pageState.reviewsChart) {
        pageState.reviewsChart.destroy();
    }
    
    // Verifica se há dados para exibir.
    if (!chartData || !chartData.labels || chartData.labels.length === 0) {
        chartContainer.innerHTML = '<p style="text-align: center; color: var(--color-text-muted);">Não há dados de revisões para exibir neste período.</p>';
        return;
    }

    // Se a tag canvas foi removida, a recria.
    if (!chartContainer.querySelector('canvas')) {
        chartContainer.innerHTML = '<canvas id="reviewsChart"></canvas>';
    }

    pageState.reviewsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Flashcards Revisados',
                data: chartData.counts,
                backgroundColor: 'rgba(79, 70, 229, 0.5)',
                borderColor: 'rgba(79, 70, 229, 1)',
                borderWidth: 2,
                borderRadius: 4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        // Garante que o eixo Y só mostre números inteiros.
                        precision: 0
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        title: (tooltipItems) => `Revisões em ${tooltipItems[0].label}`
                    }
                }
            }
        }
    });
}

/**
 * Renderiza os insights da IA e a lista de baralhos com dificuldade.
 * @param {object} insightsData - Objeto contendo a propriedade 'insight' e 'difficultDecks'.
 */
function renderInsights(insightsData) {
    const insightsContent = document.getElementById('insights-content');
    const difficultDecksList = document.getElementById('difficult-decks-list');

    // Renderiza o insight do Tutor IA
    if (insightsData && insightsData.insight) {
        insightsContent.innerHTML = `<p>${insightsData.insight.replace(/\n/g, '<br>')}</p>`;
    } else {
        insightsContent.innerHTML = '<p>Continue a estudar para receber insights personalizados do seu tutor IA!</p>';
    }

    // Renderiza a lista de baralhos com dificuldade
    difficultDecksList.innerHTML = '';
    if (insightsData && insightsData.difficultDecks && insightsData.difficultDecks.length > 0) {
        insightsData.difficultDecks.forEach(deck => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <div class="deck-info">
                    <span class="deck-name">${deck.deck_title}</span>
                    <span class="error-rate">Taxa de erro: ${Math.round(deck.error_rate)}%</span>
                </div>
                <a href="study.html?deckId=${deck.deck_id}" class="btn btn-secondary">Revisar</a>
            `;
            difficultDecksList.appendChild(listItem);
        });
    } else {
        difficultDecksList.innerHTML = '<li><p>Ótimo trabalho! Nenhum baralho com alta taxa de erro detectado.</p></li>';
    }
}

/**
 * Mostra os skeletons de carregamento para uma melhor experiência do usuário.
 */
function renderSkeletons() {
    document.getElementById('insights-content').innerHTML = `
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text"></div>`;
    
    document.getElementById('difficult-decks-list').innerHTML = `
        <li><div class="skeleton skeleton-text" style="height: 40px;"></div></li>
        <li><div class="skeleton skeleton-text" style="height: 40px;"></div></li>`;
}