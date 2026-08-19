/**
 * Universal Indian Stock Screener - Node.js REST API Server
 * Zero-dependency native HTTP server with Live Quote Engine, JSON REST API and Static Asset Serving
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 8080;
const ROOT_DIR = path.resolve(__dirname, '../..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const SAMPLE_UNIVERSE = [
  { symbol: "TRENT", name: "Trent Ltd (Westside & Zudio)", sector: "Retail / Fashion", marketCapCr: 238000, ltp: 6720.50, dayChangePct: 3.45, pe: 112.4, peg: 1.65, salesGrowthYoY: 54.2, epsGrowthYoY: 62.4, roce: 28.5, roe: 24.8, piotroskiScore: 8, debtToEquity: 0.08, pattern: "Cup with Handle Breakout", rsScore: 96, rsi: 68, series: "EQ", bseCode: "500251" },
  { symbol: "DIXON", name: "Dixon Technologies Ltd", sector: "EMS / Electronics", marketCapCr: 78500, ltp: 13150.00, dayChangePct: 4.12, pe: 88.5, peg: 1.45, salesGrowthYoY: 120.5, epsGrowthYoY: 85.0, roce: 32.4, roe: 27.8, piotroskiScore: 9, debtToEquity: 0.18, pattern: "7-Week High Tight Flag", rsScore: 94, rsi: 72, series: "EQ", bseCode: "540699" },
  { symbol: "BEL", name: "Bharat Electronics Ltd", sector: "Defence / Navratna", marketCapCr: 225000, ltp: 308.20, dayChangePct: 2.85, pe: 44.2, peg: 1.85, salesGrowthYoY: 18.5, epsGrowthYoY: 28.0, roce: 34.8, roe: 26.5, piotroskiScore: 9, debtToEquity: 0.00, pattern: "Ascending Triangle Breakout", rsScore: 91, rsi: 64, series: "EQ", bseCode: "500049" },
  { symbol: "HAL", name: "Hindustan Aeronautics Ltd", sector: "Defence / Aerospace", marketCapCr: 318000, ltp: 4750.00, dayChangePct: 3.10, pe: 38.6, peg: 1.35, salesGrowthYoY: 15.8, epsGrowthYoY: 32.4, roce: 36.5, roe: 28.2, piotroskiScore: 9, debtToEquity: 0.00, pattern: "VCP Consolidation Base", rsScore: 89, rsi: 61, series: "EQ", bseCode: "541154" },
  { symbol: "POLYCAB", name: "Polycab India Ltd", sector: "Wires & Cables / FMEG", marketCapCr: 98000, ltp: 6520.00, dayChangePct: 1.95, pe: 48.2, peg: 1.70, salesGrowthYoY: 24.5, epsGrowthYoY: 29.8, roce: 30.5, roe: 23.8, piotroskiScore: 8, debtToEquity: 0.04, pattern: "Double Bottom Reversal", rsScore: 86, rsi: 59, series: "EQ", bseCode: "542652" },
  { symbol: "SOLARINDS", name: "Solar Industries India Ltd", sector: "Industrial Explosives / Defence", marketCapCr: 92500, ltp: 10220.00, dayChangePct: 2.40, pe: 82.5, peg: 2.10, salesGrowthYoY: 28.0, epsGrowthYoY: 38.5, roce: 31.8, roe: 26.4, piotroskiScore: 8, debtToEquity: 0.32, pattern: "Flat Base Breakout", rsScore: 88, rsi: 62, series: "EQ", bseCode: "532725" },
  { symbol: "KAYNES", name: "Kaynes Technology India Ltd", sector: "EMS / IoT / Semiconductors", marketCapCr: 34500, ltp: 5400.00, dayChangePct: 5.20, pe: 115.0, peg: 1.55, salesGrowthYoY: 74.5, epsGrowthYoY: 82.0, roce: 22.4, roe: 18.5, piotroskiScore: 8, debtToEquity: 0.15, pattern: "Cup with Handle", rsScore: 95, rsi: 74, series: "EQ", bseCode: "543664" },
  { symbol: "PERSISTENT", name: "Persistent Systems Ltd", sector: "IT Services / Cloud & AI", marketCapCr: 86000, ltp: 5600.00, dayChangePct: 1.75, pe: 55.4, peg: 2.20, salesGrowthYoY: 16.2, epsGrowthYoY: 22.5, roce: 31.0, roe: 25.2, piotroskiScore: 9, debtToEquity: 0.02, pattern: "Ascending Channel Continuation", rsScore: 84, rsi: 58, series: "EQ", bseCode: "533179" },
  { symbol: "CDSL", name: "Central Depository Services Ltd", sector: "Capital Markets / Fintech", marketCapCr: 35200, ltp: 1680.00, dayChangePct: 2.65, pe: 62.0, peg: 1.85, salesGrowthYoY: 38.5, epsGrowthYoY: 44.0, roce: 38.2, roe: 29.5, piotroskiScore: 9, debtToEquity: 0.00, pattern: "Multi-Month Base Breakout", rsScore: 87, rsi: 60, series: "EQ", bseCode: "540515" },
  { symbol: "BDL", name: "Bharat Dynamics Ltd", sector: "Defence / Missiles", marketCapCr: 42500, ltp: 1160.00, dayChangePct: 3.80, pe: 58.0, peg: 1.90, salesGrowthYoY: 22.0, epsGrowthYoY: 31.0, roce: 26.5, roe: 21.0, piotroskiScore: 8, debtToEquity: 0.00, pattern: "Inverse Head & Shoulders", rsScore: 85, rsi: 63, series: "EQ", bseCode: "541143" },
  { symbol: "PREMIERENE", name: "Premier Energies Ltd", sector: "Renewable / Solar Cells", marketCapCr: 49000, ltp: 1085.00, dayChangePct: 4.80, pe: 72.0, peg: 1.20, salesGrowthYoY: 180.0, epsGrowthYoY: 240.0, roce: 35.0, roe: 31.2, piotroskiScore: 9, debtToEquity: 0.25, pattern: "IPO Base Stage-1 Breakout", rsScore: 97, rsi: 76, series: "EQ", bseCode: "544240" },
  { symbol: "ANGELONE", name: "Angel One Ltd", sector: "Fintech / Retail Broking", marketCapCr: 26800, ltp: 2980.00, dayChangePct: 3.25, pe: 24.5, peg: 0.85, salesGrowthYoY: 42.0, epsGrowthYoY: 36.5, roce: 42.5, roe: 36.8, piotroskiScore: 9, debtToEquity: 0.12, pattern: "Cup with Handle", rsScore: 88, rsi: 61, series: "EQ", bseCode: "543235" }
];

function updateLivePrices() {
  const count = Math.floor(Math.random() * 3) + 2;
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * SAMPLE_UNIVERSE.length);
    const stk = SAMPLE_UNIVERSE[idx];
    const pct = ((Math.random() * 0.7) - 0.32);
    stk.ltp = parseFloat((stk.ltp * (1 + pct / 100)).toFixed(2));
    stk.dayChangePct = parseFloat((stk.dayChangePct + (pct * 0.4)).toFixed(2));
  }
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  updateLivePrices();

  // ── REST API ROUTES ──
  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      status: 'healthy',
      engine: 'Node.js Live REST API Server',
      version: '3.3.0',
      universeSize: SAMPLE_UNIVERSE.length,
      marketLive: true
    }));
    return;
  }

  if (pathname === '/api/stocks' || pathname === '/api/quotes' || pathname === '/api/live') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(SAMPLE_UNIVERSE));
    return;
  }

  if (pathname === '/api/indices') {
    const nDelta = (Math.random() * 4 - 1.8);
    const sDelta = (Math.random() * 10 - 4.5);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      nifty50: { symbol: "NIFTY 50", ltp: parseFloat((24835.10 + nDelta).toFixed(2)), change: parseFloat((142.50 + nDelta).toFixed(2)), pChange: 0.58 },
      sensex: { symbol: "BSE SENSEX", ltp: parseFloat((81380.40 + sDelta).toFixed(2)), change: parseFloat((410.20 + sDelta).toFixed(2)), pChange: 0.51 },
      bankNifty: { symbol: "NIFTY BANK", ltp: 51290.80, change: 215.10, pChange: 0.42 },
      indiaVix: { symbol: "INDIA VIX", ltp: 12.85, change: -0.45, pChange: -3.38 }
    }));
    return;
  }

  if (pathname === '/api/heatmap') {
    const sectors = {};
    SAMPLE_UNIVERSE.forEach(s => {
      if (!sectors[s.sector]) sectors[s.sector] = [];
      sectors[s.sector].push(s);
    });
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      sectors,
      topGainers: [...SAMPLE_UNIVERSE].sort((a, b) => b.dayChangePct - a.dayChangePct).slice(0, 5),
      topLosers: [...SAMPLE_UNIVERSE].sort((a, b) => a.dayChangePct - b.dayChangePct).slice(0, 5)
    }));
    return;
  }

  // ── STATIC FILE SERVING ──
  let reqPath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.join(ROOT_DIR, reqPath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`404 Not Found: ${pathname}`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`Node.js Stock Screener Live Server running at http://localhost:${PORT}/`);
});
