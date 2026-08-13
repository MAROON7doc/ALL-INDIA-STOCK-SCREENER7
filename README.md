# 🚀 NSE/BSE Quantitative Stock Screener

An advanced, quantitative stock screening platform tailored for Indian equities (**NSE & BSE**) implementing CANSLIM growth criteria, William O'Neil pattern recognition, and risk management protocols.

![NSE/BSE Screener](https://img.shields.io/badge/Exchange-NSE%20%7C%20BSE-0284c7?style=for-the-badge)
![Protocols](https://img.shields.io/badge/Protocols-9%20Rules-10b981?style=for-the-badge)
![Patterns](https://img.shields.io/badge/Patterns-Cup%20%26%20Handle%20%7C%207W%20Base-f59e0b?style=for-the-badge)

---

## ⚡ 9 Quantitative Protocols & Mathematical Logic

| # | Protocol | Description & Formula | Default Threshold |
|---|---|---|---|
| **1** | **EPS & Sales YoY Growth** | Evaluates quarterly earnings and top-line sales acceleration. | $\text{Sales YoY} \ge 15\%$, $\text{EPS YoY} \ge 15\%$ |
| **2** | **RSI Momentum** | 14-period standard Wilder's Relative Strength Index to identify institutional momentum. | $\text{RSI}(14) \ge 70-80$ |
| **3** | **Volume Burst** | Institutional accumulation spike compared against 20-day Simple Moving Average volume. | $\text{Volume} \ge 1.5 \times \text{SMA}_{20}(\text{Volume})$ ($+50\%$ surge) |
| **4** | **7-Week Consolidation** | Identifies tight price base formation over 7-8 weeks (35-40 sessions) with Volatility Contraction (VCP). | $\text{Range} = \frac{\text{High} - \text{Low}}{\text{Low}} \le 15\%$ |
| **5** | **Cup with Handle Pattern** | Algorithmic detection of Left Rim Peak $\rightarrow$ Rounded U-Bottom (12-35% depth) $\rightarrow$ Right Rim Recovery $\rightarrow$ Handle pullback (5-12% drift with volume dry-up). | Automated Pattern Recognition Score $\ge 70$ |
| **6** | **% Stop Loss Risk Filter** | Calculates dynamic stop loss based on handle low / base low or default $7\%$ with exact position sizing. | $\text{Stop Loss} \le 8\%$ below entry |
| **7** | **ROE & ROCE** | Capital efficiency filters measuring Return on Equity and Return on Capital Employed. | $\text{ROE} \ge 17\% \text{ or } \text{ROCE} \ge 17\%$ |
| **8** | **EPS >> Last 3-5 Years** | Multi-year earnings compounding trajectory over 3-year and 5-year horizons. | $3\text{Y EPS CAGR} \ge 20\%$, $5\text{Y EPS CAGR} \ge 15\%$ |
| **9** | **Mansfield RS Score** | 12-month weighted price performance relative to the **NIFTY 50** benchmark, percentiled from 1 to 99. | $\text{RS Score} \ge 80$ (Top 20% of market) |

---

## 🖥️ Web Screener Features

- **Interactive Candlestick & Pattern Visualizer**:
  - Live HTML5 Canvas candlestick chart with annotated Cup & Handle curves, handle pullback channels, pivot breakout levels, stop-loss markers, and target levels.
  - 7-Week Consolidation base bounding boxes.
  - Interactive crosshair and OHLCV tooltip data.
- **Dynamic Multi-Protocol Filters & Presets**:
  - 1-Click presets: *User Master Protocol (All 9)*, *Cup & Handle Breakouts*, *7-Week Tight Bases*, *High RS Momentum*, *Fundamental Growth Leaders*.
  - Real-time sliders and switches with live updating results.
- **Risk Management & Position Sizing Calculator**:
  - Automatically calculates exact share quantity to purchase based on account capital, risk percentage (e.g. 1%), entry price, and stop loss.
  - Outputs 1:1, 1:2, and 1:3 Risk-to-Reward profit targets.
- **Data Export & Workflow Integration**:
  - 1-Click **Export to CSV** for custom analysis.
  - **Copy Tickers** formatted for instant pasting into TradingView, Zerodha Kite, or Chartink watchlists.

---

## 🚀 How to Run the Web Application

Simply open `index.html` in any modern web browser (Brave, Chrome, Edge, Firefox):

```powershell
# Open directly in Windows default browser
Start-Process "index.html"
```

Or serve via any static HTTP server:
```bash
# Using Python (if installed)
python -m http.server 8000

# Using Node (if installed)
npx serve .
```

---

## 🐍 Python CLI Screener (Optional Backend)

If you have Python installed, you can also run the terminal-based screener:

```bash
cd python
pip install -r requirements.txt
python screener.py
```

---

## 📁 Project Directory Structure

```
BSE-NSE-STOCK-screener/
├── index.html               # Main interactive Web Screener UI
├── css/
│   └── styles.css           # High-performance dark financial terminal styling
├── js/
│   ├── data.js              # NSE/BSE stocks database, company fundamentals & historical OHLCV data
│   ├── indicators.js        # Mathematical formulas: RSI, Volume burst, RS rating, CwH, 7W base, SL
│   ├── scanner.js           # Multi-protocol filtering and ranking engine
│   ├── chart.js             # Canvas Candlestick Chart with Pattern Annotations
│   └── app.js               # Application orchestrator, modal handlers, tabs, calculator & CSV export
├── python/
│   ├── screener.py          # Python CLI Screener using yfinance & rich tables
│   ├── patterns.py          # Python pattern recognition algorithms
│   └── requirements.txt     # Python dependencies
└── README.md                # Comprehensive documentation
```

---

## 📜 License
MIT License. Built for algorithmic and quantitative traders in Indian stock markets.
