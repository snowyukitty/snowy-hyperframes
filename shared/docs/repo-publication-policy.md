# Repository Publication Policy

更新日期：2026-06-02

本 repo 的目標是公開 Snowy HyperFrames 的工作流、教育材料、工具使用方式、踩坑經驗、模板、schema 與可公開 demo。它不是所有未來影片專案的公開存放區。

## 1. 可以提交到 GitHub 的內容

目前已測試的 demo / reference projects 可以公開提交，包含它們的圖片、MP3、字幕、HyperFrames files、metadata、docs 和 MP4：

```text
codex/projects/ai-tool-cost-benchmark/
codex/projects/ai-2030-three-futures/
codex-pi/projects/gpt-image-2-quota-research/
pi/projects/latest-tts-voice-clone-research/
claude/projects/storyboard-to-video-pipeline-demo/   （2026-08-22 審核：自述內容、無外部主張、無 bitmap、無 secret；MP4 不進 git）
claude/projects/block-vocabulary-reference/          （2026-08-22 審核：內容全部可在本 repo 驗證）
claude/projects/measurable-vs-audible-tts/           （2026-08-22 審核：數字全部來自自有量測，明確標示未下自然度結論）
claude/projects/tts-bakeoff-2026-08/                 （2026-08-22 審核：方法、稿子與量測公開；16 段生成音檔不進 git，可重生）
```

共用內容也可以提交：

```text
shared/tools/
shared/vendor/
shared/docs/
shared/schemas/
shared/templates/
README.md
AGENTS.md
CLAUDE.md
codex/README.md
codex-pi/README.md
pi/README.md
claude/README.md
docs-github-update.md
.github/workflows/
```

**Renders（2026-08-22 起）**：新的 MP4 不進 git（`.gitignore` 的 `**/renders/*.mp4`）；要分享成片放 GitHub Releases。
四支 2026-06 的 demo MP4 保留在歷史中。

## 2. 不應提交的內容

未來正式製作、客戶專案、未公開題材、私人旁白、未授權素材、原始工作草稿與 provider cache 不應提交到 GitHub。

禁止提交：

- API key、OAuth token、auth.json、`.env`。
- Pi session logs、provider cache、generated-image cache。
- 未經審核的 production project。
- 私人 voice clone data、聲音樣本、授權合約原件。
- 大量 render scratch frames、capture output、temporary work renders。

## 3. Future Project Rule

`.gitignore` 目前採用 allowlist 策略：

- `codex/projects/*` 預設忽略。
- `codex-pi/projects/*` 預設忽略。
- `pi/projects/*` 預設忽略。
- `claude/projects/*` 預設忽略。
- 只有目前五個 demo project 被明確 allowlist；`node shared/tools/hf.mjs repo-check` 會驗證 tracked 檔案都在 allowlist 內。

未來若要公開新的教育 demo，先完成以下 review，再把該 project 加入 `.gitignore` allowlist：

1. 確認素材、旁白、圖片、來源都可公開。
2. 確認 `project.json` 不含 credential。
3. 確認 `docs/references.md` 對時效性與可信度標示清楚。
4. 確認 `docs/retrospective.md` 不包含私密 provider logs。
5. 確認 MP4 單檔小於 GitHub 100 MB limit，否則改用 release asset 或 Git LFS。

## 4. Recommended Repo Story

這個 repo 應該對外呈現為：

- 三條 AI-assisted HyperFrames production workflow 的實驗紀錄。
- 研究型影片從資料到分鏡、圖片、TTS、字幕、render 的可重跑模板。
- TTS / pronunciation map / audio audit / preview gate 的實戰手冊。
- Codex、Codex-Pi、Pi 三種協作模式的成本與品質邊界。

它不應該變成：

- 所有 Snowy production project 的公開 archive。
- provider token、session logs 或私有素材倉庫。
- 未審核 AI 生成內容的自動發布管道。

## 5. Pre-Push Checklist

```powershell
node shared/tools/hf.mjs repo-check     # allowlist / secret 路徑 / >95 MB / tracked 專案必備檔（CI 也跑）
node shared/tools/hf.mjs audit --all    # 每個專案 0 error
git status --short
git ls-files | Select-String -Pattern "\.pi/|auth\.json|\.env|token|secret|\.thumbnails"
```

檢查 media size：

```powershell
Get-ChildItem -Recurse -File | Where-Object { $_.Length -gt 95000000 } | Select-Object FullName,Length
```

每個 demo project 至少保留：

- `project.json`
- `README.md`
- `docs/runbook.md`
- `docs/retrospective.md`
- `data/`
- `assets/`
- `captions/`
- `index.html`
- `package.json`
- 可公開 render 或明確說明未 render
