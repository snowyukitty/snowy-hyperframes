# tts-bakeoff-2026-08

No-API-key TTS 盲測：同一組八段稿子，分別交給 **Edge-TTS**（目前預設）與 **Kokoro-82M**（本機推理），
量出客觀數據，再用盲測聽測決定主觀自然度。

這是 `shared/docs/local-tts-no-api-key-strategy.md` 從 2026-06 起就掛著的未完成項——當時卡住的原因不是
技術，而是「聽 16 段音檔然後形成意見」沒有工具支撐。這個專案就是那個工具。

## 跑一次

```powershell
npm run bakeoff              # 合成缺少的音檔 -> 客觀量測 -> 產生盲測聽測包
npm run bakeoff -- --force   # 全部重新合成
npm run bakeoff -- --only sample-02
```

產出：

```text
assets/audio/<sample>.<provider>.mp3        音檔（Kokoro 另存 .wav 原檔）
assets/audio/<sample>.<provider>.provider.json   引擎、參數、量測（strategy doc §3 的 contract）
data/measurements.json                       全部客觀數據
bakeoff/index.html                           盲測聽測包（不進 git）
```

## 聽測方式（盲測）

打開 `bakeoff/index.html`：

1. 每段稿子下面有 A / B 兩個播放器，**標籤與客觀數據都被藏起來**，順序由 sample id 決定（每段不同）。
2. 聽完選「A 較好 / 平手 / B 較好」，可以寫一句原因。
3. 八段都評完再按「揭曉引擎」——這時才會看到是哪個引擎、以及秒數與 LUFS。
4. 按「複製評測結論」，把 markdown 貼回 `docs/listening-scorecard.md` 與 strategy doc。

八段稿子各針對一個已知弱點，所以「哪一段輸」比「總分」更有用：

| 段落 | 針對 |
| --- | --- |
| sample-01 | 純繁中基準自然度 |
| sample-02 | 中英混讀（產品名） |
| sample-03 | 數字、日期、價格 |
| sample-04 | 長句切分與換氣 |
| sample-05 | 柔和解說語氣 |
| sample-06 | 強調與轉折 |
| sample-07 | 模型名與授權縮寫 |
| sample-08 | 長稿音色穩定性 |

## 客觀數據能說什麼、不能說什麼

`data/measurements.json` 量的是長度、語速（拍/秒）、發聲語速（扣掉靜音）、內部停頓數、靜音比、
整合響度（LUFS）、真實峰值、生成 RTF。**這些能比較「一致性」與「工程成本」，不能決定「好不好聽」**——
自然度只有盲測聽測能定案，所以聽測包才是這個專案的主產物。

## 邊界

- 兩個引擎都不需要 API key。Edge-TTS 走微軟線上服務（不是離線）；Kokoro 首次下載約 311 MB 模型後可離線推理。
- 這個專案不做 voice cloning，也不使用任何他人聲音樣本。
- 稿子全部是本 repo 自己寫的內容，不引用外部研究主張。
