# Shared HyperFrames Assets

`shared/` 放三條 workflow 共用的模板、schema、文檔與腳本建議。

```text
shared/
├── docs/
├── schemas/
└── templates/
    └── hyperframes-research-project/
```

這裡不放任何 provider token 或私人 auth。專案只記錄需要哪些 auth，實際憑證存在各工具自己的安全位置，例如：

- Pi auth: `~/.pi/agent/auth.json`
- Environment variables: user/system env vars
- Codex session tools: current Codex runtime capability

## Intended Reuse

1. 從 `shared/templates/hyperframes-research-project/` 複製一份到某個 workflow 的 `projects/<name>/`。
2. 填寫 `project.json`。
3. 填寫 `data/research.json`、`data/storyboard.json`、`data/image-prompts.json`。
4. 若旁白含中英混讀，填寫 `data/pronunciation-map.json` 並使用 `scripts/prepare-tts.ps1` 生成 `.tts.txt`。
5. 補 `assets/`、`captions/`、`scripts/`。
6. 執行 `npm run check`。

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

目前階段性收尾：

```text
shared/docs/phase-summary-2026-06-03.md
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
