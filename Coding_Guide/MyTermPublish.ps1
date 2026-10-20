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
  [switch] $NoMerge,
  # Runs every refusal and stops before the first byte is written. The
  # refusals are the only guard this project has on what reaches the
  # site, and a guard that can only be exercised BY PUBLISHING cannot be
  # exercised at all -- so a broken refusal would be found by the thing
  # it was meant to prevent. With this it is proved both ways on demand:
  # the real files pass, and a deliberately spoiled copy is refused
  [switch] $Check
)
$ErrorActionPreference = 'Stop'

# --- refusal 1 could not do its job until this line existed. gh writes UTF-8
# --- bytes, and PowerShell 5.1 decodes a child process's stdout with the OEM
# --- codepage -- so every emoji in the listing of what is already published
# --- came back as replacement marks, and "this path is on the branch" read
# --- FALSE for a file plainly sitting there. The refusal then fired on a
# --- correct edit and the only way past it would have been -New, which is how
# --- a twin file gets born: the very accident this script was written to stop
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false
$gh   = "C:\Program Files\GitHub CLI\gh.exe"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$utf8 = New-Object System.Text.UTF8Encoding $false

# Progress goes to the HOST, never to the output stream: an uncaptured string
# inside this function becomes part of what it returns, and $blob.sha would then
# read off an array of [string, string, object] instead of the API answer.
# Blob posts stay silent -- forty of them would bury the three that matter.
function Post($path, $obj, $name) {
  $chat = ($path -ne "git/blobs")
  $f = Join-Path $here "_pub_$name.json"
  if ($chat) { Write-Host ("    [post] $path - serialising") }
  $json = $obj | ConvertTo-Json -Depth 20 -Compress
  if ($chat) { Write-Host ("    [post] $path - " + $json.Length + " chars, writing payload") }
  [System.IO.File]::WriteAllText($f, $json, $utf8)
  if ($chat) { Write-Host ("    [post] $path - calling gh") }
  $out = & $gh api -X POST "repos/$Repo/$path" --input $f
  if ($LASTEXITCODE -ne 0) { throw "POST $path failed: $out" }
  if ($chat) { Write-Host ("    [post] $path - ok") }
  $out | ConvertFrom-Json
}

# --- refusal 0: a path must be a bare string, not a string wearing an object.
# --- Get-Content decorates every line it emits with the provider's note
# --- properties (PSPath, PSDrive, PSProvider), and a caller that feeds those
# --- lines straight in sends a tree entry whose "path" serialises as the whole
# --- object. GitHub then takes that megabyte of JSON as the FILE NAME and
# --- creates it, happily, with a 201. It happened: forty files were born whose
# --- names were a serialised PSDrive, the real forty were never written, and
# --- nothing failed loudly. ConvertTo-Json also walks PSDrive -> Provider ->
# --- Drives on the way, which is what ate 9.8 GB before any of it was sent.
# --- And the test is NOT the type. A Get-Content line reports GetType() as
# --- String and answers -is [string] with True, exactly like a bare string.
# --- What gives it away is the decoration: a bare string carries one property,
# --- Length, while a decorated one also carries PSPath and its companions.
# --- So the guard counts properties, which is the thing that actually differs.
foreach ($f in $Files) {
  foreach ($k in 'path', 'local') {
    $v = $f.$k
    if ($null -eq $v) { throw "GUARD -Files entry has no '$k'" }
    $extra = @($v.PSObject.Properties.Name | Where-Object { $_ -ne 'Length' })
    if ($extra.Count -gt 0) {
      throw ("GUARD '$k' is a decorated string, not a bare one: it carries " +
             ($extra -join ', ') + " -> " + [string]$v +
             "   (a Get-Content line? cast it: [string]`$line)")
    }
  }
}
"guard: every path and local is a bare string"

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

# --- refusal 2b: and mojibake INSIDE the file, not only in its path.
# --- Refusal 1 has watched paths since the day a mangled emoji built a twin
# --- folder on GitHub. It never looked at CONTENT -- and on 2026-10-21
# --- twenty-two characters walked in that way: six helper scripts written
# --- UTF-8 without a BOM were read by PowerShell 5.1 through codepage 1256,
# --- so every non-ASCII character they carried arrived as its own UTF-8
# --- bytes read as Arabic. A star became three characters, an em dash
# --- three, a middle dot two -- in comments, and in strings a guard PRINTS.
# --- Nothing failed. They were caught by eye, which is not a method.
# --- The signatures below cannot occur in this project's own text: the
# --- Persian letters are not used in its Arabic prose, and a lone `a`-hat
# --- is not used at all. `A`-hamza IS Arabic, so it is only a signature
# --- when the character after it leaves the Arabic block entirely.
$marks = @{}
$marks[[char]0x00E2] = 'a-circumflex (a mangled star, dash or arrow)'
$marks[[char]0x06A9] = 'Persian kaf (the middle of a mangled star)'
$marks[[char]0x0686] = 'Persian che (the tail of a mangled emoji)'
$marks[[char]0x0698] = 'Persian zhe (the tail of a mangled emoji)'
$marks[[char]0x06AF] = 'Persian gaf (the tail of a mangled emoji)'
$marks[[char]0x06BA] = 'Arabic noon ghunna (the second byte of a mangled emoji)'
foreach ($f in $Files) {
  if ($f.path -notmatch '\.(js|css|html|md|json)$') { continue }
  $text = Get-Content $f.local -Raw -Encoding UTF8
  foreach ($ch in $marks.Keys) {
    $n = ([regex]::Matches($text, [regex]::Escape([string]$ch))).Count
    if ($n -gt 0) {
      throw ("GUARD mangled text in $($f.path): $n x " + $marks[$ch] +
             "   (a helper script read as ANSI? build every non-ASCII character " +
             "from its code point, and put back what it broke)")
    }
  }
  # âک… AND NARROWED TO EXACTLY WHAT IT IS ABOUT. The first form of this
  #   asked for `A`-hamza followed by anything outside the Arabic block,
  #   and refused `InkRoadmap.md` on the spot -- for an Arabic sentence
  #   ending in a full stop. A condition wider than its danger stops
  #   honest work, which in this project has already disabled a whole
  #   feature once. The real question is not "what follows it" but
  #   "COULD THESE TWO CHARACTERS BE A CHARACTER": encoded back through
  #   the codepage, is it a well-formed two-byte UTF-8 sequence? A full
  #   stop is not a continuation byte, so it cannot be, and the only
  #   pairs left are the ones that really were mangled.
  #
  #   AND NARROWED TWICE, because "could these two be a character" was
  #   still too wide: `A`-hamza before an ARABIC COMMA is a well-formed
  #   pair by that test and ordinary prose by any other, and it refused
  #   `RulesRoadmap.md`. What prose cannot make is `A`-hamza or
  #   `A`-madda pressed STRAIGHT UP AGAINST a Latin-1 character with no
  #   space between -- which is every two-byte mangling this actually
  #   produced (a middle dot came through as exactly that). Narrower
  #   than the danger would be useless; wider than it stops honest work,
  #   and that has cost this project a whole feature once before
  $caught = [regex]::Matches($text, '[\u0622\u0623][\u00A0-\u00FF]') | ForEach-Object { $_.Value }
  $caught = @($caught)
  if ($caught.Count -gt 0) {
    throw ("GUARD mangled text in $($f.path): $($caught.Count) two-byte character(s) " +
           "read through codepage 1256, e.g. '" + $caught[0] + "'")
  }
}
"guard: nothing mangled inside the files either"

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

if ($Check) {
  "CHECK ONLY - every refusal passed, nothing was written"
  return
}

$entries = @()
foreach ($f in $Files) {
  $b64  = [Convert]::ToBase64String([System.IO.File]::ReadAllBytes($f.local))
  $blob = Post "git/blobs" @{ content = $b64; encoding = "base64" } ($f.path -replace '[^A-Za-z0-9]', '_')
  "  blob " + $blob.sha.Substring(0, 8) + "  " + ($f.local -replace '.*\\', '')
  $entries += @{ path = $f.path; mode = "100644"; type = "blob"; sha = $blob.sha }
}

"blobs done: " + $entries.Count + " entries staged"
$tree   = Post "git/trees"   @{ base_tree = $baseTree; tree = $entries } "tree"
"tree   " + $tree.sha.Substring(0, 8)
$commit = Post "git/commits" @{ message = $Message; tree = $tree.sha; parents = @($base) } "commit"
"commit " + $commit.sha.Substring(0, 8)
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
