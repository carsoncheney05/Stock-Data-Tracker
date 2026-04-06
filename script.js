const stockSearchInput = document.getElementById('stock-search');
const searchResults = document.getElementById('search-results');
const stockform = document.getElementById('stock-form');
const tickerInput = document.getElementById('ticker');
const sharesInput = document.getElementById('shares');
const buyPriceInput = document.getElementById('buy-price');
const purchaseDateInput = document.getElementById('purchase-date');
const holdingsBody = document.getElementById('holdings-body');

let stockPriceChart;
let portfolioChart;
let searchTimeout;
let holdings = JSON.parse(localStorage.getItem('holdings')) || [];

    stockSearchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
            const query = stockSearchInput.value.trim();
            searchTimeout = setTimeout(() => {
                searchStocks(query);
            }, 300);
    });

    async function searchStocks(query) {
    if (query.length < 2) {
        searchResults.innerHTML = "";
        searchResults.style.display = "none";
        return;
    }

    try {
        const response = await fetch(`/api/search-stock?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        renderSearchResults(data.result || []);
    } catch (error) {
        console.error("Search error:", error);
        searchResults.innerHTML = "";
        searchResults.style.display = "none";
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
        try {
            const response = await fetch(
                `/api/chart?symbol=${encodeURIComponent(symbol)}&purchaseDate=${encodeURIComponent(purchaseDate)}`
            );
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("Chart error:", error);
            return null;
        }
    }

    function renderStockPriceChart(symbol, purchaseDate, chartData) {
        const ctx = document.getElementById('stock-price-chart');

        if (stockPriceChart) {
            stockPriceChart.destroy();
        }

        if (!chartData || !chartData.c || !chartData.t || chartData.c.length === 0) {
            stockPriceChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['No data'],
                    datasets: [{
                        label: `${symbol} Last 30 Days`,
                        data: [0]
                    }]
                }
            });
            return;
        }

        const labels = chartData.t.map((timestamp) => {
            const date = new Date(timestamp * 1000);
            return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
        });

        const prices = chartData.c;

        stockPriceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: `${symbol} Last 30 Days`,
                    data: prices,
                    tension: 0.2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: true
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            maxTicksLimit: 10
                        }
                    }
                }
            }
        });
    }

    function renderSearchResults(results) {
        searchResults.innerHTML = "";

        if (!results.length) {
            searchResults.style.display = "none";
            return;
        }

        results.slice(0, 8).forEach(stock => {
            const item = document.createElement("div");
            item.className = 'search-result-item';

            item.innerHTML = `
                <div class="search-name">${stock.description || stock.displaySymbol}</div>
                <div class="search-meta">${stock.symbol}</div>
            `;

    item.addEventListener('click', () => {
        tickerInput.value = stock.symbol;
        stockSearchInput.value = stock.description || stock.displaySymbol;
        searchResults.innerHTML = "";
        searchResults.style.display = "none";
    });

            searchResults.appendChild(item);
        });

        searchResults.style.display = "block";
    }

    async function updateSelectedStockChart() {
        const symbol = tickerInput.value.trim().toUpperCase();

        if (!symbol) {
            return;
        }

        const chartData = await getChartData(symbol, purchaseDateInput.value);
        renderStockPriceChart(symbol, 'Last 30 Days', chartData);

        console.log(chartData);
    }

    tickerInput.addEventListener('change', updateSelectedStockChart);
    purchaseDateInput.addEventListener('change', updateSelectedStockChart);
        
    function renderPortfolioChart(allocationMap) {
        const ctx = document.getElementById('portfolio-chart');

        if (portfolioChart) {
            portfolioChart.destroy();
        }

        const labels = Object.keys(allocationMap);
        const values = Object.values(allocationMap);

        if (labels.length === 0) {
            return;
        }

        portfolioChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels,
                datasets: [{
                    label: 'Portfolio Allocation',
                    data: values
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
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
        const chartData = await getChartData(symbol, purchaseDate);
        renderStockPriceChart(symbol, 'Last 30 Days', chartData);
    }

    function deleteHolding(id) {
        holdings = holdings.filter(holding => holding.id !== id);
        saveHoldings();
        renderHoldings();
    }

renderHoldings();