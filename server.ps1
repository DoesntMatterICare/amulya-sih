# Basic static file server in PowerShell for serving the Luma Landing Page with Clean URL routing
$port = 3000
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

Write-Host "Starting server..."
try {
    $listener.Start()
    Write-Host "Luma platform is running locally!"
    Write-Host "Open your browser and navigate to: http://localhost:$port/"
    Write-Host "Press Ctrl+C in this terminal window to stop the server."
    
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $rawPath = $request.Url.LocalPath
        if ($rawPath -eq "/") {
            $rawPath = "/index.html"
        }
        
        # Clean URL Routing
        if ($rawPath -eq "/login" -or $rawPath -eq "/signup") {
            $rawPath = "/auth.html"
        } elseif ($rawPath -eq "/discovery-assessment") {
            $rawPath = "/assessment.html"
        } elseif ($rawPath -eq "/recommendations") {
            $rawPath = "/recommendations.html"
        } elseif ($rawPath -eq "/dashboard") {
            $rawPath = "/dashboard.html"
        } elseif ($rawPath -eq "/learning-hub") {
            $rawPath = "/learning.html"
        } elseif ($rawPath -eq "/learning-concept") {
            $rawPath = "/learning-concept.html"
        } elseif ($rawPath -eq "/journey") {
            $rawPath = "/journey.html"
        } elseif ($rawPath -eq "/explorer-hub") {
            $rawPath = "/explorer.html"
        } elseif ($rawPath -eq "/summary") {
            $rawPath = "/summary.html"
        } elseif ($rawPath -eq "/profile") {
            $rawPath = "/profile.html"
        }
        
        # Build local path
        $filePath = Join-Path (Get-Location) $rawPath.TrimStart('/')
        
        if (Test-Path $filePath -PathType Leaf) {
            $extension = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = "application/octet-stream"
            switch ($extension) {
                ".html" { $contentType = "text/html; charset=utf-8" }
                ".css"  { $contentType = "text/css" }
                ".js"   { $contentType = "application/javascript" }
                ".jpg"  { $contentType = "image/jpeg" }
                ".png"  { $contentType = "image/png" }
                ".svg"  { $contentType = "image/svg+xml" }
            }
            
            $response.ContentType = $contentType
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $errorMessage = "404 - File Not Found"
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($errorMessage)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        }
        $response.OutputStream.Close()
    }
} catch {
    Write-Error $_
} finally {
    if ($listener) {
        $listener.Close()
    }
}
