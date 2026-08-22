# GitHub Publication Status

更新日期：2026-08-22（原始版本是 2026-06-03 的首次發布筆記，已改寫為長期有效的狀態說明）

```text
https://github.com/snowyukitty/snowy-hyperframes   main
```

## 這個 repo 上放什麼

| 進 git | 不進 git |
| --- | --- |
| 工作流文檔、schema、template、`shared/tools/` 工具鏈 | API key、token、`auth.json`、`.env`（任何形式的憑證） |
| 經過審核的 demo / reference / 研究專案（稿子、設定、metadata、字幕、旁白音檔） | 未經審核的專案（`*/projects/*` 預設被忽略，要逐一 allowlist） |
| 量測結果與可驗證的研究數據 | 新的 render 成片（`**/renders/*.mp4`；2026-06 的四支保留在歷史中） |
| 生成的審核包所依據的素材 | 生成的審核包本身（`review/`、`bakeoff/`、`snapshots/`，都可重生） |

成片要分享時放 **GitHub Releases**，不要進 git；理由是這個 repo 已經因為四支 MP4 帶著 127 MB 的歷史，
在慢速連線上 clone 會斷。本機建議用 sparse checkout 跳過它們。

## 發布前

```powershell
node shared/tools/hf.mjs repo-check     # allowlist / secret 路徑 / >95 MB / tracked 專案必備檔
node shared/tools/hf.mjs audit --all    # 每個專案 0 error
```

CI（`.github/workflows/validate.yml`）在每次 push 跑同樣兩件事，再加上每個**有 composition 的**專案的
`hyperframes lint`（audio-research 專案沒有 `index.html`，會被跳過）。

新專案要公開，先走 `shared/docs/repo-publication-policy.md` §3 的審核，再加進 `.gitignore` 的 allowlist。

## Repo metadata（2026-08-22 設定）

```text
description  Reproducible pipeline for AI-assisted research videos on HyperFrames: one storyboard
             becomes a timed, captioned, zh-Hant narrated 1080p film. Zero-dependency toolkit,
             blind TTS evaluation, reviewed demos. Research and demo work, not stable software.
topics       hyperframes · html-to-video · video-generation · text-to-speech · edge-tts · kokoro-tts
             traditional-chinese · research-video · agent-workflows · reproducible-research
```

刻意保留「research and demo work, not stable software」的定位，與 Atlas 的 publication roadmap 一致。
可見性未更動（本來就是 public）。**Atlas registry 裡的 `summary` 與這段描述目前不同步**，要在 Atlas
那邊更新（見 `TODO.md` 的 G）。

## 現在的狀態

- 4 條 workflow：`codex`、`codex-pi`、`pi`、`claude`。
- 8 個 tracked 專案；`hf audit --all` 0 error；CI green。
- 三支影片停在 `ready-to-preview`（人工 gate 未做，見 `TODO.md`）。
- TTS 盲測的方法與量測已公開，**自然度結論尚未存在**。

接續點：[`TODO.md`](TODO.md) → `shared/docs/design-v3.md` → `shared/docs/phase-summary-2026-08-22b.md`。
