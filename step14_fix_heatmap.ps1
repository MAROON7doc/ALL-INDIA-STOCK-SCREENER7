$utf8 = New-Object System.Text.UTF8Encoding($false)
$file = (Resolve-Path "js\screener.bundle.js").Path
$code = [System.IO.File]::ReadAllText($file, $utf8)

$oldHeatmapStart = '  /* === 7. MARKET HEATMAP TREEMAP & SECTOR MATRIX ENGINE'
$oldPortfolioStart = '  /* === 8. FINDESK PORTFOLIO ANALYTICS ENGINE'

$sIdx = $code.IndexOf($oldHeatmapStart)
$eIdx = $code.IndexOf($oldPortfolioStart)

if ($sIdx -ge 0 -and $eIdx -gt $sIdx) {
    $newHeatmapEngine = @'
  /* === 7. MARKET HEATMAP TREEMAP & SECTOR MATRIX ENGINE === */
  renderMarketHeatmap(filterIndex = 'NIFTY 50') {
    this.activeHeatmapIndex = filterIndex || 'NIFTY 50';
    const container = document.getElementById('heatmapSectorsGrid');
    if (!container) return;

    // Filter stocks based on active index selection
    let filteredUniverse = [...this.universe];
    if (filterIndex === 'NIFTY BANK') {
      filteredUniverse = this.universe.filter(s => s.sector.includes('Fintech') || s.sector.includes('Capital Markets') || s.sector.includes('Financial'));
      if (filteredUniverse.length === 0) filteredUniverse = this.universe.slice(0, 4);
    } else if (filterIndex === 'NIFTY IT') {
      filteredUniverse = this.universe.filter(s => s.sector.includes('IT') || s.sector.includes('EMS') || s.sector.includes('Electronics') || s.sector.includes('Semiconductors'));
    } else if (filterIndex === 'NIFTY AUTO' || filterIndex === 'CAPITAL GOODS') {
      filteredUniverse = this.universe.filter(s => s.sector.includes('Defence') || s.sector.includes('Aerospace') || s.sector.includes('Wires') || s.sector.includes('Explosives'));
    } else if (filterIndex === 'NIFTY PHARMA' || filterIndex === 'RENEWABLE') {
      filteredUniverse = this.universe.filter(s => s.sector.includes('Renewable') || s.sector.includes('Solar') || s.sector.includes('Explosives') || s.sector.includes('Retail'));
    } else if (filterIndex === 'NIFTY NEXT 50') {
      filteredUniverse = this.universe.filter(s => (s.marketCapCr || 0) < 150000);
    }

    if (filteredUniverse.length === 0) {
      filteredUniverse = [...this.universe];
    }

    // Group universe stocks by sector
    const sectorGroups = {};
    for (const s of filteredUniverse) {
      const sec = s.sector || 'Other Sector';
      if (!sectorGroups[sec]) sectorGroups[sec] = [];
      sectorGroups[sec].push(s);
    }

    let gridHtml = '';
    for (const [secName, stocks] of Object.entries(sectorGroups)) {
      const avgChg = stocks.reduce((acc, x) => acc + x.dayChangePct, 0) / stocks.length;
      const avgSign = avgChg >= 0 ? '+' : '';
      const avgColor = avgChg >= 0 ? '#34d399' : '#f87171';

      gridHtml += `
        <div class="heatmap-sector-card" style="background:#090e1a; border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:12px; display:flex; flex-direction:column; gap:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:6px;">
            <div style="font-weight:800; font-size:12px; color:#ffffff; display:flex; align-items:center; gap:6px;">
              <span style="width:6px; height:6px; border-radius:50%; background:#38bdf8;"></span>
              ${escapeHtml(secName)}
            </div>
            <div style="font-family:var(--font-mono); font-size:11.5px; font-weight:700; color:${avgColor};">
              ${avgSign}${avgChg.toFixed(2)}%
            </div>
          </div>
          <div class="heatmap-tiles-cluster" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:8px;">
      `;

      for (const s of stocks) {
        let bg = '#14532d';
        let textColor = '#ffffff';
        const chg = s.dayChangePct;

        if (chg >= 4.0) { bg = '#059669'; }
        else if (chg >= 2.0) { bg = '#16a34a'; }
        else if (chg > 0) { bg = '#15803d'; }
        else if (chg <= -4.0) { bg = '#dc2626'; }
        else if (chg <= -2.0) { bg = '#b91c1c'; }
        else if (chg < 0) { bg = '#991b1b'; }
        else { bg = '#334155'; }

        const sign = chg > 0 ? '+' : '';
        const mcapStr = s.marketCapCr ? `₹${(s.marketCapCr / 1000).toFixed(1)}k Cr` : '';

        gridHtml += `
          <div class="heatmap-tile" data-sym="${escapeHtml(s.symbol)}" title="${escapeHtml(s.name)} - Click for deep factor analysis" style="background:${bg}; color:${textColor}; padding:10px 10px; border-radius:8px; display:flex; flex-direction:column; justify-content:space-between; gap:4px; cursor:pointer; transition:all 0.15s ease; border:1px solid rgba(255,255,255,0.12); box-shadow:0 2px 6px rgba(0,0,0,0.3);">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span class="heatmap-tile-sym" style="font-weight:800; font-size:13px; letter-spacing:0.5px;">${escapeHtml(s.symbol)}</span>
              <span style="font-size:9.5px; opacity:0.85; font-family:var(--font-mono);">${escapeHtml(s.series || 'EQ')}</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:baseline; margin-top:2px;">
              <span style="font-size:12px; font-weight:800; font-family:var(--font-mono);">\u20B9${s.ltp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              <span class="heatmap-tile-chg" style="font-family:var(--font-mono); font-size:11.5px; font-weight:800; background:rgba(0,0,0,0.25); padding:1px 5px; border-radius:4px;">${sign}${chg.toFixed(2)}%</span>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:9.5px; opacity:0.85; margin-top:2px;">
              <span>${mcapStr}</span>
              <span>ROCE: ${s.roce}%</span>
            </div>
          </div>
        `;
      }

      gridHtml += `</div></div>`;
    }

    container.innerHTML = gridHtml;

    // Attach click listeners to open detail modal
    container.querySelectorAll('.heatmap-tile[data-sym]').forEach(tile => {
      tile.addEventListener('click', () => {
        const sym = tile.dataset.sym;
        const target = this.universe.find(x => x.symbol === sym);
        if (target) this.openModal(target);
      });
    });

    // Top Gainers & Losers Ranking Leaderboards
    const sortedGainers = [...this.universe].sort((a, b) => b.dayChangePct - a.dayChangePct).slice(0, 5);
    const sortedLosers = [...this.universe].sort((a, b) => a.dayChangePct - b.dayChangePct).slice(0, 5);

    const gainersEl = document.getElementById('heatmapTopGainersList');
    if (gainersEl) {
      gainersEl.innerHTML = sortedGainers.map((s, idx) => `
        <div class="heatmap-rank-row" data-sym="${escapeHtml(s.symbol)}" style="display:flex; justify-content:space-between; align-items:center; padding:7px 8px; border-bottom:1px solid rgba(255,255,255,0.06); font-size:11px; font-family:var(--font-mono); cursor:pointer; border-radius:4px; transition:background 0.15s ease;">
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="background:rgba(34,197,94,0.2); color:#34d399; font-weight:800; font-size:10px; padding:1px 5px; border-radius:3px;">#${idx + 1}</span>
            <span style="font-weight:700; color:#ffffff;">${escapeHtml(s.symbol)}</span>
          </div>
          <div style="text-align:right;">
            <span style="color:#34d399; font-weight:800;">+${s.dayChangePct}%</span>
            <span style="color:var(--text-muted); font-size:10px; margin-left:4px;">(\u20B9${s.ltp.toFixed(1)})</span>
          </div>
        </div>
      `).join('');

      gainersEl.querySelectorAll('.heatmap-rank-row[data-sym]').forEach(row => {
        row.addEventListener('click', () => {
          const sym = row.dataset.sym;
          const target = this.universe.find(x => x.symbol === sym);
          if (target) this.openModal(target);
        });
      });
    }

    const losersEl = document.getElementById('heatmapTopLosersList');
    if (losersEl) {
      losersEl.innerHTML = sortedLosers.map((s, idx) => `
        <div class="heatmap-rank-row" data-sym="${escapeHtml(s.symbol)}" style="display:flex; justify-content:space-between; align-items:center; padding:7px 8px; border-bottom:1px solid rgba(255,255,255,0.06); font-size:11px; font-family:var(--font-mono); cursor:pointer; border-radius:4px; transition:background 0.15s ease;">
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="background:rgba(239,68,68,0.2); color:#f87171; font-weight:800; font-size:10px; padding:1px 5px; border-radius:3px;">#${idx + 1}</span>
            <span style="font-weight:700; color:#ffffff;">${escapeHtml(s.symbol)}</span>
          </div>
          <div style="text-align:right;">
            <span style="color:#f87171; font-weight:800;">${s.dayChangePct}%</span>
            <span style="color:var(--text-muted); font-size:10px; margin-left:4px;">(\u20B9${s.ltp.toFixed(1)})</span>
          </div>
        </div>
      `).join('');

      losersEl.querySelectorAll('.heatmap-rank-row[data-sym]').forEach(row => {
        row.addEventListener('click', () => {
          const sym = row.dataset.sym;
          const target = this.universe.find(x => x.symbol === sym);
          if (target) this.openModal(target);
        });
      });
    }
  }

'@

    $code = $code.Substring(0, $sIdx) + $newHeatmapEngine + $code.Substring($eIdx)
    [System.IO.File]::WriteAllText($file, $code, $utf8)
    Write-Host "Updated renderMarketHeatmap with full index filtering, rich tiles, and click modal inspection."
} else {
    Write-Host "Could not find delimiters for heatmap engine."
}
