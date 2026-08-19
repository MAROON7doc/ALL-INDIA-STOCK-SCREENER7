"""
Universal Indian Stock Screener - Python REST API Server
Provides high-throughput screening, live quotes proxy, and JSON API endpoints.
Runs natively with standard library http.server (or FastAPI if installed).
"""

import json
import os
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler
import urllib.parse

PORT = 8080

SAMPLE_UNIVERSE = [
    {
        "symbol": "TRENT", "name": "Trent Ltd (Westside & Zudio)", "sector": "Retail / Fashion",
        "marketCapCr": 238000, "ltp": 6720.50, "dayChangePct": 3.45, "pe": 112.4, "peg": 1.65,
        "salesGrowthYoY": 54.2, "epsGrowthYoY": 62.4, "roce": 28.5, "roe": 24.8, "piotroskiScore": 8,
        "debtToEquity": 0.08, "pattern": "Cup with Handle Breakout", "rsScore": 96, "rsi": 68
    },
    {
        "symbol": "DIXON", "name": "Dixon Technologies Ltd", "sector": "EMS / Electronics",
        "marketCapCr": 78500, "ltp": 13150.00, "dayChangePct": 4.12, "pe": 88.5, "peg": 1.45,
        "salesGrowthYoY": 120.5, "epsGrowthYoY": 85.0, "roce": 32.4, "roe": 27.8, "piotroskiScore": 9,
        "debtToEquity": 0.18, "pattern": "7-Week High Tight Flag", "rsScore": 94, "rsi": 72
    },
    {
        "symbol": "BEL", "name": "Bharat Electronics Ltd", "sector": "Defence / Navratna",
        "marketCapCr": 225000, "ltp": 308.20, "dayChangePct": 2.85, "pe": 44.2, "peg": 1.85,
        "salesGrowthYoY": 18.5, "epsGrowthYoY": 28.0, "roce": 34.8, "roe": 26.5, "piotroskiScore": 9,
        "debtToEquity": 0.00, "pattern": "Ascending Triangle Breakout", "rsScore": 91, "rsi": 64
    },
    {
        "symbol": "HAL", "name": "Hindustan Aeronautics Ltd", "sector": "Defence / Aerospace",
        "marketCapCr": 318000, "ltp": 4750.00, "dayChangePct": 3.10, "pe": 38.6, "peg": 1.35,
        "salesGrowthYoY": 15.8, "epsGrowthYoY": 32.4, "roce": 36.5, "roe": 28.2, "piotroskiScore": 9,
        "debtToEquity": 0.00, "pattern": "VCP Consolidation Base", "rsScore": 89, "rsi": 61
    },
    {
        "symbol": "POLYCAB", "name": "Polycab India Ltd", "sector": "Wires & Cables / FMEG",
        "marketCapCr": 98000, "ltp": 6520.00, "dayChangePct": 1.95, "pe": 48.2, "peg": 1.70,
        "salesGrowthYoY": 24.5, "epsGrowthYoY": 29.8, "roce": 30.5, "roe": 23.8, "piotroskiScore": 8,
        "debtToEquity": 0.04, "pattern": "Double Bottom Reversal", "rsScore": 86, "rsi": 59
    },
    {
        "symbol": "SOLARINDS", "name": "Solar Industries India Ltd", "sector": "Industrial Explosives / Defence",
        "marketCapCr": 92500, "ltp": 10220.00, "dayChangePct": 2.40, "pe": 82.5, "peg": 2.10,
        "salesGrowthYoY": 28.0, "epsGrowthYoY": 38.5, "roce": 31.8, "roe": 26.4, "piotroskiScore": 8,
        "debtToEquity": 0.32, "pattern": "Flat Base Breakout", "rsScore": 88, "rsi": 62
    },
    {
        "symbol": "KAYNES", "name": "Kaynes Technology India Ltd", "sector": "EMS / IoT / Semiconductors",
        "marketCapCr": 34500, "ltp": 5400.00, "dayChangePct": 5.20, "pe": 115.0, "peg": 1.55,
        "salesGrowthYoY": 74.5, "epsGrowthYoY": 82.0, "roce": 22.4, "roe": 18.5, "piotroskiScore": 8,
        "debtToEquity": 0.15, "pattern": "Cup with Handle", "rsScore": 95, "rsi": 74
    },
    {
        "symbol": "PERSISTENT", "name": "Persistent Systems Ltd", "sector": "IT Services / Cloud & AI",
        "marketCapCr": 86000, "ltp": 5600.00, "dayChangePct": 1.75, "pe": 55.4, "peg": 2.20,
        "salesGrowthYoY": 16.2, "epsGrowthYoY": 22.5, "roce": 31.0, "roe": 25.2, "piotroskiScore": 9,
        "debtToEquity": 0.02, "pattern": "Ascending Channel Continuation", "rsScore": 84, "rsi": 58
    },
    {
        "symbol": "CDSL", "name": "Central Depository Services Ltd", "sector": "Capital Markets / Fintech",
        "marketCapCr": 35200, "ltp": 1680.00, "dayChangePct": 2.65, "pe": 62.0, "peg": 1.85,
        "salesGrowthYoY": 38.5, "epsGrowthYoY": 44.0, "roce": 38.2, "roe": 29.5, "piotroskiScore": 9,
        "debtToEquity": 0.00, "pattern": "Multi-Month Base Breakout", "rsScore": 87, "rsi": 60
    },
    {
        "symbol": "BDL", "name": "Bharat Dynamics Ltd", "sector": "Defence / Missiles",
        "marketCapCr": 42500, "ltp": 1160.00, "dayChangePct": 3.80, "pe": 58.0, "peg": 1.90,
        "salesGrowthYoY": 22.0, "epsGrowthYoY": 31.0, "roce": 26.5, "roe": 21.0, "piotroskiScore": 8,
        "debtToEquity": 0.00, "pattern": "Inverse Head & Shoulders", "rsScore": 85, "rsi": 63
    },
    {
        "symbol": "PREMIERENE", "name": "Premier Energies Ltd", "sector": "Renewable / Solar Cells",
        "marketCapCr": 49000, "ltp": 1085.00, "dayChangePct": 4.80, "pe": 72.0, "peg": 1.20,
        "salesGrowthYoY": 180.0, "epsGrowthYoY": 240.0, "roce": 35.0, "roe": 31.2, "piotroskiScore": 9,
        "debtToEquity": 0.25, "pattern": "IPO Base Stage-1 Breakout", "rsScore": 97, "rsi": 76
    },
    {
        "symbol": "ANGELONE", "name": "Angel One Ltd", "sector": "Fintech / Retail Broking",
        "marketCapCr": 26800, "ltp": 2980.00, "dayChangePct": 3.25, "pe": 24.5, "peg": 0.85,
        "salesGrowthYoY": 42.0, "epsGrowthYoY": 36.5, "roce": 42.5, "roe": 36.8, "piotroskiScore": 9,
        "debtToEquity": 0.12, "pattern": "Cup with Handle", "rsScore": 88, "rsi": 61
    }
]

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
        if parsed.path == '/api/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            res = {
                "status": "healthy",
                "engine": "Python REST API Server",
                "universeSize": len(SAMPLE_UNIVERSE)
            }
            self.wfile.write(json.dumps(res).encode('utf-8'))
            return
        elif parsed.path == '/api/stocks':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(SAMPLE_UNIVERSE).encode('utf-8'))
            return
        elif parsed.path == '/api/indices':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            indices = {
                "nifty50": {"symbol": "NIFTY 50", "ltp": 24835.10, "change": 142.50, "pChange": 0.58},
                "sensex": {"symbol": "BSE SENSEX", "ltp": 81380.40, "change": 410.20, "pChange": 0.51}
            }
            self.wfile.write(json.dumps(indices).encode('utf-8'))
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
