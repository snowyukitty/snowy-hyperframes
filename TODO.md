# TODO — Snowy HyperFrames

Checkpoint: **2026-08-22**. Everything below is either waiting on a person, or specified well enough
for any agent to start cold. Specs live in `shared/docs/design-v3.md`; the rules live in `AGENTS.md`.

Repo health at this checkpoint: 8 projects · `hf audit --all` **0 errors** · `hf repo-check` clean ·
`hyperframes@0.8.6 check` 0 findings on all three videos · CI green.

---

## Waiting on Snowy （約 10 分鐘一件，都已經是可以直接打開的網頁）

- [ ] **看過管線 demo，決定是否通過** — 六頁、77 秒。
      審核包（畫格＋真實旁白＋連續播放）：<https://claude.ai/code/artifact/3e8ebf69-9f40-4616-ac53-24da32d97624>
      本機同一份（離線可開，直接雙擊）：`claude/projects/storyboard-to-video-pipeline-demo/review/index.html`
      通過後：`claude/projects/storyboard-to-video-pipeline-demo/project.json` 的 `status` 改 `rendered`、
      `checks.humanPreview` 填日期，`npm run render` 的成片放 GitHub Release（**不要進 git**）。
- [ ] **看過研究影片，決定是否通過** — 十頁、210.5 秒。
      審核包：<https://claude.ai/code/artifact/650ec078-5f03-4e5c-aa51-4f95f7e79bfd>
      本機同一份：`claude/projects/measurable-vs-audible-tts/review/index.html`
      通過後的處理與上一項相同（專案在 `claude/projects/measurable-vs-audible-tts`）。
- [ ] **做 TTS 盲測聽測** — 八段稿子、Edge-TTS vs Kokoro，標籤與數據都藏到「揭曉」之後。
      聽測包：<https://claude.ai/code/artifact/08c1db61-79cd-4dea-a360-2b6beccd7f12>
      本機同一份：`claude/projects/tts-bakeoff-2026-08/bakeoff/index.html`
      聽完按「複製評測結論」→ 貼進 `claude/projects/tts-bakeoff-2026-08/docs/listening-scorecard.md`
      → 更新 `shared/docs/local-tts-no-api-key-strategy.md` §3.5。
      **在這件事完成之前，任何地方都不得寫下「哪個引擎比較自然」。**
- [ ] **決定要不要登入 `heygen` CLI**（`/media-use` 取樂曲用）。這是帳號動作，所以沒有代勞。
      音樂床的管線已經做好也量過了：storyboard 宣告 `music: { file, volume }` 即可。
- [ ] **決定這個公開 repo 要不要加 LICENSE**（目前沒有）。沒有 LICENSE 在法律上等於保留所有權利，
      別人不能重用 template 或工具鏈——如果那是刻意的就維持現狀，如果希望別人能用就要選一份授權。
      這是所有權決定，所以沒有代勞。
- [ ] （可選）**`block-vocabulary-reference` 的人工 gate** — 它的 status 也是 `ready-to-preview`，
      本機審核包：`claude/projects/block-vocabulary-reference/review/index.html`。
      它的用途是「block 長什麼樣」的樣式回歸基準，不是給觀眾看的影片；除非要發布它的 render，
      否則這一關可以先不做。

### 關於這些審核包

它們**本來就是本地 HTML**——artifact 是從本地檔案發布上去的。每一份都把畫格（JPEG）與旁白（MP3）
內嵌成 data URI，外部請求數為 **0**，所以離線、飛機上、用 `file://` 直接雙擊都能開。

```powershell
# 任何時候都能重生（review/ 與 bakeoff/ 是 .gitignore 忽略的產物）
cd claude/projects/<project> ; npm run review      # 影片專案
cd claude/projects/tts-bakeoff-2026-08 ; npm run bakeoff   # 聽測包
```

兩個小提醒：`index.html` 是完整的獨立檔（本機用這份）；`*.artifact.html` 是去掉外層標籤、給發布用的
變體。勾選紀錄存在瀏覽器的 localStorage，**本機檔與線上 artifact 是兩個各自獨立的儲存**，所以請固定
在其中一邊做完，再按「複製結論」。

## Open for any agent

- [ ] **H · `chart` block**（下一個里程碑的核心）— 內嵌 SVG 圖表，`bar` / `line` / `split`，
      每張圖必須有 `source`。規格與驗收：`design-v3.md` §2H。
- [ ] **I · 整頁資料頁**（可選）— 用上游 registry 的 `data-chart` 當 sub-composition。
      注意：`hyperframes add <name>` 在這條網路上可用，`catalog --query` 會逾時。`design-v3.md` §2I。
- [ ] **J · 動態語彙** — 每頁可選 `motion: rise | hold | focus | reveal`，只改 template 的 timeline
      script，不動時間真相。`design-v3.md` §2J。
- [ ] **K · 雙語旁白** — 同一份 storyboard 產出第二條語音軌與字幕。`design-v3.md` §3K。
- [ ] **G · Atlas registry 更新** — **另一個 repo，要另開 scope**：現在是 4 條 workflow、8 個 tracked
      專案、port 3002 仍為 preview；另外 GitHub 的 repo description 已於 2026-08-22 更新
      （見 `docs-github-update.md`），Atlas registry 的 `summary` 尚未跟上。
- [ ] 小項：`hf tts --provider kokoro`（程式碼已在 `hf bakeoff` 內，等聽測結論再決定）、`README.en.md`、
      `L · series identity`（等有三支以上影片再說）。

## Done at this checkpoint（詳見 `shared/docs/phase-summary-2026-08-22b.md`）

- [x] 內容區塊 blocks（`lead`/`metrics`/`cards`/`list`/`quote`/`source`）與密度檢查
- [x] `hf review` — 人工 gate 變成一個離線網頁（含連續播放）
- [x] 詞級字幕：文字取自 display 稿、時間取自 TTS 詞邊界（平均重合度 0.970）
- [x] `hf bakeoff` — 盲測 harness 與 Edge vs Kokoro 客觀量測
- [x] 第一支研究影片 `measurable-vs-audible-tts`
- [x] 音樂床（不需帳號的那一半），含「床會落在哪裡」的響度檢查
- [x] `hf audit` 的 placeholder / stale-html / music / captions / bakeoff 檢查、CI 修正
