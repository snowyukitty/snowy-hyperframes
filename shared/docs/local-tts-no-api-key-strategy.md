# Local / No-API-Key TTS Strategy

更新日期：2026-06-03

本文件記錄 Snowy HyperFrames 的 no-API-key TTS 升級方向。目標不是把 Edge-TTS 立刻替換掉，而是建立一條不用 paid API key 也能研究、測試、比較和逐步升級的 TTS 品質路線。

## 1. 定義

`no-api-key` 不等於完全離線。

- Edge-TTS：不需要 project-specific API key，但依賴 Microsoft Edge online TTS service。
- Local open-source TTS：模型下載後可在本機推理，通常不需要 API key；首次下載可能需要 Hugging Face、ModelScope 或 GitHub 網路存取。
- Voice cloning / voice conversion：即使不用 API key，也必須只使用自己擁有權利或已取得明確授權的聲音樣本。

HyperFrames 的 practical goal：

```text
Edge-TTS baseline
  -> local TTS bakeoff
  -> no-key provider adapter
  -> project-level voice quality report
```

## 2. Recommended No-Key Ladder

### Tier 0: Edge-TTS baseline

仍作為預設快速路徑：

- 已可用於 PowerShell / HyperFrames。
- 不需要 API key。
- 適合快速 research draft、demo、教育內容。
- 必須搭配 display/TTS split、pronunciation map、audio audit、preview gate。

限制：

- 不是完整 SSML production engine。
- 中英混讀、停頓、情緒、精準 phoneme 控制有限。
- 依賴線上 service，不是真正離線。

### Tier 1: Kokoro

定位：第一個 local-first 輕量候選。

理由：

- 82M open-weight TTS model，官方 repo 說 weights 是 Apache-licensed。
- 可 `pip install kokoro`。
- 支援多語 pipeline，其中 Mandarin Chinese 需要 `misaki[zh]`。
- 適合做本機無 API key baseline，先測英文、中文、中文英文混讀。

風險：

- 不應預期它能完整取代 voice clone 系統。
- 中文品質、繁中詞彙、長稿穩定性需要實測。

來源：

- https://github.com/hexgrad/kokoro
- https://huggingface.co/hexgrad/Kokoro-82M

### Tier 1: MeloTTS

定位：最務實的中文英文混讀候選之一。

理由：

- Repo 明確說 Chinese speaker supports mixed Chinese and English。
- Repo 說 CPU real-time inference。
- MIT license，README 表示可商用與非商用。

風險：

- 專案 release 較少，需檢查 Windows 安裝穩定性。
- 聲音自然度可能不如新一代 large TTS，但工程門檻低。

來源：

- https://github.com/myshell-ai/MeloTTS

### Tier 1.5: OpenVoice

定位：合法授權 voice cloning / voice conversion 研究候選，不是一般 TTS baseline。

理由：

- Repo 明確標示 OpenVoice V2 支援 English、Spanish、French、Chinese、Japanese、Korean。
- Repo 表示 V1/V2 自 2024-04 起 MIT license，可商用。
- 適合研究「已授權聲音 profile」如何接入 HyperFrames。

風險：

- 必須建立 voice consent rule。
- 需要聲音樣本 QA、音色一致性 QA、濫用防護。
- 不應作為未授權 voice clone 工具。

來源：

- https://github.com/myshell-ai/OpenVoice

### Tier 2: CosyVoice

定位：高潛力中文 / 多語 / 方言 / zero-shot candidate。

理由：

- 官方 repo 是 Apache-2.0 codebase。
- CosyVoice 3.0 highlights 包含 Chinese、English、Japanese、Korean、German、Spanish、French、Italian、Russian，以及多種中文方言/口音。
- 支援 multilingual / cross-lingual zero-shot voice cloning、pronunciation inpainting、text normalization、streaming、instruction support。

風險：

- 安裝與 runtime 較重，通常需要 conda / PyTorch / GPU。
- 模型權重、商用條款、第三方依賴要逐一確認，不能只看 repo license。
- 適合作為高品質研究線，不適合作為第一個簡單落地 adapter。

來源：

- https://github.com/FunAudioLLM/CosyVoice

### Tier 2: F5-TTS

定位：English / Chinese voice cloning 研究與技術學習候選。

理由：

- 官方 repo 提供 pip install、Docker、CLI inference、Gradio。
- 支援 reference audio + generated text 的推理模式，適合研究 voice-conditioned TTS。
- Benchmark 顯示可做到很低 RTF，但硬體與 deployment 條件要看環境。

風險：

- Code 是 MIT，但 README 明確說 pre-trained models 是 CC-BY-NC，因訓練資料限制不適合商用 production。
- 適合學習和內部研究，不適合直接作為可商用預設 voice layer。

來源：

- https://github.com/SWivid/F5-TTS

### Tier 2: Fish Speech / Fish Audio S2

定位：高品質、多語、情緒控制、voice cloning 的前沿研究候選。

理由：

- 官方 repo 描述 S2 Pro 支援 80+ languages、natural language tags、multi-speaker、multi-turn generation、rapid voice cloning。
- Benchmark 結果看起來很強，值得研究與對標。

風險：

- Repo 明確採用 Fish Audio Research License，不是寬鬆開源 license。
- S2 Pro 4B model 對硬體要求高。
- 更適合研究、benchmark 和架構參考，不應未審核就進 production。

來源：

- https://github.com/fishaudio/fish-speech

### Research-only / Caution

ChatTTS：

- 優點：對話感、笑聲、停頓、prosody 控制值得學。
- 限制：repo 明確說 released model is for academic purposes only；code AGPLv3+，model CC BY-NC 4.0。
- 結論：只作研究參考，不進 production default。

Piper：

- 優點：fast local neural TTS，MIT，工程簡潔。
- 限制：原 repo 已於 2025-10-06 archived，README 指向新 development location。
- 結論：適合參考 local CLI / ONNX / lightweight deployment，不作新主線。

來源：

- https://github.com/2noise/ChatTTS
- https://github.com/rhasspy/piper

## 3. HyperFrames TTS Contract

所有 TTS provider 都應該輸出同一種 project artifact：

```text
assets/audio/slide-01.display.txt
assets/audio/slide-01.tts.txt
assets/audio/slide-01.<provider>.mp3
assets/audio/slide-01.<provider>.duration.json
assets/audio/slide-01.<provider>.provider.json
assets/audio/slide-01.<provider>.quality-notes.md
```

Provider metadata 建議包含：

```json
{
  "provider": "kokoro",
  "model": "Kokoro-82M",
  "voice": "replace-with-voice",
  "requiresApiKey": false,
  "runsOfflineAfterDownload": true,
  "license": "Apache-2.0 weights; verify model card",
  "inputText": "assets/audio/slide-01.tts.txt",
  "outputAudio": "assets/audio/slide-01.kokoro.mp3",
  "durationSeconds": 0,
  "generatedAt": "2026-06-02T00:00:00+09:00"
}
```

## 4. Golden Samples

建立固定測試稿，任何 provider 都跑同一組：

1. 純繁中研究旁白。
2. 繁中 + OpenAI / ChatGPT / GPT-Image-2 / API / TTS。
3. 數字、百分比、美元、日期、時間。
4. 長句切句與自然停頓。
5. 柔和但清楚的解說語氣。
6. 需要強調、轉折、短 pause 的段落。
7. 英文模型名與中文敘述混合。
8. 一段 45-60 秒長稿，測長篇一致性與音質漂移。

## 5. Quality Scorecard

每個 provider 至少人工打分：

| Metric | 1 | 3 | 5 |
| --- | --- | --- | --- |
| Naturalness | 明顯機械 | 可接受 | 接近真人旁白 |
| Mandarin quality | 發音常錯 | 大致可用 | 穩定自然 |
| Mixed EN/ZH | 英文破碎 | 需 pronunciation map | 自然 |
| Pacing | 斷裂或過急 | 可剪輯 | 自然停頓 |
| Long-form consistency | 明顯漂移 | 小幅漂移 | 穩定 |
| Controllability | 幾乎不可控 | 有基本參數 | 可控發音/情緒/停頓 |
| Setup cost | 很難 | 可接受 | 一條命令或 Docker |
| License fit | 不可用 | 研究可用 | production-friendly |

## 6. Immediate Implementation Plan

短期：

1. 保留 Edge-TTS 作為 baseline。
2. 新增 `codex/projects/tts-local-bakeoff` 或 private local project。
3. 寫 golden samples。
4. 先測 Kokoro 和 MeloTTS，因為它們最接近 no-key practical path。
5. 每段輸出 duration/provider/quality notes。

### 2026-06-03 Status

已建立私有本機 bakeoff project：

```text
codex/projects/tts-local-bakeoff
```

它目前被 `.gitignore` 忽略，不進 GitHub。

已完成：

- 8 段 golden samples。
- Edge-TTS baseline text generation。
- 8 段 Edge-TTS MP3。
- Edge-TTS duration report。
- listening scorecard template。

下次接續點：

1. 聽 Edge-TTS baseline。
2. 填 listening scorecard。
3. 再接 Kokoro adapter。

中期：

1. 測 OpenVoice，只使用自己授權的 reference voice。
2. 測 CosyVoice，確認 Windows / Docker / GPU 路線。
3. F5-TTS 和 Fish Speech 作研究對標，不直接商用。

長期：

1. 建立 `shared/scripts/tts-bakeoff`。
2. 建立 provider-neutral adapter interface。
3. 把 TTS selection 寫進 `project.json`。
4. 正式專案以「Edge-TTS baseline + local candidate + manual QA」決定 final voice。

## 7. Recommendation

目前 Snowy HyperFrames 的 no-API-key TTS 主線應該是：

```text
Edge-TTS baseline
Kokoro quick local test
MeloTTS mixed EN/ZH test
OpenVoice consent-based cloning experiment
CosyVoice high-quality Chinese research
F5-TTS / Fish Speech architecture study
ChatTTS / Piper reference-only
```

這條路線符合三個要求：

- 不依賴 paid API key。
- 可學習大量高品質 GitHub repo。
- 不犧牲 HyperFrames 已有的 TTS workflow discipline：display/TTS split、pronunciation map、audio audit、preview gate。
