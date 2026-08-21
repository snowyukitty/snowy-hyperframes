# References

這個 demo 描述的是本 repo 自己的工具鏈，沒有外部研究主張；`project.json.sourceConfidence` 因此為
`not-applicable`。下列是實作所依據的一手來源：

| 主題 | 來源 | 用途 |
| --- | --- | --- |
| HyperFrames 合成契約（`data-start` / `data-duration` / `class="clip"` / `data-composition-id`） | https://github.com/heygen-com/hyperframes — `skills/hyperframes-core/SKILL.md` | `index.html` 結構 |
| HyperFrames CLI（`check` 取代 `validate` / `inspect`；`doctor`、`snapshot`） | 同上 — `skills/hyperframes-cli/SKILL.md` | `package.json` scripts |
| `hyperframes.json` 正式 schema（`registry` / `paths`，`additionalProperties: false`） | 同上 — `docs/schema/hyperframes.json` | 專案設定檔；Snowy manifest 改放 `data/timeline.json` |
| `clip_media_fit`（音訊 slot 比媒體長時在 render 時被縮短） | `npx hyperframes@0.8.6 check` 實測輸出（2026-08-22） | `hf sync` / `hf fit-audio` 把 audio slot 設為 MP3 實長 |
| Edge-TTS CLI 參數（`--rate=` / `--pitch=` equals 形式） | https://github.com/rany2/edge-tts ；`shared/docs/hyperframes-production-playbook.md` §4.5 | `hf tts` |
| GSAP 3.14.2 | https://gsap.com （Standard License） | `vendor/gsap.min.js` |

量測證據：`data/audio-durations.json`（ffprobe）、`data/timeline.json`（sync 結果）。
