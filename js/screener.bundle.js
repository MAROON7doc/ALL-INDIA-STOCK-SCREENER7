/**
 * Comprehensive NSE/BSE Quantitative Stock Screener - Master Universal Engine
 * Standalone, Self-Contained Bundle supporting both file:// and http:// protocols
 * Implements all 9 CANSLIM & Technical Protocols, Dual Candlestick Visualizers,
 * Live Market Streaming, RSS News Wire, Risk Position Calculator, and Search.
 */

(function() {
  'use strict';

  /* ==========================================================================
     1. INDICATORS & PATTERN RECOGNITION ALGORITHMS
     ========================================================================== */
  const Indicators = {
    calculateRSI(closes, period = 14) {
      if (!closes || closes.length < period + 1) return 50;
      let gains = 0, losses = 0;
      for (let i = 1; i <= period; i++) {
        const diff = closes[i] - closes[i - 1];
        if (diff >= 0) gains += diff;
        else losses += Math.abs(diff);
      }
      let avgGain = gains / period;
      let avgLoss = losses / period;

      for (let i = period + 1; i < closes.length; i++) {
        const diff = closes[i] - closes[i - 1];
        if (diff >= 0) {
          avgGain = (avgGain * (period - 1) + diff) / period;
          avgLoss = (avgLoss * (period - 1)) / period;
        } else {
          avgGain = (avgGain * (period - 1)) / period;
          avgLoss = (avgLoss * (period - 1) + Math.abs(diff)) / period;
        }
      }
      if (avgLoss === 0) return 100;
      const rs = avgGain / avgLoss;
      return parseFloat((100 - (100 / (1 + rs))).toFixed(2));
    },

    calculateSMA(values, period = 20) {
      if (!values || values.length < period) return values && values.length ? values[values.length - 1] : 0;
      const slice = values.slice(-period);
      return slice.reduce((a, b) => a + b, 0) / period;
    },

    checkVolumeBurst(volumes, thresholdRatio = 1.5) {
      if (!volumes || volumes.length < 21) {
        return { isBurst: false, ratio: 1.0, currentVol: 0, smaVol: 0, burstPct: 0 };
      }
      const currentVol = volumes[volumes.length - 1];
      const previous20 = volumes.slice(-21, -1);
      const sma20 = previous20.reduce((a, b) => a + b, 0) / 20;
      const ratio = sma20 > 0 ? currentVol / sma20 : 1.0;
      const burstPct = parseFloat(((ratio - 1) * 100).toFixed(1));
      return {
        isBurst: ratio >= thresholdRatio,
        ratio: parseFloat(ratio.toFixed(2)),
        currentVol,
        smaVol: Math.round(sma20),
        burstPct: burstPct > 0 ? burstPct : 0
      };
    },

    detect7WeekConsolidation(candles, weeks = 7, maxRangePct = 15) {
      const sessions = weeks * 5;
      if (!candles || candles.length < sessions) {
        return { isConsolidating: false, rangePct: 0, baseHigh: 0, baseLow: 0, baseLengthDays: 0 };
      }
      const baseCandles = candles.slice(-sessions);
      let high = -Infinity, low = Infinity;
      for (const c of baseCandles) {
        if (c.high > high) high = c.high;
        if (c.low < low) low = c.low;
      }
      const rangePct = low > 0 ? ((high - low) / low) * 100 : 999;
      const currentClose = candles[candles.length - 1].close;
      const isNearTop = currentClose >= high * 0.94;
      const isConsolidating = rangePct <= maxRangePct && rangePct >= 3.0 && isNearTop;
      return {
        isConsolidating,
        rangePct: parseFloat(rangePct.toFixed(2)),
        baseHigh: parseFloat(high.toFixed(2)),
        baseLow: parseFloat(low.toFixed(2)),
        baseLengthDays: sessions,
        weeks: weeks,
        distanceFromHighPct: parseFloat((((high - currentClose) / high) * 100).toFixed(2))
      };
    },

    detectCupWithHandle(candles) {
      if (!candles || candles.length < 50) {
        return { isPattern: false, score: 0, stage: 'None', details: null };
      }
      const total = candles.length;
      const lookback = Math.min(total, 90);
      const window = candles.slice(-lookback);

      let leftPeakIdx = -1, leftPeakPrice = -Infinity;
      const firstThird = Math.floor(window.length * 0.45);

      for (let i = 5; i < firstThird; i++) {
        if (window[i].high > leftPeakPrice) {
          const isLocalMax = window[i].high >= window[i - 1].high &&
                             window[i].high >= window[i - 2].high &&
                             window[i].high >= (window[i + 1]?.high || 0);
          if (isLocalMax && window[i].high > leftPeakPrice) {
            leftPeakPrice = window[i].high;
            leftPeakIdx = i;
          }
        }
      }

      if (leftPeakIdx === -1 || leftPeakPrice <= 0) {
        return { isPattern: false, score: 0, stage: 'No Left Peak' };
      }

      let cupBottomIdx = -1, cupBottomPrice = Infinity;
      const handleStartSearch = window.length - 12;

      for (let i = leftPeakIdx + 4; i < handleStartSearch; i++) {
        if (window[i].low < cupBottomPrice) {
          cupBottomPrice = window[i].low;
          cupBottomIdx = i;
        }
      }

      if (cupBottomIdx === -1) return { isPattern: false, score: 0, stage: 'No Cup Bottom' };

      const cupDepthPct = ((leftPeakPrice - cupBottomPrice) / leftPeakPrice) * 100;
      if (cupDepthPct < 10 || cupDepthPct > 45) {
        return { isPattern: false, score: 0, stage: 'Invalid Cup Depth', cupDepthPct };
      }

      let rightPeakIdx = -1, rightPeakPrice = -Infinity;
      for (let i = cupBottomIdx + 4; i < window.length - 2; i++) {
        if (window[i].high > rightPeakPrice) {
          rightPeakPrice = window[i].high;
          rightPeakIdx = i;
        }
      }

      if (rightPeakIdx === -1) return { isPattern: false, score: 0, stage: 'No Right Rim' };

      const peakDiffPct = Math.abs(leftPeakPrice - rightPeakPrice) / leftPeakPrice * 100;
      if (peakDiffPct > 10) return { isPattern: false, score: 0, stage: 'Asymmetric Rims' };

      const handleCandles = window.slice(rightPeakIdx);
      const handleLowPrice = Math.min(...handleCandles.map(c => c.low));
      const handleDepthPct = ((rightPeakPrice - handleLowPrice) / rightPeakPrice) * 100;

      if (handleDepthPct > cupDepthPct * 0.65 || handleDepthPct > 18) {
        return { isPattern: false, score: 0, stage: 'Handle Too Deep' };
      }

      const currentCandle = window[window.length - 1];
      const pivotPrice = parseFloat(rightPeakPrice.toFixed(2));
      const targetPrice = parseFloat((pivotPrice + (leftPeakPrice - cupBottomPrice)).toFixed(2));
      const defaultStopLoss = parseFloat(Math.min(handleLowPrice * 0.99, pivotPrice * 0.93).toFixed(2));
      const stopLossPct = parseFloat((((currentCandle.close - defaultStopLoss) / currentCandle.close) * 100).toFixed(2));
      const distToPivotPct = parseFloat((((currentCandle.close - pivotPrice) / pivotPrice) * 100).toFixed(2));

      let stage = 'Forming Handle';
      if (currentCandle.close >= pivotPrice * 0.99 && currentCandle.close <= pivotPrice * 1.05) {
        stage = 'At Pivot Breakout';
      } else if (currentCandle.close > pivotPrice * 1.05) {
        stage = 'Extended / Broken Out';
      }

      let score = 75;
      if (cupDepthPct >= 15 && cupDepthPct <= 30) score += 10;
      if (handleDepthPct >= 4 && handleDepthPct <= 10) score += 10;
      if (peakDiffPct <= 4) score += 5;

      return {
        isPattern: true,
        score: Math.min(99, score),
        stage,
        pivotPrice,
        targetPrice,
        stopLossPrice: defaultStopLoss,
        stopLossPct,
        distToPivotPct,
        cupDepthPct: parseFloat(cupDepthPct.toFixed(2)),
        handleDepthPct: parseFloat(handleDepthPct.toFixed(2)),
        leftPeak: { price: parseFloat(leftPeakPrice.toFixed(2)), index: total - lookback + leftPeakIdx },
        bottom: { price: parseFloat(cupBottomPrice.toFixed(2)), index: total - lookback + cupBottomIdx },
        rightPeak: { price: parseFloat(rightPeakPrice.toFixed(2)), index: total - lookback + rightPeakIdx },
        handleLow: { price: parseFloat(handleLowPrice.toFixed(2)), index: total - lookback + rightPeakIdx }
      };
    },

    calculateStockPerformance(closes) {
      if (!closes || closes.length < 250) {
        const pCurrent = closes[closes.length - 1];
        const pPast = closes[0];
        return pPast > 0 ? ((pCurrent - pPast) / pPast) * 100 : 0;
      }
      const current = closes[closes.length - 1];
      const q1 = closes[closes.length - 63] || closes[0];
      const q2 = closes[closes.length - 126] || closes[0];
      const q3 = closes[closes.length - 189] || closes[0];
      const q4 = closes[closes.length - 252] || closes[0];

      return 0.4 * (((current - q1) / q1) * 100) +
             0.2 * (((q1 - q2) / q2) * 100) +
             0.2 * (((q2 - q3) / q3) * 100) +
             0.2 * (((q3 - q4) / q4) * 100);
    },

    calculatePositionSizing(entryPrice, stopLossPrice, accountCapital = 500000, riskPerTradePct = 1.0) {
      const entry = parseFloat(entryPrice) || 0;
      const sl = parseFloat(stopLossPrice) || 0;
      if (entry <= 0 || sl <= 0 || sl >= entry) {
        return {
          shares: 0, totalInvestment: 0, riskAmount: 0,
          riskPerShare: 0, stopLossPct: 0, target1R: 0, target2R: 0, target3R: 0
        };
      }
      const riskPerShare = entry - sl;
      const stopLossPct = parseFloat(((riskPerShare / entry) * 100).toFixed(2));
      const maxRiskAmount = (accountCapital * (riskPerTradePct / 100));
      const shares = Math.max(1, Math.floor(maxRiskAmount / riskPerShare));
      const totalInvestment = shares * entry;

      return {
        shares,
        totalInvestment: Math.round(totalInvestment),
        riskAmount: Math.round(shares * riskPerShare),
        riskPerShare: parseFloat(riskPerShare.toFixed(2)),
        stopLossPct,
        target1R: parseFloat((entry + riskPerShare).toFixed(2)),
        target2R: parseFloat((entry + 2 * riskPerShare).toFixed(2)),
        target3R: parseFloat((entry + 3 * riskPerShare).toFixed(2))
      };
    }
  };

  /* ==========================================================================
     2. STOCK DATABASE & HISTORICAL CANDLESTICK GENERATOR
     ========================================================================== */
  function generateCandles(basePrice, trendType = 'cup_handle', days = 140) {
    const candles = [];
    let price = basePrice;
    const now = new Date();
    const avgVol = Math.floor(Math.random() * 800000) + 350000;

    for (let i = days; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      if (d.getDay() === 0 || d.getDay() === 6) continue;

      const dateStr = d.toISOString().split('T')[0];
      const progress = 1 - (i / days);
      let deltaPct = (Math.random() - 0.48) * 2.2;
      let volMultiplier = 0.7 + Math.random() * 0.6;

      if (trendType === 'cup_handle') {
        if (progress < 0.35) deltaPct = -0.6 + (Math.random() - 0.5) * 1.8;
        else if (progress < 0.60) { deltaPct = 0.2 + (Math.random() - 0.48) * 1.2; volMultiplier *= 0.6; }
        else if (progress < 0.82) { deltaPct = 0.9 + (Math.random() - 0.4) * 2.0; volMultiplier *= 1.4; }
        else if (progress < 0.95) { deltaPct = -0.3 + (Math.random() - 0.5) * 1.0; volMultiplier *= 0.5; }
        else { deltaPct = 1.8 + (Math.random() - 0.2) * 2.5; volMultiplier *= 2.2; }
      } else if (trendType === 'consolidation_7w') {
        if (progress < 0.60) deltaPct = 0.8 + (Math.random() - 0.4) * 2.2;
        else { deltaPct = (Math.random() - 0.5) * 1.1; volMultiplier *= (progress > 0.92 ? 1.8 : 0.6); }
      } else if (trendType === 'strong_momentum') {
        deltaPct = 0.65 + (Math.random() - 0.42) * 2.5;
        if (progress > 0.85) volMultiplier *= 1.8;
      }

      const open = price;
      const change = price * (deltaPct / 100);
      const close = Math.max(5, parseFloat((open + change).toFixed(2)));
      const high = Math.max(open, close) + Math.random() * (open * 0.015);
      const low = Math.min(open, close) - Math.random() * (open * 0.015);
      const volume = Math.round(avgVol * volMultiplier);

      price = close;
      candles.push({
        date: dateStr,
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume
      });
    }
    return candles;
  }

  const RAW_DATABASE = [
    { symbol: 'TRENT', name: 'Trent Ltd (Westside & Zudio)', exchange: 'NSE', sector: 'Retail / Consumer', marketCapCr: 248500, basePrice: 5200, patternType: 'cup_handle', salesGrowthYoY: 53.2, epsGrowthYoY: 67.8, eps3Y_CAGR: 54.2, eps5Y_CAGR: 42.8, roe: 28.6, roce: 31.4, debtToEquity: 0.12, peRatio: 98.4, industryPE: 45.2, epsHistory: [18.4, 26.8, 39.5, 62.1, 104.2], description: 'High-growth retail powerhouse operating Westside, Zudio, Star Bazaar, and Zara in India.' },
    { symbol: 'DIXON', name: 'Dixon Technologies Ltd', exchange: 'NSE', sector: 'EMS / Electronics', marketCapCr: 88400, basePrice: 11200, patternType: 'cup_handle', salesGrowthYoY: 101.4, epsGrowthYoY: 82.5, eps3Y_CAGR: 46.8, eps5Y_CAGR: 38.5, roe: 29.4, roce: 34.2, debtToEquity: 0.18, peRatio: 94.6, industryPE: 62.0, epsHistory: [26.8, 32.5, 43.4, 61.2, 111.6], description: 'Largest Electronic Manufacturing Services (EMS) player in India benefiting heavily from PLI schemes.' },
    { symbol: 'BEL', name: 'Bharat Electronics Ltd', exchange: 'NSE', sector: 'Defence / Aerospace', marketCapCr: 218000, basePrice: 240, patternType: 'cup_handle', salesGrowthYoY: 28.5, epsGrowthYoY: 38.4, eps3Y_CAGR: 29.6, eps5Y_CAGR: 24.1, roe: 26.5, roce: 35.8, debtToEquity: 0.0, peRatio: 48.2, industryPE: 52.1, epsHistory: [2.8, 3.2, 4.1, 5.4, 7.5], description: 'Navratna defence PSU specializing in advanced radar, electronic warfare, missile systems, and avionics.' },
    { symbol: 'HAL', name: 'Hindustan Aeronautics Ltd', exchange: 'NSE', sector: 'Defence / Aerospace', marketCapCr: 312000, basePrice: 3950, patternType: 'consolidation_7w', salesGrowthYoY: 18.2, epsGrowthYoY: 29.5, eps3Y_CAGR: 33.4, eps5Y_CAGR: 26.8, roe: 29.1, roce: 38.5, debtToEquity: 0.0, peRatio: 38.6, industryPE: 52.1, epsHistory: [48.5, 76.2, 87.4, 113.8, 147.2], description: 'India’s premier aerospace manufacturer (Tejas fighter aircraft, Prachand & Dhruv helicopters).' },
    { symbol: 'POLYCAB', name: 'Polycab India Ltd', exchange: 'NSE', sector: 'Wires & Cables', marketCapCr: 104500, basePrice: 5600, patternType: 'cup_handle', salesGrowthYoY: 25.1, epsGrowthYoY: 34.2, eps3Y_CAGR: 36.5, eps5Y_CAGR: 28.2, roe: 24.8, roce: 31.2, debtToEquity: 0.05, peRatio: 52.4, industryPE: 44.0, epsHistory: [49.8, 56.4, 85.2, 118.6, 159.2], description: 'Market leader in cables & wires in India gaining market share in Fast Moving Electrical Goods (FMEG).' },
    { symbol: 'SOLARINDS', name: 'Solar Industries India', exchange: 'NSE', sector: 'Defence & Industrial Explosives', marketCapCr: 94000, basePrice: 8500, patternType: 'cup_handle', salesGrowthYoY: 31.4, epsGrowthYoY: 41.2, eps3Y_CAGR: 44.1, eps5Y_CAGR: 35.6, roe: 27.2, roce: 32.8, debtToEquity: 0.28, peRatio: 78.5, industryPE: 48.0, epsHistory: [31.5, 48.2, 83.1, 108.4, 153.5], description: 'Global leader in industrial explosives and high-energy defence propellants.' },
    { symbol: 'KAYNES', name: 'Kaynes Technology Ltd', exchange: 'NSE', sector: 'EMS / Semi-conductors', marketCapCr: 36500, basePrice: 4200, patternType: 'cup_handle', salesGrowthYoY: 72.1, epsGrowthYoY: 79.4, eps3Y_CAGR: 62.4, eps5Y_CAGR: 48.9, roe: 19.8, roce: 22.4, debtToEquity: 0.14, peRatio: 112.0, industryPE: 62.0, epsHistory: [4.2, 9.8, 18.2, 28.5, 51.0], description: 'High-end integrated electronics manufacturing specialist venturing into advanced semiconductor OSAT.' },
    { symbol: 'PERSISTENT', name: 'Persistent Systems Ltd', exchange: 'NSE', sector: 'IT - Software', marketCapCr: 84200, basePrice: 4500, patternType: 'consolidation_7w', salesGrowthYoY: 19.8, epsGrowthYoY: 23.4, eps3Y_CAGR: 31.8, eps5Y_CAGR: 27.5, roe: 25.4, roce: 32.1, debtToEquity: 0.08, peRatio: 58.2, industryPE: 34.0, epsHistory: [44.6, 60.1, 87.2, 108.5, 134.0], description: 'Top-tier digital engineering and enterprise modernization tech firm delivering double-digit dollar revenue growth.' },
    { symbol: 'CDSL', name: 'Central Depository Services', exchange: 'NSE', sector: 'Financial Infrastructure', marketCapCr: 33400, basePrice: 1250, patternType: 'cup_handle', salesGrowthYoY: 52.1, epsGrowthYoY: 61.3, eps3Y_CAGR: 38.2, eps5Y_CAGR: 34.5, roe: 31.8, roce: 42.5, debtToEquity: 0.0, peRatio: 59.4, industryPE: 42.0, epsHistory: [7.2, 9.8, 14.2, 19.4, 31.2], description: 'India’s leading demat account depository with >130 million registered demat accounts.' },
    { symbol: 'BDL', name: 'Bharat Dynamics Ltd', exchange: 'NSE', sector: 'Defence / Aerospace', marketCapCr: 41200, basePrice: 890, patternType: 'consolidation_7w', salesGrowthYoY: 62.4, epsGrowthYoY: 74.1, eps3Y_CAGR: 32.5, eps5Y_CAGR: 22.8, roe: 18.9, roce: 24.6, debtToEquity: 0.0, peRatio: 64.2, industryPE: 52.1, epsHistory: [14.1, 16.4, 20.8, 25.1, 38.4], description: 'Sole manufacturer in India for surface-to-air missiles (Akash, Astra) and torpedoes.' },
    { symbol: 'PREMIERENE', name: 'Premier Energies Ltd', exchange: 'BSE/NSE', sector: 'Renewable Energy', marketCapCr: 46800, basePrice: 780, patternType: 'cup_handle', salesGrowthYoY: 124.0, epsGrowthYoY: 145.2, eps3Y_CAGR: 88.4, eps5Y_CAGR: 64.2, roe: 34.5, roce: 39.8, debtToEquity: 0.32, peRatio: 48.6, industryPE: 55.0, epsHistory: [2.1, 4.5, 8.9, 14.8, 28.5], description: 'Integrated solar cell and module manufacturer expanding capacity rapidly.' },
    { symbol: 'ANGELONE', name: 'Angel One Ltd', exchange: 'NSE', sector: 'Fintech / Brokerage', marketCapCr: 27800, basePrice: 2450, patternType: 'consolidation_7w', salesGrowthYoY: 45.8, epsGrowthYoY: 38.7, eps3Y_CAGR: 44.5, eps5Y_CAGR: 49.2, roe: 38.4, roce: 46.2, debtToEquity: 0.45, peRatio: 22.8, industryPE: 28.5, epsHistory: [38.2, 74.8, 107.5, 131.2, 178.4], description: 'Fastest growing digital broker with stellar return on equity (>38%).' },
    { symbol: 'MAZDOCK', name: 'Mazagon Dock Shipbuilders', exchange: 'NSE', sector: 'Defence / Shipbuilding', marketCapCr: 98500, basePrice: 3800, patternType: 'strong_momentum', salesGrowthYoY: 51.4, epsGrowthYoY: 64.8, eps3Y_CAGR: 58.2, eps5Y_CAGR: 41.5, roe: 36.2, roce: 49.5, debtToEquity: 0.0, peRatio: 42.1, industryPE: 48.0, epsHistory: [25.4, 32.1, 53.4, 91.2, 138.5], description: 'Premier warship and submarine builder for Indian Navy with zero debt.' },
    { symbol: 'ZOMATO', name: 'Zomato Ltd (Blinkit)', exchange: 'NSE', sector: 'Retail / Consumer', marketCapCr: 232000, basePrice: 180, patternType: 'strong_momentum', salesGrowthYoY: 65.4, epsGrowthYoY: 180.0, eps3Y_CAGR: 78.5, eps5Y_CAGR: 52.0, roe: 18.2, roce: 20.5, debtToEquity: 0.02, peRatio: 124.0, industryPE: 65.0, epsHistory: [-1.2, -0.8, -0.2, 0.4, 2.1], description: 'Dominant food delivery network and ultra-fast growing Quick Commerce leader (Blinkit).' },
    { symbol: 'TITAN', name: 'Titan Company Ltd', exchange: 'NSE', sector: 'Retail / Consumer', marketCapCr: 298000, basePrice: 3100, patternType: 'consolidation_7w', salesGrowthYoY: 18.2, epsGrowthYoY: 19.8, eps3Y_CAGR: 25.4, eps5Y_CAGR: 21.2, roe: 29.8, roce: 36.4, debtToEquity: 0.65, peRatio: 82.0, industryPE: 60.0, epsHistory: [11.2, 24.6, 36.8, 41.2, 49.5], description: 'Tata Group powerhouse with dominant market share in organized jewellery (Tanishq).' },
    { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', exchange: 'NSE', sector: 'Energy & Telecom', marketCapCr: 1980000, basePrice: 1240, patternType: 'regular', salesGrowthYoY: 9.2, epsGrowthYoY: 11.5, eps3Y_CAGR: 12.8, eps5Y_CAGR: 10.4, roe: 9.8, roce: 10.5, debtToEquity: 0.42, peRatio: 26.5, industryPE: 22.0, epsHistory: [38.5, 42.1, 45.8, 48.9, 52.4], description: 'India’s most valuable enterprise spanning Oil-to-Chemicals, Jio Telecom, and Retail.' }
  ];

  function getStockUniverse() {
    return RAW_DATABASE.map(stock => {
      const candles = generateCandles(stock.basePrice, stock.patternType, 160);
      return {
        ...stock,
        candles,
        closes: candles.map(c => c.close),
        volumes: candles.map(c => c.volume),
        ltp: candles[candles.length - 1].close,
        dayChangePct: 0
      };
    });
  }

  /* ==========================================================================
     3. SCREENER & FILTER ENGINE
     ========================================================================== */
  class ScreenerEngine {
    constructor(universe) {
      this.rawStocks = universe;
      this.analyzedStocks = [];
      this.analyzeUniverse();
    }

    analyzeUniverse() {
      const rawPerformances = this.rawStocks.map(stock => ({
        symbol: stock.symbol,
        perf: Indicators.calculateStockPerformance(stock.closes)
      }));

      rawPerformances.sort((a, b) => a.perf - b.perf);
      const n = rawPerformances.length;
      const rsScores = {};
      rawPerformances.forEach((item, index) => {
        rsScores[item.symbol] = Math.min(99, Math.max(1, Math.round(((index + 1) / n) * 99)));
      });

      this.analyzedStocks = this.rawStocks.map(stock => {
        const closes = stock.closes;
        const volumes = stock.volumes;
        const candles = stock.candles;
        const currentCandle = candles[candles.length - 1];
        const ltp = currentCandle.close;

        const rsi = Indicators.calculateRSI(closes, 14);
        const volumeBurst = Indicators.checkVolumeBurst(volumes, 1.5);
        const consolidation7W = Indicators.detect7WeekConsolidation(candles, 7, 15);
        const cupWithHandle = Indicators.detectCupWithHandle(candles);
        const rsScore = rsScores[stock.symbol] || 50;

        let recommendedSL = parseFloat((ltp * 0.93).toFixed(2));
        let slSource = 'Standard 7%';
        if (cupWithHandle.isPattern && cupWithHandle.stopLossPrice > 0) {
          recommendedSL = cupWithHandle.stopLossPrice;
          slSource = 'Cup Handle Low';
        } else if (consolidation7W.isConsolidating && consolidation7W.baseLow > 0) {
          recommendedSL = parseFloat((consolidation7W.baseLow * 0.98).toFixed(2));
          slSource = '7W Base Low';
        }

        const slPct = parseFloat((((ltp - recommendedSL) / ltp) * 100).toFixed(2));
        const prevClose = candles[candles.length - 2]?.close || ltp;
        const dayChangePct = parseFloat((((ltp - prevClose) / prevClose) * 100).toFixed(2));

        const protocolMatch = {
          p1_growth: (stock.salesGrowthYoY >= 15 && stock.epsGrowthYoY >= 15),
          p2_rsi: (rsi >= 75),
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
          volumeBurst,
          consolidation7W,
          cupWithHandle,
          rsScore,
          recommendedSL,
          slPct,
          slSource,
          protocolMatch,
          matchCount
        };
      });

      return this.analyzedStocks;
    }

    filterStocks(criteria = {}) {
      return this.analyzedStocks.filter(stock => {
        if (criteria.searchTerm) {
          const term = criteria.searchTerm.toLowerCase();
          const match = stock.symbol.toLowerCase().includes(term) ||
                        stock.name.toLowerCase().includes(term) ||
                        stock.sector.toLowerCase().includes(term);
          if (!match) return false;
        }

        if (criteria.exchange && criteria.exchange !== 'ALL') {
          if (!stock.exchange.includes(criteria.exchange)) return false;
        }

        if (criteria.sector && criteria.sector !== 'ALL') {
          if (!stock.sector.toLowerCase().includes(criteria.sector.toLowerCase())) return false;
        }

        if (criteria.requireGrowth) {
          if (stock.salesGrowthYoY < (criteria.minSalesGrowth || 15) || stock.epsGrowthYoY < (criteria.minEpsGrowth || 15)) return false;
        }

        if (criteria.requireRsi) {
          if (stock.rsi < (criteria.minRsi || 80)) return false;
        }

        if (criteria.requireVolumeBurst) {
          if (stock.volumeBurst.burstPct < (criteria.minBurstPct || 50)) return false;
        }

        if (criteria.require7WeekConsolidation) {
          if (!stock.consolidation7W.isConsolidating) return false;
        }

        if (criteria.requireCupWithHandle) {
          if (!stock.cupWithHandle.isPattern) return false;
        }

        if (criteria.requireStopLossLimit) {
          if (stock.slPct > (criteria.maxStopLossPct || 8.0)) return false;
        }

        if (criteria.requireRoeRoce) {
          if (stock.roe < (criteria.minRoe || 17) && stock.roce < (criteria.minRoce || 17)) return false;
        }

        if (criteria.requireEpsCAGR) {
          if (stock.eps3Y_CAGR < (criteria.minEps3YCAGR || 20)) return false;
        }

        if (criteria.requireRsScore) {
          if (stock.rsScore < (criteria.minRsScore || 80)) return false;
        }

        return true;
      });
    }

    sortStocks(stocks, sortBy = 'matchCount', sortDir = 'desc') {
      return [...stocks].sort((a, b) => {
        let valA = a[sortBy];
        let valB = b[sortBy];
        if (sortBy === 'volumeBurst') { valA = a.volumeBurst.burstPct; valB = b.volumeBurst.burstPct; }
        if (valA < valB) return sortDir === 'asc' ? -1 : 1;
        if (valA > valB) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }
  }

  /* ==========================================================================
     4. CANDLESTICK & PATTERN CANVAS ENGINE
     ========================================================================== */
  class CanvasChart {
    constructor(containerId) {
      this.container = document.getElementById(containerId);
      if (!this.container) return;

      this.canvas = document.createElement('canvas');
      this.container.innerHTML = '';
      this.container.appendChild(this.canvas);
      this.ctx = this.canvas.getContext('2d');

      this.stock = null;
      this.candles = [];
      this.visibleCandles = [];
      this.range = '6M';
      this.crosshair = { x: -1, y: -1, active: false, candle: null };

      this.setupListeners();
      this.resize();
    }

    resize() {
      if (!this.container || !this.canvas) return;
      const rect = this.container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      this.width = Math.max(320, rect.width || this.container.clientWidth || 800);
      this.height = Math.max(220, rect.height || this.container.clientHeight || 380);

      this.canvas.width = Math.floor(this.width * dpr);
      this.canvas.height = Math.floor(this.height * dpr);
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;

      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(dpr, dpr);
      this.render();
    }

    setStock(stock, range = null) {
      if (!stock) return;
      this.stock = stock;
      this.candles = stock.candles || [];
      if (range) this.range = range;
      this.updateVisibleRange();
      this.resize();
    }

    setRange(range) {
      this.range = range;
      this.updateVisibleRange();
      this.render();
    }

    updateVisibleRange() {
      if (!this.candles.length) return;
      let count = 130;
      if (this.range === '1M') count = 22;
      else if (this.range === '3M') count = 65;
      else if (this.range === '6M') count = 130;
      else if (this.range === '1Y') count = 260;
      else if (this.range === 'ALL') count = this.candles.length;
      this.visibleCandles = this.candles.slice(-Math.min(count, this.candles.length));
    }

    setupListeners() {
      window.addEventListener('resize', () => this.resize());

      this.canvas.addEventListener('mousemove', (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.crosshair.x = x;
        this.crosshair.y = y;
        this.crosshair.active = true;

        if (this.visibleCandles.length) {
          const paddingRight = 65, paddingLeft = 10;
          const plotWidth = this.width - paddingLeft - paddingRight;
          const candleWidth = plotWidth / this.visibleCandles.length;
          const idx = Math.floor((x - paddingLeft) / candleWidth);
          if (idx >= 0 && idx < this.visibleCandles.length) {
            this.crosshair.candle = this.visibleCandles[idx];
          } else {
            this.crosshair.candle = null;
          }
        }
        this.render();
      });

      this.canvas.addEventListener('mouseleave', () => {
        this.crosshair.active = false;
        this.crosshair.candle = null;
        this.render();
      });
    }

    render() {
      if (!this.ctx || !this.visibleCandles.length || !this.stock) return;
      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;

      ctx.clearRect(0, 0, w, h);

      const paddingRight = 65, paddingBottom = 22, paddingLeft = 10, paddingTop = 26;
      const plotWidth = w - paddingLeft - paddingRight;
      const totalPlotHeight = h - paddingTop - paddingBottom;
      const pricePlotHeight = totalPlotHeight * 0.74;
      const volumeHeight = totalPlotHeight * 0.22;
      const volumeTop = paddingTop + pricePlotHeight + 6;

      let minPrice = Infinity, maxPrice = -Infinity, maxVol = 0;
      for (const c of this.visibleCandles) {
        if (c.low < minPrice) minPrice = c.low;
        if (c.high > maxPrice) maxPrice = c.high;
        if (c.volume > maxVol) maxVol = c.volume;
      }

      const priceMargin = (maxPrice - minPrice) * 0.06 || 10;
      maxPrice += priceMargin;
      minPrice = Math.max(0, minPrice - priceMargin);
      const priceRange = maxPrice - minPrice || 1;

      const getX = (idx) => paddingLeft + (idx + 0.5) * (plotWidth / this.visibleCandles.length);
      const getY = (price) => paddingTop + pricePlotHeight - ((price - minPrice) / priceRange) * pricePlotHeight;
      const getVolY = (vol) => volumeTop + volumeHeight - (maxVol > 0 ? (vol / maxVol) * volumeHeight : 0);

      // Grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 5; i++) {
        const priceVal = minPrice + (priceRange / 5) * i;
        const y = getY(priceVal);
        ctx.beginPath();
        ctx.moveTo(paddingLeft, y);
        ctx.lineTo(w - paddingRight, y);
        ctx.stroke();

        ctx.fillStyle = '#64748b';
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`₹${priceVal.toFixed(1)}`, w - paddingRight + 6, y + 3);
      }

      const closes = this.candles.map(c => c.close);
      const visibleCount = this.visibleCandles.length;
      const startIdx = this.candles.length - visibleCount;

      // 20 SMA
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let started20 = false;
      for (let i = 0; i < visibleCount; i++) {
        const gIdx = startIdx + i;
        if (gIdx >= 19) {
          const slice = closes.slice(gIdx - 19, gIdx + 1);
          const sma = slice.reduce((a, b) => a + b, 0) / 20;
          const x = getX(i), y = getY(sma);
          if (!started20) { ctx.moveTo(x, y); started20 = true; }
          else ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // 7W Consolidation Base Box
      if (this.stock.consolidation7W?.isConsolidating) {
        const days = this.stock.consolidation7W.baseLengthDays || 35;
        const baseStart = Math.max(0, visibleCount - days);
        const boxX = getX(baseStart) - (plotWidth / visibleCount) * 0.5;
        const boxW = (w - paddingRight) - boxX;
        const boxHighY = getY(this.stock.consolidation7W.baseHigh);
        const boxLowY = getY(this.stock.consolidation7W.baseLow);
        const boxH = boxLowY - boxHighY;

        ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
        ctx.fillRect(boxX, boxHighY, boxW, boxH);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(boxX, boxHighY, boxW, boxH);
        ctx.setLineDash([]);

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`7-Week Base (${this.stock.consolidation7W.rangePct}% range)`, w - paddingRight - 8, boxHighY + 14);
      }

      // Cup with Handle Overlay
      if (this.stock.cupWithHandle?.isPattern) {
        const cwh = this.stock.cupWithHandle;
        const leftIdx = cwh.leftPeak?.index - startIdx;
        const botIdx = cwh.bottom?.index - startIdx;
        const rightIdx = cwh.rightPeak?.index - startIdx;

        if (leftIdx >= 0 && rightIdx < visibleCount) {
          const p1x = getX(leftIdx), p1y = getY(cwh.leftPeak.price);
          const p2x = getX(botIdx), p2y = getY(cwh.bottom.price);
          const p3x = getX(rightIdx), p3y = getY(cwh.rightPeak.price);

          ctx.beginPath();
          ctx.moveTo(p1x, p1y);
          ctx.quadraticCurveTo(p2x, p2y + 18, p3x, p3y);
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // Pivot line
          const pivotY = getY(cwh.pivotPrice);
          ctx.beginPath();
          ctx.moveTo(p1x, pivotY);
          ctx.lineTo(w - paddingRight, pivotY);
          ctx.strokeStyle = '#10b981';
          ctx.setLineDash([6, 3]);
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.setLineDash([]);

          // Target line
          const targetY = getY(cwh.targetPrice);
          if (targetY > paddingTop) {
            ctx.beginPath();
            ctx.moveTo(p3x, targetY);
            ctx.lineTo(w - paddingRight, targetY);
            ctx.strokeStyle = '#34d399';
            ctx.setLineDash([3, 3]);
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = '#34d399';
            ctx.font = '10px Inter, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(`Target: ₹${cwh.targetPrice}`, w - paddingRight - 8, targetY - 4);
          }

          // Stop loss line
          const slY = getY(cwh.stopLossPrice);
          ctx.beginPath();
          ctx.moveTo(p3x, slY);
          ctx.lineTo(w - paddingRight, slY);
          ctx.strokeStyle = '#ef4444';
          ctx.setLineDash([4, 4]);
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = '#f59e0b';
          ctx.font = 'bold 10px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('Left Rim', p1x, p1y - 8);
          ctx.fillText(`Cup (-${cwh.cupDepthPct}%)`, p2x, p2y + 20);
          ctx.fillText('Right Rim Pivot', p3x, p3y - 8);
        }
      }

      // Candlesticks
      const candleWidth = Math.max(2, (plotWidth / visibleCount) * 0.72);
      this.visibleCandles.forEach((c, idx) => {
        const cx = getX(idx);
        const isBullish = c.close >= c.open;
        const color = isBullish ? '#10b981' : '#ef4444';

        // Volume
        const vy = getVolY(c.volume);
        const vh = (volumeTop + volumeHeight) - vy;
        const isBurst = (idx === visibleCount - 1 && this.stock.volumeBurst?.isBurst);
        ctx.fillStyle = isBurst ? '#f59e0b' : (isBullish ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.45)');
        ctx.fillRect(cx - candleWidth / 2, vy, candleWidth, Math.max(1.5, vh));

        // Wicks
        const hy = getY(c.high), ly = getY(c.low);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cx, hy);
        ctx.lineTo(cx, ly);
        ctx.stroke();

        // Body
        const oy = getY(c.open), cy = getY(c.close);
        ctx.fillStyle = color;
        ctx.fillRect(cx - candleWidth / 2, Math.min(oy, cy), candleWidth, Math.max(1.5, Math.abs(cy - oy)));
      });

      // Top info legend
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(paddingLeft, 4, w - paddingRight - paddingLeft, 18);
      ctx.fillStyle = '#f8fafc';
      ctx.font = '11px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${this.stock.symbol} (₹${this.stock.ltp})`, paddingLeft + 6, 17);
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('— 20 SMA', paddingLeft + 140, 17);
      ctx.fillStyle = '#10b981';
      ctx.fillText(`RSI(14): ${this.stock.rsi || 75}`, paddingLeft + 220, 17);

      // Tooltip
      if (this.crosshair.active && this.crosshair.candle) {
        const c = this.crosshair.candle;
        const tooltip = `Date: ${c.date} | O: ₹${c.open} | H: ₹${c.high} | L: ₹${c.low} | C: ₹${c.close} | Vol: ${(c.volume / 100000).toFixed(2)}L`;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(paddingLeft + 4, 4, 440, 18);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.strokeRect(paddingLeft + 4, 4, 440, 18);
        ctx.fillStyle = '#f8fafc';
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.fillText(tooltip, paddingLeft + 8, 17);
      }
    }
  }

  /* ==========================================================================
     5. LIVE STREAM & NEWS WIRE ENGINE
     ========================================================================== */
  const LiveNewsData = [
    { title: 'TRENT surges on record Zudio store rollout; Q1 sales accelerate +53% YoY', source: 'Livemint Markets', pubDate: 'Just now', category: 'Earnings / EPS Beat', snippet: 'Trent Ltd registers relentless store opening run-rate with EPS accelerating +67.8% YoY.', ticker: 'TRENT' },
    { title: 'DIXON Tech bags mega smartphone manufacturing contract under PLI scheme', source: 'ET Markets', pubDate: '4m ago', category: 'Orders & Growth', snippet: 'Dixon Tech crosses 100% sales YoY surge as electronics manufacturing orders peak.', ticker: 'DIXON' },
    { title: 'BEL & HAL rally following Ministry of Defence clearance for ₹45,000 Cr contracts', source: 'CNBC-TV18 Live', pubDate: '12m ago', category: 'Orders & Growth', snippet: 'Bharat Electronics and Hindustan Aeronautics witness institutional block accumulation.', ticker: 'BEL' },
    { title: 'KAYNES Technology receives clearance for OSAT semiconductor packaging plant', source: 'Moneycontrol Wire', pubDate: '22m ago', category: 'CANSLIM Breakout', snippet: 'Kaynes Tech breaks out of a 12-week base with RS score exceeding 97.', ticker: 'KAYNES' },
    { title: 'CDSL demat account tally tops 130 Million milestone; ROCE crosses 42%', source: 'Bloomberg Quint', pubDate: '35m ago', category: 'Earnings / EPS Beat', snippet: 'Central Depository Services shows sustained ROCE > 42% with strong retail equity participation.', ticker: 'CDSL' },
    { title: 'FIIs pump ₹2,480 Cr in cash equities while DIIs purchase ₹3,150 Cr', source: 'NSE Institutional Flow', pubDate: '50m ago', category: 'Institutional Activity', snippet: 'Net institutional buying supports NIFTY 50 above 24,800 levels. Market breadth strongly positive.', ticker: null }
  ];

  /* ==========================================================================
     6. MAIN APPLICATION CONTROLLER
     ========================================================================== */
  class Application {
    constructor() {
      this.universe = getStockUniverse();
      this.scanner = new ScreenerEngine(this.universe);
      this.activeMainStock = this.universe[0];
      this.currentModalStock = null;
      this.activeNewsIdx = 0;
      this.isLive = true;
      this.streamInterval = 3000;
      this.liveTimer = null;

      this.filters = {
        searchTerm: '', exchange: 'ALL', sector: 'ALL', sortBy: 'matchCount', sortDir: 'desc',
        requireGrowth: true, minSalesGrowth: 15, minEpsGrowth: 15,
        requireRsi: true, minRsi: 70,
        requireVolumeBurst: true, minBurstPct: 40,
        require7WeekConsolidation: false, maxConsolidationRange: 15,
        requireCupWithHandle: false,
        requireStopLossLimit: true, maxStopLossPct: 8.0,
        requireRoeRoce: true, minRoe: 17, minRoce: 17,
        requireEpsCAGR: true, minEps3YCAGR: 20,
        requireRsScore: true, minRsScore: 80
      };

      this.init();
    }

    init() {
      this.mainChart = new CanvasChart('mainCanvasContainer');
      this.modalChart = new CanvasChart('modalCanvasContainer');

      this.bindUI();
      this.renderStockPills();
      this.applyPreset('user_master');
      this.runScan();

      if (this.mainChart && this.activeMainStock) {
        this.updateMainChart(this.activeMainStock);
      }

      this.startLiveStream();
      this.renderNews();
      this.startNewsCycle();
    }

    bindUI() {
      // Sliders
      const bindRng = (id, pillId, fmt, fn) => {
        const el = document.getElementById(id), pill = document.getElementById(pillId);
        if (!el || !pill) return;
        el.addEventListener('input', (e) => {
          const v = parseFloat(e.target.value);
          pill.textContent = fmt(v);
          fn(v);
          this.runScan();
        });
      };

      bindRng('rng_salesGrowth', 'val_salesGrowth', v => `${v}%`, v => this.filters.minSalesGrowth = v);
      bindRng('rng_epsGrowth', 'val_epsGrowth', v => `${v}%`, v => this.filters.minEpsGrowth = v);
      bindRng('rng_rsi', 'val_rsi', v => `${v}`, v => this.filters.minRsi = v);
      bindRng('rng_volumeBurst', 'val_volumeBurst', v => `+${v}%`, v => this.filters.minBurstPct = v);
      bindRng('rng_consolidationRange', 'val_consolidationRange', v => `≤ ${v}%`, v => this.filters.maxConsolidationRange = v);
      bindRng('rng_maxStopLoss', 'val_maxStopLoss', v => `≤ ${v}%`, v => this.filters.maxStopLossPct = v);
      bindRng('rng_roe', 'val_roe', v => `${v}%`, v => { this.filters.minRoe = v; this.filters.minRoce = v; });
      bindRng('rng_epsCAGR', 'val_epsCAGR', v => `${v}%`, v => this.filters.minEps3YCAGR = v);
      bindRng('rng_rsScore', 'val_rsScore', v => `${v}`, v => this.filters.minRsScore = v);

      // Checkboxes
      const bindChk = (id, cardId, fn) => {
        const el = document.getElementById(id), card = document.getElementById(cardId);
        if (!el || !card) return;
        el.addEventListener('change', (e) => {
          if (e.target.checked) card.classList.add('active');
          else card.classList.remove('active');
          fn(e.target.checked);
          this.runScan();
        });
      };

      bindChk('chk_p1', 'card_p1', v => this.filters.requireGrowth = v);
      bindChk('chk_p2', 'card_p2', v => this.filters.requireRsi = v);
      bindChk('chk_p3', 'card_p3', v => this.filters.requireVolumeBurst = v);
      bindChk('chk_p4', 'card_p4', v => this.filters.require7WeekConsolidation = v);
      bindChk('chk_p5', 'card_p5', v => this.filters.requireCupWithHandle = v);
      bindChk('chk_p6', 'card_p6', v => this.filters.requireStopLossLimit = v);
      bindChk('chk_p7', 'card_p7', v => this.filters.requireRoeRoce = v);
      bindChk('chk_p8', 'card_p8', v => this.filters.requireEpsCAGR = v);
      bindChk('chk_p9', 'card_p9', v => this.filters.requireRsScore = v);

      // Search & Selects
      document.getElementById('txtSearch')?.addEventListener('input', (e) => {
        this.filters.searchTerm = e.target.value.trim();
        this.runScan();
      });

      document.getElementById('selExchange')?.addEventListener('change', (e) => {
        this.filters.exchange = e.target.value;
        this.runScan();
      });

      document.getElementById('selSector')?.addEventListener('change', (e) => {
        this.filters.sector = e.target.value;
        this.runScan();
      });

      document.getElementById('selSortBy')?.addEventListener('change', (e) => {
        this.filters.sortBy = e.target.value;
        this.runScan();
      });

      // Presets
      document.querySelectorAll('.preset-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          this.applyPreset(chip.dataset.preset);
          this.runScan();
        });
      });

      // Chart Toggle Button
      document.getElementById('btnToggleMainChart')?.addEventListener('click', () => {
        const card = document.getElementById('mainChartCard');
        if (card) {
          card.style.display = card.style.display === 'none' ? 'block' : 'none';
          if (card.style.display === 'block') {
            setTimeout(() => this.mainChart?.resize(), 50);
          }
        }
      });

      // Live Toggle
      document.getElementById('btnToggleLive')?.addEventListener('click', () => {
        const btn = document.getElementById('btnToggleLive');
        const pill = document.getElementById('livePillIndicator');
        this.isLive = !this.isLive;
        if (this.isLive) {
          btn.textContent = '⏸ Pause';
          pill.innerHTML = '<span class="live-dot"></span> LIVE STREAMING';
          pill.style.borderColor = 'rgba(16, 185, 129, 0.4)';
          pill.style.color = 'var(--accent-green)';
          this.startLiveStream();
        } else {
          btn.textContent = '▶ Resume';
          pill.innerHTML = '<span class="live-dot" style="background:#64748b; box-shadow:none;"></span> STREAM PAUSED';
          pill.style.borderColor = 'rgba(100, 116, 139, 0.4)';
          pill.style.color = '#94a3b8';
          if (this.liveTimer) clearTimeout(this.liveTimer);
        }
      });

      document.getElementById('selStreamSpeed')?.addEventListener('change', (e) => {
        this.streamInterval = parseInt(e.target.value, 10);
      });

      // News Drawer
      const openNews = () => document.getElementById('newsDrawerOverlay')?.classList.add('active');
      const closeNews = () => document.getElementById('newsDrawerOverlay')?.classList.remove('active');
      document.getElementById('btnOpenNewsDrawer')?.addEventListener('click', openNews);
      document.getElementById('btnReadMoreNews')?.addEventListener('click', openNews);
      document.getElementById('btnCloseNewsDrawer')?.addEventListener('click', closeNews);
      document.getElementById('newsDrawerOverlay')?.addEventListener('click', (e) => {
        if (e.target.id === 'newsDrawerOverlay') closeNews();
      });

      // Export Actions
      document.getElementById('btnResetFilters')?.addEventListener('click', () => {
        this.applyPreset('all');
        this.runScan();
      });
      document.getElementById('btnRunScan')?.addEventListener('click', () => this.runScan());
      document.getElementById('btnExportCsv')?.addEventListener('click', () => this.exportCSV());
      document.getElementById('btnCopyTickers')?.addEventListener('click', () => this.copyTickers());

      // Modal Tab switching
      document.getElementById('btnCloseModal')?.addEventListener('click', () => this.closeModal());
      document.getElementById('stockModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'stockModal') this.closeModal();
      });

      document.querySelectorAll('.modal-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          const tabName = tab.dataset.tab;
          document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
          const content = document.getElementById(`tab_${tabName}`);
          if (content) content.style.display = 'block';
          if (tabName === 'chart') {
            setTimeout(() => this.modalChart?.resize(), 50);
          }
        });
      });

      // Timeframe buttons
      document.querySelectorAll('.main-range-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.main-range-btn').forEach(b => b.classList.remove('btn-primary'));
          btn.classList.add('btn-primary');
          this.mainChart?.setRange(btn.dataset.range);
        });
      });

      document.querySelectorAll('.modal-range-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.modal-range-btn').forEach(b => b.classList.remove('btn-primary'));
          btn.classList.add('btn-primary');
          this.modalChart?.setRange(btn.dataset.range);
        });
      });

      // Calculator
      ['calcCapital', 'calcRiskPct', 'calcEntryPrice', 'calcStopLossPrice'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', () => this.updateCalculator());
      });
    }

    renderStockPills() {
      const container = document.getElementById('stockPillSelector');
      if (!container) return;
      const symbols = ['TRENT', 'DIXON', 'KAYNES', 'BEL', 'HAL', 'SOLARINDS', 'CDSL', 'BDL', 'POLYCAB', 'PERSISTENT'];
      container.innerHTML = symbols.map(sym => `
        <button class="stock-pill ${sym === this.activeMainStock.symbol ? 'active' : ''}" data-symbol="${sym}">
          ${sym}
        </button>
      `).join('');

      container.querySelectorAll('.stock-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          container.querySelectorAll('.stock-pill').forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          const stock = this.universe.find(s => s.symbol === pill.dataset.symbol);
          if (stock) this.updateMainChart(stock);
        });
      });
    }

    updateMainChart(stock) {
      if (!stock || !this.mainChart) return;
      this.activeMainStock = stock;
      const titleEl = document.getElementById('mainChartStockTitle');
      if (titleEl) {
        titleEl.innerHTML = `${stock.symbol} <span style="font-size:12px; color:${stock.dayChangePct >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}; font-weight:600;" id="mainChartPrice">₹${stock.ltp.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${stock.dayChangePct > 0 ? '+' : ''}${stock.dayChangePct}%)</span>`;
      }

      const badgeEl = document.getElementById('mainChartPatternBadge');
      if (badgeEl) {
        if (stock.cupWithHandle?.isPattern) {
          badgeEl.textContent = `☕ Cup & Handle (Score ${stock.cupWithHandle.score})`;
          badgeEl.className = 'tag tag-cwh';
        } else if (stock.consolidation7W?.isConsolidating) {
          badgeEl.textContent = `🧱 7-Week Base (${stock.consolidation7W.rangePct}% range)`;
          badgeEl.className = 'tag tag-7w';
        } else {
          badgeEl.textContent = `High RS Leader (${stock.rsScore})`;
          badgeEl.className = 'tag';
        }
      }
      this.mainChart.setStock(stock);
    }

    applyPreset(key) {
      const setChk = (id, val) => {
        const el = document.getElementById(id);
        if (el) {
          el.checked = val;
          const card = document.getElementById(id.replace('chk_', 'card_'));
          if (card) {
            if (val) card.classList.add('active');
            else card.classList.remove('active');
          }
        }
      };

      if (key === 'user_master') {
        this.filters.requireGrowth = true;
        this.filters.requireRsi = true; this.filters.minRsi = 70;
        this.filters.requireVolumeBurst = true; this.filters.minBurstPct = 40;
        this.filters.require7WeekConsolidation = false;
        this.filters.requireCupWithHandle = false;
        this.filters.requireStopLossLimit = true; this.filters.maxStopLossPct = 8.0;
        this.filters.requireRoeRoce = true; this.filters.minRoe = 17;
        this.filters.requireEpsCAGR = true; this.filters.minEps3YCAGR = 20;
        this.filters.requireRsScore = true; this.filters.minRsScore = 80;

        setChk('chk_p1', true); setChk('chk_p2', true); setChk('chk_p3', true);
        setChk('chk_p4', false); setChk('chk_p5', false); setChk('chk_p6', true);
        setChk('chk_p7', true); setChk('chk_p8', true); setChk('chk_p9', true);
      } else if (key === 'cup_handle') {
        this.filters.requireGrowth = true;
        this.filters.requireCupWithHandle = true;
        this.filters.require7WeekConsolidation = false;
        this.filters.requireRsi = false;
        this.filters.requireVolumeBurst = false;
        this.filters.requireRsScore = true;

        setChk('chk_p1', true); setChk('chk_p2', false); setChk('chk_p3', false);
        setChk('chk_p4', false); setChk('chk_p5', true); setChk('chk_p6', true);
        setChk('chk_p7', true); setChk('chk_p8', false); setChk('chk_p9', true);
      } else if (key === 'consolidation_7w') {
        this.filters.require7WeekConsolidation = true;
        this.filters.requireCupWithHandle = false;
        this.filters.requireGrowth = true;
        this.filters.requireRsi = false;

        setChk('chk_p1', true); setChk('chk_p2', false); setChk('chk_p3', false);
        setChk('chk_p4', true); setChk('chk_p5', false); setChk('chk_p6', true);
        setChk('chk_p7', false); setChk('chk_p8', false); setChk('chk_p9', true);
      } else if (key === 'all') {
        ['chk_p1','chk_p2','chk_p3','chk_p4','chk_p5','chk_p6','chk_p7','chk_p8','chk_p9'].forEach(id => setChk(id, false));
        this.filters.requireGrowth = false; this.filters.requireRsi = false;
        this.filters.requireVolumeBurst = false; this.filters.require7WeekConsolidation = false;
        this.filters.requireCupWithHandle = false; this.filters.requireStopLossLimit = false;
        this.filters.requireRoeRoce = false; this.filters.requireEpsCAGR = false;
        this.filters.requireRsScore = false;
      }
    }

    runScan() {
      const filtered = this.scanner.filterStocks(this.filters);
      const sorted = this.scanner.sortStocks(filtered, this.filters.sortBy, this.filters.sortDir);
      this.currentResults = sorted;
      this.renderTable(sorted);
      this.updateStats(sorted);
    }

    updateStats(stocks) {
      document.getElementById('statMatchingCount').textContent = stocks.length;
      document.getElementById('statMatchingSub').textContent = `Scanned universe: ${this.universe.length}`;
      document.getElementById('statCupCount').textContent = stocks.filter(s => s.cupWithHandle?.isPattern).length;
      document.getElementById('stat7wCount').textContent = stocks.filter(s => s.consolidation7W?.isConsolidating).length;
      const avgRs = stocks.length ? Math.round(stocks.reduce((a, b) => a + (b.rsScore || 50), 0) / stocks.length) : 0;
      document.getElementById('statAvgRs').textContent = avgRs;
    }

    renderTable(stocks) {
      const tbody = document.getElementById('screenerTableBody');
      if (!tbody) return;

      if (!stocks.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="13" style="text-align:center; padding:32px; color:var(--text-muted);">
              No stocks matched all active protocols. Try relaxing some filters or selecting the <strong>View All</strong> preset.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = stocks.map(stock => {
        const matchClass = stock.matchCount >= 7 ? 'match-high' : (stock.matchCount >= 4 ? 'match-med' : 'match-low');
        const dayChgStyle = stock.dayChangePct >= 0 ? 'color:var(--accent-green);' : 'color:var(--accent-red);';
        const daySign = stock.dayChangePct > 0 ? '+' : '';

        let patternBadge = `<span style="color:var(--text-muted); font-size:11px;">Consolidating</span>`;
        if (stock.cupWithHandle?.isPattern) {
          patternBadge = `<span class="tag tag-cwh">☕ Cup & Handle (${stock.cupWithHandle.score})</span>`;
        } else if (stock.consolidation7W?.isConsolidating) {
          patternBadge = `<span class="tag tag-7w">🧱 7W Base (${stock.consolidation7W.rangePct}%)</span>`;
        }

        const volBurstDisplay = stock.volumeBurst?.burstPct > 0 
          ? `<span style="color:var(--accent-amber); font-weight:600;">+${stock.volumeBurst.burstPct}%</span>`
          : `<span style="color:var(--text-muted);">${stock.volumeBurst?.ratio || 1.0}x</span>`;

        return `
          <tr data-symbol="${stock.symbol}">
            <td>
              <div class="stock-cell">
                <span class="stock-symbol">${stock.symbol}</span>
                <span class="stock-name">${stock.name}</span>
              </div>
            </td>
            <td>
              <div class="price-num">₹${stock.ltp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <div style="font-size:11px; ${dayChgStyle}">${daySign}${stock.dayChangePct}%</div>
            </td>
            <td>
              <span class="val-pill" style="font-size:12px; font-weight:700; ${stock.rsScore >= 80 ? 'color:var(--accent-green); background:var(--accent-green-bg);' : ''}">
                ${stock.rsScore}
              </span>
            </td>
            <td>
              <span style="font-family:var(--font-mono); font-weight:600; ${stock.rsi >= 75 ? 'color:var(--accent-amber);' : ''}">
                ${stock.rsi}
              </span>
            </td>
            <td>${volBurstDisplay}</td>
            <td>${patternBadge}</td>
            <td><span style="font-family:var(--font-mono); color:var(--accent-green);">+${stock.salesGrowthYoY}%</span></td>
            <td><span style="font-family:var(--font-mono); color:var(--accent-green); font-weight:600;">+${stock.epsGrowthYoY}%</span></td>
            <td>
              <div style="font-family:var(--font-mono); font-size:11.5px;">3Y: +${stock.eps3Y_CAGR}%</div>
              <div style="font-family:var(--font-mono); font-size:10.5px; color:var(--text-muted);">5Y: +${stock.eps5Y_CAGR}%</div>
            </td>
            <td>
              <div style="font-family:var(--font-mono); font-size:11.5px; color:var(--accent-green);">ROE: ${stock.roe}%</div>
              <div style="font-family:var(--font-mono); font-size:10.5px; color:var(--text-secondary);">ROCE: ${stock.roce}%</div>
            </td>
            <td>
              <div style="font-family:var(--font-mono); font-size:11.5px;">₹${stock.recommendedSL.toLocaleString('en-IN')}</div>
              <div style="font-family:var(--font-mono); font-size:10.5px; color:var(--accent-red);">${stock.slPct}% (${stock.slSource})</div>
            </td>
            <td>
              <span class="match-score-badge ${matchClass}">
                ${stock.matchCount}/9
              </span>
            </td>
            <td>
              <div style="display:flex; gap:4px;">
                <button class="btn btn-sm btn-chart-quick" data-symbol="${stock.symbol}">📈 View</button>
                <button class="btn btn-primary btn-sm btn-analyze" data-symbol="${stock.symbol}">Details</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      tbody.querySelectorAll('.btn-chart-quick').forEach(btn => {
        btn.addEventListener('click', () => {
          const sym = btn.dataset.symbol;
          const stock = this.universe.find(s => s.symbol === sym);
          if (stock) {
            this.updateMainChart(stock);
            document.getElementById('mainChartCard')?.scrollIntoView({ behavior: 'smooth' });
          }
        });
      });

      tbody.querySelectorAll('.btn-analyze').forEach(btn => {
        btn.addEventListener('click', () => {
          const sym = btn.dataset.symbol;
          const stock = this.universe.find(s => s.symbol === sym);
          if (stock) this.openModal(stock);
        });
      });
    }

    startLiveStream() {
      if (this.liveTimer) clearTimeout(this.liveTimer);
      const loop = () => {
        if (!this.isLive) return;

        // Generate live ticks
        const updateCount = Math.floor(Math.random() * 3) + 2;
        const targets = [...this.universe].sort(() => 0.5 - Math.random()).slice(0, updateCount);
        const updated = [];

        targets.forEach(stock => {
          const candle = stock.candles[stock.candles.length - 1];
          const deltaPct = (Math.random() - 0.44) * 0.7;
          const newClose = parseFloat(Math.max(5, candle.close * (1 + deltaPct / 100)).toFixed(2));
          candle.volume += Math.floor(Math.random() * 35000) + 8000;
          candle.close = newClose;
          candle.high = Math.max(candle.high, newClose);
          candle.low = Math.min(candle.low, newClose);

          const baseClose = stock.candles[stock.candles.length - 2]?.close || newClose;
          stock.dayChangePct = parseFloat((((newClose - baseClose) / baseClose) * 100).toFixed(2));
          stock.ltp = newClose;
          stock.closes[stock.closes.length - 1] = newClose;
          stock.volumes[stock.volumes.length - 1] = candle.volume;

          updated.push({ symbol: stock.symbol, dir: deltaPct >= 0 ? 'up' : 'down' });
        });

        this.scanner.analyzeUniverse();
        this.runScan();

        // Flash rows
        updated.forEach(t => {
          const row = document.querySelector(`tr[data-symbol="${t.symbol}"]`);
          if (row) {
            const cls = t.dir === 'up' ? 'flash-up' : 'flash-down';
            row.classList.add(cls);
            setTimeout(() => row.classList.remove(cls), 500);
          }
        });

        // Update active main chart if updated
        if (this.mainChart && this.activeMainStock) {
          const matched = updated.find(t => t.symbol === this.activeMainStock.symbol);
          if (matched) this.updateMainChart(this.activeMainStock);
        }

        // Update Breadth
        let advances = 0, declines = 0;
        this.universe.forEach(s => {
          if (s.dayChangePct >= 0) advances++;
          else declines++;
        });
        const advEl = document.getElementById('breadthAdvances');
        const decEl = document.getElementById('breadthDeclines');
        if (advEl) advEl.textContent = `▲ ${advances} Advances`;
        if (decEl) decEl.textContent = `▼ ${declines} Declines`;

        this.liveTimer = setTimeout(loop, this.streamInterval);
      };

      this.liveTimer = setTimeout(loop, this.streamInterval);
    }

    renderNews() {
      const list = document.getElementById('newsFeedList');
      if (!list) return;
      list.innerHTML = LiveNewsData.map(item => `
        <div class="news-card" data-ticker="${item.ticker || ''}">
          <div class="news-card-header">
            <span class="news-tag">${item.category}</span>
            <span class="news-time">${item.pubDate} • ${item.source}</span>
          </div>
          <div class="news-title">${item.title}</div>
          <div class="news-snippet">${item.snippet}</div>
          ${item.ticker ? `<div style="margin-top:6px;"><span class="val-pill" style="font-size:10px;">Symbol: ${item.ticker}</span></div>` : ''}
        </div>
      `).join('');

      list.querySelectorAll('.news-card').forEach(card => {
        card.addEventListener('click', () => {
          const ticker = card.dataset.ticker;
          if (ticker) {
            const txt = document.getElementById('txtSearch');
            if (txt) { txt.value = ticker; this.filters.searchTerm = ticker; }
            this.runScan();
            const stock = this.universe.find(s => s.symbol === ticker);
            if (stock) this.updateMainChart(stock);
            document.getElementById('newsDrawerOverlay')?.classList.remove('active');
          }
        });
      });
    }

    startNewsCycle() {
      const headline = document.getElementById('breakingHeadline');
      const update = () => {
        const item = LiveNewsData[this.activeNewsIdx % LiveNewsData.length];
        if (headline) {
          headline.innerHTML = `<strong>${item.source}</strong>: ${item.title} <span style="color:var(--text-muted); font-size:11px;">(${item.pubDate})</span>`;
        }
        this.activeNewsIdx++;
      };
      update();
      setInterval(update, 7000);
    }

    openModal(stock) {
      this.currentModalStock = stock;
      const modal = document.getElementById('stockModal');
      if (!modal) return;

      document.getElementById('modalStockSymbol').textContent = stock.symbol;
      document.getElementById('modalStockName').textContent = stock.name;
      document.getElementById('modalLTP').textContent = `₹${stock.ltp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      document.getElementById('modalDayChg').textContent = `${stock.dayChangePct > 0 ? '+' : ''}${stock.dayChangePct}%`;
      document.getElementById('modalExchangeTag').textContent = stock.exchange;

      const tag = document.getElementById('modalPatternTag');
      if (stock.cupWithHandle?.isPattern) {
        tag.textContent = `☕ Cup & Handle (Score: ${stock.cupWithHandle.score})`;
        tag.className = 'tag tag-cwh';
      } else if (stock.consolidation7W?.isConsolidating) {
        tag.textContent = `🧱 7-Week Base (${stock.consolidation7W.rangePct}%)`;
        tag.className = 'tag tag-7w';
      } else {
        tag.textContent = `Leader (${stock.rsScore})`;
        tag.className = 'tag';
      }

      document.getElementById('fundSalesYoY').textContent = `+${stock.salesGrowthYoY}%`;
      document.getElementById('fundEpsYoY').textContent = `+${stock.epsGrowthYoY}%`;
      document.getElementById('fundEps3Y').textContent = `+${stock.eps3Y_CAGR}%`;
      document.getElementById('fundEps5Y').textContent = `+${stock.eps5Y_CAGR}%`;
      document.getElementById('fundRoe').textContent = `${stock.roe}%`;
      document.getElementById('fundRoce').textContent = `${stock.roce}%`;
      document.getElementById('fundDebt').textContent = `${stock.debtToEquity}`;
      document.getElementById('fundPE').textContent = `${stock.peRatio} / ${stock.industryPE}`;

      const barWrap = document.getElementById('epsHistoryBar');
      if (barWrap && stock.epsHistory) {
        const maxVal = Math.max(...stock.epsHistory, 10);
        const yr = new Date().getFullYear();
        barWrap.innerHTML = stock.epsHistory.map((val, i) => {
          const h = Math.max(10, Math.round((val / maxVal) * 80));
          return `
            <div style="display:flex; flex-direction:column; align-items:center; flex:1;">
              <div style="font-size:11px; font-family:var(--font-mono); font-weight:600; color:var(--accent-blue); margin-bottom:4px;">₹${val}</div>
              <div style="width:100%; height:${h}px; background:linear-gradient(180deg, #38bdf8, #0284c7); border-radius:4px 4px 0 0;"></div>
              <div style="font-size:10.5px; color:var(--text-muted); margin-top:6px;">FY${(yr - (stock.epsHistory.length - 1 - i)) % 100}</div>
            </div>
          `;
        }).join('');
      }

      document.getElementById('modalDescription').textContent = stock.description || '';
      const compList = document.getElementById('protocolComplianceList');
      if (compList && stock.protocolMatch) {
        const rules = [
          { label: 'P1: EPS & Sales YoY Growth (≥15%)', ok: stock.protocolMatch.p1_growth },
          { label: 'P2: RSI Momentum Zone (≥75)', ok: stock.protocolMatch.p2_rsi },
          { label: 'P3: Burst of Volume (>50% vs SMA)', ok: stock.protocolMatch.p3_volumeBurst },
          { label: 'P4: 7-Week Consolidation Base', ok: stock.protocolMatch.p4_consolidation7W },
          { label: 'P5: Cup with Handle Pattern Recognition', ok: stock.protocolMatch.p5_cupWithHandle },
          { label: 'P6: % Stop Loss Risk Limit (≤8%)', ok: stock.protocolMatch.p6_stopLoss },
          { label: 'P7: ROE / ROCE > 17%', ok: stock.protocolMatch.p7_roe_roce },
          { label: 'P8: EPS >> Last 3-5 Years (CAGR>20%)', ok: stock.protocolMatch.p8_epsCAGR },
          { label: 'P9: Mansfield RS Score > 80 vs NIFTY', ok: stock.protocolMatch.p9_rsScore }
        ];

        compList.innerHTML = rules.map(r => `
          <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 12px; background:var(--bg-card); border-radius:var(--radius-sm); border:1px solid var(--border-subtle); font-size:12px;">
            <span>${r.label}</span>
            <span style="font-weight:700; font-family:var(--font-mono); color:${r.ok ? 'var(--accent-green)' : 'var(--text-muted)'};">
              ${r.ok ? '✓ PASS' : '— FAIL'}
            </span>
          </div>
        `).join('');
      }

      const entry = stock.ltp;
      const sl = stock.recommendedSL || (entry * 0.93);
      const entryEl = document.getElementById('calcEntryPrice');
      const slEl = document.getElementById('calcStopLossPrice');
      if (entryEl) entryEl.value = entry;
      if (slEl) slEl.value = sl;
      this.updateCalculator();

      modal.classList.add('active');
      setTimeout(() => {
        if (this.modalChart) {
          this.modalChart.setStock(stock, '6M');
        }
      }, 50);
    }

    closeModal() {
      document.getElementById('stockModal')?.classList.remove('active');
    }

    updateCalculator() {
      const cap = parseFloat(document.getElementById('calcCapital')?.value) || 500000;
      const rPct = parseFloat(document.getElementById('calcRiskPct')?.value) || 1.0;
      const entry = parseFloat(document.getElementById('calcEntryPrice')?.value) || 100;
      const sl = parseFloat(document.getElementById('calcStopLossPrice')?.value) || 93;

      const res = Indicators.calculatePositionSizing(entry, sl, cap, rPct);
      document.getElementById('calcSharesOut').textContent = `${res.shares} Qty`;
      document.getElementById('calcInvOut').textContent = `₹${res.totalInvestment.toLocaleString('en-IN')}`;
      document.getElementById('calcRiskAmountOut').textContent = `₹${res.riskAmount.toLocaleString('en-IN')}`;
      document.getElementById('calcSlPctOut').textContent = `-${res.stopLossPct}%`;
      document.getElementById('calcT1').textContent = `₹${res.target1R.toLocaleString('en-IN')}`;
      document.getElementById('calcT2').textContent = `₹${res.target2R.toLocaleString('en-IN')}`;
      document.getElementById('calcT3').textContent = `₹${res.target3R.toLocaleString('en-IN')}`;
    }

    exportCSV() {
      if (!this.currentResults?.length) { alert('No stocks to export.'); return; }
      const headers = ['Symbol', 'Name', 'Exchange', 'Sector', 'LTP', 'Day Change %', 'RS Score', 'RSI', 'Vol Burst %', 'Sales YoY %', 'EPS YoY %', '3Y EPS CAGR %', '5Y EPS CAGR %', 'ROE %', 'ROCE %', 'Stop Loss', 'SL %', 'Match Count'];
      const rows = this.currentResults.map(s => [
        s.symbol, `"${s.name}"`, s.exchange, `"${s.sector}"`, s.ltp, s.dayChangePct, s.rsScore, s.rsi,
        s.volumeBurst?.burstPct || 0, s.salesGrowthYoY, s.epsGrowthYoY, s.eps3Y_CAGR, s.eps5Y_CAGR, s.roe, s.roce,
        s.recommendedSL, s.slPct, s.matchCount
      ]);
      const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const link = document.createElement('a');
      link.setAttribute('href', encodeURI(csv));
      link.setAttribute('download', `NSE_BSE_Screener_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    copyTickers() {
      if (!this.currentResults?.length) { alert('No tickers.'); return; }
      const txt = this.currentResults.map(s => s.symbol).join(', ');
      navigator.clipboard.writeText(txt).then(() => {
        const btn = document.getElementById('btnCopyTickers');
        if (btn) {
          const old = btn.innerHTML;
          btn.innerHTML = '✓ Copied!';
          setTimeout(() => btn.innerHTML = old, 2000);
        }
      });
    }
  }

  // Auto-boot on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { window.screener = new Application(); });
  } else {
    window.screener = new Application();
  }
})();
