# HyperFrames Research Project Template

不要手動複製這個資料夾；在 repo 任何位置執行：

```powershell
node shared/tools/hf.mjs new <workflow>/<project-name>     # workflow: codex | codex-pi | pi | claude
```

`hf new` 會複製模板、填好 `project.json` / `package.json` 的 id、放入 `vendor/gsap.min.js`，
並提醒你：新專案預設被 `.gitignore` 忽略，公開前要走 `shared/docs/repo-publication-policy.md` 的審核。

## 之後的流程

```powershell
cd <workflow>/projects/<project-name>
#  1. 寫 data/storyboard.json（id / title / chapter / durationTarget / image / subtitle / narration）
#     與 data/pronunciation-map.json；研究型專案同時填 data/research.json、docs/references.md
npm run html        #  2. storyboard -> index.html 的 slide/audio 區塊（CSS/JS 在標記外，可自由改）
npm run pipeline    #  3. prepare-tts -> tts (Edge-TTS) -> measure (ffprobe) -> sync -> audit
npm run check       #  4. hidden-window hf audit + hyperframes@0.8.16 check
npm run review      #  5. 人工 gate：產生 review/index.html（畫格 + 真實旁白 + 餘裕 + 逐項勾選）
npm run render      #  6. renders/<project>.mp4（不進 git；要分享放 GitHub Releases）
```

## 資訊層：blocks

一頁的數字、清單、引述寫在 storyboard 的 `slides[].blocks`，由 `hf html` 生成 HTML：

| type | 內容 | 每頁建議 |
| --- | --- | --- |
| `lead` | 一句話導語 | 1 |
| `metrics` | `items[{label, value, note}]` | 2–4 |
| `cards` | `items[{title, text}]` | 2–3 |
| `list` | `items[string]`（`ordered: true` 可編號） | 2–5 |
| `quote` | `text` + `source` | 1 |
| `source` | 頁尾來源註記 | 1 |
| `chart` | `bar`（2–6 項）／`split`（2–4 段）／`line`（1–2 條、每條 ≤12 點）；**必填 `source`** | 1 |

圖表若設了 `min`／`max`，caption 會自動加註「（縱軸自 X 起）」——截斷的座標軸一定會自己招認。

每頁還可以選到場方式：`motion: rise | hold | focus | reveal`（預設 `rise`），只影響入場動畫，
不影響任何時間真相。

一頁最多三個 block，`hf audit` 會檢查。實際樣子：`claude/projects/block-vocabulary-reference`。

## 音樂床（可選）

在 storyboard 頂層宣告即可，`hf html` 會生成一條跨全片的 `bgm` 音軌：

```jsonc
"music": { "file": "assets/audio/bgm.mp3", "volume": 0.14 }
```

`hf audit` 會檢查檔案存在、**長度不短於全片**（太短會被 HyperFrames 靜靜截掉）、音量範圍，
並用「床本身的響度 × 音量」預估它在成片裡的落點。實測：床本身 −20 LUFS、volume 0.14 →
成片裡約 −37.7 LUFS，旁白約 −15.8 LUFS，相差 22 dB。

音樂本身要自備（確認你有權使用），或用上游的 `/media-use` 取得。

## 模板裡有什麼

```text
index.html                 可直接 check/render 的合成骨架：CJK @font-face(local)、full-bleed 背景、
                           lower-third 字幕、chapter eyebrow、進度標籤、無圖片時的漸層 + 進度環、
                           以 DOM data-start 驅動的 GSAP 入場動畫（沒有第二份時間陣列會漂移）
package.json               all scripts route through shared/tools/hf.mjs and pinned hyperframes@0.8.16
hyperframes.json           HyperFrames 自己的設定（registry / paths）；Snowy 的時間軸在 data/timeline.json
project.json               專案索引（shared/schemas/project.schema.json）
data/storyboard.json       唯一的意圖來源
data/pronunciation-map.json 字幕 -> 朗讀稿 替換規則
data/research.json, data/image-prompts.json
docs/runbook.md, docs/retrospective.md, docs/references.md
assets/images/, assets/audio/, captions/, renders/
```

## 視覺慣例（playbook §4.7）

- 16:9 full-bleed 背景圖（或無圖片的漸層），深色 overlay 保字幕可讀。
- 文字、數字、來源一律 HTML overlay；不烤進圖片。
- 每頁用 slide-specific 圖片檔名，避免 duplicate media warning。
- 裝飾用 SVG shape 而不是文字，`hyperframes check` 的 contrast / occlusion 才不會誤判。

完整手冊：`shared/docs/hyperframes-production-playbook.md`；工具鏈：`node shared/tools/hf.mjs help`。
