# Retrospective — measurable-vs-audible-tts

日期：2026-08-22 · workflow：`claude` · status：`ready-to-preview`

## 這支影片為什麼是這個題目

工作流 v2 需要一支**真正的研究影片**來證明管線可用，而不是再一支講管線自己的 demo。同一個 session
剛好產生了一份原創數據（`tts-bakeoff-2026-08` 的 16 段音檔量測），而且那份數據有一個誠實的缺口：
客觀差異量得出來，自然度量不出來。與其等聽測做完再拍一支「結論片」，不如直接把這個缺口當成主題——
「可以量的，跟只能聽的」。這樣影片既有原創內容，又不需要假裝有一個還不存在的結論。

## 做法

- 10 頁全部用 `blocks` 資訊層（`metrics` × 4 頁、`cards` × 2、`list` × 2、`quote` × 1、每頁一條 `source`），
  **沒有任何生成圖片**——研究影片的資訊密度來自排版，不是插圖。
- 每一頁只放一個發現，並在頁尾寫出量測方法（ffprobe／silencedetect／ebur128），觀眾可以自己重跑。
- `durationTarget` 在第一次 TTS 後重新對齊成「實測旁白 + 1.2 秒」：第一版用預估秒數，結果 242 秒裡有
  44 秒是空白，節奏拖沓；對齊後 210.5 秒，空白降到約 12 秒。

## 驗證

| 項目 | 結果 |
| --- | --- |
| `hf audit` | 0 errors / 0 warnings |
| `hyperframes@0.8.6 check` | lint 0/0、runtime 0/0、layout 0 issues / 9 samples、motion 0/0、contrast **58/58 WCAG AA** |
| `render` | 3m 30.5s、1920×1080 30fps H.264 + AAC 48k、13.6 MB、1m 18.8s 完成 |
| 逐頁目視（contact sheet） | 10 頁皆正常；收尾頁第一版太空，補上三張 cards 後才成立 |
| 人工 preview | **未做**（agent session） |

## 誠實標註

- 影片最後一頁自己說「這支影片本身也還沒過人工那一關」——那是真的，不是修辭。
- 成片沒有進 git（`**/renders/*.mp4` 已忽略）；要分享請放 GitHub Releases。
- 引擎自然度沒有結論，影片也沒有暗示結論。若之後盲測結果出來，應該另外拍一支結論片，
  而不是回頭改這一支——這支的主題是方法，不是排名。

---

## 2026-08-22 更新：三頁改成用畫的

第一版把每個發現都做成 metric tiles，等於「把數字念出來又寫一遍」。`chart` block 做好之後，
其中三頁換成真正的比較：

| 頁 | 原本 | 現在 | 為什麼 |
| --- | --- | --- | --- |
| 04 語速 | 三個數字方塊 | `bar`（4.42 vs 3.63） | 兩個數的比較，一眼就該看得出誰比較長 |
| 05 停頓 | 兩個數字方塊 | `bar`，Kokoro 標 `emphasis` | 「念得比較慢卻幾乎不停頓」是反直覺的結論，用紅色那條直接呈現 |
| 06 拉丁縮寫 | 三個數字方塊 | `line`（八段逐段語速） | 重點是第七段的凹陷；那是趨勢，不是單一數字 |

旁白一個字都沒改，所以沒有重新生成 TTS，時間軸也沒有變動——只有 `index.html` 的生成區塊換了。
另外用 `motion` 分了節奏：開場、限制頁、收尾 `focus`，四張發現頁 `reveal`。

驗證：`hf audit` 0 findings、`hyperframes@0.8.6 check` 0 findings（對比度 **62/62 AA**）、
render 210.5s / 14.1 MB / 1m21s、審核包已重新產生並更新到同一個 artifact URL。
**人工 preview 仍未做**，status 維持 `ready-to-preview`。

## 2026-08-24 maintenance

- Upgraded to HyperFrames 0.8.11 and regenerated the owned regions with the narration clips in the `voiceover` audio group.
- Compacted generated slide wrappers. The storyboard remains the readable source; the entry composition dropped below the new large-file lint threshold.
- The shared line-chart inset removed the 7 px endpoint clipping finding.
- Verification: `hf audit` 0 errors / 0 warnings; `hyperframes check --strict` passed with lint, runtime, layout, and motion at 0 findings and 62/62 contrast checks passing.
- Render and human preview were not repeated; the existing review gate remains pending.
