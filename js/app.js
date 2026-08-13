/**
 * Main Application Orchestrator
 * Connects UI, Filter Engine, Candlestick Chart Visualizer, and Position Sizing Calculator.
 */

import { getInitialStockUniverse } from './data.js';
import { StockScanner } from './scanner.js';
import { StockChart } from './chart.js';
import { Indicators } from './indicators.js';

class App {
  constructor() {
    this.rawUniverse = getInitialStockUniverse();
    this.scanner = new StockScanner(this.rawUniverse);
    this.chart = null;
    this.currentStock = null;
    this.activePreset = 'user_master';

    this.filters = {
      searchTerm: '',
      exchange: 'ALL',
      sector: 'ALL',
      sortBy: 'matchCount',
      sortDir: 'desc',
      // Protocols
      requireGrowth: true,
      minSalesGrowth: 15,
      minEpsGrowth: 15,
      requireRsi: true,
      minRsi: 70,
      requireVolumeBurst: true,
      minBurstPct: 50,
      require7WeekConsolidation: false,
      maxConsolidationRange: 15,
      requireCupWithHandle: false,
      requireStopLossLimit: true,
      maxStopLossPct: 8.0,
      requireRoeRoce: true,
      minRoe: 17,
      minRoce: 17,
      requireEpsCAGR: true,
      minEps3YCAGR: 20,
      requireRsScore: true,
      minRsScore: 80
    };

    this.init();
  }

  init() {
    this.chart = new StockChart('canvasContainer');
    this.bindEvents();
    this.applyPreset('user_master');
    this.runScan();
  }

  bindEvents() {
    // Range Slider value bindings
    this.bindSlider('rng_salesGrowth', 'val_salesGrowth', (v) => `${v}%`, (v) => { this.filters.minSalesGrowth = v; this.runScan(); });
    this.bindSlider('rng_epsGrowth', 'val_epsGrowth', (v) => `${v}%`, (v) => { this.filters.minEpsGrowth = v; this.runScan(); });
    this.bindSlider('rng_rsi', 'val_rsi', (v) => `${v}`, (v) => { this.filters.minRsi = v; this.runScan(); });
    this.bindSlider('rng_volumeBurst', 'val_volumeBurst', (v) => `+${v}%`, (v) => { this.filters.minBurstPct = v; this.runScan(); });
    this.bindSlider('rng_consolidationRange', 'val_consolidationRange', (v) => `≤ ${v}%`, (v) => { this.filters.maxConsolidationRange = v; this.runScan(); });
    this.bindSlider('rng_maxStopLoss', 'val_maxStopLoss', (v) => `≤ ${v}%`, (v) => { this.filters.maxStopLossPct = v; this.runScan(); });
    this.bindSlider('rng_roe', 'val_roe', (v) => `${v}%`, (v) => { this.filters.minRoe = v; this.filters.minRoce = v; this.runScan(); });
    this.bindSlider('rng_epsCAGR', 'val_epsCAGR', (v) => `${v}%`, (v) => { this.filters.minEps3YCAGR = v; this.runScan(); });
    this.bindSlider('rng_rsScore', 'val_rsScore', (v) => `${v}`, (v) => { this.filters.minRsScore = v; this.runScan(); });

    // Checkbox switches bindings
    this.bindCheckbox('chk_p1', 'card_p1', (checked) => { this.filters.requireGrowth = checked; this.runScan(); });
    this.bindCheckbox('chk_p2', 'card_p2', (checked) => { this.filters.requireRsi = checked; this.runScan(); });
    this.bindCheckbox('chk_p3', 'card_p3', (checked) => { this.filters.requireVolumeBurst = checked; this.runScan(); });
    this.bindCheckbox('chk_p4', 'card_p4', (checked) => { this.filters.require7WeekConsolidation = checked; this.runScan(); });
    this.bindCheckbox('chk_p5', 'card_p5', (checked) => { this.filters.requireCupWithHandle = checked; this.runScan(); });
    this.bindCheckbox('chk_p6', 'card_p6', (checked) => { this.filters.requireStopLossLimit = checked; this.runScan(); });
    this.bindCheckbox('chk_p7', 'card_p7', (checked) => { this.filters.requireRoeRoce = checked; this.runScan(); });
    this.bindCheckbox('chk_p8', 'card_p8', (checked) => { this.filters.requireEpsCAGR = checked; this.runScan(); });
    this.bindCheckbox('chk_p9', 'card_p9', (checked) => { this.filters.requireRsScore = checked; this.runScan(); });

    // Search and Selects
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

    // Preset Chips
    document.querySelectorAll('.preset-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.applyPreset(chip.dataset.preset);
        this.runScan();
      });
    });

    // Action Buttons
    document.getElementById('btnResetFilters')?.addEventListener('click', () => {
      this.applyPreset('all');
      this.runScan();
    });

    document.getElementById('btnRunScan')?.addEventListener('click', () => {
      this.runScan();
    });

    document.getElementById('btnExportCsv')?.addEventListener('click', () => {
      this.exportToCSV();
    });

    document.getElementById('btnCopyTickers')?.addEventListener('click', () => {
      this.copyTickers();
    });

    // Modal controls
    document.getElementById('btnCloseModal')?.addEventListener('click', () => {
      this.closeModal();
    });

    document.getElementById('stockModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'stockModal') this.closeModal();
    });

    // Modal Tabs
    document.querySelectorAll('.modal-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const tabName = tab.dataset.tab;
        document.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');
        const activeContent = document.getElementById(`tab_${tabName}`);
        if (activeContent) activeContent.style.display = 'block';

        if (tabName === 'chart' && this.chart) {
          setTimeout(() => this.chart.resize(), 50);
        }
      });
    });

    // Chart Range Buttons
    document.querySelectorAll('.range-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('btn-primary'));
        btn.classList.add('btn-primary');
        if (this.chart) this.chart.setRange(btn.dataset.range);
      });
    });

    // Calculator inputs dynamic update
    ['calcCapital', 'calcRiskPct', 'calcEntryPrice', 'calcStopLossPrice'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', () => this.updateCalculator());
    });
  }

  bindSlider(sliderId, valPillId, formatFn, onUpdate) {
    const slider = document.getElementById(sliderId);
    const pill = document.getElementById(valPillId);
    if (!slider || !pill) return;
    slider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      pill.textContent = formatFn(val);
      onUpdate(val);
    });
  }

  bindCheckbox(chkId, cardId, onUpdate) {
    const chk = document.getElementById(chkId);
    const card = document.getElementById(cardId);
    if (!chk || !card) return;
    chk.addEventListener('change', (e) => {
      if (e.target.checked) card.classList.add('active');
      else card.classList.remove('active');
      onUpdate(e.target.checked);
    });
  }

  applyPreset(presetKey) {
    this.activePreset = presetKey;
    const setChk = (id, checked) => {
      const el = document.getElementById(id);
      if (el) {
        el.checked = checked;
        const cardId = id.replace('chk_', 'card_');
        const card = document.getElementById(cardId);
        if (card) {
          if (checked) card.classList.add('active');
          else card.classList.remove('active');
        }
      }
    };

    if (presetKey === 'user_master') {
      // User's master protocol with all 9 criteria
      this.filters.requireGrowth = true;
      this.filters.requireRsi = true;
      this.filters.minRsi = 70; // High RSI momentum zone
      this.filters.requireVolumeBurst = true;
      this.filters.minBurstPct = 40;
      this.filters.require7WeekConsolidation = false; // Optional base
      this.filters.requireCupWithHandle = false;
      this.filters.requireStopLossLimit = true;
      this.filters.maxStopLossPct = 8.0;
      this.filters.requireRoeRoce = true;
      this.filters.minRoe = 17;
      this.filters.requireEpsCAGR = true;
      this.filters.minEps3YCAGR = 20;
      this.filters.requireRsScore = true;
      this.filters.minRsScore = 80;

      setChk('chk_p1', true);
      setChk('chk_p2', true);
      setChk('chk_p3', true);
      setChk('chk_p4', false);
      setChk('chk_p5', false);
      setChk('chk_p6', true);
      setChk('chk_p7', true);
      setChk('chk_p8', true);
      setChk('chk_p9', true);
    } else if (presetKey === 'cup_handle') {
      this.filters.requireGrowth = true;
      this.filters.requireCupWithHandle = true;
      this.filters.require7WeekConsolidation = false;
      this.filters.requireRsi = false;
      this.filters.requireVolumeBurst = false;
      this.filters.requireRsScore = true;
      this.filters.minRsScore = 75;

      setChk('chk_p1', true);
      setChk('chk_p2', false);
      setChk('chk_p3', false);
      setChk('chk_p4', false);
      setChk('chk_p5', true);
      setChk('chk_p6', true);
      setChk('chk_p7', true);
      setChk('chk_p8', false);
      setChk('chk_p9', true);
    } else if (presetKey === 'consolidation_7w') {
      this.filters.require7WeekConsolidation = true;
      this.filters.requireCupWithHandle = false;
      this.filters.requireGrowth = true;
      this.filters.requireRsi = false;
      this.filters.requireVolumeBurst = false;
      this.filters.requireRsScore = true;

      setChk('chk_p1', true);
      setChk('chk_p2', false);
      setChk('chk_p3', false);
      setChk('chk_p4', true);
      setChk('chk_p5', false);
      setChk('chk_p6', true);
      setChk('chk_p7', false);
      setChk('chk_p8', false);
      setChk('chk_p9', true);
    } else if (presetKey === 'high_rs_rsi') {
      this.filters.requireRsScore = true;
      this.filters.minRsScore = 80;
      this.filters.requireRsi = true;
      this.filters.minRsi = 70;
      this.filters.requireVolumeBurst = true;
      this.filters.requireCupWithHandle = false;
      this.filters.require7WeekConsolidation = false;

      setChk('chk_p1', false);
      setChk('chk_p2', true);
      setChk('chk_p3', true);
      setChk('chk_p4', false);
      setChk('chk_p5', false);
      setChk('chk_p6', false);
      setChk('chk_p7', false);
      setChk('chk_p8', false);
      setChk('chk_p9', true);
    } else if (presetKey === 'fundamental_growth') {
      this.filters.requireGrowth = true;
      this.filters.requireRoeRoce = true;
      this.filters.requireEpsCAGR = true;
      this.filters.requireRsScore = false;
      this.filters.requireRsi = false;
      this.filters.requireVolumeBurst = false;
      this.filters.requireCupWithHandle = false;
      this.filters.require7WeekConsolidation = false;

      setChk('chk_p1', true);
      setChk('chk_p2', false);
      setChk('chk_p3', false);
      setChk('chk_p4', false);
      setChk('chk_p5', false);
      setChk('chk_p6', false);
      setChk('chk_p7', true);
      setChk('chk_p8', true);
      setChk('chk_p9', false);
    } else if (presetKey === 'all') {
      // Turn all off to inspect universe
      ['chk_p1','chk_p2','chk_p3','chk_p4','chk_p5','chk_p6','chk_p7','chk_p8','chk_p9'].forEach(id => {
        setChk(id, false);
      });
      this.filters.requireGrowth = false;
      this.filters.requireRsi = false;
      this.filters.requireVolumeBurst = false;
      this.filters.require7WeekConsolidation = false;
      this.filters.requireCupWithHandle = false;
      this.filters.requireStopLossLimit = false;
      this.filters.requireRoeRoce = false;
      this.filters.requireEpsCAGR = false;
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
    const totalMatching = stocks.length;
    const cupCount = stocks.filter(s => s.cupWithHandle.isPattern).length;
    const w7Count = stocks.filter(s => s.consolidation7W.isConsolidating).length;
    const avgRs = totalMatching > 0 ? Math.round(stocks.reduce((a, b) => a + b.rsScore, 0) / totalMatching) : 0;

    document.getElementById('statMatchingCount').textContent = totalMatching;
    document.getElementById('statMatchingSub').textContent = `Scanned universe: ${this.rawUniverse.length}`;
    document.getElementById('statCupCount').textContent = cupCount;
    document.getElementById('stat7wCount').textContent = w7Count;
    document.getElementById('statAvgRs').textContent = avgRs;
  }

  renderTable(stocks) {
    const tbody = document.getElementById('screenerTableBody');
    if (!tbody) return;

    if (stocks.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="13" style="text-align:center; padding:32px; color:var(--text-muted);">
            No stocks matched all active protocols. Try relaxing some filters or selecting the <strong>View All</strong> preset.
          </td>
        </tr>
      `;
      return;
    }

    let html = '';
    stocks.forEach(stock => {
      const matchScoreClass = stock.matchCount >= 7 ? 'match-high' : (stock.matchCount >= 4 ? 'match-med' : 'match-low');
      const dayChgClass = stock.dayChangePct >= 0 ? 'color:var(--accent-green);' : 'color:var(--accent-red);';
      const daySign = stock.dayChangePct > 0 ? '+' : '';

      // Pattern label
      let patternBadge = `<span style="color:var(--text-muted); font-size:11px;">Consolidating</span>`;
      if (stock.cupWithHandle.isPattern) {
        patternBadge = `<span class="tag tag-cwh" title="Cup & Handle Score: ${stock.cupWithHandle.score}">☕ Cup & Handle (${stock.cupWithHandle.score})</span>`;
      } else if (stock.consolidation7W.isConsolidating) {
        patternBadge = `<span class="tag tag-7w" title="7-Week Base Range: ${stock.consolidation7W.rangePct}%">🧱 7W Base (${stock.consolidation7W.rangePct}%)</span>`;
      }

      // Volume burst badge
      const volBurstDisplay = stock.volumeBurst.burstPct > 0 
        ? `<span style="color:var(--accent-amber); font-weight:600;">+${stock.volumeBurst.burstPct}%</span>`
        : `<span style="color:var(--text-muted);">${stock.volumeBurst.ratio}x</span>`;

      html += `
        <tr>
          <td>
            <div class="stock-cell">
              <span class="stock-symbol">${stock.symbol}</span>
              <span class="stock-name">${stock.name}</span>
            </div>
          </td>
          <td>
            <div class="price-num">₹${stock.ltp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            <div style="font-size:11px; ${dayChgClass}">${daySign}${stock.dayChangePct}%</div>
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
            <span class="match-score-badge ${matchScoreClass}">
              ${stock.matchCount}/9
            </span>
          </td>
          <td>
            <button class="btn btn-primary btn-sm btn-analyze" data-symbol="${stock.symbol}">
              Analyze Chart
            </button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;

    // Attach click listeners to analyze buttons
    tbody.querySelectorAll('.btn-analyze').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const symbol = btn.dataset.symbol;
        const stock = this.rawUniverse.find(s => s.symbol === symbol) || stocks.find(s => s.symbol === symbol);
        if (stock) this.openModal(stock);
      });
    });
  }

  openModal(stock) {
    this.currentStock = stock;
    const modal = document.getElementById('stockModal');
    if (!modal) return;

    // Header info
    document.getElementById('modalStockSymbol').textContent = stock.symbol;
    document.getElementById('modalStockName').textContent = stock.name;
    document.getElementById('modalLTP').textContent = `₹${stock.ltp ? stock.ltp.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : stock.currentPrice}`;
    document.getElementById('modalDayChg').textContent = `${stock.dayChangePct > 0 ? '+' : ''}${stock.dayChangePct}%`;
    document.getElementById('modalExchangeTag').textContent = stock.exchange;

    const patternTag = document.getElementById('modalPatternTag');
    if (stock.cupWithHandle.isPattern) {
      patternTag.textContent = `☕ Cup & Handle (Score: ${stock.cupWithHandle.score})`;
      patternTag.className = 'tag tag-cwh';
    } else if (stock.consolidation7W.isConsolidating) {
      patternTag.textContent = `🧱 7-Week Consolidation (${stock.consolidation7W.rangePct}% range)`;
      patternTag.className = 'tag tag-7w';
    } else {
      patternTag.textContent = 'High RS Leader';
      patternTag.className = 'tag';
    }

    // Chart tab
    document.getElementById('chartPatternSummary').textContent = stock.cupWithHandle.isPattern
      ? `Annotated: Cup with Handle (Cup Depth: -${stock.cupWithHandle.cupDepthPct}%, Pivot: ₹${stock.cupWithHandle.pivotPrice}, Target: ₹${stock.cupWithHandle.targetPrice})`
      : (stock.consolidation7W.isConsolidating
          ? `Annotated: 7-Week Consolidation Box (Base High: ₹${stock.consolidation7W.baseHigh}, Base Low: ₹${stock.consolidation7W.baseLow})`
          : `Annotated: Candlestick Price Action with Volume Bursts & 20-Day Moving Average`);

    // Fundamentals tab
    document.getElementById('fundSalesYoY').textContent = `+${stock.salesGrowthYoY}%`;
    document.getElementById('fundEpsYoY').textContent = `+${stock.epsGrowthYoY}%`;
    document.getElementById('fundEps3Y').textContent = `+${stock.eps3Y_CAGR}%`;
    document.getElementById('fundEps5Y').textContent = `+${stock.eps5Y_CAGR}%`;
    document.getElementById('fundRoe').textContent = `${stock.roe}%`;
    document.getElementById('fundRoce').textContent = `${stock.roce}%`;
    document.getElementById('fundDebt').textContent = `${stock.debtToEquity}`;
    document.getElementById('fundPE').textContent = `${stock.peRatio} / ${stock.industryPE}`;

    // EPS 5-Year History Bars
    const barWrap = document.getElementById('epsHistoryBar');
    if (barWrap && stock.epsHistory) {
      const maxVal = Math.max(...stock.epsHistory, 10);
      const currentYear = new Date().getFullYear();
      let barHtml = '';
      stock.epsHistory.forEach((val, i) => {
        const yr = currentYear - (stock.epsHistory.length - 1 - i);
        const hPct = Math.max(10, Math.round((val / maxVal) * 80));
        barHtml += `
          <div style="display:flex; flex-direction:column; align-items:center; flex:1;">
            <div style="font-size:11px; font-family:var(--font-mono); font-weight:600; color:var(--accent-blue); margin-bottom:4px;">₹${val}</div>
            <div style="width:100%; height:${hPct}px; background:linear-gradient(180deg, #38bdf8, #0284c7); border-radius:4px 4px 0 0;"></div>
            <div style="font-size:10.5px; color:var(--text-muted); margin-top:6px;">FY${yr % 100}</div>
          </div>
        `;
      });
      barWrap.innerHTML = barHtml;
    }

    // Company Description & Checklist
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

    // Initialize Calculator fields with stock prices
    const entry = stock.ltp || stock.currentPrice;
    const sl = stock.recommendedSL || (entry * 0.93);
    document.getElementById('calcEntryPrice').value = entry;
    document.getElementById('calcStopLossPrice').value = sl;
    this.updateCalculator();

    // Show modal and render chart
    modal.classList.add('active');
    setTimeout(() => {
      if (this.chart) {
        this.chart.setStock(stock, '6M');
      }
    }, 60);
  }

  closeModal() {
    const modal = document.getElementById('stockModal');
    if (modal) modal.classList.remove('active');
  }

  updateCalculator() {
    const capital = parseFloat(document.getElementById('calcCapital')?.value) || 500000;
    const riskPct = parseFloat(document.getElementById('calcRiskPct')?.value) || 1.0;
    const entry = parseFloat(document.getElementById('calcEntryPrice')?.value) || 100;
    const sl = parseFloat(document.getElementById('calcStopLossPrice')?.value) || 93;

    const res = Indicators.calculatePositionSizing(entry, sl, capital, riskPct);

    document.getElementById('calcSharesOut').textContent = `${res.shares} Qty`;
    document.getElementById('calcInvOut').textContent = `₹${res.totalInvestment.toLocaleString('en-IN')}`;
    document.getElementById('calcRiskAmountOut').textContent = `₹${res.riskAmount.toLocaleString('en-IN')}`;
    document.getElementById('calcSlPctOut').textContent = `-${res.stopLossPct}%`;

    document.getElementById('calcT1').textContent = `₹${res.target1R.toLocaleString('en-IN')}`;
    document.getElementById('calcT2').textContent = `₹${res.target2R.toLocaleString('en-IN')}`;
    document.getElementById('calcT3').textContent = `₹${res.target3R.toLocaleString('en-IN')}`;
  }

  exportToCSV() {
    if (!this.currentResults || this.currentResults.length === 0) {
      alert('No stocks to export.');
      return;
    }

    const headers = ['Symbol', 'Company Name', 'Exchange', 'Sector', 'LTP', 'Day Change %', 'RS Score', 'RSI', 'Volume Burst %', 'Sales YoY %', 'EPS YoY %', '3Y EPS CAGR %', '5Y EPS CAGR %', 'ROE %', 'ROCE %', 'Stop Loss', 'SL %', 'Match Count (out of 9)'];
    
    const rows = this.currentResults.map(s => [
      s.symbol,
      `"${s.name}"`,
      s.exchange,
      `"${s.sector}"`,
      s.ltp,
      s.dayChangePct,
      s.rsScore,
      s.rsi,
      s.volumeBurst.burstPct,
      s.salesGrowthYoY,
      s.epsGrowthYoY,
      s.eps3Y_CAGR,
      s.eps5Y_CAGR,
      s.roe,
      s.roce,
      s.recommendedSL,
      s.slPct,
      s.matchCount
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `NSE_BSE_Screener_Results_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  copyTickers() {
    if (!this.currentResults || this.currentResults.length === 0) {
      alert('No tickers available to copy.');
      return;
    }
    const tickers = this.currentResults.map(s => s.symbol).join(', ');
    navigator.clipboard.writeText(tickers).then(() => {
      const btn = document.getElementById('btnCopyTickers');
      const originalText = btn.innerHTML;
      btn.innerHTML = '✓ Copied!';
      setTimeout(() => { btn.innerHTML = originalText; }, 2000);
    });
  }
}

// Instantiate on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.screenerApp = new App();
});
