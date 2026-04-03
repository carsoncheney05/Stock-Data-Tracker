const stockSearchInput = document.getElementById('stock-search');
const searchResults = document.getElementById('search-results');
const stockform = document.getElementById('stock-form');
const tickerInput = document.getElementById('ticker');
const sharesInput = document.getElementById('shares');
const buyPriceInput = document.getElementById('buy-price');
const purchaseDateInput = document.getElementById('purchase-date');
const holdingsBody = document.getElementById('holdings-body');


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
                <td><button onclick="deleteHolding(${holding.id})">Delete</button></td>
            `;

            holdingsBody.appendChild(row);
        }

        document.getElementById('total-value').textContent = `$${totalInvested.toFixed(2)}`;
        document.getElementById('total-current-value').textContent = `$${totalCurrentValue.toFixed(2)}`;
        document.getElementById('total-gain-loss').textContent = `$${totalGainLoss.toFixed(2)}`;
    }

    function deleteHolding(id) {
        holdings = holdings.filter(holding => holding.id !== id);
        saveHoldings();
        renderHoldings();
    }

renderHoldings();