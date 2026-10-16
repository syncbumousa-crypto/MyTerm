# ============================================================
#  خادمٌ ساكنٌ صغير — بلا Python وبلا تنصيب
# ============================================================
#  يخدم مجلّدَه على المنفذ، ويفتح المتصفّح. أوقِفه بـCtrl+C.

param([int]$Port = 8796)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

$types = @{
  '.html'='text/html; charset=utf-8'; '.css'='text/css; charset=utf-8';
  '.js'='application/javascript; charset=utf-8'; '.json'='application/json; charset=utf-8';
  '.svg'='image/svg+xml'; '.png'='image/png'; '.jpg'='image/jpeg'; '.ico'='image/x-icon';
  '.webp'='image/webp'; '.gif'='image/gif'; '.jpeg'='image/jpeg';
  '.woff2'='font/woff2'; '.txt'='text/plain; charset=utf-8'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
try { $listener.Start() }
catch { Write-Host "تعذّر فتح المنفذ $Port — جرّب منفذًا آخر." -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "  http://localhost:$Port/" -ForegroundColor Cyan
Write-Host "  (Ctrl+C للإيقاف)"
Write-Host ""


while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
    if ([string]::IsNullOrWhiteSpace($rel)) { $rel = 'index.html' }
    $path = Join-Path $root $rel
    # A directory means its index, as any real server does — a rig that 404s
    # where the live site serves will send you chasing ghosts.
    if (Test-Path -LiteralPath $path -PathType Container) { $path = Join-Path $path 'index.html' }

    # لا يُخرَج من المجلّد
    $full = [System.IO.Path]::GetFullPath($path)
    if (-not $full.StartsWith([System.IO.Path]::GetFullPath($root), [StringComparison]::OrdinalIgnoreCase)) {
      $ctx.Response.StatusCode = 403; $ctx.Response.Close(); continue
    }

    if (Test-Path -LiteralPath $full -PathType Leaf) {
      # ولا خزانة في الفحص المحلي: اربك ذلك فحوصا كثيرة
      $ctx.Response.Headers.Add("Cache-Control","no-store, must-revalidate")
      $ext = [System.IO.Path]::GetExtension($full).ToLower()
      $ctx.Response.ContentType = $(if ($types.ContainsKey($ext)) { $types[$ext] } else { 'application/octet-stream' })
      $bytes = [System.IO.File]::ReadAllBytes($full)
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $ctx.Response.StatusCode = 404
      $b = [Text.Encoding]::UTF8.GetBytes('404')
      $ctx.Response.OutputStream.Write($b, 0, $b.Length)
    }
    $ctx.Response.Close()
  } catch { }
}
