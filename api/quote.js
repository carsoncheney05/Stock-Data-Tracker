export default async function handler(req, res) {
  const symbol = req.query.symbol;

  if (!symbol) {
    return res.status(400).json({ error: "Missing stock symbol" });
  }

  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${process.env.FINNHUB_API_KEY}`
    );

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch stock quote" });
  }
}