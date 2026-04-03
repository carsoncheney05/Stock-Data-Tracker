export default async function handler(req, res) {
  const symbol = req.query.symbol;
  const purchaseDate = req.query.purchaseDate;

  if (!symbol || !purchaseDate) {
    return res.status(400).json({ error: "Missing symbol or purchaseDate" });
  }

  if (!process.env.FINNHUB_API_KEY) {
    return res.status(500).json({ error: "Missing FINNHUB_API_KEY on server" });
  }

  const from = Math.floor(new Date(purchaseDate).getTime() / 1000);
  const to = Math.floor(Date.now() / 1000);

  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=D&from=${from}&to=${to}&token=${process.env.FINNHUB_API_KEY}`
    );

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch chart data" });
  }
}