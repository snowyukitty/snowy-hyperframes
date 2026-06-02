# Edge-TTS 配音設定

本專案使用 Edge-TTS 逐頁輸出 MP3，避免單一長音訊難以對齊分鏡。

## 建議設定

```text
voice:  zh-TW-HsiaoChenNeural
rate:   +8%
pitch:  -2Hz
volume: +0%
```

選擇理由：

- `zh-TW-HsiaoChenNeural` 對繁體中文旁白較自然。
- `+8%` 能將總長控制在約 2 分鐘，仍保留舒適語速。
- `-2Hz` 稍微降低尖銳感，適合調研型簡報。

## 重新生成配音

```powershell
npm run tts
```

腳本會先執行：

```text
scripts/prepare-tts.ps1
```

這一步會把 viewer-facing 文字複製或讀取為：

```text
assets/audio/slide-01.display.txt
...
assets/audio/slide-07.display.txt
```

再套用：

```text
data/pronunciation-map.json
```

輸出給 Edge-TTS 使用的發音稿：

```text
assets/audio/slide-01.tts.txt
...
assets/audio/slide-07.tts.txt
```

最後 `generate-tts.ps1` 會優先讀取 `.tts.txt`，若不存在才退回舊的 `.txt`：

```text
assets/audio/slide-01.tts.txt
...
assets/audio/slide-07.tts.txt
```

並輸出：

```text
assets/audio/slide-01.mp3
...
assets/audio/slide-07.mp3
```

若修改旁白文字，建議同時更新：

- `data/storyboard.json`
- `docs/storyboard.md`
- `captions/narration.srt`
- `index.html` 中對應頁面的畫面字幕

## 中英混讀策略

Edge-TTS 不適合依賴自訂 SSML 控制發音。`rany2/edge-tts` README 明確說 custom SSML support 已移除，服務只允許 Edge 本身可生成的單一 voice/prosody 結構。因此本專案採用「字幕稿與 TTS 發音稿分離」：

- 螢幕字幕和 SRT 保留自然、可讀的正式名稱，例如 `GPT-Image-2`、`Free`、`Plus`、`Pro`。
- TTS 發音稿使用較自然的讀法，例如 `G P T Image 二`、`免費版`、`Plus 版`、`Pro 版`。
- 所有替換集中在 `data/pronunciation-map.json`，方便之後專案複用與審核。

若未來需要精準音素、別名、lexicon 或 `<lang xml:lang>` 控制，應改用 Azure Speech SSML，而不是嘗試把 SSML 塞進 Edge-TTS。
