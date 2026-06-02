$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$AudioDir = Join-Path $ProjectRoot "assets\audio"
$Voice = "zh-TW-HsiaoChenNeural"
$Rate = "+8%"
$Pitch = "-2Hz"
$Volume = "+0%"

$pythonScripts = Join-Path $env:APPDATA "Python\Python312\Scripts"
if (Test-Path -LiteralPath $pythonScripts) {
  $env:Path = "$env:Path;$pythonScripts"
}

for ($i = 1; $i -le 7; $i++) {
  $name = "slide-{0:D2}" -f $i
  $ttsText = Join-Path $AudioDir "$name.tts.txt"
  $legacyText = Join-Path $AudioDir "$name.txt"
  $text = if (Test-Path -LiteralPath $ttsText) { $ttsText } else { $legacyText }
  $mp3 = Join-Path $AudioDir "$name.mp3"

  if (!(Test-Path -LiteralPath $text)) {
    throw "Missing TTS input for $name. Expected $ttsText or $legacyText"
  }

  edge-tts --voice $Voice --rate=$Rate --pitch=$Pitch --volume=$Volume --file $text --write-media $mp3
}

Write-Host "Generated slide narration files in $AudioDir"
