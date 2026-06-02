$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$AudioDir = Join-Path $ProjectRoot "assets\audio"
$MapPath = Join-Path $ProjectRoot "data\pronunciation-map.json"
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

if (!(Test-Path -LiteralPath $MapPath)) {
  throw "Missing pronunciation map: $MapPath"
}

if (!(Test-Path -LiteralPath $AudioDir)) {
  throw "Missing audio directory: $AudioDir"
}

$map = Get-Content -LiteralPath $MapPath -Raw -Encoding UTF8 | ConvertFrom-Json
$legacyFiles = Get-ChildItem -LiteralPath $AudioDir -Filter "slide-*.txt" |
  Where-Object { $_.Name -match '^slide-\d{2}\.txt$' } |
  Sort-Object Name

foreach ($legacy in $legacyFiles) {
  $displayName = $legacy.Name -replace '\.txt$', '.display.txt'
  $displayPath = Join-Path $AudioDir $displayName
  if (!(Test-Path -LiteralPath $displayPath)) {
    Copy-Item -LiteralPath $legacy.FullName -Destination $displayPath
  }
}

$displayFiles = Get-ChildItem -LiteralPath $AudioDir -Filter "slide-*.display.txt" | Sort-Object Name
if ($displayFiles.Count -eq 0) {
  throw "No slide display text files found in $AudioDir"
}

foreach ($display in $displayFiles) {
  $text = Get-Content -LiteralPath $display.FullName -Raw -Encoding UTF8

  foreach ($entry in $map.entries) {
    if ($null -ne $entry.enabled -and $entry.enabled -eq $false) {
      continue
    }

    $matchType = if ($entry.matchType) { [string]$entry.matchType } else { "literal" }
    $match = [string]$entry.match
    $replacement = [string]$entry.tts

    if ($matchType -eq "regex") {
      $evaluator = [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $replacement }
      $text = [regex]::Replace($text, $match, $evaluator)
    } else {
      $text = $text.Replace($match, $replacement)
    }
  }

  $ttsName = $display.Name -replace '\.display\.txt$', '.tts.txt'
  $ttsPath = Join-Path $AudioDir $ttsName
  [System.IO.File]::WriteAllText($ttsPath, $text.TrimEnd() + [Environment]::NewLine, $Utf8NoBom)
  Write-Host "Prepared $ttsName"
}
