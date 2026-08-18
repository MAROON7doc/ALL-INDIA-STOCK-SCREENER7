$port = 8080
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add('http://localhost:8080/')
$listener.Prefixes.Add('http://127.0.0.1:8080/')
$listener.Start()
Write-Host 'Local Web Server started at http://localhost:8080/'

$mime = @{
    '.html' = 'text/html; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.js'   = 'application/javascript; charset=utf-8'
    '.json' = 'application/json'
    '.png'  = 'image/png'
    '.svg'  = 'image/svg+xml'
    '.ico'  = 'image/x-icon'
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $reqPath = $context.Request.Url.LocalPath
        if ($reqPath -eq '/' -or $reqPath -eq '') { $reqPath = '/index.html' }
        $localFile = (Get-Location).Path + $reqPath.Replace('/', '\')

        if (Test-Path $localFile -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($localFile).ToLower()
            $contentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
            $bytes = [System.IO.File]::ReadAllBytes($localFile)
            $context.Response.ContentType = $contentType
            $context.Response.ContentLength64 = $bytes.Length
            $context.Response.AddHeader('Access-Control-Allow-Origin', '*')
            $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $context.Response.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes('404 Not Found')
            $context.Response.OutputStream.Write($msg, 0, $msg.Length)
        }
        $context.Response.Close()
    } catch {}
}