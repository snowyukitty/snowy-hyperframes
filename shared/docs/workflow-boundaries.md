# Workflow Boundaries

## `codex-pi`

Codex 統籌任務，產出 Pi-compatible 的專案結構。可以使用 Codex 內建 image generation，也可以調用 Pi 或 Pi 已安裝的 CLI 工具。適合人機協作與過渡期。

Auth 原則：

- 不把 auth 寫入 project。
- project 只記錄 `requiresAuth`。
- 若 Pi 未登入 `openai-codex`，圖片可由 Codex 先生成，並保留 prompt 供 Pi 日後重跑。

## `codex`

只用 Codex 與本機工具完成。專案不要求 Pi 之後可自主重跑。

## `pi`

Pi 自主完成。若需要 GPT-Image-2 生圖，Pi 必須有 `openai-codex` OAuth。GitHub Copilot 可作為主推理 provider，但不能替代生圖 auth。

Pi 的優勢是可重跑與工程化：本機 CLI、檔案批處理、metadata、audio audit、HyperFrames lint/render、retrospective 都能落地。Pi 的風險是若沒有人工 preview gate，會很快把流程跑到 render，但節奏、旁白截斷、圖文可讀性等品質問題可能到成片才暴露。

Pi workflow 的正式 render gate：

1. `npm run audio:audit`（若有 TTS/MP3）
2. `npm run check`
3. `npm run preview` / `npm run dev`
4. 人工確認後才 `npm run render`

## Common Rule

每個具體 project 必須能回答：

- 這是用哪條 workflow 做的？
- 需要哪些 auth？
- 圖片是誰生成的？
- 是否已 render？
- 來源可信度屬於官方、混合還是估算為主？
