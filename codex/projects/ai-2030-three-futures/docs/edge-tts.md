# Edge-TTS

## Settings

```text
voice:  zh-TW-HsiaoChenNeural
rate:   +5%
pitch:  -3Hz
volume: +0%
```

## Generate

```powershell
npm run tts
```

流程：

1. `scripts/prepare-tts.ps1` 讀取 `assets/audio/slide-*.display.txt`。
2. 套用 `data/pronunciation-map.json`。
3. 生成 `assets/audio/slide-*.tts.txt`。
4. `scripts/generate-tts.ps1` 呼叫 Edge-TTS 輸出 MP3。

## Notes

旁白故意使用比較電影化的中文句式。若要更短、更像商業簡報，可先改 `display.txt`，再重跑 `npm run tts`，最後依 `ffprobe` 更新時間軸與 SRT。
