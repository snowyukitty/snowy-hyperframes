# Reusable Workflow Runbook

## 1. 更新研究資料

1. 查官方資料：OpenAI Help、ChatGPT Pricing、OpenAI API Docs。
2. 查社群資料：OpenAI Developer Community、Reddit、可信第三方媒體。
3. 將資料寫入 `data/research.json`，並在 `docs/references.md` 區分：
   - 官方已公開資訊
   - 社群實測或使用者回報
   - 合理推估

## 2. 更新分鏡

編輯：

```text
data/storyboard.json
docs/storyboard.md
assets/audio/slide-*.display.txt
data/pronunciation-map.json
```

再重新產生音訊：

```powershell
npm run tts
```

`npm run tts` 會先產生 `assets/audio/slide-*.tts.txt`，再用 Edge-TTS 輸出 MP3。舊的 `assets/audio/slide-*.txt` 只作為相容性輸入保留。

使用 `ffprobe` 檢查每頁音訊長度後，更新：

```text
index.html
captions/narration.srt
```

## 3. 更新圖片

圖片 prompt 保存在：

```text
data/image-prompts.json
```

若使用 Pi 並且已登入 `openai-codex`，可要求 Pi 使用 `codex_generate_image`。若未登入，使用 placeholder 或由外部生圖工具產生後放入：

```text
assets/images/
```

## 4. 驗證但不渲染

```powershell
npm run check
```

## 4.1. 中英混讀 QA

若旁白含英文品牌、模型名、API 名稱或方案名稱：

1. 先更新 `data/pronunciation-map.json`。
2. 執行 `npm run tts:prepare`，檢查 `assets/audio/slide-*.tts.txt`。
3. 再執行 `npm run tts` 重生 MP3。
4. 只在發音稿中改讀法，不把螢幕字幕改成發音拼寫。

## 5. 需要渲染時

```powershell
npm run render
```

或直接：

```powershell
hyperframes render . --output renders/gpt-image-2-quota-research.mp4
```
