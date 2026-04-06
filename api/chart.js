export default async function handler(req, res) {
  const symbol = req.query.symbol;
  const purchaseDate = req.query.purchaseDate;

  if (!symbol || !purchaseDate) {
    return res.status(400).json({ error: "Missing symbol or purchaseDate" });
  }

  if (!process.env.ALPHA_VANTAGE_API_KEY) {
    return res.status(500).json({ error: "Missing ALPHA_VANTAGE_API_KEY on server" });
  }

  try {
    const response = await fetch(
      `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${encodeURIComponent(symbol)}&outputsize=full&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`
    );

    const data = await response.json();

    if (data.Note) {
      return res.status(200).json({ error: data.Note });
    }

    if (data["Error Message"]) {
      return res.status(200).json({ error: data["Error Message"] });
    }

    const series = data["Time Series (Daily)"];
    if (!series) {
      return res.status(200).json({ s: "no_data", c: [], t: [] });
    }

    const fromDate = new Date(purchaseDate);
    fromDate.setHours(0, 0, 0, 0);

    const entries = Object.entries(series)
      .filter(([date]) => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d >= fromDate;
      })
      .sort((a, b) => new Date(a[0]) - new Date(b[0]));

    const c = entries.map(([, values]) => Number(values["4. close"]));
    const t = entries.map(([date]) => Math.floor(new Date(date).getTime() / 1000));

    return res.status(200).json({
      s: c.length ? "ok" : "no_data",
      c,
      t
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch chart data" });
  }
}