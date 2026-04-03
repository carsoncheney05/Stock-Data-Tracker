export default async function handler(req, res) {
  const symbol = req.query.symbol;

  if (!symbol) {
    return res.status(400).json({ error: "Missing stock symbol" });
  }

  if (!process.env.FINNHUB_API_KEY) {
    return res.status(500).json({ error: "Missing FINNHUB_API_KEY on server" });
  }

  const now = Math.floor(Date.now() / 1000);
  const sixMonthsAgo = now - 60 * 60 * 24 * 30 * 6;

  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=D&from=${sixMonthsAgo}&to=${now}&token=${process.env.FINNHUB_API_KEY}`
    );

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch chart data" });
  }
}