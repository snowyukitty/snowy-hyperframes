# storyboard-to-video-pipeline-demo

從分鏡到影片：Snowy HyperFrames 工作流 v2 的自我描述 demo。

- 6 頁、77.2 秒、1920×1080 30fps、zh-Hant 旁白（Edge-TTS `zh-TW-HsiaoChenNeural`）。
- **沒有任何 bitmap 圖片**：背景是 template 內建的漸層 + 進度環（純 CSS/SVG），所以這個專案可以在
  沒有任何圖片生成 auth 的機器上從零重跑。
- 所有時間軸都由 `shared/tools/hf.mjs` 從 `data/storyboard.json` 與量測到的 MP3 長度產生，
  `index.html` 的 slide / audio 區塊是生成的（`<!-- hf:* -->` 標記之間），不要手改。

## 重跑

```powershell
npm run html        # 從 storyboard 重建 index.html 的 slide/audio 區塊（CSS/JS 不動）
npm run pipeline    # prepare-tts -> tts -> measure -> sync -> audit
npm run check       # hf audit + npx hyperframes@0.8.6 check
npm run preview     # 人工 gate
npm run render      # renders/storyboard-to-video-pipeline-demo.mp4（不進 git）
```

Render 不進 git（`**/renders/*.mp4` 已忽略）；需要分享成片時放 GitHub Releases。

## 檔案

```text
data/storyboard.json        分鏡、旁白、字幕、目標秒數（意圖）
data/pronunciation-map.json 顯示字幕 -> TTS 朗讀稿 的替換規則
data/audio-durations.json   ffprobe 量到的每段 MP3 長度（量測）
data/timeline.json          sync 產生的時間軸（結果，hf 的 manifest of record）
assets/audio/slide-NN.*     display.txt / tts.txt / mp3
captions/narration.srt      由 sync 產生，cue 長度 = 旁白實際長度
hyperframes.json            HyperFrames 自己的專案設定（registry / paths），不是 Snowy manifest
vendor/gsap.min.js          由 hf vendor 放入，render 不依賴 CDN
```

詳細：`docs/runbook.md`、`docs/retrospective.md`。
