/**
 * NSE/BSE Stock Screener Database & Historical Data Generator
 * Contains curated metadata, fundamental metrics (Sales, EPS, 3-5Y CAGR, ROE, ROCE),
 * and OHLCV price series generator.
 */

// Helper to generate realistic daily candlestick series
function generateCandles(basePrice, trendType = 'cup_handle', days = 140) {
  const candles = [];
  let price = basePrice;
  const now = new Date();
  
  // Base volume
  const avgVol = Math.floor(Math.random() * 800000) + 350000;

  for (let i = days; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    // Skip weekends
    if (d.getDay() === 0 || d.getDay() === 6) continue;

    const dateStr = d.toISOString().split('T')[0];
    const progress = 1 - (i / days);
    let deltaPct = (Math.random() - 0.48) * 2.2;
    let volMultiplier = 0.7 + Math.random() * 0.6;

    if (trendType === 'cup_handle') {
      // Cup left side (0.0 to 0.35) -> drop 18-25%
      if (progress < 0.35) {
        deltaPct = -0.6 + (Math.random() - 0.5) * 1.8;
      }
      // Cup bottom (0.35 to 0.60) -> rounding bottom, low volume
      else if (progress < 0.60) {
        deltaPct = 0.2 + (Math.random() - 0.48) * 1.2;
        volMultiplier *= 0.6; // Volume dry up at bottom
      }
      // Cup right side (0.60 to 0.82) -> rally back to left rim
      else if (progress < 0.82) {
        deltaPct = 0.9 + (Math.random() - 0.4) * 2.0;
        volMultiplier *= 1.4; // Volume expansion on right side
      }
      // Handle (0.82 to 0.95) -> tight gentle drift 5-8% down, low volume
      else if (progress < 0.95) {
        deltaPct = -0.3 + (Math.random() - 0.5) * 1.0;
        volMultiplier *= 0.5; // Classic handle volume contraction
      }
      // Breakout (0.95 to 1.0) -> pivot surge with volume burst
      else {
        deltaPct = 1.8 + (Math.random() - 0.2) * 2.5;
        volMultiplier *= 2.2; // Volume Burst > 50%
      }
    } else if (trendType === 'consolidation_7w') {
      // Prior rally (0 to 0.60)
      if (progress < 0.60) {
        deltaPct = 0.8 + (Math.random() - 0.4) * 2.2;
      }
      // 7-week tight consolidation base (0.60 to 1.0, ~35 sessions)
      else {
        deltaPct = (Math.random() - 0.5) * 1.1; // Very tight range < 8%
        volMultiplier *= (progress > 0.92 ? 1.8 : 0.6); // Volume dry up then breakout
      }
    } else if (trendType === 'strong_momentum') {
      deltaPct = 0.65 + (Math.random() - 0.42) * 2.5;
      if (progress > 0.85) volMultiplier *= 1.8;
    } else {
      deltaPct = (Math.random() - 0.49) * 2.0;
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

export const STOCK_DATABASE = [
  {
    symbol: 'TRENT',
    name: 'Trent Ltd (Westside & Zudio)',
    exchange: 'NSE',
    sector: 'Retail / Consumer Discretionary',
    marketCapCr: 248500,
    currentPrice: 7120.50,
    basePrice: 5200,
    patternType: 'cup_handle',
    salesGrowthQoQ: 56.4,
    salesGrowthYoY: 53.2,
    epsGrowthYoY: 67.8,
    eps3Y_CAGR: 54.2,
    eps5Y_CAGR: 42.8,
    roe: 28.6,
    roce: 31.4,
    debtToEquity: 0.12,
    peRatio: 98.4,
    industryPE: 45.2,
    epsHistory: [18.4, 26.8, 39.5, 62.1, 104.2], // 5 years EPS in INR
    salesHistoryCr: [3490, 4498, 8242, 12375, 17200],
    description: 'High-growth retail powerhouse operating Westside, Zudio, Star Bazaar, and Zara in India. Demonstrating immense EPS acceleration and store expansion.'
  },
  {
    symbol: 'DIXON',
    name: 'Dixon Technologies (India) Ltd',
    exchange: 'NSE',
    sector: 'EMS / Electronics Manufacturing',
    marketCapCr: 88400,
    currentPrice: 14850.00,
    basePrice: 11200,
    patternType: 'cup_handle',
    salesGrowthQoQ: 98.2,
    salesGrowthYoY: 101.4,
    epsGrowthYoY: 82.5,
    eps3Y_CAGR: 46.8,
    eps5Y_CAGR: 38.5,
    roe: 29.4,
    roce: 34.2,
    debtToEquity: 0.18,
    peRatio: 94.6,
    industryPE: 62.0,
    epsHistory: [26.8, 32.5, 43.4, 61.2, 111.6],
    salesHistoryCr: [4400, 6448, 10697, 12192, 23500],
    description: 'Largest Electronic Manufacturing Services (EMS) player in India benefiting heavily from PLI schemes, Mobile phone & TV manufacturing.'
  },
  {
    symbol: 'BEL',
    name: 'Bharat Electronics Ltd',
    exchange: 'NSE',
    sector: 'Defence / Aerospace',
    marketCapCr: 218000,
    currentPrice: 304.50,
    basePrice: 240,
    patternType: 'cup_handle',
    salesGrowthQoQ: 32.1,
    salesGrowthYoY: 28.5,
    epsGrowthYoY: 38.4,
    eps3Y_CAGR: 29.6,
    eps5Y_CAGR: 24.1,
    roe: 26.5,
    roce: 35.8,
    debtToEquity: 0.0,
    peRatio: 48.2,
    industryPE: 52.1,
    epsHistory: [2.8, 3.2, 4.1, 5.4, 7.5],
    salesHistoryCr: [13818, 15044, 17333, 19820, 24600],
    description: 'Navratna defence PSU specializing in advanced radar, electronic warfare, missile systems, and avionics with zero debt.'
  },
  {
    symbol: 'HAL',
    name: 'Hindustan Aeronautics Ltd',
    exchange: 'NSE',
    sector: 'Defence / Aerospace',
    marketCapCr: 312000,
    currentPrice: 4720.00,
    basePrice: 3950,
    patternType: 'consolidation_7w',
    salesGrowthQoQ: 14.8,
    salesGrowthYoY: 18.2,
    epsGrowthYoY: 29.5,
    eps3Y_CAGR: 33.4,
    eps5Y_CAGR: 26.8,
    roe: 29.1,
    roce: 38.5,
    debtToEquity: 0.0,
    peRatio: 38.6,
    industryPE: 52.1,
    epsHistory: [48.5, 76.2, 87.4, 113.8, 147.2],
    salesHistoryCr: [21100, 22755, 24620, 26928, 32100],
    description: 'India’s premier aerospace manufacturer (Tejas fighter aircraft, Prachand & Dhruv helicopters) with a massive multi-year order book.'
  },
  {
    symbol: 'POLYCAB',
    name: 'Polycab India Ltd',
    exchange: 'NSE',
    sector: 'Wires & Cables / FMEG',
    marketCapCr: 104500,
    currentPrice: 6980.00,
    basePrice: 5600,
    patternType: 'cup_handle',
    salesGrowthQoQ: 27.5,
    salesGrowthYoY: 25.1,
    epsGrowthYoY: 34.2,
    eps3Y_CAGR: 36.5,
    eps5Y_CAGR: 28.2,
    roe: 24.8,
    roce: 31.2,
    debtToEquity: 0.05,
    peRatio: 52.4,
    industryPE: 44.0,
    epsHistory: [49.8, 56.4, 85.2, 118.6, 159.2],
    salesHistoryCr: [8985, 12204, 14108, 18039, 21450],
    description: 'Market leader in cables & wires in India gaining market share in Fast Moving Electrical Goods (FMEG) with outstanding cash flows.'
  },
  {
    symbol: 'SOLARINDS',
    name: 'Solar Industries India Ltd',
    exchange: 'NSE',
    sector: 'Defence & Industrial Explosives',
    marketCapCr: 94000,
    currentPrice: 10650.00,
    basePrice: 8500,
    patternType: 'cup_handle',
    salesGrowthQoQ: 29.8,
    salesGrowthYoY: 31.4,
    epsGrowthYoY: 41.2,
    eps3Y_CAGR: 44.1,
    eps5Y_CAGR: 35.6,
    roe: 27.2,
    roce: 32.8,
    debtToEquity: 0.28,
    peRatio: 78.5,
    industryPE: 48.0,
    epsHistory: [31.5, 48.2, 83.1, 108.4, 153.5],
    salesHistoryCr: [2775, 3948, 6923, 6028, 8300],
    description: 'Global leader in industrial explosives and high-energy defence propellants (drones, warheads, rocket propulsion).'
  },
  {
    symbol: 'KAYNES',
    name: 'Kaynes Technology India Ltd',
    exchange: 'NSE',
    sector: 'EMS / Semi-conductors',
    marketCapCr: 36500,
    currentPrice: 5680.00,
    basePrice: 4200,
    patternType: 'cup_handle',
    salesGrowthQoQ: 68.4,
    salesGrowthYoY: 72.1,
    epsGrowthYoY: 79.4,
    eps3Y_CAGR: 62.4,
    eps5Y_CAGR: 48.9,
    roe: 19.8,
    roce: 22.4,
    debtToEquity: 0.14,
    peRatio: 112.0,
    industryPE: 62.0,
    epsHistory: [4.2, 9.8, 18.2, 28.5, 51.0],
    salesHistoryCr: [424, 706, 1126, 1805, 3100],
    description: 'High-end integrated electronics manufacturing specialist venturing into advanced semiconductor OSAT and high-reliability aerospace components.'
  },
  {
    symbol: 'PERSISTENT',
    name: 'Persistent Systems Ltd',
    exchange: 'NSE',
    sector: 'IT - Software / AI Engineering',
    marketCapCr: 84200,
    currentPrice: 5460.00,
    basePrice: 4500,
    patternType: 'consolidation_7w',
    salesGrowthQoQ: 17.2,
    salesGrowthYoY: 19.8,
    epsGrowthYoY: 23.4,
    eps3Y_CAGR: 31.8,
    eps5Y_CAGR: 27.5,
    roe: 25.4,
    roce: 32.1,
    debtToEquity: 0.08,
    peRatio: 58.2,
    industryPE: 34.0,
    epsHistory: [44.6, 60.1, 87.2, 108.5, 134.0],
    salesHistoryCr: [4188, 5711, 8350, 9821, 11800],
    description: 'Top-tier digital engineering and enterprise modernization tech firm delivering consistent double-digit dollar revenue growth.'
  },
  {
    symbol: 'CDSL',
    name: 'Central Depository Services (India) Ltd',
    exchange: 'NSE',
    sector: 'Capital Markets / Financial Infrastructure',
    marketCapCr: 33400,
    currentPrice: 1590.00,
    basePrice: 1250,
    patternType: 'cup_handle',
    salesGrowthQoQ: 48.6,
    salesGrowthYoY: 52.1,
    epsGrowthYoY: 61.3,
    eps3Y_CAGR: 38.2,
    eps5Y_CAGR: 34.5,
    roe: 31.8,
    roce: 42.5,
    debtToEquity: 0.0,
    peRatio: 59.4,
    industryPE: 42.0,
    epsHistory: [7.2, 9.8, 14.2, 19.4, 31.2],
    salesHistoryCr: [284, 388, 555, 681, 1020],
    description: 'India’s leading demat account depository with >120 million registered demat accounts and monopolistic operating leverage.'
  },
  {
    symbol: 'BDL',
    name: 'Bharat Dynamics Ltd',
    exchange: 'NSE',
    sector: 'Defence / Missiles & Torpedoes',
    marketCapCr: 41200,
    currentPrice: 1125.00,
    basePrice: 890,
    patternType: 'consolidation_7w',
    salesGrowthQoQ: 85.0,
    salesGrowthYoY: 62.4,
    epsGrowthYoY: 74.1,
    eps3Y_CAGR: 32.5,
    eps5Y_CAGR: 22.8,
    roe: 18.9,
    roce: 24.6,
    debtToEquity: 0.0,
    peRatio: 64.2,
    industryPE: 52.1,
    epsHistory: [14.1, 16.4, 20.8, 25.1, 38.4],
    salesHistoryCr: [1914, 2817, 2489, 2359, 3600],
    description: 'Sole manufacturer in India for surface-to-air missiles (Akash, Astra, Milan) and heavyweight anti-submarine torpedoes.'
  },
  {
    symbol: 'ZOMATO',
    name: 'Zomato Ltd (Eternal / Blinkit)',
    exchange: 'NSE',
    sector: 'E-Commerce / Quick Commerce',
    marketCapCr: 232000,
    currentPrice: 262.50,
    basePrice: 180,
    patternType: 'strong_momentum',
    salesGrowthQoQ: 68.2,
    salesGrowthYoY: 65.4,
    epsGrowthYoY: 180.0,
    eps3Y_CAGR: 78.5,
    eps5Y_CAGR: 52.0,
    roe: 18.2,
    roce: 20.5,
    debtToEquity: 0.02,
    peRatio: 124.0,
    industryPE: 65.0,
    epsHistory: [-1.2, -0.8, -0.2, 0.4, 2.1],
    salesHistoryCr: [1994, 4192, 7079, 12114, 18500],
    description: 'Dominant food delivery network and ultra-fast growing Quick Commerce leader (Blinkit) experiencing explosive profitability inflection.'
  },
  {
    symbol: 'ANGELONE',
    name: 'Angel One Ltd',
    exchange: 'NSE',
    sector: 'Fintech / Retail Brokerage',
    marketCapCr: 27800,
    currentPrice: 3080.00,
    basePrice: 2450,
    patternType: 'consolidation_7w',
    salesGrowthQoQ: 42.1,
    salesGrowthYoY: 45.8,
    epsGrowthYoY: 38.7,
    eps3Y_CAGR: 44.5,
    eps5Y_CAGR: 49.2,
    roe: 38.4,
    roce: 46.2,
    debtToEquity: 0.45,
    peRatio: 22.8,
    industryPE: 28.5,
    epsHistory: [38.2, 74.8, 107.5, 131.2, 178.4],
    salesHistoryCr: [1291, 2291, 3021, 4272, 5950],
    description: 'Fastest growing digital broker in India with massive retail active client share and stellar return on equity (>38%).'
  },
  {
    symbol: 'TATAELXSI',
    name: 'Tata Elxsi Ltd',
    exchange: 'NSE',
    sector: 'IT / ER&D Design Tech',
    marketCapCr: 45800,
    currentPrice: 7350.00,
    basePrice: 6600,
    patternType: 'consolidation_7w',
    salesGrowthQoQ: 11.2,
    salesGrowthYoY: 13.5,
    epsGrowthYoY: 18.2,
    eps3Y_CAGR: 24.5,
    eps5Y_CAGR: 28.4,
    roe: 32.1,
    roce: 41.5,
    debtToEquity: 0.0,
    peRatio: 56.4,
    industryPE: 38.0,
    epsHistory: [41.2, 59.8, 88.5, 114.2, 130.5],
    salesHistoryCr: [1610, 2470, 3144, 3552, 4120],
    description: 'Design and technology services pioneer for Connected Autonomous Vehicles, Healthcare medtech, and Digital Broadcast OTT.'
  },
  {
    symbol: 'MOTHERSON',
    name: 'Samvardhana Motherson International',
    exchange: 'NSE',
    sector: 'Auto Ancillaries',
    marketCapCr: 128000,
    currentPrice: 188.40,
    basePrice: 145,
    patternType: 'cup_handle',
    salesGrowthQoQ: 21.4,
    salesGrowthYoY: 19.8,
    epsGrowthYoY: 42.1,
    eps3Y_CAGR: 34.2,
    eps5Y_CAGR: 21.5,
    roe: 18.4,
    roce: 21.8,
    debtToEquity: 0.52,
    peRatio: 36.5,
    industryPE: 32.0,
    epsHistory: [1.8, 2.4, 3.2, 4.3, 5.8],
    salesHistoryCr: [57369, 63774, 78700, 98600, 112000],
    description: 'Global automotive components giant supplying electrical wiring, vision systems, and polymer modules to top tier global OEMs.'
  },
  {
    symbol: 'MAZDOCK',
    name: 'Mazagon Dock Shipbuilders Ltd',
    exchange: 'NSE',
    sector: 'Defence / Shipbuilding',
    marketCapCr: 98500,
    currentPrice: 4890.00,
    basePrice: 3800,
    patternType: 'strong_momentum',
    salesGrowthQoQ: 46.2,
    salesGrowthYoY: 51.4,
    epsGrowthYoY: 64.8,
    eps3Y_CAGR: 58.2,
    eps5Y_CAGR: 41.5,
    roe: 36.2,
    roce: 49.5,
    debtToEquity: 0.0,
    peRatio: 42.1,
    industryPE: 48.0,
    epsHistory: [25.4, 32.1, 53.4, 91.2, 138.5],
    salesHistoryCr: [4048, 5733, 7827, 9466, 13100],
    description: 'Premier warship and submarine builder for Indian Navy (Destroyers, Frigates, Scorpene submarines) with debt-free balance sheet.'
  },
  {
    symbol: 'TITAN',
    name: 'Titan Company Ltd',
    exchange: 'NSE',
    sector: 'Consumer Goods / Jewellery',
    marketCapCr: 298000,
    currentPrice: 3350.00,
    basePrice: 3100,
    patternType: 'consolidation_7w',
    salesGrowthQoQ: 16.4,
    salesGrowthYoY: 18.2,
    epsGrowthYoY: 19.8,
    eps3Y_CAGR: 25.4,
    eps5Y_CAGR: 21.2,
    roe: 29.8,
    roce: 36.4,
    debtToEquity: 0.65,
    peRatio: 82.0,
    industryPE: 60.0,
    epsHistory: [11.2, 24.6, 36.8, 41.2, 49.5],
    salesHistoryCr: [21644, 28799, 40575, 51084, 59500],
    description: 'Tata Group powerhouse with dominant market share in organized jewellery (Tanishq, Mia, CaratLane), watches, and Eyewear.'
  },
  {
    symbol: 'PREMIERENE',
    name: 'Premier Energies Ltd',
    exchange: 'BSE/NSE',
    sector: 'Renewable Energy / Solar PV',
    marketCapCr: 46800,
    currentPrice: 1040.00,
    basePrice: 780,
    patternType: 'cup_handle',
    salesGrowthQoQ: 110.5,
    salesGrowthYoY: 124.0,
    epsGrowthYoY: 145.2,
    eps3Y_CAGR: 88.4,
    eps5Y_CAGR: 64.2,
    roe: 34.5,
    roce: 39.8,
    debtToEquity: 0.32,
    peRatio: 48.6,
    industryPE: 55.0,
    epsHistory: [2.1, 4.5, 8.9, 14.8, 28.5],
    salesHistoryCr: [512, 940, 1463, 3143, 5600],
    description: 'Second largest integrated solar cell and solar module manufacturer in India expanding capacity rapidly under DCR guidelines.'
  },
  {
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd',
    exchange: 'NSE',
    sector: 'Conglomerate / Energy & Telecom',
    marketCapCr: 1980000,
    currentPrice: 1290.00,
    basePrice: 1240,
    patternType: 'regular',
    salesGrowthQoQ: 8.4,
    salesGrowthYoY: 9.2,
    epsGrowthYoY: 11.5,
    eps3Y_CAGR: 12.8,
    eps5Y_CAGR: 10.4,
    roe: 9.8,
    roce: 10.5,
    debtToEquity: 0.42,
    peRatio: 26.5,
    industryPE: 22.0,
    epsHistory: [38.5, 42.1, 45.8, 48.9, 52.4],
    salesHistoryCr: [539238, 792756, 976524, 1000122, 1045000],
    description: 'India’s most valuable enterprise spanning Oil-to-Chemicals, Jio Telecom, and Reliance Retail.'
  },
  {
    symbol: 'TCS',
    name: 'Tata Consultancy Services Ltd',
    exchange: 'NSE',
    sector: 'IT - Software',
    marketCapCr: 1480000,
    currentPrice: 4090.00,
    basePrice: 3850,
    patternType: 'regular',
    salesGrowthQoQ: 6.2,
    salesGrowthYoY: 7.4,
    epsGrowthYoY: 10.2,
    eps3Y_CAGR: 11.5,
    eps5Y_CAGR: 12.1,
    roe: 48.5,
    roce: 59.2,
    debtToEquity: 0.0,
    peRatio: 30.2,
    industryPE: 28.0,
    epsHistory: [86.5, 104.2, 115.8, 125.4, 137.6],
    salesHistoryCr: [164177, 191754, 225458, 240893, 258000],
    description: 'World’s premier IT services and consulting powerhouse with industry-leading margins and zero debt.'
  },
  {
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Ltd',
    exchange: 'NSE',
    sector: 'Banking - Private',
    marketCapCr: 1290000,
    currentPrice: 1680.00,
    basePrice: 1590,
    patternType: 'regular',
    salesGrowthQoQ: 14.5,
    salesGrowthYoY: 16.8,
    epsGrowthYoY: 15.2,
    eps3Y_CAGR: 16.8,
    eps5Y_CAGR: 18.2,
    roe: 16.2,
    roce: 17.5,
    debtToEquity: 0.0, // Banks evaluated on RoA/RoE
    peRatio: 19.4,
    industryPE: 18.0,
    epsHistory: [52.1, 62.4, 76.5, 84.2, 94.8],
    salesHistoryCr: [146063, 157851, 192800, 315000, 350000],
    description: 'India’s largest private sector bank with fortress balance sheet and industry-leading asset quality.'
  }
];

// Initialize OHLCV candles for all stocks in database
export function getInitialStockUniverse() {
  return STOCK_DATABASE.map(stock => {
    const candles = generateCandles(stock.basePrice, stock.patternType, 160);
    return {
      ...stock,
      candles,
      closes: candles.map(c => c.close),
      volumes: candles.map(c => c.volume)
    };
  });
}
