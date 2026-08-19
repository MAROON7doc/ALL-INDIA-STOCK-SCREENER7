  /* ==========================================================================
     TRADINGVIEW LIGHTWEIGHT CHARTS WRAPPER (V2 - TIME-SCALE & DATE-RANGE ENHANCED)
     Replaces InteractiveGPUChart with TradingView's battle-tested chart engine.
     Public API is fully backward-compatible with all Application usages.
     ========================================================================== */
  class TradingViewLWChart {
    constructor(containerId) {
      this.container = document.getElementById(containerId);
      if (!this.container) return;

      // Public state (read by Application)
      this.stock = null;
      this.allCandles = [];
      this.interval = '1D';
      this.isLoading = false;
      this.isFallback = false;
      this._hasFocus = false;

      // Internal state
      this._series = null;      // main candlestick/line/area series
      this._volSeries = null;   // volume histogram
      this._ema20Series = null;
      this._ema50Series = null;
      this._priceLines = [];
      this._markers = [];
      this._chartType = 'candle';
      this._layers = { ema: true, vwap: true, volume: true, protocols: true };
      this._isMarketLive = false;
      this._loadingEl = null;
      this._currentScaleMode = 0; // 0 = Normal, 1 = Log, 2 = Percentage

      this._buildLoadingOverlay();
      this._initChart();
      this._setupResize();
    }

    /* ── Internal: Build DOM loading overlay ─────────────────────────── */
    _buildLoadingOverlay() {
      this._loadingEl = document.createElement('div');
      Object.assign(this._loadingEl.style, {
        position: 'absolute', inset: '0', display: 'none', alignItems: 'center',
        justifyContent: 'center', flexDirection: 'column', gap: '10px',
        background: '#070c17', color: '#94a3b8', fontSize: '12px',
        fontFamily: 'Inter, sans-serif', zIndex: '10', pointerEvents: 'none'
      });
      this._loadingEl.innerHTML = `
        <svg width="36" height="36" viewBox="0 0 36 36" style="animation:tv-spin 0.9s linear infinite">
          <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(56,189,248,0.18)" stroke-width="3"/>
          <path d="M18 4 A14 14 0 0 1 32 18" fill="none" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
        </svg>
        <span class="tv-load-msg">Loading market series…</span>
      `;
      if (!document.getElementById('tv-spin-style')) {
        const s = document.createElement('style');
        s.id = 'tv-spin-style';
        s.textContent = '@keyframes tv-spin{to{transform:rotate(360deg)}}';
        document.head.appendChild(s);
      }
      this.container.style.position = 'relative';
      this.container.appendChild(this._loadingEl);
    }

    /* ── Internal: Create LW chart ───────────────────────────────────── */
    _initChart() {
      if (!window.LightweightCharts) {
        console.error('TradingViewLWChart: LightweightCharts library not loaded!');
        return;
      }
      const { width, height } = this.container.getBoundingClientRect();
      const isIntraday = ['1m', '5m', '15m', '1H', '4H'].includes(this.interval);

      this._chart = LightweightCharts.createChart(this.container, {
        width: Math.max(300, width),
        height: Math.max(200, height),
        layout: {
          background: { type: 'solid', color: '#070c17' },
          textColor: '#94a3b8',
          fontSize: 11,
          fontFamily: "'Inter', 'DM Mono', sans-serif",
        },
        grid: {
          vertLines: { color: 'rgba(255,255,255,0.04)' },
          horzLines: { color: 'rgba(255,255,255,0.04)' },
        },
        crosshair: {
          mode: LightweightCharts.CrosshairMode.Normal,
          vertLine: { color: 'rgba(148,163,184,0.45)', labelBackgroundColor: '#0f172a' },
          horzLine: { color: 'rgba(148,163,184,0.45)', labelBackgroundColor: '#0f172a' },
        },
        rightPriceScale: {
          borderColor: 'rgba(255,255,255,0.12)',
          textColor: '#94a3b8',
          scaleMargins: { top: 0.08, bottom: 0.22 },
          autoScale: true,
          alignLabels: true,
          visible: true,
        },
        timeScale: {
          borderColor: 'rgba(255,255,255,0.12)',
          textColor: '#94a3b8',
          timeVisible: isIntraday,
          secondsVisible: false,
          fixLeftEdge: false,
          fixRightEdge: false,
          rightOffset: 12,
          barSpacing: isIntraday ? 6 : 9,
          minBarSpacing: 2,
          visible: true,
        },
        handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
        handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true },
      });

      this._buildSeries('candle');
    }

    /* ── Internal: Update time scale options based on interval ───────── */
    _updateTimeScaleOptions() {
      if (!this._chart) return;
      const isIntraday = ['1m', '5m', '15m', '1H', '4H'].includes(this.interval);
      this._chart.applyOptions({
        timeScale: {
          timeVisible: isIntraday,
          secondsVisible: false,
          borderColor: 'rgba(255,255,255,0.12)',
          textColor: '#94a3b8',
          fixLeftEdge: false,
          fixRightEdge: false,
          rightOffset: 12,
          barSpacing: isIntraday ? 6 : 9,
          minBarSpacing: 2,
          visible: true,
        },
        rightPriceScale: {
          borderColor: 'rgba(255,255,255,0.12)',
          textColor: '#94a3b8',
          scaleMargins: { top: 0.08, bottom: 0.22 },
          autoScale: true,
          mode: this._currentScaleMode,
          visible: true,
        }
      });
    }

    /* ── Internal: Build/rebuild main series by type ─────────────────── */
    _buildSeries(type) {
      if (this._series) { try { this._chart.removeSeries(this._series); } catch(e) {} }
      if (this._volSeries) { try { this._chart.removeSeries(this._volSeries); } catch(e) {} }
      if (this._ema20Series) { try { this._chart.removeSeries(this._ema20Series); } catch(e) {} }
      if (this._ema50Series) { try { this._chart.removeSeries(this._ema50Series); } catch(e) {} }

      if (type === 'candle' || type === 'bar') {
        this._series = this._chart.addCandlestickSeries({
          upColor: '#22c55e',
          downColor: '#ef4444',
          borderUpColor: '#22c55e',
          borderDownColor: '#ef4444',
          wickUpColor: '#22c55e',
          wickDownColor: '#ef4444',
        });
      } else if (type === 'area') {
        this._series = this._chart.addAreaSeries({
          lineColor: '#38bdf8',
          topColor: 'rgba(56,189,248,0.28)',
          bottomColor: 'rgba(56,189,248,0.02)',
          lineWidth: 2,
          crosshairMarkerVisible: true,
        });
      } else {
        this._series = this._chart.addLineSeries({
          color: '#38bdf8',
          lineWidth: 2,
          crosshairMarkerVisible: true,
        });
      }

      // Volume histogram on bottom 20%
      this._volSeries = this._chart.addHistogramSeries({
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      });
      this._chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.80, bottom: 0 },
      });

      // EMA overlays
      this._ema20Series = this._chart.addLineSeries({
        color: '#f59e0b',
        lineWidth: 1.5,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      this._ema50Series = this._chart.addLineSeries({
        color: '#8b5cf6',
        lineWidth: 1.5,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });

      this._chartType = type;
      if (this.allCandles.length) this._applyData();
    }

    /* ── Internal: Convert candle to timestamp/date string ───────────── */
    _toTime(candle) {
      const isIntraday = ['1m', '5m', '15m', '1H', '4H'].includes(this.interval);
      try {
        let dateStr = candle.date || '';
        if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
          const [d, m, y] = dateStr.split('-');
          dateStr = `${y}-${m}-${d}`;
        }
        if (isIntraday) {
          const timeStr = candle.time || '09:15';
          return Math.floor(new Date(`${dateStr}T${timeStr}:00+05:30`).getTime() / 1000);
        }
        return dateStr;
      } catch(e) {
        return candle.date || '2025-01-01';
      }
    }

    /* ── Internal: Compute EMA series ─────────────────────────────────── */
    _calcEMA(candles, period) {
      if (candles.length < period) return [];
      const k = 2 / (period + 1);
      const out = [];
      let ema = candles.slice(0, period).reduce((s, c) => s + c.close, 0) / period;
      for (let i = period - 1; i < candles.length; i++) {
        if (i > period - 1) ema = candles[i].close * k + ema * (1 - k);
        const t = this._toTime(candles[i]);
        if (t) out.push({ time: t, value: parseFloat(ema.toFixed(2)) });
      }
      return out;
    }

    /* ── Internal: Apply current candle data to all series ─────────── */
    _applyData() {
      if (!this._series || !this.allCandles.length) return;
      this._updateTimeScaleOptions();

      const candles = this.allCandles;
      const isIntraday = ['1m', '5m', '15m', '1H', '4H'].includes(this.interval);

      // Map to LW format, filter valid numbers, and deduplicate
      const seen = new Set();
      const rawData = [];

      for (const c of candles) {
        const t = this._toTime(c);
        if (!t) continue;
        const key = String(t);
        if (seen.has(key)) continue;
        seen.add(key);

        const open = Number(c.open);
        const close = Number(c.close);
        const high = Number(c.high);
        const low = Number(c.low);
        if (![open, close, high, low].every(Number.isFinite) || open <= 0 || close <= 0) continue;
        const normalizedHigh = Math.max(open, close, Number.isFinite(high) && high > 0 ? high : 0);
        const normalizedLow = Math.min(open, close, Number.isFinite(low) && low > 0 ? low : open);
        const volume = Number.isFinite(Number(c.volume)) && Number(c.volume) >= 0 ? Number(c.volume) : 0;

        rawData.push({
          time: t,
          open,
          high: normalizedHigh,
          low: normalizedLow,
          close,
          volume,
          isUp: close >= open
        });
      }

      // STRICT CHRONOLOGICAL ASCENDING SORT REQUIRED BY TRADINGVIEW
      rawData.sort((a, b) => {
        if (typeof a.time === 'number' && typeof b.time === 'number') return a.time - b.time;
        return String(a.time).localeCompare(String(b.time));
      });

      const ohlcData = rawData.map(d => {
        if (this._chartType === 'candle' || this._chartType === 'bar') {
          return { time: d.time, open: d.open, high: d.high, low: d.low, close: d.close };
        }
        return { time: d.time, value: d.close };
      });

      const volData = rawData.map(d => ({
        time: d.time,
        value: d.volume,
        color: d.isUp ? 'rgba(34,197,94,0.45)' : 'rgba(239,68,68,0.45)'
      }));

      try {
        this._series.setData(ohlcData);
        if (this._layers.volume && this._volSeries) this._volSeries.setData(volData);
        else if (this._volSeries) this._volSeries.setData([]);

        if (this._layers.ema) {
          const ema20 = this._calcEMA(candles, 20);
          const ema50 = this._calcEMA(candles, 50);
          if (this._ema20Series) this._ema20Series.setData(ema20);
          if (this._ema50Series) this._ema50Series.setData(ema50);
        } else {
          if (this._ema20Series) this._ema20Series.setData([]);
          if (this._ema50Series) this._ema50Series.setData([]);
        }

        // VWAP price line on intraday
        this._clearPriceLines();
        if (this._layers.vwap && isIntraday && rawData.length > 0) {
          const last = rawData[rawData.length - 1];
          if (last) {
            const vwap = (last.high + last.low + last.close) / 3;
            this._addPriceLine(parseFloat(vwap.toFixed(2)), 'VWAP', '#f59e0b', 1);
          }
        }

        this._applyProtocolMarkers(candles, ohlcData);
        this._chart.timeScale().scrollToRealTime();
      } catch(e) {
        console.warn('TradingViewLWChart: applyData error', e);
      }
    }

    /* ── Internal: Add protocol markers ──────────────────────────────── */
    _applyProtocolMarkers(candles, ohlcData) {
      if (!this._series || !this._layers.protocols || ohlcData.length < 10) return;
      const markers = [];
      const n = candles.length;
      for (let i = 30; i < n - 1; i++) {
        const c = candles[i];
        const prev10High = Math.max(...candles.slice(i - 10, i).map(x => x.high));
        if (c.close > prev10High * 1.02 && c.volume > (candles[i-1]?.volume || 0) * 1.3) {
          markers.push({ time: this._toTime(c), position: 'belowBar', color: '#22c55e', shape: 'arrowUp', text: 'B', size: 1 });
        }
      }
      try { this._series.setMarkers(markers.slice(-5)); } catch(e) {}
    }

    /* ── Internal: Price lines ───────────────────────────────────────── */
    _addPriceLine(price, title, color, lineWidth = 1) {
      if (!this._series) return null;
      const pl = this._series.createPriceLine({ price, color, lineWidth, lineStyle: 2, axisLabelVisible: true, title });
      this._priceLines.push(pl);
      return pl;
    }
    _clearPriceLines() {
      for (const pl of this._priceLines) { try { this._series.removePriceLine(pl); } catch(e) {} }
      this._priceLines = [];
    }

    /* ── Internal: Resize handler ────────────────────────────────────── */
    _setupResize() {
      const doResize = () => {
        if (!this._chart || !this.container) return;
        const { width, height } = this.container.getBoundingClientRect();
        if (width > 10 && height > 10) {
          this._chart.applyOptions({ width, height });
        }
      };
      window.addEventListener('resize', () => requestAnimationFrame(doResize));
      if (window.ResizeObserver) {
        new ResizeObserver(() => requestAnimationFrame(doResize)).observe(this.container);
      }
    }

    /* ═══════════════════════════════════════════════════════════════════
       PUBLIC API — Backward-compatible with all Application usages
       ═══════════════════════════════════════════════════════════════════ */

    setData(stock, candles) {
      this.stock = stock;
      this.allCandles = candles || [];
      this._applyData();
    }

    refreshCandles() {
      if (!this.stock) return;
      const interval = this.interval;
      let targetCandles =
        interval === '1m'  ? this.stock.intraday1m  :
        interval === '5m'  ? this.stock.intraday5m  :
        interval === '15m' ? this.stock.intraday15m :
        interval === '1H'  ? this.stock.intraday1H  :
        interval === '4H'  ? (this.stock.intraday4H || this.stock.intraday1H) :
        interval === '1D'  ? this.stock.dailyCandles :
        interval === '1W'  ? this.stock.weekly :
        interval === '1M'  ? this.stock.monthly :
        this.stock.dailyCandles;
      this.isFallback = !targetCandles?.length;
      this.allCandles = targetCandles?.length ? targetCandles : (this.stock.dailyCandles || []);
      this._applyData();
    }

    setInterval(interval) {
      this.interval = interval;
      this.refreshCandles();
    }

    setChartType(type) {
      if (type === this._chartType) return;
      this._buildSeries(type);
    }

    setRange(range) {
      if (!this.stock) return;
      const rangeMap = {
        '1D': { interval: '1m', bars: 75 },
        '5D': { interval: '5m', bars: 120 },
        '1M': { interval: '1D', bars: 22 },
        '3M': { interval: '1D', bars: 66 },
        '6M': { interval: '1D', bars: 130 },
        '1Y': { interval: '1D', bars: 250 },
        '5Y': { interval: '1W', bars: 260 },
        'ALL': { interval: '1M', bars: 0 }
      };

      const conf = rangeMap[range] || { interval: '1D', bars: 66 };
      if (this.interval !== conf.interval) {
        this.interval = conf.interval;
        this.refreshCandles();
      }

      if (this._chart) {
        if (range === 'ALL' || conf.bars === 0) {
          this._chart.timeScale().fitContent();
        } else {
          const total = this.allCandles.length;
          const from = Math.max(0, total - conf.bars);
          this._chart.timeScale().setVisibleLogicalRange({ from, to: total + 3 });
        }
      }

      document.querySelectorAll('#tvRangeGroup .tv-bottom-range-btn').forEach(btn => {
        if (btn.dataset.range === range) btn.classList.add('active');
        else btn.classList.remove('active');
      });
    }

    setPriceScaleMode(mode) {
      if (!this._chart) return;
      if (mode === 'percentage' || mode === 2) {
        this._currentScaleMode = 2;
      } else if (mode === 'logarithmic' || mode === 1) {
        this._currentScaleMode = 1;
      } else {
        this._currentScaleMode = 0;
      }
      this._chart.priceScale().applyOptions({ mode: this._currentScaleMode, autoScale: true });
    }

    setStock(stock, interval, exchangeMode) {
      this.stock = stock;
      if (interval) this.interval = interval;
      if (exchangeMode) this._exchangeMode = exchangeMode;
      this.refreshCandles();
      this.resize();
    }

    updateRealtimeTick(ltp, volume, date, isNewCandle) {
      if (!this._series || !this.allCandles.length) return;
      try {
        const last = this.allCandles[this.allCandles.length - 1];
        const isIntraday = ['1m', '5m', '15m', '1H', '4H'].includes(this.interval);
        const t = isNewCandle
          ? (isIntraday ? Math.floor((date instanceof Date ? date : new Date()).getTime() / 1000) : (date instanceof Date ? date.toISOString().split('T')[0] : String(date)))
          : this._toTime(last);

        if (this._chartType === 'candle' || this._chartType === 'bar') {
          const tick = {
            time: t,
            open: isNewCandle ? ltp : last.open,
            high: isNewCandle ? ltp : Math.max(last.high, ltp),
            low:  isNewCandle ? ltp : Math.min(last.low, ltp),
            close: ltp,
          };
          this._series.update(tick);
        } else {
          this._series.update({ time: t, value: ltp });
        }

        if (this._volSeries && volume) {
          this._volSeries.update({
            time: t,
            value: volume,
            color: ltp >= last.close ? 'rgba(34,197,94,0.45)' : 'rgba(239,68,68,0.45)',
          });
        }

        if (!isNewCandle && last) {
          last.close = ltp;
          last.high = Math.max(last.high, ltp);
          last.low  = Math.min(last.low, ltp);
        }
      } catch(e) {}
    }

    setLayer(layerKey, active) {
      this._layers[layerKey] = active;
      this._applyData();
    }

    setLoading(isLoading, message) {
      this.isLoading = isLoading;
      if (!this._loadingEl) return;
      const msgEl = this._loadingEl.querySelector('.tv-load-msg');
      if (msgEl) msgEl.textContent = message || 'Loading market series…';
      this._loadingEl.style.display = isLoading ? 'flex' : 'none';
    }

    setMarketLiveState(isLive, isSim) {
      this._isMarketLive = isLive;
    }

    setExchangeMode(mode) { this._exchangeMode = mode; }
    setFilterParams(params) {}
    setMarketOpen(bool) { this._isMarketLive = bool; }

    resetZoom() {
      this._chart?.timeScale().resetTimeScale();
      this._chart?.timeScale().fitContent();
    }

    resize() {
      if (!this._chart || !this.container) return;
      requestAnimationFrame(() => {
        const { width, height } = this.container.getBoundingClientRect();
        if (width > 10 && height > 10) this._chart.applyOptions({ width, height });
      });
    }

    destroy() {
      if (this._chart) { this._chart.remove(); this._chart = null; }
    }
  }
