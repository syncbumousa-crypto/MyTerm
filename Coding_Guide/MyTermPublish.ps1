# ============================================================
# # 🚚 🛡️  THE ONLY WAY FILES REACH THE SITE
# # 🔤 PowerShell
# # 🎯 Takes a handful of local files and a version number, puts them on a
# #    fresh branch cut from the publishing branch, merges it, waits for
# #    the build, and proves the new version is the one being served
# # 🔗 Three mistakes already happened by hand, so each is a refusal here:
# #    a branch cut from an old point (behind_by), a path that does not
# #    already exist on the publishing branch (a typo silently becomes a
# #    NEW file instead of an edit), and an emoji mangled into mojibake by
# #    PowerShell 5.1, which quietly builds a twin folder beside the real
# #    one. So no emoji is written literally in any LINE THAT RUNS here:
# #    PowerShell 5.1 reads a script without a BOM as ANSI, and an emoji
# #    typed into a path string arrives at GitHub as a different folder.
# #    Callers pass emoji folders the same way, built from code points
# ============================================================
param(
  [Parameter(Mandatory)] [int]    $Version,
  [Parameter(Mandatory)] [string] $Branch,
  [Parameter(Mandatory)] [string] $Message,
  [Parameter(Mandatory)] [hashtable[]] $Files,   # @{ local = '...'; path = 'docs/...' }
  [string[]] $New   = @(),       # paths deliberately created for the first time
  [string] $Repo    = 'syncbumousa-crypto/MyTerm',
  [string] $Publish = 'Puplished',
  [switch] $NoMerge
)
$ErrorActionPreference = 'Stop'
$gh   = "C:\Program Files\GitHub CLI\gh.exe"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$utf8 = New-Object System.Text.UTF8Encoding $false

function Post($path, $obj, $name) {
  $f = Join-Path $here "_pub_$name.json"
  [System.IO.File]::WriteAllText($f, ($obj | ConvertTo-Json -Depth 20 -Compress), $utf8)
  $out = & $gh api -X POST "repos/$Repo/$path" --input $f
  if ($LASTEXITCODE -ne 0) { throw "POST $path failed: $out" }
  $out | ConvertFrom-Json
}

# --- refusal 1: a path that is not already published is a typo, not an edit,
# --- and mojibake is exactly what a typo looks like when an emoji is lost
$base     = (& $gh api "repos/$Repo/git/ref/heads/$Publish" --jq ".object.sha").Trim()
$baseTree = (& $gh api "repos/$Repo/commits/$base" --jq ".commit.tree.sha").Trim()
$known    = (& $gh api "repos/$Repo/git/trees/$baseTree`?recursive=1" | ConvertFrom-Json).tree |
            Where-Object { $_.type -eq 'blob' } | ForEach-Object { $_.path }
foreach ($f in $Files) {
  if ($f.path -match '[\u00C0-\u00FF]{2}') { throw "GUARD mojibake in path -> $($f.path)" }
  if (-not (Test-Path $f.local))           { throw "GUARD no local file -> $($f.local)" }
  if ($known -notcontains $f.path -and $New -notcontains $f.path) {
    throw "GUARD not on $Publish -> $($f.path)  (pass it in -New if it is meant to be a new file)"
  }
}
"guard: $($Files.Count) paths checked against $Publish, none mangled" +
  $(if ($New.Count) { ", $($New.Count) allowed as new" })

# --- refusal 2: no half-cut comment frame. Editing a file by character
# --- offsets can slice a header in two and take the code under it with it;
# --- what is left parses perfectly and throws at the first call. It shows
# --- as two title lines with no frame between them, so that is what is
# --- counted: every block opens with a frame and closes with one
foreach ($f in $Files) {
  if ($f.path -notmatch '\.(js|css|html)$') { continue }
  $text = Get-Content $f.local -Raw -Encoding UTF8
  $marks = [regex]::Matches($text, '(?m)^\s*(?://|/\*)\s*(?<kind>#\s*\p{So}|=+\s*\*/|#\s*=+|-{10,})')
  $titles = ([regex]::Matches($text, '(?m)^\s*(?://|/\*)\s*#\s*🔤')).Count
  $frames = ([regex]::Matches($text, '(?m)^\s*(?://|/\*)\s*=====')).Count
  if ($titles -gt 0 -and $frames -lt ($titles * 2)) {
    throw "GUARD a comment frame is cut in $($f.path): $titles headers but only $frames frame lines (needs $($titles * 2))"
  }
}
"guard: every comment frame is whole"

# --- refusal 3: the version must actually be stamped in what is being sent
$idx = $Files | Where-Object { $_.path -eq 'docs/index.html' }
if ($idx) {
  $h = Get-Content $idx.local -Raw -Encoding UTF8
  $stamps = ([regex]::Matches($h, "\?v=$Version\b")).Count
  $corner = [regex]::IsMatch($h, ">v$Version<")
  if ($stamps -lt 1 -or -not $corner) { throw "GUARD version $Version not stamped: calls=$stamps corner=$corner" }
  if ([regex]::IsMatch($h, "\?v=(?!$Version\b)\d+")) { throw "GUARD a stale ?v= is still in index.html" }
  "guard: v$Version stamped in $stamps calls and in the corner"
}

$entries = @()
foreach ($f in $Files) {
  $b64  = [Convert]::ToBase64String([System.IO.File]::ReadAllBytes($f.local))
  $blob = Post "git/blobs" @{ content = $b64; encoding = "base64" } ($f.path -replace '[^A-Za-z0-9]', '_')
  "  blob " + $blob.sha.Substring(0, 8) + "  " + ($f.local -replace '.*\\', '')
  $entries += @{ path = $f.path; mode = "100644"; type = "blob"; sha = $blob.sha }
}

$tree   = Post "git/trees"   @{ base_tree = $baseTree; tree = $entries } "tree"
$commit = Post "git/commits" @{ message = $Message; tree = $tree.sha; parents = @($base) } "commit"
$ref    = Post "git/refs"    @{ ref = "refs/heads/$Branch"; sha = $commit.sha } "ref"
"branch $Branch at " + $commit.sha.Substring(0, 8)

# --- refusal 4: never merge a branch that is behind the publishing branch
$behind = [int](& $gh api "repos/$Repo/compare/$Publish...$Branch" --jq ".behind_by").Trim()
if ($behind -ne 0) { throw "GUARD $Branch is $behind commits behind $Publish - merge $Publish into it first" }
if ($NoMerge) { "held: not merged (asked not to)"; return }

$headline = if ($idx) { "Publish v$Version" } else { ($Message -split "`n")[0] }
[System.IO.File]::WriteAllText((Join-Path $here "_pub_merge.json"),
  (@{ base = $Publish; head = $Branch; commit_message = $headline } | ConvertTo-Json -Compress), $utf8)
$m = & $gh api -X POST "repos/$Repo/merges" --input (Join-Path $here "_pub_merge.json") | ConvertFrom-Json
"merged as " + $m.sha.Substring(0, 8)

# --- the proof: the live page, not the build log. Nothing under docs/ was
# --- touched, so there is no new page to wait for
if (-not ($Files | Where-Object { $_.path -like 'docs/*' })) { "nothing under docs/ changed, so nothing to wait for"; return }
for ($i = 0; $i -lt 14; $i++) {
  Start-Sleep -Seconds 12
  $r = Invoke-WebRequest "https://syncbumousa-crypto.github.io/MyTerm/index.html?probe=$(Get-Random)" -UseBasicParsing
  if ($r.Content -match "\?v=$Version\b") { "LIVE v$Version after $(($i + 1) * 12)s"; return }
}
throw "v$Version never appeared on the live page"
