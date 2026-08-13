/**
 * Screener Engine & Protocol Evaluator
 * Runs all 9 screening protocols, ranks stocks, and applies dynamic filtering.
 */

import { Indicators } from './indicators.js';

export class StockScanner {
  constructor(stockUniverse = []) {
    this.rawStocks = stockUniverse;
    this.analyzedStocks = [];
    this.benchmarkPerformance = 18.5; // NIFTY 50 1-year weighted return benchmark
  }

  /**
   * Run full technical & fundamental analysis on all stocks in the universe
   */
  analyzeUniverse() {
    // 1. Calculate raw performances for RS Ranking
    const rawPerformances = this.rawStocks.map(stock => {
      const perf = Indicators.calculateStockPerformance(stock.closes);
      return { symbol: stock.symbol, perf };
    });

    // Sort to determine percentile RS Score (1 to 99)
    rawPerformances.sort((a, b) => a.perf - b.perf);
    const n = rawPerformances.length;
    const rsScores = {};
    rawPerformances.forEach((item, index) => {
      const percentile = Math.min(99, Math.max(1, Math.round(((index + 1) / n) * 99)));
      rsScores[item.symbol] = percentile;
    });

    // 2. Perform deep analysis per stock
    this.analyzedStocks = this.rawStocks.map(stock => {
      const closes = stock.closes;
      const volumes = stock.volumes;
      const candles = stock.candles;
      const currentCandle = candles[candles.length - 1];
      const ltp = currentCandle.close;

      // Technical Indicators
      const rsi = Indicators.calculateRSI(closes, 14);
      const sma20 = Math.round(Indicators.calculateSMA(closes, 20));
      const sma50 = Math.round(Indicators.calculateSMA(closes, 50));
      const sma200 = Math.round(Indicators.calculateSMA(closes, 200));
      const volumeBurst = Indicators.checkVolumeBurst(volumes, 1.5);
      const consolidation7W = Indicators.detect7WeekConsolidation(candles, 7, 15);
      const cupWithHandle = Indicators.detectCupWithHandle(candles);
      const rsScore = rsScores[stock.symbol] || 50;

      // Dynamic Stop Loss Calculation
      let recommendedSL = parseFloat((ltp * 0.93).toFixed(2)); // Default 7% SL
      let slSource = 'Standard 7%';
      if (cupWithHandle.isPattern && cupWithHandle.stopLossPrice > 0) {
        recommendedSL = cupWithHandle.stopLossPrice;
        slSource = 'Cup Handle Low';
      } else if (consolidation7W.isConsolidating && consolidation7W.baseLow > 0) {
        recommendedSL = parseFloat((consolidation7W.baseLow * 0.98).toFixed(2));
        slSource = '7W Base Low';
      }

      const slPct = parseFloat((((ltp - recommendedSL) / ltp) * 100).toFixed(2));

      // Day Change
      const prevClose = candles[candles.length - 2]?.close || ltp;
      const dayChangePct = parseFloat((((ltp - prevClose) / prevClose) * 100).toFixed(2));

      // Protocols Match Status
      const protocolMatch = {
        p1_growth: (stock.salesGrowthYoY >= 15 && stock.epsGrowthYoY >= 15),
        p2_rsi: (rsi >= 75), // User protocol RSI zone
        p3_volumeBurst: (volumeBurst.isBurst || volumeBurst.burstPct >= 40),
        p4_consolidation7W: consolidation7W.isConsolidating,
        p5_cupWithHandle: cupWithHandle.isPattern,
        p6_stopLoss: (slPct >= 3 && slPct <= 10),
        p7_roe_roce: (stock.roe >= 17 || stock.roce >= 17),
        p8_epsCAGR: (stock.eps3Y_CAGR >= 20 || stock.eps5Y_CAGR >= 18),
        p9_rsScore: (rsScore >= 80)
      };

      const matchCount = Object.values(protocolMatch).filter(Boolean).length;

      return {
        ...stock,
        ltp,
        dayChangePct,
        rsi,
        sma20,
        sma50,
        sma200,
        volumeBurst,
        consolidation7W,
        cupWithHandle,
        rsScore,
        recommendedSL,
        slPct,
        slSource,
        protocolMatch,
        matchCount,
        matchRatePct: Math.round((matchCount / 9) * 100)
      };
    });

    return this.analyzedStocks;
  }

  /**
   * Filter analyzed stocks using user configuration criteria
   */
  filterStocks(criteria = {}) {
    if (!this.analyzedStocks || this.analyzedStocks.length === 0) {
      this.analyzeUniverse();
    }

    return this.analyzedStocks.filter(stock => {
      // 1. Text Search (Symbol / Name / Sector)
      if (criteria.searchTerm) {
        const term = criteria.searchTerm.toLowerCase();
        const matches = stock.symbol.toLowerCase().includes(term) ||
                        stock.name.toLowerCase().includes(term) ||
                        stock.sector.toLowerCase().includes(term);
        if (!matches) return false;
      }

      // 2. Exchange Filter
      if (criteria.exchange && criteria.exchange !== 'ALL') {
        if (!stock.exchange.includes(criteria.exchange)) return false;
      }

      // 3. Sector Filter
      if (criteria.sector && criteria.sector !== 'ALL') {
        if (!stock.sector.toLowerCase().includes(criteria.sector.toLowerCase())) return false;
      }

      // Protocol 1: EPS and Sales Growth
      if (criteria.requireGrowth) {
        const minSales = criteria.minSalesGrowth || 15;
        const minEps = criteria.minEpsGrowth || 15;
        if (stock.salesGrowthYoY < minSales || stock.epsGrowthYoY < minEps) return false;
      }

      // Protocol 2: RSI Threshold (e.g. RSI > 80%)
      if (criteria.requireRsi) {
        const minRsi = criteria.minRsi || 80;
        if (stock.rsi < minRsi) return false;
      }

      // Protocol 3: Burst of Volume > 50%
      if (criteria.requireVolumeBurst) {
        const minBurstPct = criteria.minBurstPct || 50;
        if (stock.volumeBurst.burstPct < minBurstPct) return false;
      }

      // Protocol 4: 7-Week Consolidation Base
      if (criteria.require7WeekConsolidation) {
        if (!stock.consolidation7W.isConsolidating) return false;
      }

      // Protocol 5: Cup with Handle Candle Pattern
      if (criteria.requireCupWithHandle) {
        if (!stock.cupWithHandle.isPattern) return false;
      }

      // Protocol 6: % Stop Loss Filter (e.g. SL <= maxSLPct)
      if (criteria.requireStopLossLimit) {
        const maxSL = criteria.maxStopLossPct || 8.0;
        if (stock.slPct > maxSL) return false;
      }

      // Protocol 7: ROE / ROCE > 17%
      if (criteria.requireRoeRoce) {
        const minRoe = criteria.minRoe || 17;
        const minRoce = criteria.minRoce || 17;
        if (stock.roe < minRoe && stock.roce < minRoce) return false;
      }

      // Protocol 8: EPS >> Last 3-5 Years (CAGR > threshold)
      if (criteria.requireEpsCAGR) {
        const min3YCAGR = criteria.minEps3YCAGR || 20;
        if (stock.eps3Y_CAGR < min3YCAGR) return false;
      }

      // Protocol 9: RS Score > 80
      if (criteria.requireRsScore) {
        const minRs = criteria.minRsScore || 80;
        if (stock.rsScore < minRs) return false;
      }

      return true;
    });
  }

  /**
   * Sort stocks
   */
  sortStocks(stocks, sortBy = 'matchCount', sortDir = 'desc') {
    return [...stocks].sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (sortBy === 'volumeBurst') {
        valA = a.volumeBurst.burstPct;
        valB = b.volumeBurst.burstPct;
      } else if (sortBy === 'cupScore') {
        valA = a.cupWithHandle.score || 0;
        valB = b.cupWithHandle.score || 0;
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }
}
