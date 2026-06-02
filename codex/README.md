# Codex Workflow

`codex` 用於只靠 Codex 完成的 HyperFrames 專案。

```text
codex/
└── projects/
```

適用情境：

- 不需要 Pi packages 或 Pi auth。
- 圖片、研究、HTML、TTS 都由 Codex 與本機 CLI 直接完成。
- 專案不要求 Pi 之後可自主重跑。

每個具體專案放在：

```text
codex/projects/<project-name>/
```

## Projects

```text
projects/ai-tool-cost-benchmark
projects/ai-2030-three-futures
```

第一個 Codex-only benchmark 專案，研究 Codex、Pi + GitHub Copilot、Claude Code 在 `research -> video(with audio/subtitle/images)` 工作流中的固定成本、邊際成本、媒體完整度、可重跑性與風險。

`ai-2030-three-futures` 是 2030 情境研究影片，包含樂觀、一般、悲觀三個版本，並已輸出 MP4。
