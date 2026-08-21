# measurable-vs-audible-tts

**可以量的，跟只能聽的：兩個免 API key 中文 TTS 引擎的實測**
10 頁 · 約 3 分 30 秒 · 1920×1080 · zh-Hant 旁白（Edge-TTS `zh-TW-HsiaoChenNeural`）· 零 bitmap

這是 Snowy HyperFrames 工作流 v2 上的第一支**研究型**影片：內容是本 repo 自己做的 TTS 實測，
畫面全部由 storyboard 的 `blocks` 資訊層生成，沒有任何生成圖片。

## 它主張什麼、不主張什麼

- **主張**：兩個引擎在語速、停頓、響度一致性、生成成本上有可量測的差異，而且差距最大的地方是
  拉丁縮寫。每個數字都能在 `claude/projects/tts-bakeoff-2026-08/data/measurements.json` 查到。
- **不主張**：哪一個比較自然、比較好聽。自然度沒有客觀量測，盲測聽測尚未完成——影片自己把這件事講出來。

完整來源分層見 `docs/references.md`、`data/research.json`。

## 重跑

```powershell
npm run html        # storyboard -> index.html（slide/audio 區塊）
npm run pipeline    # prepare-tts -> tts -> measure -> sync -> audit
npm run check       # hf audit + hyperframes@0.8.6 check
npm run review      # 人工審核包（畫格 + 真實旁白 + 餘裕 + 逐項勾選）
npm run render      # renders/measurable-vs-audible-tts.mp4（不進 git）
```

## 狀態

`ready-to-preview`：`hf audit` 0 findings、`hyperframes check` 0 findings（contrast 58/58 WCAG AA）、
已 smoke render。**人工 preview 尚未進行**——影片最後一頁自己也這麼說。
通過後把 `project.json.status` 改成 `rendered`，成片放 GitHub Releases。
