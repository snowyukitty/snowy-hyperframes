# Phase Summary — 2026-08-22 (二)：內容層、人工 gate、TTS 實測、第一支研究影片

接續 `phase-summary-2026-08-22.md`（工作流 v2 的工具鏈）。這一輪按 `design-v2.md` 的工作項執行，
完成 **B、B2、C、D（harness）、F**；**A、E、G** 仍待辦。

## 1. 完成了什麼

### B — 內容區塊（研究投影片的資訊層）

storyboard 的 `slides[].blocks` → `lead` / `metrics` / `cards` / `list` / `quote` / `source`，
由 `hf html` 生成、`hf audit` 管密度（每頁上限 3 個 block、metrics 2–4、cards 2–3、list 2–5）。

有 blocks 的頁面改用「上 92px 到下 220px 的整條版面 + 群組置中」，格子寬度上限化，每個小字表面自己畫深色面板。
過程中修掉兩個真缺陷：chapter 叫 `quote` 時會套用 `.quote` 樣式把版面撐破 263px（改成 `chapter-` 命名空間）；
第一版 block 太小擠在畫面上方三分之一（放大到 66px 數值、38px 卡片標題）。

參考專案（公開）：`claude/projects/block-vocabulary-reference`，一頁一種 block，也是樣式回歸測試。

### B2 — `hf review`：把人工 gate 變成十分鐘的事（原計畫沒有）

規則 2 要求 render 前必須有人看過，但那件事原本需要開 dev server、拖時間軸，於是實務上常被跳過。
`hf review` 產生**一個離線 HTML**：每頁一張實際畫格 + 真實旁白音檔 + 字幕 + 時間餘裕（依截斷風險上色），
有 **cinema 模式**（依序播放，等於不 render 就能判斷節奏）、三個逐頁勾選（發音／節奏／可讀性）、
一鍵複製 markdown 審核結論。`--artifact` 產生可發布版本，所以審核可以在手機上完成。

### C — 詞級字幕（不是用 ASR）

`shared/tools/edge_tts_words.py` 用 `boundary="WordBoundary"` 合成（7.x 預設是 `SentenceBoundary`，
這正是 CLI 丟失詞時間的原因），**同一次合成**同時產出 MP3 與 `slide-NN.words.json`。
`hf captions` 的字幕**文字取自 display 稿**（標點正確、拼字正確），**時間取自詞邊界**（用「拍數」比例對齊）。

實測：管線 demo 29 條字幕、中位數 15 字；逐條比對「字幕字元 vs 該時間窗實際唸出的 token」，
**平均重合度 0.970**。唯一的離群值是字幕 `工作流 v2。` 對上唸出的 `版本二`——那是 pronunciation map 正常運作，
也正好是「字幕不能取自 TTS token 流」的證據。

### D — TTS 盲測 harness（2026-06 的未完成項）

`hf bakeoff`：8 段 golden samples × 2 引擎 = 16 段音檔，客觀量測（長度、語速、發聲語速、停頓數、
靜音比、LUFS、真實峰值、RTF）寫進 `data/measurements.json`，並產生**盲測** A/B 聽測包
（引擎名稱與客觀數據都藏到「揭曉」之後，順序每段不同）。

客觀結論（已寫入 `local-tts-no-api-key-strategy.md` §3.5）：Kokoro 唸同樣稿子慢 20%、
靜音佔比 7% vs Edge 的 21%（幾乎不在標點處換氣）、響度較低且一致性較差、
遇到拉丁縮寫時語速掉到 2.95 拍/秒（Edge 3.97）。**自然度沒有結論，也不得從這些數字推斷。**

### F — 第一支研究影片

`claude/projects/measurable-vs-audible-tts`：10 頁、210.5 秒、零 bitmap、Edge-TTS 旁白。
主題就是上面那個誠實的缺口：「可以量的，跟只能聽的」。每個數字都能在 `measurements.json` 查到，
每頁頁尾寫出量測方法，最後一頁自己說明「這支影片也還沒過人工那一關」。

`hyperframes@0.8.6 check` 0 findings（contrast 58/58 AA），smoke render 3m30.5s / 13.6 MB。

## 2. 驗證紀錄

| 檢查 | 結果 |
| --- | --- |
| `hf audit --all` | 8 專案、0 error |
| `hf repo-check` | 0 problem（443 tracked files、8 allowlisted） |
| `hyperframes@0.8.6 check` | 每個影片專案皆 Check passed（對比度 18/18、53/53、58/58 等全數 AA） |
| 字幕對齊 | 平均重合度 0.970（29 條） |
| 人工 preview | **全部未做**（三支影片都停在 `ready-to-preview`） |

## 3. 待辦（依序）

1. **人工 gate（design-v2 A）**：兩份審核包已經是 Artifact，可直接在瀏覽器/手機完成：
   `storyboard-to-video-pipeline-demo` 與 `measurable-vs-audible-tts`。通過後改 status、成片放 Releases。
2. **盲測聽測（design-v2 D 的後半）**：`tts-bakeoff-2026-08` 的聽測包也已是 Artifact。
   聽完填 `docs/listening-scorecard.md` → 更新 strategy §3.5 → 決定 `hf tts --provider kokoro` 要不要做。
3. **E（BGM bed + voiceover carve）**：需要 `heygen` CLI 登入，屬於帳號動作，**要先問過 Snowy**。
4. **G（Atlas registry）**：另一個 repo，另開 scope；現在有 4 條 workflow、8 個 tracked 專案。
5. 可選：`chart` block（接上游 registry 的 `data-chart`）、`hf tts --provider kokoro`、英文 README。

## 4. Stop point

乾淨。工具鏈、template、三支影片、一個聽測 harness、CI、文件都已驗證並推上 GitHub；
唯一未做的是需要耳朵的三件事，而它們現在都只需要十分鐘。
