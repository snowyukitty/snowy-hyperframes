$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$AudioDir = Join-Path $ProjectRoot "assets\audio"
$Voice = "zh-TW-HsiaoChenNeural"
$Rate = "+6%"
$Pitch = "-2Hz"
$Volume = "+0%"

$pythonScripts = Join-Path $env:APPDATA "Python\Python312\Scripts"
if (Test-Path -LiteralPath $pythonScripts) {
  $env:Path = "$env:Path;$pythonScripts"
}

$ttsFiles = Get-ChildItem -LiteralPath $AudioDir -Filter "slide-*.tts.txt" | Sort-Object Name
if ($ttsFiles.Count -eq 0) {
  $ttsFiles = Get-ChildItem -LiteralPath $AudioDir -Filter "slide-*.txt" |
    Where-Object { $_.Name -match '^slide-\d{2}\.txt$' } |
    Sort-Object Name
}

if ($ttsFiles.Count -eq 0) {
  throw "No TTS input files found in $AudioDir"
}

foreach ($textFile in $ttsFiles) {
  $name = $textFile.Name -replace '\.tts\.txt$', '' -replace '\.txt$', ''
  $mp3 = Join-Path $AudioDir "$name.mp3"
  edge-tts --voice $Voice --rate=$Rate --pitch=$Pitch --volume=$Volume --file $textFile.FullName --write-media $mp3
}

Write-Host "Generated slide narration files in $AudioDir"
