# Edge-TTS 配音設定

本專案使用逐頁 MP3，方便調整單頁旁白與時間軸。

## Settings

```text
voice:  zh-TW-HsiaoChenNeural
rate:   +6%
pitch:  -2Hz
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
4. `scripts/generate-tts.ps1` 呼叫 Edge-TTS 輸出 `assets/audio/slide-*.mp3`。

## Pronunciation Strategy

字幕保留正式名稱，例如 `GitHub Copilot`、`Claude Code`、`API credit`。TTS 稿則使用較自然讀法，例如 `P I`、`A P I`、`T T S`。通用策略見：

```text
../../../../shared/docs/tts-pronunciation-strategy.md
```
