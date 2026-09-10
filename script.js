const stockSearchInput = document.getElementById('stock-search');
const searchResults = document.getElementById('search-results');
const stockform = document.getElementById('stock-form');
const tickerInput = document.getElementById('ticker');
const sharesInput = document.getElementById('shares');
const buyPriceInput = document.getElementById('buy-price');
const purchaseDateInput = document.getElementById('purchase-date');
const holdingsBody = document.getElementById('holdings-body');
const rangeButtons = document.querySelectorAll('.range-button');

let stockPriceChart;
let portfolioChart;
let searchTimeout;
let chartSelection = { symbol: '', purchaseDate: ''};
let latestChartRequest = 0;
let holdings = JSON.parse(localStorage.getItem('holdings')) || [];
let selectedChartRange = '1m'; // Default chart range
let latestSearchRequest = 0;

function closeSearchResults() {
    clearTimeout(searchTimeout);
    latestSearchRequest++;
    searchResults.classList.remove('is-open');
}

rangeButtons.forEach(button => {
    button.addEventListener('click', () => {
        selectedChartRange = button.dataset.range;

        rangeButtons.forEach((rangeButton) => {
            rangeButton.classList.remove('active');
        });

    button.classList.add('active');
    showChart(chartSelection.symbol, chartSelection.purchaseDate);
        });
    });
        stockSearchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);

            const query = stockSearchInput.value.trim();
            const requestId = ++latestSearchRequest;

            if (query.length < 2) {
                closeSearchResults();
                return;
            }

            searchTimeout = setTimeout(() => {
                searchStocks(query, requestId);
            }, 200);
        });

    async function searchStocks(query, requestId) {
        try {
            const response = await fetch(
                `/api/search-stock?q=${encodeURIComponent(query)}`
            );

            if (!response.ok) {
                throw new Error(`Search failed: ${response.status}`);
            }

            const data = await response.json();

            // Ignore responses for an older search.
            if (requestId !== latestSearchRequest) return;

            renderSearchResults(
                Array.isArray(data.result) ? data.result : []
            );
        } catch (error) {
            if (requestId !== latestSearchRequest) return;

            console.error('Search error:', error);
            closeSearchResults();
        }
    }

    async function getQuote(symbol) {
        try {
        const response = await fetch(`/api/quote?symbol=${encodeURIComponent(symbol)}`);
        const data = await response.json();
        return data;
        } catch (error) {
        console.error("Quote error:", error);
        return null;
        }
    }

    async function getChartData(symbol, purchaseDate) {
        const params = new URLSearchParams({
            symbol,
            range: selectedChartRange
        });

        if (purchaseDate) {
            params.set('purchaseDate', purchaseDate);
        }

        const response = await fetch('/api/chart?' + params.toString());
        const data = await response.json();

        if (!response.ok || data.error) {
            throw new Error(data.error || 'Chart request failed.');
        }
        return data;
    }
    function renderStockPriceChart(symbol, purchaseDate, chartData) {
        const ctx = document.getElementById('stock-price-chart');
        const rangeLabels = {'1d': 'Latest Trading Day', '1w': 'Past Week', '1m': 'Past 30 Days', '3m': 'Past 90 Days', '1y': 'Past Year', purchase: `Since ${purchaseDate}`};

        const range = chartData?.range || selectedChartRange;
        const chartLabel = `${symbol} - ${rangeLabels[range]}`;

        if (stockPriceChart) {
            stockPriceChart.destroy();
        }

        if (!chartData || !chartData.c || !chartData.t || chartData.c.length === 0) {
            stockPriceChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['No data'],
                    datasets: [{
                        label: chartLabel,
                        data: []
                    }]
                }
            });
            return;
        }

        const labels = chartData.t.map((timestamp) => {
            const date = new Date(timestamp * 1000);

            if (range === '1d') {
                return date.toLocaleTimeString('en-US', {
                    hour: 'numeric', minute: '2-digit'
                });
            }
            return date.toLocaleDateString('en-US');
        });

        const prices = chartData.c;

        stockPriceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: chartLabel,
                    data: prices,
                    tension: 0.2,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.08)',
                    borderWidth: 2,
                    fill: true,
                    pointRadius: prices.length === 1 ? 3 : 0,
                    pointHoverRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: window.matchMedia(
                    '(prefers-reduced-motion: reduce)'
                ).matches ? false : {
                    duration: 650,
                    easing: 'easeOutQuart'
                },
                plugins: {
                    legend: {
                        display: true
                    }
                },
                scales: {
                  x: {
                    ticks: {
                        autoSkip: range !== '1d',
                        maxTicksLimit: 10,
                            callback: function(value) {
                                if (range === '1d') {
                                    const date = new Date(chartData.t[value] * 1000);

                                    // Label the first point and each whole hour.
                                    if (value !== 0 && date.getMinutes() !== 0) {
                                        return null;
                                    }
                                }

                                return this.getLabelForValue(value);
                            }
                        }
                    }
                }
            }
        });
    }

    function renderSearchResults(results) {
    if (!results.length) {
        closeSearchResults();
        return;
    }

    const rows = results.slice(0, 8).map((stock) => {
        const item = document.createElement('div');
        item.className = 'search-result-item';

        const name = document.createElement('div');
        name.className = 'search-name';
        name.textContent =
            stock.description || stock.displaySymbol || stock.symbol;

        const symbol = document.createElement('div');
        symbol.className = 'search-meta';
        symbol.textContent = stock.symbol;

        item.append(name, symbol);

        item.addEventListener('click', () => {
            tickerInput.value = stock.symbol;
            stockSearchInput.value = name.textContent;

            closeSearchResults();
            updateSelectedStockChart();
        });

        return item;
    });

    searchResults.replaceChildren(...rows);
    searchResults.classList.add('is-open');
}

    function updateSelectedStockChart() {
        return showChart(
            tickerInput.value.trim().toUpperCase(),
            purchaseDateInput.value
        );
    }

    tickerInput.addEventListener('change', updateSelectedStockChart);
    purchaseDateInput.addEventListener('change', updateSelectedStockChart);
        
    function renderPortfolioChart(allocationMap) {
        const canvas = document.getElementById('portfolio-chart');
        const frame = canvas.parentElement;
        const status = document.getElementById('allocation-status');

        const entries = Object.entries(allocationMap).filter(
            ([, value]) => Number.isFinite(value) && value > 0
        );

        if (entries.length === 0) {
            if (portfolioChart) {
                portfolioChart.destroy();
                portfolioChart = null;
            }

            frame.hidden = true;
            status.hidden = false;
            status.textContent = holdings.length === 0
                ? 'Add a holding to see your allocation.'
                : 'No current market values available to chart.';

            return;
        }

        frame.hidden = false;
        status.hidden = true;

        const labels = entries.map(([symbol]) => symbol);
        const values = entries.map(([, value]) => value);

        // Update the existing chart when holdings change.
        if (portfolioChart) {
            portfolioChart.data.labels = labels;
            portfolioChart.data.datasets[0].data = values;
            portfolioChart.update();
            return;
        }

        portfolioChart = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    label: 'Current Market Value',
                    data: values,
                    backgroundColor: [
                        '#2563eb',
                        '#7c3aed',
                        '#0891b2',
                        '#059669',
                        '#d97706',
                        '#db2777'
                    ],
                    borderColor: '#ffffff',
                    borderWidth: 3,
                    hoverOffset: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                animation: window.matchMedia(
                    '(prefers-reduced-motion: reduce)'
                ).matches ? false : {
                    duration: 500,
                    easing: 'easeOutQuart'
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 16,
                            font: { size: 14 }
                        }
                    }
                }
            }
        });
    }

    stockform.addEventListener('submit', function(event) {
        event.preventDefault(); 

        const newHolding = {
            id: Date.now(),
            ticker: tickerInput.value.toUpperCase(),
            shares: parseFloat(sharesInput.value),
            buyPrice: parseFloat(buyPriceInput.value),
            purchaseDate: purchaseDateInput.value
        };

        holdings.push(newHolding);
        saveHoldings();
        renderHoldings();
        stockform.reset();

    });

    function saveHoldings() {
        localStorage.setItem('holdings', JSON.stringify(holdings));
    }

    async function renderHoldings() {
        holdingsBody.innerHTML = '';

        let allocationMap = {};
        let totalInvested = 0;
        let totalCurrentValue = 0;
        let totalGainLoss = 0;

        for (const holding of holdings) {
            const row = document.createElement('tr');

            const invested = holding.shares * holding.buyPrice;
            totalInvested += invested;

            const quote = await getQuote(holding.ticker);

            let currentPrice = 0;
            let currentValue = 0;
            let gainLoss = 0;

            if (quote && quote.c) {
                currentPrice = quote.c;
                currentValue = holding.shares * currentPrice;
                gainLoss = currentValue - invested;
            }

            if (currentValue > 0) {
                if (!allocationMap[holding.ticker]) {
                    allocationMap[holding.ticker] = 0;
                }
                allocationMap[holding.ticker] += currentValue;
            }

            totalCurrentValue += currentValue;
            totalGainLoss += gainLoss;

            row.innerHTML = `
                <td>${holding.ticker}</td>
                <td>${holding.shares}</td>
                <td>$${holding.buyPrice.toFixed(2)}</td>
                <td>${currentPrice ? `$${currentPrice.toFixed(2)}` : '--'}</td>
                <td>$${invested.toFixed(2)}</td>
                <td>${currentValue ? `$${currentValue.toFixed(2)}` : '--'}</td>
                <td style="color: ${gainLoss >= 0 ? 'green' : 'red'};">
                    ${currentPrice ? `$${gainLoss.toFixed(2)}` : '--'}
                </td>
                <td>${holding.purchaseDate}</td>
                <td><button onclick="showChart('${holding.ticker}', '${holding.purchaseDate}')">View</button>
                    <button onclick="deleteHolding(${holding.id})">Delete</button>
                </td>
            `;

            holdingsBody.appendChild(row);
        }

        document.getElementById('total-value').textContent = `$${totalInvested.toFixed(2)}`;
        document.getElementById('total-current-value').textContent = `$${totalCurrentValue.toFixed(2)}`;
        document.getElementById('total-gain-loss').textContent = `$${totalGainLoss.toFixed(2)}`;
        renderPortfolioChart(allocationMap);
    }

    async function showChart(symbol, purchaseDate) {
        const panel = document.getElementById('stock-chart-panel');
        const status = document.getElementById('stock-chart-status');
        const frame = document.getElementById('stock-chart-frame');

        symbol = String(symbol || '').trim().toUpperCase();
        chartSelection = { symbol, purchaseDate: purchaseDate || '' };
        const requestId = ++latestChartRequest;

        if (selectedChartRange === 'purchase' && !chartSelection.purchaseDate) {
            selectedChartRange = '1m';
        }

        rangeButtons.forEach(button => {
            const active = button.dataset.range === selectedChartRange;

            button.classList.toggle('active', active);
            button.setAttribute('aria-pressed', String(active));
            button.disabled = button.dataset.range === 'purchase'
                && !chartSelection.purchaseDate;
        });

        panel.inert = !symbol;
        panel.classList.toggle('is-open', Boolean(symbol));

        if (!symbol) {
            panel.classList.remove('is-loading');
            frame.setAttribute('aria-busy', 'false');
            frame.style.visibility = 'hidden';
            status.textContent = '';
            return;
        }

        // Open the panel before waiting for the stock data.
        panel.classList.add('is-loading');
        frame.setAttribute('aria-busy', 'true');
        status.classList.remove('is-error');
        status.textContent = 'Loading ' + symbol + '…';

        try {
            const chartData = await getChartData(symbol, purchaseDate);

            // Ignore a response if another selection has replaced it.
            if (requestId !== latestChartRequest) return;

            if (!chartData
                || !Array.isArray(chartData.c)
                || !Array.isArray(chartData.t)
                || chartData.c.length !== chartData.t.length
                || !chartData.c.every(Number.isFinite)
                || !chartData.t.every(Number.isFinite)) {
                throw new Error('Invalid chart response.');
            }

            if (chartData.c.length === 0) {
                frame.style.visibility = 'hidden';
                status.textContent = 'No prices available for this range.';
                return;
            }

            frame.style.visibility = 'visible';
            renderStockPriceChart(symbol, purchaseDate, chartData);
            status.textContent = '';
        } catch (error) {
            if (requestId !== latestChartRequest) return;

            console.error('Chart error:', error);
            frame.style.visibility = 'hidden';
            status.classList.add('is-error');
            status.textContent = 'Could not load ' + symbol + '. Please try again.';
        } finally {
            if (requestId === latestChartRequest) {
                panel.classList.remove('is-loading');
                frame.setAttribute('aria-busy', 'false');
            }
        }
    }



    function deleteHolding(id) {
        holdings = holdings.filter(holding => holding.id !== id);
        saveHoldings();
        renderHoldings();
    }


updateSelectedStockChart();
renderHoldings();