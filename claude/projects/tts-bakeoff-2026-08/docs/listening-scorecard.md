# Listening Scorecard — tts-bakeoff-2026-08

聽測方式：打開 `bakeoff/index.html`（`npm run bakeoff` 產生），盲測選出每段的勝方，八段評完後按
「揭曉引擎」，再按「複製評測結論」把結果貼進下面的表。

**狀態：待人工聽測。** 客觀數據已經量好（`data/measurements.json`），但自然度尚未有人聽過；
在有人聽完之前，這份 scorecard 不得寫入任何「哪個引擎比較自然」的結論。

## 結論（貼上聽測包的輸出）

<!-- 貼在這裡 -->

| 段落 | 針對 | 勝出 | 備註 |
| --- | --- | --- | --- |
| sample-01 純繁中研究旁白 | 基準自然度 | | |
| sample-02 中英混讀產品名 | 中英切換 | | |
| sample-03 數字、日期、價格 | 數字讀法 | | |
| sample-04 長句切分 | 換氣 | | |
| sample-05 柔和解說語氣 | 語氣 | | |
| sample-06 強調與轉折 | 重音停頓 | | |
| sample-07 模型名與授權條款 | 專有名詞 | | |
| sample-08 長稿穩定性 | 音色漂移 | | |

## 決策（聽完再填）

- [ ] 維持 Edge-TTS 為預設
- [ ] 改用 Kokoro 為預設
- [ ] 分場景使用（例如：草稿用 Kokoro（離線、免等網路），正式片用 Edge-TTS）

理由：

## 後續（視結論而定）

- 若 Kokoro 勝出或打平：在 `hf tts` 加上 `--provider kokoro`，讓一般專案也能離線產旁白
  （目前 `hf bakeoff` 已經會呼叫 `npx hyperframes tts`，把它接到 `hf tts` 只是把同一段程式挪過去）。
- 若 Edge-TTS 明顯勝出：把結論寫進 strategy doc 的 Tier 0，並把 Kokoro 標為「離線備援」。
- 兩種情況都要更新 `shared/docs/local-tts-no-api-key-strategy.md` 的「實測結果」段落。
