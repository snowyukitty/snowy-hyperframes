# References

這個專案不引用外部研究；頁面上的每個數字都指向本 repo 內可驗證的規則，因此
`project.json.sourceConfidence` 為 `not-applicable`。

| 頁面上的主張 | 可驗證位置 |
| --- | --- |
| block 類型共 6 種 | `shared/tools/hf.mjs` → `BLOCK_TYPES` |
| 一頁上限 3 個 block、list 上限 5 項 | `shared/tools/hf.mjs` → `BLOCK_LIMITS` 與 `audit` 的 `block-density` 規則 |
| 安全邊界 0.6s | `shared/tools/hf.mjs` → `PAD_DEFAULT`，寫入 `data/timeline.json` |
| 「先量 MP3 再決定頁面長度」 | `shared/docs/hyperframes-production-playbook.md` §4.6 |
| 量測工具 ffprobe、回寫工具 hf sync | `data/audio-durations.json`、`data/timeline.json` |
