  /* ==========================================================================
     TRADINGVIEW LIGHTWEIGHT CHARTS WRAPPER
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
          vertLine: { color: 'rgba(148,163,184,0.5)', labelBackgroundColor: '#0f1729' },
          horzLine: { color: 'rgba(148,163,184,0.5)', labelBackgroundColor: '#0f1729' },
        },
        rightPriceScale: {
          borderColor: 'rgba(255,255,255,0.08)',
          textColor: '#64748b',
          scaleMargins: { top: 0.06, bottom: 0.25 },
        },
        timeScale: {
          borderColor: 'rgba(255,255,255,0.08)',
          textColor: '#64748b',
          timeVisible: true,
          secondsVisible: false,
          fixLeftEdge: false,
          fixRightEdge: false,
        },
        handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
        handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true },
      });

      this._buildSeries('candle');
    }

    /* ── Internal: Build/rebuild main series by type ─────────────────── */
    _buildSeries(type) {
      // Remove existing series
      if (this._series) { try { this._chart.removeSeries(this._series); } catch(e) {} }
      if (this._volSeries) { try { this._chart.removeSeries(this._volSeries); } catch(e) {} }
      if (this._ema20Series) { try { this._chart.removeSeries(this._ema20Series); } catch(e) {} }
      if (this._ema50Series) { try { this._chart.removeSeries(this._ema50Series); } catch(e) {} }

      // Main price series
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

      // Volume histogram (separate pane via scaleMargins trick on priceScale)
      this._volSeries = this._chart.addHistogramSeries({
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      });
      this._chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.78, bottom: 0 },
      });

      // EMA overlay series
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

    /* ── Internal: Convert our candle format to LW unix timestamp ───── */
    _toTime(candle) {
      // candle.date format: "DD-MM-YYYY" or "YYYY-MM-DD"
      // candle.time format: "HH:MM" (optional)
      try {
        let dateStr = candle.date || '';
        if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
          const [d, m, y] = dateStr.split('-');
          dateStr = `${y}-${m}-${d}`;
        }
        if (candle.time) {
          return Math.floor(new Date(`${dateStr}T${candle.time}:00+05:30`).getTime() / 1000);
        }
        return dateStr; // LW accepts 'YYYY-MM-DD' strings for daily
      } catch(e) {
        return candle.t || Math.floor(Date.now() / 1000);
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
        out.push({ time: this._toTime(candles[i]), value: parseFloat(ema.toFixed(2)) });
      }
      return out;
    }

    /* ── Internal: Apply current candle data to all series ─────────── */
    _applyData() {
      if (!this._series || !this.allCandles.length) return;

      const candles = this.allCandles;
      const isIntraday = ['1m','5m','15m','1H','4H'].includes(this.interval);

      // Map to LW format (deduplicate by time)
      const seen = new Set();
      const ohlcData = [];
      const volData = [];

      for (const c of candles) {
        const t = this._toTime(c);
        const key = String(t);
        if (seen.has(key)) continue;
        seen.add(key);

        if (this._chartType === 'candle' || this._chartType === 'bar') {
          ohlcData.push({ time: t, open: c.open, high: c.high, low: c.low, close: c.close });
        } else {
          ohlcData.push({ time: t, value: c.close });
        }

        const isUp = c.close >= c.open;
        volData.push({
          time: t,
          value: c.volume || 0,
          color: isUp ? 'rgba(34,197,94,0.45)' : 'rgba(239,68,68,0.45)',
        });
      }

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

        // Add VWAP as a price line if intraday
        this._clearPriceLines();
        if (this._layers.vwap && isIntraday && ohlcData.length > 0) {
          const last = this.allCandles[this.allCandles.length - 1];
          const vwapApprox = last ? (last.high + last.low + last.close) / 3 : null;
          if (vwapApprox) {
            this._addPriceLine(vwapApprox, 'VWAP', '#f59e0b', 1);
          }
        }

        // Protocol markers
        this._applyProtocolMarkers(candles, ohlcData);

        // Scroll to latest
        this._chart.timeScale().scrollToRealTime();
      } catch(e) {
        console.warn('TradingViewLWChart: setData error', e);
      }
    }

    /* ── Internal: Add protocol markers (CANSLIM signals) ───────────── */
    _applyProtocolMarkers(candles, ohlcData) {
      if (!this._series || !this._layers.protocols || ohlcData.length < 10) return;
      const markers = [];
      const n = candles.length;
      // Cup & Handle detection (simplified: new high after pullback)
      for (let i = 30; i < n - 1; i++) {
        const c = candles[i];
        const prev10High = Math.max(...candles.slice(i - 10, i).map(x => x.high));
        if (c.close > prev10High * 1.02 && c.volume > (candles[i-1]?.volume || 0) * 1.3) {
          markers.push({ time: this._toTime(c), position: 'belowBar', color: '#22c55e', shape: 'arrowUp', text: 'B', size: 1 });
        }
      }
      // Limit markers to latest 5 to avoid clutter
      const recentMarkers = markers.slice(-5);
      try { this._series.setMarkers(recentMarkers); } catch(e) {}
    }

    /* ── Internal: Price line helpers ────────────────────────────────── */
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
        '1D': '1m', '5D': '15m', '1M': '1D', '3M': '1D',
        '6M': '1D', '1Y': '1D', 'ALL': '1W'
      };
      const newInterval = rangeMap[range] || '1D';
      this.setInterval(newInterval);
      this._chart?.timeScale().scrollToRealTime();
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
        const t = isNewCandle
          ? Math.floor((date instanceof Date ? date : new Date()).getTime() / 1000)
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
        // Keep last candle LTP in sync
        if (!isNewCandle && last) {
          last.close = ltp;
          last.high = Math.max(last.high, ltp);
          last.low  = Math.min(last.low, ltp);
        }
      } catch(e) { /* ignore tick errors */ }
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
      // Visual cue: show live dot color on the last candle via price line
    }

    setExchangeMode(mode) { this._exchangeMode = mode; }
    setFilterParams(params) { /* No-op: LW chart doesn't need filter params */ }
    setMarketOpen(bool) { this._isMarketLive = bool; }

    resetZoom() {
      this._chart?.timeScale().resetTimeScale();
      this._chart?.timeScale().scrollToRealTime();
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
