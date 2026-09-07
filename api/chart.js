import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

const allowedRanges = ['1d', '1w', '1m', '3m', '1y', 'purchase'];

export default async function handler(req, res) {
  const symbol = String(req.query.symbol || "").trim().toUpperCase();
  const range = String(req.query.range || '1m').toLowerCase();
  const purchaseDate = String(req.query.purchaseDate || '');

  if (!symbol) {
    return res.status(400).json({ error: 'Symbol is required' });
  }

  if (!allowedRanges.includes(range)) {
    return res.status(400).json({ error: 'Invalid range' });
  }

  const now = new Date();
  let period1 = new Date(now);
  let interval = '1d';

  switch (range) {
    case '1d':
      period1.setUTCDate(period1.getUTCDate() - 5);
      interval = '5m';
      break;
    case '1w':
      period1.setUTCDate(period1.getUTCDate() - 7);
      interval = '1h';
      break;
    case '1m':
      period1.setUTCDate(period1.getUTCDate() - 30);
      interval = '1d';
      break;
    case '3m':
      period1.setUTCDate(period1.getUTCDate() - 90);
      interval = '1d';
      break;
    case '1y':
      period1.setUTCDate(period1.getUTCDate() - 365);
      interval = '1d';
      break;
    case 'purchase':
      if (!purchaseDate) {
        return res.status(400).json({ error: 'Purchase date is required' });
      }
      period1 = new Date(`${purchaseDate}T00:00:00Z`);
      
      if (Number.isNaN(period1.getTime()) || period1 > now) {
        return res.status(400).json({ error: 'Invalid purchase date' });
      }

      const holdingAgeinDays = (now.getTime() - period1.getTime()) / (1000 * 60 * 60 * 24);

      interval = holdingAgeinDays > 730 ? '1w' : '1d';
      break;
  }

  try {
    const result = await yahooFinance.chart(symbol, { period1, interval });
  
    let quotes = result.quotes.filter(
      (quote) => quote.close !== null && quote.close !== undefined
    );
    
    if (range === '1d' && quotes.length > 0) {
      const latestTradingDate = quotes
        .at(-1)
        .date
        .toISOString()
        .slice(0, 10);

      quotes = quotes.filter(
        (quote) =>
          quote.date.toISOString().slice(0,10) === latestTradingDate
      );
    }

    return res.status(200).json({
      s: quotes.length ? 'ok' : 'no_data',
      range,
      c: quotes.map((quote) => quote.close),
      t: quotes.map((quote) => Math.floor(quote.date.getTime() / 1000))
    });
  } catch (error) {
    console.error(`Yahoo Finance chart error for ${symbol}:`, error);

    return res.status(500).json({ error: 'Failed to fetch chart data' });
  }
}