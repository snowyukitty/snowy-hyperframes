# Retrospective — tts-bakeoff-2026-08

日期：2026-08-22 · workflow：`claude` · status：`draft`（等人工聽測）

## 為什麼 2026-06 卡住

phase-summary-2026-06-03 把「聽 8 段 Edge-TTS baseline，填 scorecard，再加 Kokoro」列為第一優先，
然後兩個多月沒動。回頭看，卡點不是技術能力，是**這件事沒有工具**：要人打開檔案總管、逐一播放、
在腦中記住上一段、再手動填表。任何需要人「憑記憶比較」的流程都會被無限延後。

## 這次做了什麼

把主觀與客觀分開，各自給它適合的工具：

- **客觀**：`hf bakeoff` 用 ffmpeg 量長度、語速（拍/秒）、發聲語速（扣掉靜音）、內部停頓數、靜音比、
  整合響度（LUFS）、真實峰值、生成 RTF，寫進 `data/measurements.json`。這些數字能談一致性與工程成本。
- **主觀**：同一個指令產生 `bakeoff/index.html` —— **盲測** A/B 聽測包，標籤與客觀數據都藏到「揭曉」之後，
  每段順序由 sample id 決定。聽完按一顆按鈕就得到 markdown 結論。

八段稿子各針對一個弱點（純中文、中英混讀、數字、長句、語氣、強調、專有名詞、長稿穩定性），
所以「哪一段輸」比總分有用。

## 實作上踩到的

- `hyperframes tts` 需要 `pip install kokoro-onnx soundfile`，第一次執行會下載約 311 MB 模型（約 47 秒，含載入）。
  安裝後完全本機推理。
- Kokoro 輸出 24 kHz 單聲道 WAV；聽測包改用 96 kbps MP3 轉檔，才能把整包壓在幾 MB 以內。
- 客觀數據**不能**代替聽測。第一段的量測就顯示兩個引擎語速差很多（Edge 4.37 拍/秒 vs Kokoro 3.49），
  但語速慢不等於自然，也不等於不自然——這正是要盲測的原因。

## 誠實標註

- **沒有任何自然度結論。** `docs/listening-scorecard.md` 是空的，等人聽完才填。
- **公開範圍（決定過一次又改掉，記錄理由）**：一開始決定整個專案不進 git，理由是「沒有結論的評測若公開，
  等於用嚴謹的外觀承諾一個還不存在的答案」。後來改成公開**方法與量測**、但**不收錄 16 段音檔**，理由是
  這個 session 剛好證明了相反方向的風險：2026-06 的私有 `codex/projects/tts-local-bakeoff`（8 段 golden
  samples、Edge-TTS baseline、scorecard）**在這台機器上已經找不到了**。只留本機的研究會消失。
  折衷是：稿子、設定、量測、scorecard 進 git（都是小的文字檔、且不可再生），音檔不進（`npm run bakeoff`
  可完全重生）。README 與本文都明確標示自然度結論尚未存在。
- 沒有測 MeloTTS / CosyVoice / F5-TTS：strategy doc 把它們排在 Tier 1.5–2，先把 Tier 0 vs Tier 1 的
  比較做完再說。
