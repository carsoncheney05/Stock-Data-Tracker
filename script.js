const stockform = document.getElementById('stock-form');
const tickerInput = document.getElementById('ticker');
const sharesInput = document.getElementById('shares');
const buyPriceInput = document.getElementById('buy-price');
const purchaseDateInput = document.getElementById('purchase-date');
const holdingsBody = document.getElementById('holdings-body');

let holdings = JSON.parse(localStorage.getItem('holdings')) || [];

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