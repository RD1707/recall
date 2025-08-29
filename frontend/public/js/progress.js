const pageState = {
    reviewsChart: null,
};

document.addEventListener('DOMContentLoaded', () => {
    loadAllProgressData(7);
    setupEventListeners();
});

async function loadAllProgressData(range = 7) {
    renderSkeletons();

    const [chartData, insightsData, summaryData] = await Promise.all([
        fetchReviewsOverTime(range), 
        fetchPerformanceInsights(),  
        fetchAnalyticsSummary()      
    ]);

    updateStatCards(summaryData);
    renderReviewsChart(chartData);
    renderInsights(insightsData);
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
    document.querySelector('.chart-container').style.opacity = '0.5';
    
    const chartData = await fetchReviewsOverTime(range);
    renderReviewsChart(chartData);

    document.querySelector('.chart-container').style.opacity = '1';
}

function updateStatCards(summary) {
    if (!summary) return; 
    document.getElementById('total-reviews-stat').textContent = summary.total_reviews || 0;
    document.getElementById('accuracy-stat').textContent = `${Math.round(summary.average_accuracy || 0)}%`;
    document.getElementById('max-streak-stat').textContent = `${summary.max_streak || 0} dias`;
    document.getElementById('mastered-cards-stat').textContent = summary.mastered_cards || 0;
}

function renderReviewsChart(chartData) {
    const ctx = document.getElementById('reviewsChart').getContext('2d');
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

function renderSkeletons() {
    document.getElementById('insights-content').innerHTML = `
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text"></div>`;
    
    document.getElementById('difficult-decks-list').innerHTML = `
        <li><div class="skeleton skeleton-text" style="height: 40px;"></div></li>
        <li><div class="skeleton skeleton-text" style="height: 40px;"></div></li>`;
}