# Shared HyperFrames Assets

`shared/` 放四條 workflow 共用的工具鏈、模板、schema 與文檔。

```text
shared/
├── tools/
│   └── hf.mjs                 共用工具鏈（new / html / prepare-tts / tts / measure / sync / fit-audio / vendor / review / audit / repo-check / pipeline）
├── vendor/
│   └── gsap.min.js            render 不依賴 CDN
├── docs/
├── schemas/
└── templates/
    └── hyperframes-research-project/
```

```powershell
node shared/tools/hf.mjs help
```

這裡不放任何 provider token 或私人 auth。專案只記錄需要哪些 auth，實際憑證存在各工具自己的安全位置，例如：

- Pi auth: `~/.pi/agent/auth.json`
- Environment variables: user/system env vars
- Codex session tools: current Codex runtime capability

## Intended Reuse

1. `node shared/tools/hf.mjs new <workflow>/<name>`（自動複製 template、填 id、vendor GSAP）。
2. 填寫 `project.json`、`data/storyboard.json`（唯一的意圖來源）、`data/pronunciation-map.json`；研究型專案再填 `data/research.json`、`docs/references.md`。
3. `npm run html`（storyboard → index.html 區塊）。
4. `npm run pipeline`（prepare-tts → Edge-TTS → ffprobe 量測 → sync 時間軸 / 字幕 / metadata → audit）。
5. `npm run check`（`hf audit` + `hyperframes check`）。
6. `npm run review` 產生人工審核包（每頁畫格 + 真實旁白 + 時間餘裕 + 逐項通過紀錄，離線可開、可分享），
   人工通過後才 `npm run render`。

資訊層（數字、清單、引述）用 storyboard 的 `slides[].blocks`；字彙表與實際樣子見
`claude/projects/block-vocabulary-reference`。

## TTS Notes

中英混讀的共用策略放在：

```text
shared/docs/tts-pronunciation-strategy.md
```

對應 schema：

```text
shared/schemas/pronunciation-map.schema.json
```

No-API-key / local-first TTS 升級路線：

```text
shared/docs/local-tts-no-api-key-strategy.md
```

待辦看板與設計文件：

```text
TODO.md                    開放中的工作，以及每一件由誰負責
shared/docs/design-v3.md   目前里程碑的規格與驗收
shared/docs/design-v2.md   §1 架構契約（仍然有效）＋ 已交付里程碑的實作紀錄
```

目前階段性收尾：

```text
shared/docs/phase-summary-2026-08-22.md
```

HyperFrames 0.8 升級實測：

```text
shared/docs/hyperframes-0.8-upgrade-notes.md
```

## Production Notes

完整製作手冊放在：

```text
shared/docs/hyperframes-production-playbook.md
```

內容包括：

- 目前三條 workflow 的定位。
- 已完成專案與輸出狀態。
- 標準 project skeleton。
- research、image generation、Edge-TTS、SRT、timeline、render 的標準流程。
- 已解決問題與未來改進方向。

三條 workflow 的實測總結：

```text
shared/docs/workflow-test-summary.md
```

GitHub 公開邊界與未來 project 上傳規則：

```text
shared/docs/repo-publication-policy.md
```
