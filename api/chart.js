import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

export default async function handler(req, res) {
  const symbol = String(req.query.symbol || "").trim().toUpperCase();

  if (!symbol) {
    return res.status(400).json({ error: 'Symbol is required' });
  }

  try {
    const period1 = new Date();
    period1.setDate(period1.getDate() - 45); // 45 days ago

    const result = await yahooFinance.chart(symbol, {
      period1,
      interval: '1d'
    });

    const quotes = result.quotes
      .filter((quote) => quote.close !== null) // Filter out quotes with null close values
      .slice(-30); // Get the last 30 quotes

    return res.status(200).json({
      s: quotes.length ? "ok" : "no_data",
      c: quotes.map((quote) => quote.close),
      t: quotes.map((quote) => Math.floor(quote.date.getTime() / 1000)), // Convert to Unix timestamp in seconds
    });
  } catch (error) {
    console.error(`Yahoo Finance chart error for ${symbol}:`, error);

    return res.status(500).json({ error: 'Failed to fetch chart data' });
  }
}
  