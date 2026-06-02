# Codex-Pi Workflow

`codex-pi` 用於「Codex 統籌 + Pi-compatible 專案輸出」的 HyperFrames 工作流。Codex 可以查資料、生成圖片、建立檔案、跑 HyperFrames/Edge-TTS；Pi 相關工具與 prompts 會被保留在專案中，讓未來 Pi 能接手或重跑。

## Definition

```text
codex-pi = Codex orchestrates, Pi-compatible project output
```

這不代表每個專案都一定要實際調用 Pi；它代表輸出結構、資料檔與 prompts 設計時會考慮 Pi 後續接手。

## Directory Layout

```text
codex-pi/
├── README.md
└── projects/
    └── <project-name>/
```

每個 project 應包含：

```text
project.json
index.html
package.json
hyperframes.json
data/
docs/
assets/
captions/
scripts/
```

## When To Use

- Pi 的工具鏈已配置，但某些 auth 尚未完成。
- 想先用 Codex image generation 做素材，同時保存 prompt 供 Pi 日後重跑。
- 想讓專案具備研究資料、分鏡、來源與 TTS 的可維護結構。
- 需要 Codex 更直接地操作本機檔案與 HyperFrames CLI。

## Auth Boundary

- 不把 token 或 API key 寫入 project。
- project 只在 `project.json` 記錄 `auth.required` 與 `auth.optional`。
- Pi auth 實際位置是 `~/.pi/agent/auth.json`。
- 若 Pi 要自行使用 `codex_generate_image`，必須有 `openai-codex` OAuth。
- GitHub Copilot 可以作為 Pi 的主推理 provider，但不能替代 `openai-codex` 生圖 auth。

## Current Projects

```text
projects/gpt-image-2-quota-research
```

單一專案的工具紀錄、困難與經驗教訓放在各 project 的：

```text
docs/retrospective.md
```
