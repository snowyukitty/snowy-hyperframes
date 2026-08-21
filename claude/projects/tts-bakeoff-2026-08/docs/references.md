# References — tts-bakeoff-2026-08

八段稿子全部是本 repo 自己寫的內容，不引用外部研究主張。以下是**工具與授權**的一手來源
（`project.json.sourceConfidence` 為 `official-only`：每一條都指向官方頁面或本機可驗證的事實）。

| 主張 | 來源 |
| --- | --- |
| Kokoro-82M 權重為 Apache-2.0 | https://huggingface.co/hexgrad/Kokoro-82M · https://github.com/hexgrad/kokoro |
| `hyperframes tts` 以本機 Kokoro 合成，支援 `zf_xiaobei` 等中文聲音與 `--lang zh` | `npx hyperframes@0.8.6 tts --help`（本機執行輸出） |
| Kokoro 模型首次下載約 311 MB | 本機 `~/.cache/hyperframes/tts/models/` 實測大小（2026-08-22） |
| Edge-TTS 不需要 API key，但依賴微軟線上服務 | https://github.com/rany2/edge-tts |
| Edge-TTS 的 `WordBoundary` 事件提供逐詞時間 | `edge_tts.Communicate(..., boundary="WordBoundary")` 本機實測 |
| F5-TTS 推理程式 MIT、預訓練模型 CC-BY-NC（出現在 sample-07 的稿子裡） | https://github.com/SWivid/F5-TTS |
| EBU R128 響度量測 | `ffmpeg -af ebur128=peak=true`（本機 ffmpeg 8.1.2） |

sample-03 裡的「每百萬字元三十美元」是**稿子內容**，用來測數字讀法，不是本專案對任何廠商定價的主張。
