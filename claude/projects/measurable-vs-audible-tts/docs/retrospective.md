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
