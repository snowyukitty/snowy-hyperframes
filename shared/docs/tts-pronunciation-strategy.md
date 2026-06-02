# TTS Pronunciation Strategy

This note records the default narration strategy for Snowy HyperFrames projects, especially for Traditional Chinese scripts that contain English product names, acronyms, model names, and plan labels.

## Research Summary

Edge-TTS is still the best default for fast local iteration because it is already installed, works well from PowerShell, and produces usable Mandarin narration without a project-specific API key. The important limitation is that Edge-TTS should be treated as a text-in/audio-out tool with only voice, rate, pitch, volume, and subtitle-output controls. The `rany2/edge-tts` project states that custom SSML support was removed because Microsoft Edge's online TTS service only accepts SSML that Edge itself can generate, effectively a single voice and prosody block. Do not rely on custom `<phoneme>`, `<say-as>`, `<sub>`, or lexicon tags when using Edge-TTS.

Azure Speech is the precise-pronunciation fallback. Microsoft's official SSML docs support phonemes, custom lexicons, `say-as`, and `sub`, and the Azure Speech language support docs describe multilingual voices and `<lang xml:lang>` accent control. Use Azure Speech when exact pronunciation is a hard requirement, when there is budget for an API-backed service, or when a project needs formal pronunciation QA.

Open-source TTS engines are useful as experiments, not as the default production path yet. MeloTTS is relevant because its README says the Chinese speaker supports mixed Chinese and English and CPU real-time inference. ChatTTS is relevant for dialogue-like Chinese/English experiments, but its released model is marked for academic purposes only, so it is not a clean default for reusable project output. For subtitles, WhisperX and Montreal Forced Aligner are better viewed as optional alignment tools when Edge-TTS word or sentence boundaries are not enough.

## Default Workflow

1. Keep display text and TTS text separate.
2. Store human-facing narration in `assets/audio/slide-XX.display.txt`.
3. Store pronunciation replacements in `data/pronunciation-map.json`.
4. Run `scripts/prepare-tts.ps1` to generate `assets/audio/slide-XX.tts.txt`.
5. Run Edge-TTS from the generated `.tts.txt` files.
6. Keep SRT subtitles aligned to the display/caption wording, not necessarily to every pronunciation-map spelling.

## Replacement Rules

Use pronunciation-map entries for:

- Acronyms: `API` -> `A P I`, `GPT` -> `G P T`.
- Model names: `GPT-Image-2` -> `G P T Image 二`.
- Product names that voices misread: `OpenAI` -> `Open A I`, `ChatGPT` -> `Chat G P T`.
- Plan labels: keep screen text as `Free / Plus / Pro`, but use `免費版 / Plus 版 / Pro 版` in TTS if that sounds more natural.
- English phrases that should be understood, not spelled literally: `Images with thinking` -> `Images with thinking 功能`.

Keep replacements conservative. Do not rewrite every English word into Chinese; preserve the terms a target viewer would expect to hear.

## Voice Selection

Default voice:

```text
zh-TW-HsiaoChenNeural
```

Candidate voices for A/B tests:

```text
zh-TW-HsiaoChenNeural
zh-TW-HsiaoYuNeural
zh-TW-YunJheNeural
zh-CN-XiaoxiaoNeural
en-US-EmmaMultilingualNeural
```

Use the Taiwan Mandarin voices for final Traditional Chinese narration unless a multilingual voice clearly handles product terminology better in a short sample. Avoid switching voices mid-sentence in Edge-TTS projects; voice changes can make the narration feel stitched together.

## Fallback Ladder

1. Edge-TTS with display/TTS split and pronunciation map.
2. Edge-TTS voice A/B test on a 10-20 second technical sample.
3. Segment-level bilingual audio only for high-value phrases, then concatenate with FFmpeg.
4. No-API-key local TTS bakeoff with Kokoro and MeloTTS.
5. Consent-based local voice cloning / conversion experiment with OpenVoice.
6. Azure Speech SSML for exact phoneme, alias, lexicon, and language-tag control when an API-backed fallback is acceptable.
7. Heavier open-source models such as CosyVoice, F5-TTS, and Fish Speech only after installation, license, voice quality, and Windows runtime are verified.

The no-API-key route is tracked separately:

```text
shared/docs/local-tts-no-api-key-strategy.md
```

## Sources Checked

- GitHub: rany2/edge-tts README, especially custom SSML limitation and CLI controls: https://github.com/rany2/edge-tts
- Microsoft Learn: Azure Speech SSML pronunciation documentation: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-synthesis-markup-pronunciation
- Microsoft Learn: Azure Speech language and voice support documentation: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=tts
- GitHub: myshell-ai/MeloTTS README for mixed Chinese-English support: https://github.com/myshell-ai/MeloTTS
- GitHub: hexgrad/kokoro README for Kokoro-82M local inference and Apache-licensed weights: https://github.com/hexgrad/kokoro
- GitHub: myshell-ai/OpenVoice README for local voice cloning / conversion and MIT license: https://github.com/myshell-ai/OpenVoice
- GitHub: FunAudioLLM/CosyVoice README for multilingual Chinese-focused local TTS research: https://github.com/FunAudioLLM/CosyVoice
- GitHub: SWivid/F5-TTS README for local voice-conditioned TTS and model license caution: https://github.com/SWivid/F5-TTS
- GitHub: fishaudio/fish-speech README for Fish Audio S2 research and license caution: https://github.com/fishaudio/fish-speech
- GitHub: 2noise/ChatTTS README for experimental Chinese/English dialogue TTS context: https://github.com/2noise/ChatTTS
- GitHub: rhasspy/piper README for archived fast local TTS reference: https://github.com/rhasspy/piper
- GitHub: m-bain/whisperX for optional speech alignment: https://github.com/m-bain/whisperX
- GitHub: MontrealCorpusTools/Montreal-Forced-Aligner for optional forced alignment: https://github.com/MontrealCorpusTools/Montreal-Forced-Aligner
