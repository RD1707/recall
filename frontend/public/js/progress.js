const pageState = {
    reviewsChart: null,
};

window.pageLoadingComplete = false;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initializeProgressPage();
    } catch (error) {
        if (typeof updateLoadingMessage === 'function') {
            updateLoadingMessage('Erro', 'Não foi possível carregar as estatísticas');
        }
        
        setTimeout(() => {
            if (typeof hideLoading === 'function') {
                hideLoading();
            }
            showToast('Erro ao carregar progresso', 'error');
        }, 1000);
    }
});

async function initializeProgressPage() {
    if (typeof updateLoadingMessage === 'function') {
        updateLoadingMessage('Analisando Progresso', 'Configurando interface...');
    }
    
    setupEventListeners();
    
    if (typeof updateLoadingMessage === 'function') {
        updateLoadingMessage('Analisando Progresso', 'Buscando dados...');
    }
    
    await loadAllProgressData(7);
    
    if (typeof updateLoadingMessage === 'function') {
        updateLoadingMessage('Pronto!', 'Análise concluída');
    }
    
    setTimeout(() => {
        window.pageLoadingComplete = true;
        if (typeof hideLoading === 'function') {
            hideLoading();
        }
    }, 500);
}

async function loadAllProgressData(range = 7) {
    renderSkeletons();

    try {
        if (window.globalLoader && typeof window.globalLoader.wrapMultipleOperations === 'function') {
            const operations = [
                {
                    operation: async () => {
                        const summaryData = await fetchAnalyticsSummary();
                        updateStatCards(summaryData);
                    },
                    message: { title: 'Analisando Progresso', subtitle: 'Carregando estatísticas gerais...' }
                },
                {
                    operation: async () => {
                        const chartData = await fetchReviewsOverTime(range);
                        renderReviewsChart(chartData);
                    },
                    message: { title: 'Analisando Progresso', subtitle: 'Gerando gráficos de atividade...' }
                },
                {
                    operation: async () => {
                        const insightsData = await fetchPerformanceInsights();
                        renderInsights(insightsData);
                    },
                    message: { title: 'Analisando Progresso', subtitle: 'Processando insights do tutor IA...' }
                }
            ];

            await window.globalLoader.wrapMultipleOperations(operations);
        } else {
            const [chartData, insightsData, summaryData] = await Promise.all([
                fetchReviewsOverTime(range), 
                fetchPerformanceInsights(),  
                fetchAnalyticsSummary()      
            ]);

            updateStatCards(summaryData);
            renderReviewsChart(chartData);
            renderInsights(insightsData);
        }
    } catch (error) {
        showToast('Erro ao carregar algumas informações', 'error');
    }
}

function setupEventListeners() {
    const timeRangeSelector = document.querySelector('.time-range-selector');
    if (!timeRangeSelector) return;

    timeRangeSelector.addEventListener('click', (e) => {
        const button = e.target.closest('.time-range-btn');
        if (button && !button.classList.contains('active')) {
            const range = parseInt(button.dataset.range, 10);
            
            timeRangeSelector.querySelector('.active')?.classList.remove('active');
            button.classList.add('active');

            loadAndRenderChart(range);
        }
    });
}

async function loadAndRenderChart(range) {
    try {
        let chartData;
        if (window.globalLoader && typeof window.globalLoader.wrapAsyncOperation === 'function') {
            chartData = await window.globalLoader.wrapAsyncOperation(
                fetchReviewsOverTime(range),
                { title: 'Atualizando Gráfico', subtitle: `Carregando dados dos últimos ${range} dias...` }
            );
        } else {
            document.querySelector('.chart-container').style.opacity = '0.5';
            chartData = await fetchReviewsOverTime(range);
            document.querySelector('.chart-container').style.opacity = '1';
        }
        
        renderReviewsChart(chartData);
    } catch (error) {
        showToast('Erro ao atualizar gráfico', 'error');
    }
}

function updateStatCards(summary) {
    if (!summary) return; 
    document.getElementById('total-reviews-stat').textContent = summary.total_reviews || 0;
    document.getElementById('accuracy-stat').textContent = `${Math.round(summary.average_accuracy || 0)}%`;
    document.getElementById('max-streak-stat').textContent = `${summary.max_streak || 0} dias`;
    document.getElementById('mastered-cards-stat').textContent = summary.mastered_cards || 0;
}

function renderReviewsChart(chartData) {
    const ctx = document.getElementById('reviewsChart');
    if (!ctx) return;
    
    const chartContainer = document.querySelector('.chart-container');

    if (pageState.reviewsChart) {
        pageState.reviewsChart.destroy();
    }
    
    if (!chartData || !chartData.labels || chartData.labels.length === 0) {
        chartContainer.innerHTML = '<p style="text-align: center; color: var(--color-text-muted);">Não há dados de revisões para exibir neste período.</p>';
        return;
    }

    if (!chartContainer.querySelector('canvas')) {
        chartContainer.innerHTML = '<canvas id="reviewsChart"></canvas>';
    }

    pageState.reviewsChart = new Chart(ctx.getContext('2d'), {
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

function renderInsights(insightsData) {
    const insightsContent = document.getElementById('insights-content');
    const difficultDecksList = document.getElementById('difficult-decks-list');

    if (!insightsContent || !difficultDecksList) return;

    if (insightsData && insightsData.insight) {
        insightsContent.innerHTML = `<p>${insightsData.insight.replace(/\n/g, '<br>')}</p>`;
    } else {
        insightsContent.innerHTML = '<p>Continue a estudar para receber insights personalizados do seu tutor IA!</p>';
    }

    difficultDecksList.innerHTML = '';
    if (insightsData && insightsData.difficultDecks && insightsData.difficultDecks.length > 0) {
        insightsData.difficultDecks.forEach(deck => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <div class="deck-info">
                    <span class="deck-name">${escapeHtml(deck.deck_title)}</span>
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

function renderSkeletons() {
    const insightsContent = document.getElementById('insights-content');
    const difficultDecksList = document.getElementById('difficult-decks-list');
    
    if (insightsContent) {
        insightsContent.innerHTML = `
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text"></div>`;
    }
    
    if (difficultDecksList) {
        difficultDecksList.innerHTML = `
            <li><div class="skeleton skeleton-text" style="height: 40px;"></div></li>
            <li><div class="skeleton skeleton-text" style="height: 40px;"></div></li>`;
    }
}

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}