# Pi Workflow

`pi` 用於讓 Pi 自主完成的 HyperFrames 專案。它特別適合把研究影片流程工程化：查資料、生成圖片、產生 TTS、建立字幕、驗證 timeline、render，以及把所有 artifact 保存在本機。

```text
pi/
└── projects/
```

適用情境：

- Pi 已登入必要 provider。
- 研究可用 Tavily / Brave Search。
- PDF 可用 `pi-docparser`。
- 圖片可用 `pi-codex-image-gen` 的 `codex_generate_image`。
- TTS 可用 `edge-tts` CLI。
- 需要可重跑的本機工程：scripts、checks、metadata、render logs、retrospective。

不適合直接無人值守 render 的情境：

- 旁白長度尚未用 `ffprobe` 對齊。
- 尚未人工聽過 TTS。
- 尚未瀏覽 browser preview。
- 需要高度審美/導演判斷，但沒有中途人工 feedback。

重要前提：

- 若要 Pi 自己生成 GPT-Image-2 圖片，Pi 必須完成 `/login` 並選擇 `ChatGPT Plus/Pro (Codex Subscription)`，讓 `auth.json` 內存在 `openai-codex`。
- GitHub Copilot auth 可作為主推理模型，但不能替代 `openai-codex` 生圖 auth。

每個具體專案放在：

```text
pi/projects/<project-name>/
```

Current projects:

```text
pi/projects/latest-tts-voice-clone-research
```

`latest-tts-voice-clone-research` is the first completed Pi-led full HyperFrames package in this workspace. It includes research data, 11 generated images, Edge-TTS MP3 narration, captions, audio audit, HyperFrames Studio preview, and a no-cut rendered MP4.

## Required QA Gate Before Render

Pi 專案 render 前應先完成：

```bash
npm run audio:audit   # 若專案有 TTS/MP3
npm run check
npm run preview       # 或 npm run dev
```

人工預覽時至少確認：

- 沒有音頻被 slide duration 截斷。
- native audio controls 沒有出現在畫面中。
- 圖片與標題對應正確。
- 1080p 下文字可讀。
- 旁白發音、停頓和節奏可以接受。

只有 preview 批准後才執行：

```bash
npm run render
```

## When Pi Is Best

Pi 更適合：

- 可重跑 research-to-video pipeline。
- 大量本機檔案與 CLI 串接。
- 長期沉澱為模板、scripts、checks。
- 驗證 auth boundary 和 package integration。

Pi 較不適合：

- 沒有人工 feedback 的高審美決策。
- 需要反覆聽音、逐句剪輯、細緻導演節奏的最終剪輯。
- 外部 provider/auth 尚未配置完成的情境。
