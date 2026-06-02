# Audio Drafts

Use separate text files for display wording and TTS pronunciation.

```text
slide-01.display.txt  # viewer-facing narration text
slide-01.tts.txt      # generated pronunciation text for Edge-TTS
slide-01.mp3          # generated audio
```

Recommended flow:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/prepare-tts.ps1
powershell -ExecutionPolicy Bypass -File scripts/generate-tts.ps1
```

Keep `slide-XX.display.txt` close to subtitles and storyboard narration. Do not edit generated `.tts.txt` files unless testing a local pronunciation change before updating `data/pronunciation-map.json`.
