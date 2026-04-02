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

    function renderHoldings() {
        holdingsBody.innerHTML = '';
        
        holdings.forEach((holding) => {
            const row = document.createElement('tr');

            row.innerHTML = `
                <td>${holding.ticker}</td>
                <td>${holding.shares}</td>
                <td>${holding.buyPrice.toFixed(2)}</td>
                <td>${(holding.shares * holding.buyPrice).toFixed(2)}</td>
                <td>--</td>
                <td>--</td>
                <td>${holding.purchaseDate}</td>
                <td><button onclick="deleteHolding(${holding.id})">Delete</button></td>
            `;

            holdingsBody.appendChild(row);
        });
    }

    function deleteHolding(id) {
        holdings = holdings.filter(holding => holding.id !== id);
        saveHoldings();
        renderHoldings();
    }

renderHoldings();