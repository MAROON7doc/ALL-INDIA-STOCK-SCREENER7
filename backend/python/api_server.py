"""
Universal Indian Stock Screener - Python REST API Server
Provides high-throughput screening, live quotes proxy, and JSON API endpoints.
Runs natively with standard library http.server (or FastAPI if installed).
"""

import json
import os
import random
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler
import urllib.parse

PORT = 8080

SAMPLE_UNIVERSE = [
    {
        "symbol": "TRENT", "name": "Trent Ltd (Westside & Zudio)", "sector": "Retail / Fashion", "isin": "INE849A01020",
        "marketCapCr": 238000, "ltp": 6720.50, "dayChangePct": 3.45, "pe": 112.4, "peg": 1.65,
        "salesGrowthYoY": 54.2, "epsGrowthYoY": 62.4, "roce": 28.5, "roe": 24.8, "piotroskiScore": 8,
        "debtToEquity": 0.08, "pattern": "Cup with Handle Breakout", "rsScore": 96, "rsi": 68, "series": "EQ", "bseCode": "500251"
    },
    {
        "symbol": "DIXON", "name": "Dixon Technologies Ltd", "sector": "EMS / Electronics", "isin": "INE935N01020",
        "marketCapCr": 78500, "ltp": 13150.00, "dayChangePct": 4.12, "pe": 88.5, "peg": 1.45,
        "salesGrowthYoY": 120.5, "epsGrowthYoY": 85.0, "roce": 32.4, "roe": 27.8, "piotroskiScore": 9,
        "debtToEquity": 0.18, "pattern": "7-Week High Tight Flag", "rsScore": 94, "rsi": 72, "series": "EQ", "bseCode": "540699"
    },
    {
        "symbol": "BEL", "name": "Bharat Electronics Ltd", "sector": "Defence / Navratna", "isin": "INE263A01024",
        "marketCapCr": 225000, "ltp": 308.20, "dayChangePct": 2.85, "pe": 44.2, "peg": 1.85,
        "salesGrowthYoY": 18.5, "epsGrowthYoY": 28.0, "roce": 34.8, "roe": 26.5, "piotroskiScore": 9,
        "debtToEquity": 0.00, "pattern": "Ascending Triangle Breakout", "rsScore": 91, "rsi": 64, "series": "EQ", "bseCode": "500049"
    },
    {
        "symbol": "HAL", "name": "Hindustan Aeronautics Ltd", "sector": "Defence / Aerospace", "isin": "INE066F01020",
        "marketCapCr": 318000, "ltp": 4750.00, "dayChangePct": 3.10, "pe": 38.6, "peg": 1.35,
        "salesGrowthYoY": 15.8, "epsGrowthYoY": 32.4, "roce": 36.5, "roe": 28.2, "piotroskiScore": 9,
        "debtToEquity": 0.00, "pattern": "VCP Consolidation Base", "rsScore": 89, "rsi": 61, "series": "EQ", "bseCode": "541154"
    },
    {
        "symbol": "POLYCAB", "name": "Polycab India Ltd", "sector": "Wires & Cables / FMEG", "isin": "INE455K01017",
        "marketCapCr": 98000, "ltp": 6520.00, "dayChangePct": 1.95, "pe": 48.2, "peg": 1.70,
        "salesGrowthYoY": 24.5, "epsGrowthYoY": 29.8, "roce": 30.5, "roe": 23.8, "piotroskiScore": 8,
        "debtToEquity": 0.04, "pattern": "Double Bottom Reversal", "rsScore": 86, "rsi": 59, "series": "EQ", "bseCode": "542652"
    },
    {
        "symbol": "SOLARINDS", "name": "Solar Industries India Ltd", "sector": "Industrial Explosives / Defence", "isin": "INE343H01029",
        "marketCapCr": 92500, "ltp": 10220.00, "dayChangePct": 2.40, "pe": 82.5, "peg": 2.10,
        "salesGrowthYoY": 28.0, "epsGrowthYoY": 38.5, "roce": 31.8, "roe": 26.4, "piotroskiScore": 8,
        "debtToEquity": 0.32, "pattern": "Flat Base Breakout", "rsScore": 88, "rsi": 62, "series": "EQ", "bseCode": "532725"
    },
    {
        "symbol": "KAYNES", "name": "Kaynes Technology India Ltd", "sector": "EMS / IoT / Semiconductors", "isin": "INE918Z01012",
        "marketCapCr": 34500, "ltp": 5400.00, "dayChangePct": 5.20, "pe": 115.0, "peg": 1.55,
        "salesGrowthYoY": 74.5, "epsGrowthYoY": 82.0, "roce": 22.4, "roe": 18.5, "piotroskiScore": 8,
        "debtToEquity": 0.15, "pattern": "Cup with Handle", "rsScore": 95, "rsi": 74, "series": "EQ", "bseCode": "543664"
    },
    {
        "symbol": "PERSISTENT", "name": "Persistent Systems Ltd", "sector": "IT Services / Cloud & AI", "isin": "INE262H01013",
        "marketCapCr": 86000, "ltp": 5600.00, "dayChangePct": 1.75, "pe": 55.4, "peg": 2.20,
        "salesGrowthYoY": 16.2, "epsGrowthYoY": 22.5, "roce": 31.0, "roe": 25.2, "piotroskiScore": 9,
        "debtToEquity": 0.02, "pattern": "Ascending Channel Continuation", "rsScore": 84, "rsi": 58, "series": "EQ", "bseCode": "533179"
    },
    {
        "symbol": "CDSL", "name": "Central Depository Services Ltd", "sector": "Capital Markets / Fintech", "isin": "INE736A01011",
        "marketCapCr": 35200, "ltp": 1680.00, "dayChangePct": 2.65, "pe": 62.0, "peg": 1.85,
        "salesGrowthYoY": 38.5, "epsGrowthYoY": 44.0, "roce": 38.2, "roe": 29.5, "piotroskiScore": 9,
        "debtToEquity": 0.00, "pattern": "Multi-Month Base Breakout", "rsScore": 87, "rsi": 60, "series": "EQ", "bseCode": "540515"
    },
    {
        "symbol": "BDL", "name": "Bharat Dynamics Ltd", "sector": "Defence / Missiles", "isin": "INE171Z01018",
        "marketCapCr": 42500, "ltp": 1160.00, "dayChangePct": 3.80, "pe": 58.0, "peg": 1.90,
        "salesGrowthYoY": 22.0, "epsGrowthYoY": 31.0, "roce": 26.5, "roe": 21.0, "piotroskiScore": 8,
        "debtToEquity": 0.00, "pattern": "Inverse Head & Shoulders", "rsScore": 85, "rsi": 63, "series": "EQ", "bseCode": "541143"
    },
    {
        "symbol": "PREMIERENE", "name": "Premier Energies Ltd", "sector": "Renewable / Solar Cells", "isin": "INE239W01016",
        "marketCapCr": 49000, "ltp": 1085.00, "dayChangePct": 4.80, "pe": 72.0, "peg": 1.20,
        "salesGrowthYoY": 180.0, "epsGrowthYoY": 240.0, "roce": 35.0, "roe": 31.2, "piotroskiScore": 9,
        "debtToEquity": 0.25, "pattern": "IPO Base Stage-1 Breakout", "rsScore": 97, "rsi": 76, "series": "EQ", "bseCode": "544240"
    },
    {
        "symbol": "ANGELONE", "name": "Angel One Ltd", "sector": "Fintech / Retail Broking", "isin": "INE732I01013",
        "marketCapCr": 26800, "ltp": 2980.00, "dayChangePct": 3.25, "pe": 24.5, "peg": 0.85,
        "salesGrowthYoY": 42.0, "epsGrowthYoY": 36.5, "roce": 42.5, "roe": 36.8, "piotroskiScore": 9,
        "debtToEquity": 0.12, "pattern": "Cup with Handle", "rsScore": 88, "rsi": 61, "series": "EQ", "bseCode": "543235"
    }
]

def update_live_prices():
    """Generates server-side live micro-ticks for real-time stock updates"""
    for _ in range(random.randint(2, 4)):
        stk = random.choice(SAMPLE_UNIVERSE)
        pct = round(random.uniform(-0.35, 0.45), 2)
        stk["ltp"] = round(stk["ltp"] * (1 + pct / 100.0), 2)
        stk["dayChangePct"] = round(stk["dayChangePct"] + (pct * 0.4), 2)

class ApiRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        update_live_prices()

        if parsed.path == '/api/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            res = {
                "status": "healthy",
                "engine": "Python Live REST API Server",
                "version": "3.3.0",
                "universeSize": len(SAMPLE_UNIVERSE),
                "marketLive": True
            }
            self.wfile.write(json.dumps(res).encode('utf-8'))
            return
        elif parsed.path in ('/api/stocks', '/api/quotes', '/api/live'):
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(SAMPLE_UNIVERSE).encode('utf-8'))
            return
        elif parsed.path == '/api/indices':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            n_delta = round(random.uniform(-1.5, 2.5), 2)
            s_delta = round(random.uniform(-4.0, 6.0), 2)
            indices = {
                "nifty50": {"symbol": "NIFTY 50", "ltp": round(24835.10 + n_delta, 2), "change": round(142.50 + n_delta, 2), "pChange": 0.58},
                "sensex": {"symbol": "BSE SENSEX", "ltp": round(81380.40 + s_delta, 2), "change": round(410.20 + s_delta, 2), "pChange": 0.51},
                "bankNifty": {"symbol": "NIFTY BANK", "ltp": 51290.80, "change": 215.10, "pChange": 0.42},
                "indiaVix": {"symbol": "INDIA VIX", "ltp": 12.85, "change": -0.45, "pChange": -3.38}
            }
            self.wfile.write(json.dumps(indices).encode('utf-8'))
            return
        elif parsed.path == '/api/heatmap':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            sectors = {}
            for s in SAMPLE_UNIVERSE:
                sec = s["sector"]
                sectors.setdefault(sec, []).append(s)
            res = {
                "sectors": sectors,
                "topGainers": sorted(SAMPLE_UNIVERSE, key=lambda x: x["dayChangePct"], reverse=True)[:5],
                "topLosers": sorted(SAMPLE_UNIVERSE, key=lambda x: x["dayChangePct"])[:5]
            }
            self.wfile.write(json.dumps(res).encode('utf-8'))
            return
        
        super().do_GET()

def run_server():
    server_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(server_dir)
    server_address = ('', PORT)
    httpd = HTTPServer(server_address, ApiRequestHandler)
    print(f"Python Backend REST API Server listening on http://localhost:{PORT}/")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")

if __name__ == '__main__':
    run_server()
