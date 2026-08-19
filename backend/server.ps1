# ==============================================================================
# UNIVERSAL INDIAN STOCK SCREENER - NATIVE REST API & WEB SERVER
# Powered by .NET HttpListener (Zero External Dependencies Required)
# ==============================================================================

param(
    [int]$Port = 8080
)

$utf8 = New-Object System.Text.UTF8Encoding($false)
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Prefixes.Add("http://127.0.0.1:$Port/")

try {
    $listener.Start()
} catch {
    Write-Host "[ERROR] Could not bind to port $Port. It may already be in use." -ForegroundColor Red
    exit 1
}

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host " UNIVERSAL INDIAN STOCK SCREENER - BACKEND REST API SERVER" -ForegroundColor Green
Write-Host " Running at: http://localhost:$Port/" -ForegroundColor Yellow
Write-Host " API Health: http://localhost:$Port/api/health" -ForegroundColor Yellow
Write-Host " Stock Data: http://localhost:$Port/api/stocks" -ForegroundColor Yellow
Write-Host " Indices:    http://localhost:$Port/api/indices" -ForegroundColor Yellow
Write-Host " Heatmap:    http://localhost:$Port/api/heatmap" -ForegroundColor Yellow
Write-Host " Press Ctrl+C to terminate the server." -ForegroundColor Gray
Write-Host "==================================================================" -ForegroundColor Cyan

$rootDir = (Resolve-Path "$PSScriptRoot\..").Path
if (-not (Test-Path "$rootDir\index.html")) {
    $rootDir = $PSScriptRoot
}

$mime = @{
    '.html' = 'text/html; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.js'   = 'application/javascript; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.png'  = 'image/png'
    '.svg'  = 'image/svg+xml'
    '.ico'  = 'image/x-icon'
}

# Institutional Stock Universe Dataset
$universe = @(
    @{
        symbol = "TRENT"; name = "Trent Ltd (Westside & Zudio)"; sector = "Retail / Fashion"; isin = "INE849A01020";
        marketCapCr = 238000; ltp = 6720.50; dayChangePct = 3.45; pe = 112.4; peg = 1.65; sectorPe = 85.0;
        fcfYield = 1.85; dividendYield = 0.15; salesGrowthYoY = 54.2; sales3Y_CAGR = 48.6;
        epsGrowthYoY = 62.4; eps3Y_CAGR = 58.2; roce = 28.5; roe = 24.8; opm = 18.2;
        piotroskiScore = 8; debtToEquity = 0.08; interestCoverage = 18.5; currentRatio = 2.10;
        stopLossPct = 6.5; promoterHoldingPct = 37.0; promoterPledgePct = 0.0;
        fiiHoldingPct = 28.4; diiHoldingPct = 16.8; recentInsiderBuying = $true;
        rsScore = 96; rsi = 68; volumeBurstPct = 85; dma50 = 6250.0; dma200 = 5120.0;
        mtfBullishCount = 6; pattern = "Cup with Handle Breakout"; series = "EQ"; bseCode = "500251";
        thesis = "Unprecedented retail footprint expansion via Zudio, superior store unit economics, and 50%+ top-line compounding."
    },
    @{
        symbol = "DIXON"; name = "Dixon Technologies Ltd"; sector = "EMS / Electronics"; isin = "INE935N01020";
        marketCapCr = 78500; ltp = 13150.00; dayChangePct = 4.12; pe = 88.5; peg = 1.45; sectorPe = 65.0;
        fcfYield = 2.10; dividendYield = 0.10; salesGrowthYoY = 120.5; sales3Y_CAGR = 52.0;
        epsGrowthYoY = 85.0; eps3Y_CAGR = 46.5; roce = 32.4; roe = 27.8; opm = 4.2;
        piotroskiScore = 9; debtToEquity = 0.18; interestCoverage = 14.2; currentRatio = 1.45;
        stopLossPct = 5.8; promoterHoldingPct = 33.8; promoterPledgePct = 0.0;
        fiiHoldingPct = 22.5; diiHoldingPct = 24.1; recentInsiderBuying = $false;
        rsScore = 94; rsi = 72; volumeBurstPct = 120; dma50 = 11800.0; dma200 = 9450.0;
        mtfBullishCount = 6; pattern = "7-Week High Tight Flag"; series = "EQ"; bseCode = "540699";
        thesis = "Leading electronic manufacturing services player benefiting directly from mobile, IT hardware, and component PLI schemes."
    },
    @{
        symbol = "BEL"; name = "Bharat Electronics Ltd"; sector = "Defence / Navratna"; isin = "INE263A01024";
        marketCapCr = 225000; ltp = 308.20; dayChangePct = 2.85; pe = 44.2; peg = 1.85; sectorPe = 52.0;
        fcfYield = 2.95; dividendYield = 0.95; salesGrowthYoY = 18.5; sales3Y_CAGR = 17.2;
        epsGrowthYoY = 28.0; eps3Y_CAGR = 24.5; roce = 34.8; roe = 26.5; opm = 24.6;
        piotroskiScore = 9; debtToEquity = 0.00; interestCoverage = 95.0; currentRatio = 1.95;
        stopLossPct = 4.5; promoterHoldingPct = 51.1; promoterPledgePct = 0.0;
        fiiHoldingPct = 17.4; diiHoldingPct = 19.8; recentInsiderBuying = $false;
        rsScore = 91; rsi = 64; volumeBurstPct = 45; dma50 = 292.0; dma200 = 245.0;
        mtfBullishCount = 5; pattern = "Ascending Triangle Breakout"; series = "EQ"; bseCode = "500049";
        thesis = "Zero-debt defense electronics champion with order book exceeding Rs 76,000 Cr and robust export pipeline."
    },
    @{
        symbol = "HAL"; name = "Hindustan Aeronautics Ltd"; sector = "Defence / Aerospace"; isin = "INE066F01020";
        marketCapCr = 318000; ltp = 4750.00; dayChangePct = 3.10; pe = 38.6; peg = 1.35; sectorPe = 52.0;
        fcfYield = 3.40; dividendYield = 0.85; salesGrowthYoY = 15.8; sales3Y_CAGR = 14.5;
        epsGrowthYoY = 32.4; eps3Y_CAGR = 29.8; roce = 36.5; roe = 28.2; opm = 28.5;
        piotroskiScore = 9; debtToEquity = 0.00; interestCoverage = 110.0; currentRatio = 2.20;
        stopLossPct = 5.0; promoterHoldingPct = 71.6; promoterPledgePct = 0.0;
        fiiHoldingPct = 12.8; diiHoldingPct = 8.5; recentInsiderBuying = $false;
        rsScore = 89; rsi = 61; volumeBurstPct = 60; dma50 = 4520.0; dma200 = 3850.0;
        mtfBullishCount = 5; pattern = "VCP Consolidation Base"; series = "EQ"; bseCode = "541154";
        thesis = "Monopolistic military aircraft and helicopter manufacturer with massive multi-year Tejas Mk1A and engine production contracts."
    },
    @{
        symbol = "POLYCAB"; name = "Polycab India Ltd"; sector = "Wires & Cables / FMEG"; isin = "INE455K01017";
        marketCapCr = 98000; ltp = 6520.00; dayChangePct = 1.95; pe = 48.2; peg = 1.70; sectorPe = 45.0;
        fcfYield = 2.25; dividendYield = 0.45; salesGrowthYoY = 24.5; sales3Y_CAGR = 26.8;
        epsGrowthYoY = 29.8; eps3Y_CAGR = 33.2; roce = 30.5; roe = 23.8; opm = 13.8;
        piotroskiScore = 8; debtToEquity = 0.04; interestCoverage = 35.0; currentRatio = 2.45;
        stopLossPct = 5.2; promoterHoldingPct = 63.1; promoterPledgePct = 0.0;
        fiiHoldingPct = 12.5; diiHoldingPct = 14.8; recentInsiderBuying = $false;
        rsScore = 86; rsi = 59; volumeBurstPct = 35; dma50 = 6280.0; dma200 = 5540.0;
        mtfBullishCount = 5; pattern = "Double Bottom Reversal"; series = "EQ"; bseCode = "542652";
        thesis = "Market leader in domestic cables & wires benefiting from infrastructure, real estate, and data center electrification demand."
    },
    @{
        symbol = "SOLARINDS"; name = "Solar Industries India Ltd"; sector = "Industrial Explosives / Defence"; isin = "INE343H01029";
        marketCapCr = 92500; ltp = 10220.00; dayChangePct = 2.40; pe = 82.5; peg = 2.10; sectorPe = 60.0;
        fcfYield = 1.45; dividendYield = 0.12; salesGrowthYoY = 28.0; sales3Y_CAGR = 34.5;
        epsGrowthYoY = 38.5; eps3Y_CAGR = 42.0; roce = 31.8; roe = 26.4; opm = 23.5;
        piotroskiScore = 8; debtToEquity = 0.32; interestCoverage = 16.5; currentRatio = 1.75;
        stopLossPct = 6.0; promoterHoldingPct = 73.1; promoterPledgePct = 0.0;
        fiiHoldingPct = 7.2; diiHoldingPct = 14.5; recentInsiderBuying = $false;
        rsScore = 88; rsi = 62; volumeBurstPct = 40; dma50 = 9850.0; dma200 = 8420.0;
        mtfBullishCount = 5; pattern = "Flat Base Breakout"; series = "EQ"; bseCode = "532725";
        thesis = "Dominant industrial explosives supplier expanding rapidly into defense warheads, propellants, and drone ammunitions."
    },
    @{
        symbol = "KAYNES"; name = "Kaynes Technology India Ltd"; sector = "EMS / IoT / Semiconductors"; isin = "INE918Z01012";
        marketCapCr = 34500; ltp = 5400.00; dayChangePct = 5.20; pe = 115.0; peg = 1.55; sectorPe = 70.0;
        fcfYield = 1.10; dividendYield = 0.00; salesGrowthYoY = 74.5; sales3Y_CAGR = 58.0;
        epsGrowthYoY = 82.0; eps3Y_CAGR = 64.5; roce = 22.4; roe = 18.5; opm = 14.2;
        piotroskiScore = 8; debtToEquity = 0.15; interestCoverage = 12.8; currentRatio = 2.30;
        stopLossPct = 7.2; promoterHoldingPct = 57.8; promoterPledgePct = 0.0;
        fiiHoldingPct = 14.2; diiHoldingPct = 18.5; recentInsiderBuying = $true;
        rsScore = 95; rsi = 74; volumeBurstPct = 145; dma50 = 4820.0; dma200 = 3650.0;
        mtfBullishCount = 6; pattern = "Cup with Handle"; series = "EQ"; bseCode = "543664";
        thesis = "High-margin IoT and automotive electronics manufacturer setting up an advanced OSAT semiconductor testing facility in Gujarat."
    },
    @{
        symbol = "PERSISTENT"; name = "Persistent Systems Ltd"; sector = "IT Services / Cloud & AI"; isin = "INE262H01013";
        marketCapCr = 86000; ltp = 5600.00; dayChangePct = 1.75; pe = 55.4; peg = 2.20; sectorPe = 32.0;
        fcfYield = 2.40; dividendYield = 0.55; salesGrowthYoY = 16.2; sales3Y_CAGR = 24.8;
        epsGrowthYoY = 22.5; eps3Y_CAGR = 28.4; roce = 31.0; roe = 25.2; opm = 17.5;
        piotroskiScore = 9; debtToEquity = 0.02; interestCoverage = 42.0; currentRatio = 2.10;
        stopLossPct = 4.8; promoterHoldingPct = 31.0; promoterPledgePct = 0.0;
        fiiHoldingPct = 24.5; diiHoldingPct = 27.2; recentInsiderBuying = $false;
        rsScore = 84; rsi = 58; volumeBurstPct = 25; dma50 = 5380.0; dma200 = 4650.0;
        mtfBullishCount = 5; pattern = "Ascending Channel Continuation"; series = "EQ"; bseCode = "533179";
        thesis = "Industry-leading revenue growth in software engineering, enterprise cloud migration, and generative AI transformation."
    },
    @{
        symbol = "CDSL"; name = "Central Depository Services Ltd"; sector = "Capital Markets / Fintech"; isin = "INE736A01011";
        marketCapCr = 35200; ltp = 1680.00; dayChangePct = 2.65; pe = 62.0; peg = 1.85; sectorPe = 48.0;
        fcfYield = 2.60; dividendYield = 0.90; salesGrowthYoY = 38.5; sales3Y_CAGR = 32.0;
        epsGrowthYoY = 44.0; eps3Y_CAGR = 36.5; roce = 38.2; roe = 29.5; opm = 61.5;
        piotroskiScore = 9; debtToEquity = 0.00; interestCoverage = 150.0; currentRatio = 3.50;
        stopLossPct = 5.0; promoterHoldingPct = 20.0; promoterPledgePct = 0.0;
        fiiHoldingPct = 15.8; diiHoldingPct = 23.4; recentInsiderBuying = $false;
        rsScore = 87; rsi = 60; volumeBurstPct = 55; dma50 = 1590.0; dma200 = 1320.0;
        mtfBullishCount = 5; pattern = "Multi-Month Base Breakout"; series = "EQ"; bseCode = "540515";
        thesis = "Market leader in demat account market share (>11.5 Crore demat accounts) with high operating margins (>60%) and zero debt."
    },
    @{
        symbol = "BDL"; name = "Bharat Dynamics Ltd"; sector = "Defence / Missiles"; isin = "INE171Z01018";
        marketCapCr = 42500; ltp = 1160.00; dayChangePct = 3.80; pe = 58.0; peg = 1.90; sectorPe = 52.0;
        fcfYield = 2.10; dividendYield = 0.75; salesGrowthYoY = 22.0; sales3Y_CAGR = 19.5;
        epsGrowthYoY = 31.0; eps3Y_CAGR = 25.8; roce = 26.5; roe = 21.0; opm = 22.8;
        piotroskiScore = 8; debtToEquity = 0.00; interestCoverage = 80.0; currentRatio = 2.05;
        stopLossPct = 5.5; promoterHoldingPct = 74.9; promoterPledgePct = 0.0;
        fiiHoldingPct = 3.8; diiHoldingPct = 12.4; recentInsiderBuying = $false;
        rsScore = 85; rsi = 63; volumeBurstPct = 70; dma50 = 1080.0; dma200 = 920.0;
        mtfBullishCount = 5; pattern = "Inverse Head & Shoulders"; series = "EQ"; bseCode = "541143";
        thesis = "Sole manufacturer of surface-to-air Akash and Astra missile systems in India with large export order pipelines."
    },
    @{
        symbol = "PREMIERENE"; name = "Premier Energies Ltd"; sector = "Renewable / Solar Cells"; isin = "INE239W01016";
        marketCapCr = 49000; ltp = 1085.00; dayChangePct = 4.80; pe = 72.0; peg = 1.20; sectorPe = 65.0;
        fcfYield = 1.90; dividendYield = 0.00; salesGrowthYoY = 180.0; sales3Y_CAGR = 85.0;
        epsGrowthYoY = 240.0; eps3Y_CAGR = 110.0; roce = 35.0; roe = 31.2; opm = 26.5;
        piotroskiScore = 9; debtToEquity = 0.25; interestCoverage = 11.5; currentRatio = 1.65;
        stopLossPct = 6.8; promoterHoldingPct = 72.2; promoterPledgePct = 0.0;
        fiiHoldingPct = 8.5; diiHoldingPct = 11.2; recentInsiderBuying = $true;
        rsScore = 97; rsi = 76; volumeBurstPct = 160; dma50 = 960.0; dma200 = 780.0;
        mtfBullishCount = 6; pattern = "IPO Base Stage-1 Breakout"; series = "EQ"; bseCode = "544240";
        thesis = "India's 2nd largest integrated solar cell and module manufacturer with huge multi-GW capacity expansions and ALMM protection."
    },
    @{
        symbol = "ANGELONE"; name = "Angel One Ltd"; sector = "Fintech / Retail Broking"; isin = "INE732I01013";
        marketCapCr = 26800; ltp = 2980.00; dayChangePct = 3.25; pe = 24.5; peg = 0.85; sectorPe = 35.0;
        fcfYield = 4.80; dividendYield = 1.85; salesGrowthYoY = 42.0; sales3Y_CAGR = 38.5;
        epsGrowthYoY = 36.5; eps3Y_CAGR = 34.0; roce = 42.5; roe = 36.8; opm = 38.0;
        piotroskiScore = 9; debtToEquity = 0.12; interestCoverage = 22.0; currentRatio = 1.85;
        stopLossPct = 5.2; promoterHoldingPct = 38.2; promoterPledgePct = 0.0;
        fiiHoldingPct = 18.2; diiHoldingPct = 10.5; recentInsiderBuying = $true;
        rsScore = 88; rsi = 61; volumeBurstPct = 65; dma50 = 2820.0; dma200 = 2450.0;
        mtfBullishCount = 5; pattern = "Cup with Handle"; series = "EQ"; bseCode = "543235";
        thesis = "Fintech powerhouse trading at attractive valuation (PE 24.5x, PEG 0.85) with industry-leading client addition and FCF."
    }
)

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $req = $context.Request
        $res = $context.Response

        $res.AddHeader('Access-Control-Allow-Origin', '*')
        $res.AddHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        $res.AddHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

        if ($req.HttpMethod -eq 'OPTIONS') {
            $res.StatusCode = 200
            $res.Close()
            continue
        }

        $urlPath = $req.Url.LocalPath.ToLower()

        # ── REST API ENDPOINTS ───────────────────────────────────────────────────
        if ($urlPath -eq '/api/health') {
            $resObj = @{
                status = "healthy";
                engine = "Antigravity Native .NET REST API";
                version = "3.2.0";
                timestamp = (Get-Date).ToString("o");
                universeSize = $universe.Count;
                activeProtocols = 10;
            }
            $json = ConvertTo-Json -InputObject $resObj -Compress
            $bytes = $utf8.GetBytes($json)
            $res.ContentType = 'application/json; charset=utf-8'
            $res.ContentLength64 = $bytes.Length
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
        }
        elseif ($urlPath -eq '/api/stocks') {
            $json = ConvertTo-Json -InputObject $universe -Depth 4 -Compress
            $bytes = $utf8.GetBytes($json)
            $res.ContentType = 'application/json; charset=utf-8'
            $res.ContentLength64 = $bytes.Length
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
        }
        elseif ($urlPath -eq '/api/indices') {
            $indices = @{
                nifty50 = @{ symbol = "NIFTY 50"; ltp = 24835.10; change = 142.50; pChange = 0.58 };
                sensex  = @{ symbol = "BSE SENSEX"; ltp = 81380.40; change = 410.20; pChange = 0.51 };
                bankNifty = @{ symbol = "NIFTY BANK"; ltp = 51290.80; change = 215.10; pChange = 0.42 };
                indiaVix = @{ symbol = "INDIA VIX"; ltp = 12.85; change = -0.45; pChange = -3.38 };
                fiiDii = @{ fiiNetCr = 2480; diiNetCr = 3150 };
            }
            $json = ConvertTo-Json -InputObject $indices -Depth 3 -Compress
            $bytes = $utf8.GetBytes($json)
            $res.ContentType = 'application/json; charset=utf-8'
            $res.ContentLength64 = $bytes.Length
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
        }
        elseif ($urlPath -eq '/api/heatmap') {
            $sectors = @{}
            foreach ($s in $universe) {
                $sec = $s.sector
                if (-not $sectors.ContainsKey($sec)) { $sectors[$sec] = @() }
                $sectors[$sec] += $s
            }
            $resObj = @{
                sectors = $sectors;
                topGainers = ($universe | Sort-Object dayChangePct -Descending | Select-Object -First 5);
                topLosers = ($universe | Sort-Object dayChangePct | Select-Object -First 5);
            }
            $json = ConvertTo-Json -InputObject $resObj -Depth 4 -Compress
            $bytes = $utf8.GetBytes($json)
            $res.ContentType = 'application/json; charset=utf-8'
            $res.ContentLength64 = $bytes.Length
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
        }
        # ── STATIC FILE SERVING ───────────────────────────────────────────────────
        else {
            $localRel = $req.Url.LocalPath
            if ($localRel -eq '/' -or $localRel -eq '') { $localRel = '/index.html' }
            $filePath = $rootDir + $localRel.Replace('/', '\')

            if (Test-Path $filePath -PathType Leaf) {
                $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                $contentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
                $bytes = [System.IO.File]::ReadAllBytes($filePath)
                $res.ContentType = $contentType
                $res.ContentLength64 = $bytes.Length
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $res.StatusCode = 404
                $msg = $utf8.GetBytes("404 Not Found: $localRel")
                $res.OutputStream.Write($msg, 0, $msg.Length)
            }
        }

        $res.Close()
    } catch {
        # Silent exception catch to keep server loop resilient
    }
}
