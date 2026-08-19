# 🚀 Universal Indian Stock Screener (NSE / BSE)

[![Deploy Universal Indian Stock Screener to GitHub Pages](https://github.com/MAROON7doc/ALL-INDIA-STOCK-SCREENER7/actions/workflows/deploy.yml/badge.svg)](https://github.com/MAROON7doc/ALL-INDIA-STOCK-SCREENER7/actions/workflows/deploy.yml)
![Exchange](https://img.shields.io/badge/Exchange-NSE%20%7C%20BSE-0284c7?style=for-the-badge)
![Android Mobile](https://img.shields.io/badge/Android-Native%20WebView-10b981?style=for-the-badge&logo=android)
![Screener Hub](https://img.shields.io/badge/TradeOne-Pure%20Screener%20Engine-8b5cf6?style=for-the-badge)

An institutional-grade, quantitative stock screening and equity research platform tailored for Indian equities (**NSE & BSE**) implementing multi-factor composite scoring, CANSLIM growth criteria, 6-dimension real-time filtering, Market Heatmap treemaps, FinDesk portfolio analytics, Sector Deep-Dive matrix, and a dedicated Android Mobile WebView experience.

---

### 🌐 Live Platform Access Links

| Platform Version | Live Direct Link | Description |
| :--- | :--- | :--- |
| 🖥️ **Full Desktop Terminal** | [**Open Desktop Terminal**](https://maroon7doc.github.io/ALL-INDIA-STOCK-SCREENER7/) | High-Throughput TradeOne Super-Hub with 12 Universal Equities, Heatmap, Portfolio & Sectors |
| 📱 **Android Mobile View** | [**Open Mobile View**](https://maroon7doc.github.io/ALL-INDIA-STOCK-SCREENER7/mobile.html) | Native touch-optimized mobile trading station with swipe navigation & stock cards |

---

## ⚡ Core Features & Modules

### 1. 🎛️ High-Throughput Screener Hub (`index.html` & `mobile.html`)
- **6 Factor Dimensions**: Valuation (P/E, PEG, FCF), Growth (Sales YoY, PAT CAGR), Quality (ROCE, ROE, OPM, Piotroski 0-9), Solvency (D/E, Interest Coverage, Current Ratio, Stop Loss %), Ownership (Promoter %, FII %, DII %, Insider Buys), and Technicals (Mansfield RS, RSI, Volume Burst, 50/200 DMA, MTF Green).
- **Strategy Presets Ribbon**: 1-Click activation for CANSLIM, Quality Compounders, Deep Value, Momentum Breakouts, Institutional Stake, Volume Shockers, and Multibaggers.
- **Dynamic Table Views**: Overview, Valuation, Growth, Quality, Solvency, Ownership, and Technicals with instant column sorting.
- **Stock Detail Modal**: Multi-tab deep dive with Factor Scores Radar, Financial Matrix, Equity Thesis, Catalysts & Risks, and Position Sizing Calculator.

### 2. 🗺️ Market Heatmap Treemap
- Real-time sector clusters color-coded by day change % with top gainers and losers leaderboards.

### 3. 💼 FinDesk Portfolio Analytics
- 2D Canvas Performance Curve comparing Portfolio Return against NIFTY 50 benchmark across 1D/1W/1M/1Y/ALL timeframes with asset allocation donut and holdings ledger.

### 4. 🌐 Sector Deep-Dive Analysis
- 2D Relative Strength vs Momentum Quadrant Scatter Matrix with speedometer sentiment gauge.

### 5. 📱 Android & Mobile WebView Client (`mobile.html`)
- Native touch-optimized bottom navigation switching across TradeOne Screener Cards, Market Heatmap, Portfolio Holdings, Sector Intelligence, CANSLIM Protocols, and Scalper Terminal.

---

## 📁 Repository Structure

```
ALL-INDIA-STOCK-SCREENER7/
├── index.html                  # Master Web Application (Desktop & Tablet Terminal)
├── mobile.html                 # Dedicated Android Mobile Web Client
├── css/
│   └── styles.css              # Universal High-Contrast Institutional Dark Theme
├── js/
│   └── screener.bundle.js      # Unified Client Application Engine (Dual-Mode)
├── backend/                    # Optional Backend Server Scaffolding (Local/Proxy API)
│   ├── server.ps1              # Native .NET REST API Server (Zero external dependencies)
│   ├── python/
│   │   ├── api_server.py       # Python REST API Server
│   │   ├── screener.py         # CLI Screening Engine with Rich UI
│   │   ├── patterns.py         # Technical Pattern Recognition Logic
│   │   └── requirements.txt    # Python Requirements
│   └── node/
│       ├── server.js           # Node.js REST API Server
│       └── package.json        # NPM Package Manifest
├── tools/
│   ├── debug_test_suite.ps1    # Automated Diagnostic & Static Analysis Test Suite
│   └── audit_all_controls.ps1  # Interactive Control Binding Verifier
├── start_server.bat            # 1-Click Local Server Launcher
├── server.ps1                  # Root Convenience Server Launcher
├── .gitignore                  # Git Ignore Specifications
└── README.md                   # Platform Documentation
```

---

## 🔒 Security & Architecture Notes

- **Zero-Leak Authentication**: Broker authentication (e.g. Angel One SmartAPI) requires direct JWT session tokens or a private local backend server. Plaintext passwords and credentials are **strictly forbidden from routing through public third-party proxies** (such as CORS proxies).
- **Session Token Expiry**: Client-stored tokens in `localStorage` are gated with a strict 12-hour expiration window and cleared upon session termination.
- **XSS Sanitization**: Dynamic data interpolations across tables, modals, and tooltips are sanitized with `escapeHtml()`.
- **Dual-Mode Discovery**: The frontend automatically detects local backend server availability (`/api/health`), switching between `🟢 BACKEND API CONNECTED` (local server) and `🌐 CLOUD BROWSER ENGINE` (GitHub Pages standalone).
- **Data Provenance**: Clear UI indicators distinguish between live API streaming and baseline/simulated quantitative models.

---

## 🚀 Running Locally

### 1-Click Launch (Windows)
Double-click `start_server.bat` to launch the native .NET REST API server and open the web app in your default browser at `http://localhost:8080/`.

### Automated Diagnostic Test
Run the diagnostic suite anytime to verify syntax, DOM bindings, and data integrity:
```powershell
powershell -ExecutionPolicy Bypass -File .\tools\debug_test_suite.ps1
```
