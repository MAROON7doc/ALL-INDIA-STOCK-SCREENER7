# 🚀 Universal Indian Stock Screener & Super Screener (NSE / BSE)

An institutional-grade, quantitative stock screening and equity research platform tailored for Indian equities (**NSE & BSE**) implementing CANSLIM growth criteria, Moat & Corporate Governance Intelligence, Dynamic Momentum Ranking (DMR), Smart Money Concepts (SMC), SEBI PIT Insider Trading Disclosures, and multi-timeframe GPU candlestick analytics.

🌐 **Live GitHub Pages Web App**: [https://maroon7doc.github.io/BSE-NSE-STOCK-screener/](https://maroon7doc.github.io/BSE-NSE-STOCK-screener/)

![NSE/BSE Screener](https://img.shields.io/badge/Exchange-NSE%20%7C%20BSE-0284c7?style=for-the-badge)
![Protocols](https://img.shields.io/badge/CANSLIM%20Protocols-10%20Rules-10b981?style=for-the-badge)
![Profiles](https://img.shields.io/badge/Investor%20Profiles-7%20Modes-8b5cf6?style=for-the-badge)
![Patterns](https://img.shields.io/badge/Patterns-Cup%20%26%20Handle%20%7C%207W%20Base%20%7C%20NR4%2FNR7-f59e0b?style=for-the-badge)

---

## ⚡ Universal Indian Screener Modules

### 1. 🎯 7 Universal Investor Profiles
- **Conservative Compounder**: ROCE $\ge 25\%$, Low Debt ($D/E \le 0.25$), $CFO/PAT \ge 0.90$.
- **Multibagger Hunter**: Sales YoY $> 25\%$, 3Y EPS CAGR $> 30\%$, Moat Score $\ge 8.0/10$.
- **GARP (Growth at Reasonable Price)**: $PEG \le 1.6$, ROCE $\ge 20\%$.
- **Deep Value / Cash Rich**: FCF Yield $\ge 3.0\%$ or P/E $\le 45\text{x}$.
- **Dividend & Cash Flow**: FCF Yield $\ge 2.5\%$, Conservative Balance Sheet.
- **Momentum Leader (DMR Decile 9–10)**: DMR Decile $\ge 9$, Mansfield RS $\ge 85$.
- **Special Situations / Turnaround**: De-leveraging balance sheets with cash conversion inflection.

### 2. 🏰 Moat & Governance Intelligence (0–10 Scoring)
- **Moat Scoring (0–10)**: Pricing power, switching costs, distribution scale, and brand elasticity.
- **Governance Scoring (0–10)**: Big-4 statutory audits, promoter integrity, capital allocation, and zero pledge verification.
- **Forensic Red-Flag Meter (0–100)**: Quantitative accounting audit and governance safety categorization.

### 3. 📜 Dynamic Equity Research Thesis & Risks
- **Investment Thesis**: Live contextual research thesis for each tracked instrument.
- **Upcoming Catalysts**: Order book pipeline, PLI disbursements, capacity additions.
- **Bear-Case Invalidation Risks**: Specific downside triggers (SSSG drop, raw material spikes, OEM in-sourcing).
- **Cash Flow Quality**: Live $CFO/PAT$ ratio, Free Cash Flow Yield %, PEG Ratio, and Working Capital Days.

### 4. ⚡ Real-Time Intraday & Technical Engine
- **Live Volume Shockers (`⚡ 3.4x`)**: Intraday volume surge detection relative to 10-day time-adjusted moving average.
- **Narrow Range Contraction (`🎯 NR4`, `🎯 NR7`, Inside Day)**: Volatility squeeze detection.
- **Smart Money Concepts (SMC)**: Demand/Supply Order Blocks, Point of Control (POC), Value Area High/Low.
- **SEBI PIT Reg 7(2) Insider Trading Log**: Direct disclosure tracking for promoter buys $> ₹10\text{ Lakhs}$.

### 5. 📊 Unlimited Broker-Ready CSV Export
- Enriched with all **33 institutional fields** including ISIN codes, NSE series, BSE scrip codes, Moat scores, Quality scores, Governance ratings, CFO/PAT ratios, FCF yield, PEG ratios, and thesis summaries.

---

## 🚀 Live Deployment & How to Run

### Option 1: Live Cloud URL (GitHub Pages)
Access the live application directly in your browser:
👉 **[https://maroon7doc.github.io/BSE-NSE-STOCK-screener/](https://maroon7doc.github.io/BSE-NSE-STOCK-screener/)**

### Option 2: Local Windows Execution
Double-click `run_live_screener.bat` or open `index.html` directly in your browser:

```powershell
Start-Process "index.html"
```

---

## 📁 Project Structure

```
BSE-NSE-STOCK-screener/
├── .github/workflows/
│   └── deploy.yml           # Automated GitHub Pages CI/CD workflow
├── index.html               # Main interactive Super Screener UI
├── chart.html               # Standalone TradingView-grade interactive chart view
├── css/
│   └── styles.css           # Institutional financial terminal styling
├── js/
│   └── screener.bundle.js   # Unified high-performance JavaScript engine
├── run_live_screener.bat    # 1-Click launcher for local execution
├── debug_test_suite.ps1     # Automated diagnostic test suite
├── test_error_scan.ps1      # Static analysis & error scanner
├── test_engine_math.ps1     # Quantitative math & edge-case test suite
└── README.md                # Platform documentation
```

---

## 📜 Regulatory Disclaimer
This application is designed for educational, analytical, and quantitative screening purposes in accordance with SEBI guidelines. Algorithmic parameters do not constitute SEBI-registered investment advisory or financial recommendations.

