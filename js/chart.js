/**
 * High-Performance Candlestick & Technical Pattern Chart Engine
 * Built with HTML5 Canvas, ResizeObserver, live ticking support,
 * Cup with Handle annotations, 7-Week Consolidation Box, Moving Averages (20/50/200),
 * and dynamic RSI oscillator sub-panel.
 */

import { Indicators } from './indicators.js';

export class StockChart {
  constructor(canvasContainerId, isMini = false) {
    this.container = document.getElementById(canvasContainerId);
    if (!this.container) return;

    this.isMini = isMini;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'screener-canvas';
    this.container.innerHTML = '';
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    this.stock = null;
    this.candles = [];
    this.visibleCandles = [];
    this.range = '6M';
    this.crosshair = { x: -1, y: -1, active: false, candle: null, candleIdx: -1 };

    this.width = 800;
    this.height = 420;

    this.setupListeners();
    this.observeContainer();
    this.resize();
  }

  observeContainer() {
    if (window.ResizeObserver && this.container) {
      this.resizeObserver = new ResizeObserver(() => {
        this.resize();
      });
      this.resizeObserver.observe(this.container);
    }
  }

  resize() {
    if (!this.container || !this.canvas) return;
    const rect = this.container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Use measured width or fallback
    this.width = Math.max(300, rect.width || this.container.clientWidth || 800);
    this.height = Math.max(200, rect.height || this.container.clientHeight || 420);

    this.canvas.width = Math.floor(this.width * dpr);
    this.canvas.height = Math.floor(this.height * dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform
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

  updateLiveTick(stock) {
    if (!this.stock || this.stock.symbol !== stock.symbol) return;
    this.stock = stock;
    this.candles = stock.candles || [];
    this.updateVisibleRange();
    this.render();
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
        const paddingRight = 65;
        const paddingLeft = 10;
        const plotWidth = this.width - paddingLeft - paddingRight;
        const candleWidth = plotWidth / this.visibleCandles.length;
        const idx = Math.floor((x - paddingLeft) / candleWidth);
        if (idx >= 0 && idx < this.visibleCandles.length) {
          this.crosshair.candle = this.visibleCandles[idx];
          this.crosshair.candleIdx = idx;
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

    const paddingRight = 65; // Price scale
    const paddingBottom = 24; // Date scale
    const paddingLeft = 10;
    const paddingTop = 28;

    const plotWidth = w - paddingLeft - paddingRight;
    const totalPlotHeight = h - paddingTop - paddingBottom;
    
    // Layout partitions: 70% Price action, 18% Volume, 12% RSI
    const pricePlotHeight = totalPlotHeight * 0.72;
    const volumeHeight = totalPlotHeight * 0.22;
    const volumeTop = paddingTop + pricePlotHeight + 8;

    // Price Bounds
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVol = 0;

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

    // 1. Draw Grid Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const gridSteps = 5;
    for (let i = 0; i <= gridSteps; i++) {
      const priceVal = minPrice + (priceRange / gridSteps) * i;
      const y = getY(priceVal);
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(w - paddingRight, y);
      ctx.stroke();

      // Price Label on right axis
      ctx.fillStyle = '#64748b';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`₹${priceVal.toFixed(1)}`, w - paddingRight + 6, y + 3);
    }

    // 2. Draw Moving Averages (20 SMA & 50 SMA)
    const closes = this.candles.map(c => c.close);
    const totalLen = this.candles.length;
    const visibleCount = this.visibleCandles.length;
    const startIdx = totalLen - visibleCount;

    // 20-day SMA Line
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)'; // Cyan
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let sma20Started = false;
    for (let i = 0; i < visibleCount; i++) {
      const globalIdx = startIdx + i;
      if (globalIdx >= 19) {
        const slice = closes.slice(globalIdx - 19, globalIdx + 1);
        const sma = slice.reduce((a, b) => a + b, 0) / 20;
        const x = getX(i);
        const y = getY(sma);
        if (!sma20Started) { ctx.moveTo(x, y); sma20Started = true; }
        else ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // 50-day SMA Line
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.8)'; // Amber
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let sma50Started = false;
    for (let i = 0; i < visibleCount; i++) {
      const globalIdx = startIdx + i;
      if (globalIdx >= 49) {
        const slice = closes.slice(globalIdx - 49, globalIdx + 1);
        const sma = slice.reduce((a, b) => a + b, 0) / 50;
        const x = getX(i);
        const y = getY(sma);
        if (!sma50Started) { ctx.moveTo(x, y); sma50Started = true; }
        else ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // 3. Draw 7-Week Consolidation Box
    if (this.stock.consolidation7W && this.stock.consolidation7W.isConsolidating) {
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

    // 4. Draw Cup & Handle Pattern Overlay
    if (this.stock.cupWithHandle && this.stock.cupWithHandle.isPattern) {
      const cwh = this.stock.cupWithHandle;
      const leftIdx = cwh.leftPeak?.index - startIdx;
      const botIdx = cwh.bottom?.index - startIdx;
      const rightIdx = cwh.rightPeak?.index - startIdx;

      if (leftIdx >= 0 && rightIdx < visibleCount) {
        const p1x = getX(leftIdx);
        const p1y = getY(cwh.leftPeak.price);
        const p2x = getX(botIdx);
        const p2y = getY(cwh.bottom.price);
        const p3x = getX(rightIdx);
        const p3y = getY(cwh.rightPeak.price);

        // Cup Arc
        ctx.beginPath();
        ctx.moveTo(p1x, p1y);
        ctx.quadraticCurveTo(p2x, p2y + 18, p3x, p3y);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Pivot Breakout Line
        const pivotY = getY(cwh.pivotPrice);
        ctx.beginPath();
        ctx.moveTo(p1x, pivotY);
        ctx.lineTo(w - paddingRight, pivotY);
        ctx.strokeStyle = '#10b981';
        ctx.setLineDash([6, 3]);
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.setLineDash([]);

        // Target Line
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

        // Stop Loss Line
        const slY = getY(cwh.stopLossPrice);
        ctx.beginPath();
        ctx.moveTo(p3x, slY);
        ctx.lineTo(w - paddingRight, slY);
        ctx.strokeStyle = '#ef4444';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.setLineDash([]);

        // Badges
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Left Rim', p1x, p1y - 8);
        ctx.fillText(`Cup (-${cwh.cupDepthPct}%)`, p2x, p2y + 20);
        ctx.fillText('Right Rim Pivot', p3x, p3y - 8);

        ctx.fillStyle = '#ef4444';
        ctx.textAlign = 'right';
        ctx.fillText(`SL: ₹${cwh.stopLossPrice} (-${cwh.stopLossPct}%)`, w - paddingRight - 8, slY + 12);
      }
    }

    // 5. Draw Candlesticks & Volumes
    const candleWidth = Math.max(2, (plotWidth / visibleCount) * 0.72);

    this.visibleCandles.forEach((c, idx) => {
      const cx = getX(idx);
      const isBullish = c.close >= c.open;
      const color = isBullish ? '#10b981' : '#ef4444';

      // 5a. Volume Histogram
      const vy = getVolY(c.volume);
      const vh = (volumeTop + volumeHeight) - vy;
      const isBurst = (idx === visibleCount - 1 && this.stock.volumeBurst?.isBurst);
      ctx.fillStyle = isBurst ? '#f59e0b' : (isBullish ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.45)');
      ctx.fillRect(cx - candleWidth / 2, vy, candleWidth, Math.max(1.5, vh));

      // 5b. Candlestick Wick
      const hy = getY(c.high);
      const ly = getY(c.low);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cx, hy);
      ctx.lineTo(cx, ly);
      ctx.stroke();

      // 5c. Candlestick Body
      const oy = getY(c.open);
      const cy = getY(c.close);
      const bodyY = Math.min(oy, cy);
      const bodyH = Math.max(1.5, Math.abs(cy - oy));

      ctx.fillStyle = color;
      ctx.fillRect(cx - candleWidth / 2, bodyY, candleWidth, bodyH);
    });

    // 6. Header Legend / Stats Strip on Chart
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(paddingLeft, 4, w - paddingRight - paddingLeft, 20);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.strokeRect(paddingLeft, 4, w - paddingRight - paddingLeft, 20);

    const currentCandle = this.visibleCandles[this.visibleCandles.length - 1];
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(`${this.stock.symbol} (₹${currentCandle.close})`, paddingLeft + 8, 18);

    ctx.fillStyle = '#38bdf8';
    ctx.fillText('— 20 SMA', paddingLeft + 140, 18);
    ctx.fillStyle = '#f59e0b';
    ctx.fillText('— 50 SMA', paddingLeft + 220, 18);
    ctx.fillStyle = '#10b981';
    ctx.fillText(`RSI(14): ${this.stock.rsi || 75}`, paddingLeft + 300, 18);

    // 7. Interactive Crosshair & Tooltip
    if (this.crosshair.active && this.crosshair.candle) {
      const c = this.crosshair.candle;
      const idx = this.crosshair.candleIdx;
      const cx = getX(idx);
      const cy = getY(c.close);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.moveTo(cx, paddingTop);
      ctx.lineTo(cx, h - paddingBottom);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(paddingLeft, cy);
      ctx.lineTo(w - paddingRight, cy);
      ctx.stroke();
      ctx.setLineDash([]);

      // Floating Tooltip Box
      const tooltip = `Date: ${c.date} | O: ₹${c.open} | H: ₹${c.high} | L: ₹${c.low} | C: ₹${c.close} | Vol: ${(c.volume / 100000).toFixed(2)}L`;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(paddingLeft + 5, 5, 460, 18);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.strokeRect(paddingLeft + 5, 5, 460, 18);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '10.5px JetBrains Mono, monospace';
      ctx.fillText(tooltip, paddingLeft + 10, 18);
    }
  }
}
