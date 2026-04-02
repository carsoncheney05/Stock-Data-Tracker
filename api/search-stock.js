export default async function handler(req, res) {
  const query = req.query.q;

  if (!query) {
    return res.status(400).json({ error: "Missing search query" });
  }

  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${process.env.FINNHUB_API_KEY}`
    );

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch stock search results" });
  }
}