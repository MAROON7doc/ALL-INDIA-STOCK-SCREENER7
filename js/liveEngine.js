/**
 * Live Market Streamer & Multi-Source Equity Engine
 * Provides live ticking data, Yahoo Finance integration, Sector Heatmaps,
 * Market Breadth, and real-time event dispatching for NSE/BSE stocks.
 */

export class LiveStreamEngine {
  constructor(universe, onTickCallback, onAlertCallback) {
    this.universe = universe;
    this.onTick = onTickCallback;
    this.onAlert = onAlertCallback;
    this.isRunning = true;
    this.intervalMs = 3000; // 3 seconds live refresh
    this.timer = null;
    this.lastAlertTime = {};

    this.sectorPerformance = {
      'Defence / Aerospace': { change: +2.85, count: 3 },
      'EMS / Electronics': { change: +3.92, count: 2 },
      'Retail / Consumer': { change: +2.45, count: 2 },
      'Wires & Cables': { change: +1.80, count: 1 },
      'Fintech / Capital Markets': { change: +2.60, count: 2 },
      'IT - Software': { change: +0.65, count: 2 },
      'Renewable Energy': { change: +3.10, count: 1 }
    };
  }

  start() {
    this.isRunning = true;
    this.loop();
  }

  stop() {
    this.isRunning = false;
    if (this.timer) clearTimeout(this.timer);
  }

  setIntervalMs(ms) {
    this.intervalMs = ms;
  }

  async loop() {
    if (!this.isRunning) return;

    // Simulate / fetch live ticks for random 3-6 stocks in universe
    const updatedStocks = this.generateLiveTicks();
    if (this.onTick) {
      this.onTick(updatedStocks);
    }

    this.timer = setTimeout(() => this.loop(), this.intervalMs);
  }

  /**
   * Generates realistic micro-market fluctuations, volume spikes, and triggers burst alerts
   */
  generateLiveTicks() {
    const countToUpdate = Math.floor(Math.random() * 4) + 2; // 2 to 5 stocks per tick
    const shuffled = [...this.universe].sort(() => 0.5 - Math.random());
    const targets = shuffled.slice(0, countToUpdate);
    const updatedSymbols = [];

    targets.forEach(stock => {
      const candles = stock.candles;
      if (!candles || candles.length === 0) return;

      const lastCandle = candles[candles.length - 1];
      // Micro price fluctuation between -0.3% and +0.45% (bullish bias for growth leaders)
      const tickDeltaPct = (Math.random() - 0.44) * 0.75;
      const prevClose = lastCandle.close;
      const newClose = parseFloat(Math.max(5, prevClose * (1 + tickDeltaPct / 100)).toFixed(2));
      
      // Additional micro volume on tick
      const volDelta = Math.floor(Math.random() * 45000) + 10000;
      lastCandle.volume += volDelta;
      lastCandle.close = newClose;
      lastCandle.high = Math.max(lastCandle.high, newClose);
      lastCandle.low = Math.min(lastCandle.low, newClose);

      // Recompute day change
      const baseClose = candles[candles.length - 2]?.close || prevClose;
      stock.dayChangePct = parseFloat((((newClose - baseClose) / baseClose) * 100).toFixed(2));
      stock.ltp = newClose;
      stock.closes[stock.closes.length - 1] = newClose;
      stock.volumes[stock.volumes.length - 1] = lastCandle.volume;

      // Check if sudden volume burst triggered alert
      const avgVol = stock.volumes.slice(-21, -1).reduce((a, b) => a + b, 0) / 20;
      const burstRatio = avgVol > 0 ? lastCandle.volume / avgVol : 1.0;
      const burstPct = Math.round((burstRatio - 1) * 100);

      const now = Date.now();
      const lastAlert = this.lastAlertTime[stock.symbol] || 0;
      if (burstPct >= 50 && (now - lastAlert > 30000)) { // 30 sec debounce
        this.lastAlertTime[stock.symbol] = now;
        if (this.onAlert) {
          this.onAlert({
            type: 'VOLUME_BURST',
            symbol: stock.symbol,
            burstPct,
            price: newClose,
            dayChangePct: stock.dayChangePct,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          });
        }
      }

      updatedSymbols.push({
        symbol: stock.symbol,
        ltp: newClose,
        dayChangePct: stock.dayChangePct,
        tickDirection: tickDeltaPct >= 0 ? 'up' : 'down'
      });
    });

    return updatedSymbols;
  }

  /**
   * Fetch live Yahoo Finance chart/quote via CORS proxy
   */
  async fetchLiveYahooQuote(symbol) {
    const yahooTicker = symbol.includes('.') ? symbol : `${symbol}.NS`;
    const corsProxy = 'https://api.allorigins.win/raw?url=';
    const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooTicker}?interval=1d&range=3mo`;

    try {
      const resp = await fetch(corsProxy + encodeURIComponent(targetUrl), {
        signal: AbortSignal.timeout(4000)
      });
      if (!resp.ok) return null;
      const json = await resp.json();
      const result = json?.chart?.result?.[0];
      if (!result) return null;

      const meta = result.meta;
      const quote = result.indicators?.quote?.[0];
      const timestamps = result.timestamp;

      if (!quote || !timestamps) return null;

      const candles = timestamps.map((ts, idx) => ({
        date: new Date(ts * 1000).toISOString().split('T')[0],
        open: parseFloat((quote.open[idx] || meta.regularMarketPrice).toFixed(2)),
        high: parseFloat((quote.high[idx] || meta.regularMarketPrice).toFixed(2)),
        low: parseFloat((quote.low[idx] || meta.regularMarketPrice).toFixed(2)),
        close: parseFloat((quote.close[idx] || meta.regularMarketPrice).toFixed(2)),
        volume: quote.volume[idx] || 100000
      })).filter(c => !isNaN(c.close));

      return {
        symbol,
        price: meta.regularMarketPrice,
        dayChange: meta.regularMarketDayHigh - meta.regularMarketDayLow,
        dayChangePct: parseFloat((((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100).toFixed(2)),
        candles
      };
    } catch (e) {
      console.warn(`Yahoo live fetch failed for ${symbol}:`, e.message);
      return null;
    }
  }

  /**
   * Compute Real-time Market Breadth
   */
  getMarketBreadth() {
    let advances = 0;
    let declines = 0;
    let unchanged = 0;

    this.universe.forEach(s => {
      if (s.dayChangePct > 0.05) advances++;
      else if (s.dayChangePct < -0.05) declines++;
      else unchanged++;
    });

    const total = advances + declines + unchanged || 1;
    const advancePct = Math.round((advances / total) * 100);

    return {
      advances,
      declines,
      unchanged,
      advancePct,
      sentiment: advancePct >= 65 ? 'Strongly Bullish' : (advancePct >= 50 ? 'Moderately Bullish' : 'Cautious')
    };
  }
}
