# ============================================================
# # 🛡️ 📌  THE GUARD OVER WHAT WAS CARRIED ACROSS
# # 🔤 PowerShell
# # 🎯 Compares the migrated Summaries tree against the old project it
# #    came from: chapter for chapter, and every pct number.
# # 🔗 Counting files only proves files exist. The thing that can go
# #    wrong silently is a number: a pct parsed out of progress.js by
# #    the wrong regex is still a number, still plausible, and wrong.
# #    So every pct is read back out of the migrated JSON and matched
# #    against the line it came from. A copy that is off by one chapter
# #    is caught by the count; a copy that is off by one percent is
# #    caught only by this.
# ============================================================

$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
$emoji = [char]0xD83D + [char]0xDCDA
$store = Join-Path $repo ("docs\" + $emoji + "TermBoard\Summaries")
$old   = "C:\Users\syncb\OneDrive\Desktop\" + [char]0x0627 + [char]0x0644 + [char]0x062A +
         [char]0x0644 + [char]0x062E + [char]0x064A + [char]0x0635 + " " + [char]0x0627 +
         [char]0x0644 + [char]0x0630 + [char]0x0643 + [char]0x064A
$prog  = Join-Path $old ([char]0x0644 + [char]0x0648 + [char]0x062D + [char]0x0629 + " " +
         [char]0x0627 + [char]0x0644 + [char]0x0645 + [char]0x0648 + [char]0x0627 + [char]0x062F +
         "\data\progress.js")

if (-not (Test-Path $store)) { "FAIL  no Summaries tree at $store"; exit 1 }
if (-not (Test-Path $prog))  { "FAIL  no progress.js at $prog"; exit 1 }

$bad = 0

# --- 1. every pct in the tree matches the source it was read from
$src = Get-Content $prog -Raw -Encoding UTF8
$srcPct = @{}
$course = $null
foreach ($line in ($src -split "`n")) {
    if ($line -match "^\s*'([A-Z]+\d+)':\s*\{root:") { $course = $Matches[1] }
    if ($course -and $line -match "^\s*'([^']+)':\s*\{built:(true|false)") {
        $ch = $Matches[1]
        $p  = if ($line -match 'pct:(\d+)') { [int]$Matches[1] } else { 0 }
        $srcPct["$course/$ch"] = $p
    }
}

$files = Get-ChildItem (Join-Path $store 'courses') -Recurse -Filter '*.json' |
         Where-Object { $_.FullName -like '*chapters*' }
$checked = 0
foreach ($f in $files) {
    $j = Get-Content $f.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
    $key = "$($j.course)/$($j.chapter)"
    $checked++
    if (-not $srcPct.ContainsKey($key)) { "FAIL  $key is in the tree but not in progress.js"; $bad++; continue }
    if ($srcPct[$key] -ne $j.pct) { "FAIL  $key pct $($j.pct) but source says $($srcPct[$key])"; $bad++ }
}
"pct: $checked chapters read back, $($srcPct.Count) in the source"

# --- 2. nothing in the source was dropped
foreach ($k in $srcPct.Keys) {
    $c, $ch = $k -split '/', 2
    $p = Join-Path $store "courses\$c\chapters\$ch.json"
    if (-not (Test-Path $p)) { "FAIL  $k is in progress.js but not in the tree"; $bad++ }
}

# --- 3. a built chapter must have a folder on disk, and the other way round
foreach ($nat in (Get-ChildItem (Join-Path $store 'courses') -Directory)) {
    $code = $nat.Name
    $built = @(Get-ChildItem (Join-Path $nat.FullName 'chapters') -Filter '*.json' |
               Where-Object { (Get-Content $_.FullName -Raw -Encoding UTF8 | ConvertFrom-Json).built })
    $root = Join-Path $old (([char]0x0645 + [char]0x0644 + [char]0x062E + [char]0x0635 + [char]0x0627 + [char]0x062A) + " $code")
    $disk = @(Get-ChildItem $root -Directory -Filter '*Ch*' -ErrorAction SilentlyContinue)
    $note = if ($built.Count -eq $disk.Count) { 'ok' } else { "drift: $($disk.Count - $built.Count) folder(s) on disk not marked built" }
    "{0,-9} built={1,-3} onDisk={2,-3} {3}" -f $code, $built.Count, $disk.Count, $note
}

# --- 4. the craft files came over whole
$m = @(Get-ChildItem (Join-Path $store 'method') -Filter '*.md')
$mOld = @(Get-ChildItem (Join-Path $old ([char]0x0645 + [char]0x0634 + [char]0x0631 + [char]0x0648 + [char]0x0639 + " " +
        [char]0x0627 + [char]0x0644 + [char]0x062A + [char]0x0644 + [char]0x062E + [char]0x064A + [char]0x0635 + " " +
        [char]0x0627 + [char]0x0644 + [char]0x0630 + [char]0x0643 + [char]0x064A)) -Filter '*.md' |
        Where-Object { $_.Name -match '^\d\d_' })
if ($m.Count -ne $mOld.Count) { "FAIL  craft files: $($m.Count) carried, $($mOld.Count) in the source"; $bad++ }
else {
    $diff = 0
    foreach ($f in $m) {
        $o = Join-Path $mOld[0].DirectoryName $f.Name
        if (-not (Test-Path $o)) { $diff++; continue }
        if ((Get-FileHash $f.FullName).Hash -ne (Get-FileHash $o).Hash) { "FAIL  changed in transit: $($f.Name)"; $diff++ }
    }
    if ($diff) { $bad += $diff } else { "craft: $($m.Count) files, byte for byte" }
}

""
if ($bad) { "GUARD FAILED - $bad problem(s)."; exit 1 }
"GUARD PASSED - the tree says what the source says."
exit 0
