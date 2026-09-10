import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

function topThree(result, type) {
    if (!Array.isArray(result?.quotes)) {
        throw new Error('Invalid screener response.');
    }

    return result.quotes
        .filter(quote =>
            typeof quote.symbol === 'string'
            && quote.symbol.trim().length > 0
            && Number.isFinite(quote.regularMarketChangePercent)
            && (type === 'gainers'
                ? quote.regularMarketChangePercent > 0
                : quote.regularMarketChangePercent < 0)
        )
        .sort((a, b) => type === 'gainers'
            ? b.regularMarketChangePercent - a.regularMarketChangePercent
            : a.regularMarketChangePercent - b.regularMarketChangePercent
        )
        .slice(0, 3)
        .map(quote => ({
            symbol: quote.symbol,
            name: quote.shortName || quote.longName || quote.symbol,
            price: Number.isFinite(quote.regularMarketPrice)
                ? quote.regularMarketPrice : null,
            currency: quote.currency || '',
            changePercent: quote.regularMarketChangePercent,
            quoteTime: Number.isFinite(quote.regularMarketTime)
                ? quote.regularMarketTime : null
        }));
}

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Method not allowed.' });
    }

    try {
        const [gainersResult, losersResult] = await Promise.all([
            yahooFinance.screener('day_gainers', { count: 25 }),
            yahooFinance.screener('day_losers', { count: 25 })
        ]);

        const data = {
            gainers: topThree(gainersResult, 'gainers'),
            losers: topThree(losersResult, 'losers')
        };

        res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60');
        return res.status(200).json(data);
    } catch (error) {
        console.error('Market movers error:', error);
        res.setHeader('Cache-Control', 'no-store');

        return res.status(502).json({
            error: 'Could not load market movers.'
        });
    }
}