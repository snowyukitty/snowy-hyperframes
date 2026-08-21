# References — measurable-vs-audible-tts

本片的數字**全部是本 repo 自己量的**，可用 `npm run bakeoff` 在別台機器重跑驗證；外部來源只用於描述
工具與授權。`project.json.sourceConfidence` 設為 `mixed`（自有量測 + 官方文件）。

## 一、自有量測（本片主張的唯一來源）

| 影片中的數字 | 可驗證位置 |
| --- | --- |
| 語速 4.42 / 3.63 拍每秒 | `claude/projects/tts-bakeoff-2026-08/data/measurements.json` → `rate` |
| 八段總長 101.5s / 122.2s | 同上 → `durationSeconds` 加總 |
| 靜音佔比 21% / 7% | 同上 → `silenceRatio`（ffmpeg `silencedetect=noise=-35dB:d=0.18`）|
| 第七段 3.97 / 2.95、11.2s / 15.1s | 同上 → `sample-07` 兩列 |
| 響度 −19.1 / −20.7 LUFS，標準差 0.20 / 0.36 | 同上 → `lufs`（ffmpeg `ebur128=peak=true`）|
| 生成 RTF 0.35 / 0.65 | 同上 → `realTimeFactor`（合成耗時 ÷ 音檔長度）|
| 十六段音檔、共 223.7 秒 | 同上 → `results` 陣列長度與長度加總 |

量測環境：Windows 11、Node 24、FFmpeg 8.1.2、edge-tts 7.2.8、kokoro-onnx（`hyperframes@0.8.6 tts`），
2026-08-22。Edge-TTS 的 RTF 含網路往返，會隨連線品質變動；Kokoro 的 RTF 是本機推理。

## 二、官方文件（只描述工具與授權）

| 主張 | 來源 |
| --- | --- |
| Kokoro-82M 權重 Apache-2.0 | https://huggingface.co/hexgrad/Kokoro-82M · https://github.com/hexgrad/kokoro |
| Edge-TTS 免 API key、線上服務 | https://github.com/rany2/edge-tts |
| `hyperframes tts` 本機 Kokoro、`zf_xiaobei`、`--lang zh` | `npx hyperframes@0.8.6 tts --help` |
| F5-TTS 推理 MIT／模型 CC-BY-NC（僅為 sample-07 稿子內容） | https://github.com/SWivid/F5-TTS |
| EBU R128 響度量測 | `ffmpeg -af ebur128=peak=true` |

## 三、推估值

無。本片不使用任何推估數字。

## 四、明確不主張的事

- 不宣稱任何一個引擎比較自然或比較好聽——自然度沒有客觀量測，盲測尚未完成。
- 不比較未受測的引擎（MeloTTS、CosyVoice、ElevenLabs 等）。
- 「約 311 MB」是本機模型快取實測大小，非官方公告值。
