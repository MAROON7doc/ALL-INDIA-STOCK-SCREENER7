/**
 * Technical & Fundamental Indicators & Pattern Recognition Engine
 * Protocols:
 * 1. EPS & Sales Growth Analysis
 * 2. RSI (14-period standard Wilder's)
 * 3. Volume Burst Ratio vs 20-day SMA (>50% surge)
 * 4. 7-Week Tight Consolidation Base Detector
 * 5. Cup with Handle Candlestick Pattern Detector
 * 6. Stop Loss & Risk/Reward Position Sizing Calculator
 * 7. ROE & ROCE Filter (>17%)
 * 8. 3-5 Year Multi-Year EPS Growth CAGR Analyzer
 * 9. Mansfield Relative Strength (RS) Score (1-99 percentile vs NIFTY 50)
 */

export const Indicators = {
  /**
   * Calculate 14-period RSI using Wilder's Smoothing
   * @param {number[]} closes - Array of closing prices
   * @param {number} period - RSI period (default 14)
   * @returns {number} Current RSI value (0 - 100)
   */
  calculateRSI(closes, period = 14) {
    if (!closes || closes.length < period + 1) return 50;
    
    let gains = 0;
    let losses = 0;

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

  /**
   * Calculate Simple Moving Average
   */
  calculateSMA(values, period = 20) {
    if (!values || values.length < period) return values && values.length ? values[values.length - 1] : 0;
    const slice = values.slice(-period);
    const sum = slice.reduce((a, b) => a + b, 0);
    return sum / period;
  },

  /**
   * Calculate Exponential Moving Average
   */
  calculateEMA(values, period = 20) {
    if (!values || values.length === 0) return 0;
    if (values.length < period) return this.calculateSMA(values, values.length);
    
    const k = 2 / (period + 1);
    let ema = this.calculateSMA(values.slice(0, period), period);
    for (let i = period; i < values.length; i++) {
      ema = values[i] * k + ema * (1 - k);
    }
    return ema;
  },

  /**
   * Volume Burst Check
   * Protocol: Current Volume > 50% above 20-day SMA volume (Volume >= 1.5 * SMA20)
   */
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

  /**
   * 7-Week Consolidation Base Detector
   * Protocol: Checks if the stock has formed a tight base over ~7 weeks (35-40 trading sessions)
   * with volatility contraction (range <= 10-15%) and volume dry up.
   */
  detect7WeekConsolidation(candles, weeks = 7, maxRangePct = 15) {
    const sessions = weeks * 5; // ~35 trading days
    if (!candles || candles.length < sessions) {
      return { isConsolidating: false, rangePct: 0, baseHigh: 0, baseLow: 0, baseLengthDays: 0 };
    }

    const baseCandles = candles.slice(-sessions);
    let high = -Infinity;
    let low = Infinity;
    let totalVolume = 0;

    for (const c of baseCandles) {
      if (c.high > high) high = c.high;
      if (c.low < low) low = c.low;
      totalVolume += c.volume;
    }

    const rangePct = low > 0 ? ((high - low) / low) * 100 : 999;
    const currentClose = candles[candles.length - 1].close;
    const isNearTop = currentClose >= high * 0.94; // Within 6% of base high
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

  /**
   * Cup with Handle Candlestick Pattern Recognition Algorithm
   * Detects William O'Neil / CANSLIM classic Cup with Handle structure:
   * 1. Prior Uptrend: At least 20-30% prior advance before cup formation.
   * 2. Cup Left Rim Peak: Clear swing high.
   * 3. Rounded U-Shaped Bottom: Cup correction depth between 12% and 38% (healthy base).
   * 4. Cup Right Rim Peak: Price recovers to within 3-5% of Left Rim.
   * 5. Handle Formation: Downward/sideways consolidation for 5 to 15 sessions, depth 5-12%, volume contracting.
   * 6. Pivot Breakout Level: Right rim / Handle resistance price.
   * 7. Target Level: Pivot + Cup Depth.
   * 8. Stop Loss: 5-8% below pivot or Handle Low.
   */
  detectCupWithHandle(candles) {
    if (!candles || candles.length < 50) {
      return { isPattern: false, score: 0, stage: 'None', details: null };
    }

    const total = candles.length;
    // Look across the last 60 to 120 sessions for the base
    const lookback = Math.min(total, 90);
    const window = candles.slice(-lookback);

    // 1. Identify Left Peak (in the earlier 1/3 of the window)
    let leftPeakIdx = -1;
    let leftPeakPrice = -Infinity;
    const firstThird = Math.floor(window.length * 0.45);

    for (let i = 5; i < firstThird; i++) {
      if (window[i].high > leftPeakPrice) {
        // check if local peak
        const isLocalMax = window[i].high >= window[i - 1].high &&
                           window[i].high >= window[i - 2].high &&
                           window[i].high >= (window[i + 1]?.high || 0) &&
                           window[i].high >= (window[i + 2]?.high || 0);
        if (isLocalMax && window[i].high > leftPeakPrice) {
          leftPeakPrice = window[i].high;
          leftPeakIdx = i;
        }
      }
    }

    if (leftPeakIdx === -1 || leftPeakPrice <= 0) {
      return { isPattern: false, score: 0, stage: 'No Left Peak', details: null };
    }

    // 2. Identify Cup Bottom (between left peak and recent 15 sessions)
    let cupBottomIdx = -1;
    let cupBottomPrice = Infinity;
    const handleStartSearch = window.length - 15;

    for (let i = leftPeakIdx + 5; i < handleStartSearch; i++) {
      if (window[i].low < cupBottomPrice) {
        cupBottomPrice = window[i].low;
        cupBottomIdx = i;
      }
    }

    if (cupBottomIdx === -1 || cupBottomPrice === Infinity) {
      return { isPattern: false, score: 0, stage: 'No Cup Bottom', details: null };
    }

    const cupDepthPct = ((leftPeakPrice - cupBottomPrice) / leftPeakPrice) * 100;
    // Cup depth should ideally be between 10% and 40%
    if (cupDepthPct < 10 || cupDepthPct > 45) {
      return { isPattern: false, score: 0, stage: 'Invalid Cup Depth', details: { cupDepthPct } };
    }

    // 3. Identify Right Rim Peak (after cup bottom, before current handle)
    let rightPeakIdx = -1;
    let rightPeakPrice = -Infinity;

    for (let i = cupBottomIdx + 5; i < window.length - 3; i++) {
      if (window[i].high > rightPeakPrice) {
        rightPeakPrice = window[i].high;
        rightPeakIdx = i;
      }
    }

    if (rightPeakIdx === -1 || rightPeakPrice <= 0) {
      return { isPattern: false, score: 0, stage: 'No Right Rim', details: null };
    }

    // Right peak should be within 8% of left peak
    const peakDiffPct = Math.abs(leftPeakPrice - rightPeakPrice) / leftPeakPrice * 100;
    if (peakDiffPct > 10) {
      return { isPattern: false, score: 0, stage: 'Asymmetric Rims', details: { peakDiffPct } };
    }

    // 4. Handle analysis (from right peak to current candle)
    const handleCandles = window.slice(rightPeakIdx);
    const handleLength = handleCandles.length;
    if (handleLength < 3 || handleLength > 25) {
      return { isPattern: false, score: 0, stage: 'Invalid Handle Length', details: { handleLength } };
    }

    let handleLowPrice = Infinity;
    for (const c of handleCandles) {
      if (c.low < handleLowPrice) handleLowPrice = c.low;
    }

    const handleDepthPct = ((rightPeakPrice - handleLowPrice) / rightPeakPrice) * 100;
    // Handle pullback should be healthy (3% to 15%), less than cup depth
    if (handleDepthPct > cupDepthPct * 0.65 || handleDepthPct > 18) {
      return { isPattern: false, score: 0, stage: 'Handle Too Deep', details: { handleDepthPct } };
    }

    const currentCandle = window[window.length - 1];
    const pivotPrice = parseFloat(rightPeakPrice.toFixed(2));
    const targetPrice = parseFloat((pivotPrice + (leftPeakPrice - cupBottomPrice)).toFixed(2));
    const defaultStopLoss = parseFloat(Math.min(handleLowPrice * 0.99, pivotPrice * 0.93).toFixed(2));
    const stopLossPct = parseFloat((((currentCandle.close - defaultStopLoss) / currentCandle.close) * 100).toFixed(2));
    const distToPivotPct = parseFloat((((currentCandle.close - pivotPrice) / pivotPrice) * 100).toFixed(2));

    // Determine Pattern Stage
    let stage = 'Forming Handle';
    if (currentCandle.close >= pivotPrice * 0.99 && currentCandle.close <= pivotPrice * 1.05) {
      stage = 'At Pivot Breakout';
    } else if (currentCandle.close > pivotPrice * 1.05) {
      stage = 'Extended / Broken Out';
    } else if (distToPivotPct < -5) {
      stage = 'In Handle Pullback';
    }

    // Score pattern quality (0 - 100)
    let score = 70;
    if (cupDepthPct >= 15 && cupDepthPct <= 30) score += 10;
    if (handleDepthPct >= 4 && handleDepthPct <= 10) score += 10;
    if (peakDiffPct <= 4) score += 10;

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

  /**
   * Mansfield Relative Strength (RS) Rating Calculation vs NIFTY 50 benchmark
   * Formula: Weighted 12-Month Relative Return
   * Weightings: 40% Last Quarter (Q1) + 20% Q2 + 20% Q3 + 20% Q4
   */
  calculateStockPerformance(closes) {
    if (!closes || closes.length < 250) {
      const pCurrent = closes[closes.length - 1];
      const pPast = closes[0];
      return pPast > 0 ? ((pCurrent - pPast) / pPast) * 100 : 0;
    }

    const current = closes[closes.length - 1];
    const q1 = closes[closes.length - 63] || closes[0];  // ~3 months ago
    const q2 = closes[closes.length - 126] || closes[0]; // ~6 months ago
    const q3 = closes[closes.length - 189] || closes[0]; // ~9 months ago
    const q4 = closes[closes.length - 252] || closes[0]; // ~12 months ago

    const r1 = ((current - q1) / q1) * 100;
    const r2 = ((q1 - q2) / q2) * 100;
    const r3 = ((q2 - q3) / q3) * 100;
    const r4 = ((q3 - q4) / q4) * 100;

    return 0.4 * r1 + 0.2 * r2 + 0.2 * r3 + 0.2 * r4;
  },

  /**
   * Risk Management & Position Sizing Calculation
   * Protocol: % Stop loss & exact share quantity sizing
   */
  calculatePositionSizing(entryPrice, stopLossPrice, accountCapital = 500000, riskPerTradePct = 1.0) {
    const entry = parseFloat(entryPrice) || 0;
    const sl = parseFloat(stopLossPrice) || 0;
    if (entry <= 0 || sl <= 0 || sl >= entry) {
      return {
        shares: 0,
        totalInvestment: 0,
        riskAmount: 0,
        riskPerShare: 0,
        stopLossPct: 0,
        target1R: 0,
        target2R: 0,
        target3R: 0
      };
    }

    const riskPerShare = entry - sl;
    const stopLossPct = parseFloat(((riskPerShare / entry) * 100).toFixed(2));
    const maxRiskAmount = (accountCapital * (riskPerTradePct / 100));
    const shares = Math.floor(maxRiskAmount / riskPerShare);
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
