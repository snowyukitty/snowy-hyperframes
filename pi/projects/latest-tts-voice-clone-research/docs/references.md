# References: 2026 年最新 TTS 與 AI Voice Clone 技術研究

**研究日期：** 2026-06-02  
**語言：** 繁體中文  
**研究範圍：** 截至 2026 年 6 月最新的 TTS、voice clone、narration、voice conversion、multilingual voice 與 prosody control 技術

---

## 官方文檔與公告

### OpenAI

1. **Advancing voice intelligence with new models in the API** (May 7, 2026)
   - URL: https://openai.com/index/advancing-voice-intelligence-with-new-models-in-the-api
   - 核心內容：
     - 新一代 GPT-Realtime-2 模型，具備 GPT-5 級別推理，實時聲音對話
     - GPT-Realtime-Translate：支持 70+ 輸入語言、13 輸出語言
     - GPT-Realtime-Whisper：實時轉錄 $0.017/分鐘
     - 定價：GPT-Realtime-2 $32/1M 輸入 token，$64/1M 輸出 token
   - 適用場景：實時聲音代理、跨語言對話、軟體指導
   - 局限：面向實時對話，非預錄旁白優化；高成本

### Microsoft Azure

2. **Speech Synthesis Markup Language (SSML) Pronunciation Control**
   - URL: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-synthesis-markup-pronunciation
   - 核心內容：
     - 支持 `<phoneme>` 標籤精確發音控制
     - 支持 `<say-as>` 格式控制（數字、日期、時間）
     - 支持多語言聲音與 `<lang xml:lang>` 口音控制
     - 自訂詞彙表功能
   - 適用場景：需要精確發音、特定方言或強調的內容
   - 成本：較 Edge-TTS 高

3. **Azure Speech Language Support**
   - 支持繁體中文、簡體中文與多種台灣地區特定聲音
   - Enterprise Data Residency 支持

### GitHub: rany2/edge-tts

4. **Edge-TTS Documentation**
   - URL: https://github.com/rany2/edge-tts
   - 核心內容：
     - 免費的 Microsoft Edge 線上 TTS 包裝，無需 API key
     - **重要：** 自訂 SSML 已移除（Microsoft Edge 只接受 Edge 自身能生成的 SSML）
     - 支持聲音、速率、音調、音量、字幕輸出控制
     - 台灣普通話預設聲音：`zh-TW-HsiaoChenNeural`、`HsiaoYuNeural`、`YunJheNeural`
     - **局限：** 不支持 `<phoneme>`、`<say-as>`、自訂詞彙表
   - 適用場景：快速原型、教育、個人項目

---

## ElevenLabs 官方資源

5. **ElevenLabs Voice Cloning Overview** (2026)
   - URL: https://elevenlabs.io/voice-cloning
   - 核心內容：
     - **Instant Voice Cloning：** 1 分鐘音頻樣本
     - **Professional Voice Cloning：** 30+ 分鐘高品質音頻，捕捉口音與情感
     - Multilingual v2（70+ 語言）與 Turbo v2.5（實時）模型
     - May 2026 新增 Dubbing v2：原聲表演轉移到每個語言版本
   - 定價：付費方案自動獲得商業使用權
   - 支持語言：包括繁體中文、簡體中文

6. **ElevenLabs Review 2026: Voice Cloning & Synthesis** (Feb 2026)
   - URL: https://www.coval.ai/blog/elevenlabs-review-2026-voice-cloning-and-synthesis-capabilities-explained
   - 內容：
     - Multilingual v2：最高品質，適合內容創作
     - Turbo v2.5：實時應用，速度與品質平衡
     - Flash models：最快生成，質量略降
     - 超過 1 百萬創作者使用，每月處理百萬小時音頻

---

## 開源 TTS 與模型研究

### Fish Speech / CosyVoice / Kokoro 等

7. **Best Voice Cloning Models For Edge Deployment In 2026**
   - URL: https://www.siliconflow.com/articles/en/best-voice-cloning-models-for-edge-deployment
   - 核心排名：
     - Fish Speech V1.5：ELO 1339（頂級開源）
     - CosyVoice 2.0 / IndexTTS-2：前三開源模型
     - 300k+ 小時訓練（Fish Speech），支持中文/英文混讀

8. **The Best Open-Source Text-to-Speech Models in 2026**
   - URL: https://www.bentoml.com/blog/exploring-the-world-of-open-source-text-to-speech-models
   - 詳細分析：
     - **Fish Audio S2 Pro：** 81.88% EmergentTTS-Eval 勝率，超越 ElevenLabs
     - **Kokoro-82M：** 82M 參數，CPU 可運行，38+ 語言，Apache 2.0 許可
     - **MeloTTS：** MIT 許可，中文混英文支持，CPU 實時推理
     - **ChatTTS：** 100k 小時中英數據，對話導向，但學術標記
     - **F5-TTS：** Flow Matching 架構，200M 參數，零樣本複製（5-15 秒）

9. **Best TTS Models 2026: Open-Source vs ElevenLabs Comparison**
   - URL: https://ocdevel.com/blog/20250720-tts
   - 排名對比：
     - 商用：Vocu V3.0 (1603 ELO) > Inworld TTS MAX (1594) > ElevenLabs Flash v2.5 (1548)
     - 開源：Kokoro (1424) > XTTS v2 (1388)
     - 最佳成本效益：Inworld TTS ($5-10/1M chars)
     - 開源聲音複製：Chatterbox (63.75% 勝 ElevenLabs)

10. **F5-TTS: A Fairytaler that Fakes Fluent and Faithful Speech with Flow Matching**
    - URL: https://github.com/swivid/f5-tts
    - 技術細節：
      - Flow Matching + Diffusion Transformer
      - 無需 duration 模型、phoneme 對齊或傳統 TTS 複雜度
      - ~200M 參數，MIT 推理許可，CC-BY-NC 模型許可
      - 延遲：300-500ms (RTX 4090, nfe_step=16)
      - 零樣本聲音複製：5-15 秒參考音頻

11. **Best TTS APIs in 2026: Inworld, Speechmatics, Cartesia, and more**
    - URL: https://inworld.ai/resources/best-voice-ai-tts-apis-for-real-time-voice-agents-2026-benchmarks
    - 核心內容：
      - Inworld Realtime TTS 1-Max：60.9% 勝 Cartesia，60.7% 勝 OpenAI（盲測）
      - 延遲 P90：130-250ms，低於 ElevenLabs Multilingual v3
      - Cartesia Sonic 3：40-90ms 最快延遲
      - 支持聲音複製、多語言、自訂發音

---

## 強制對齐與字幕生成

12. **WhisperX: Automatic Speech Recognition with Word-level Timestamps**
    - URL: https://github.com/m-bain/whisperX
    - 核心功能：
      - Faster-Whisper + wav2vec2 強制對齐 + pyannote 說話者分段
      - 詞級精度：±50ms（vs Whisper ±500ms）
      - 輸出格式：JSON、SRT、VTT、TXT、TSV
      - 速度：RTX 4090 上 70× 實時（批量推理）
      - 費用：免費開源，BSD-2-Clause 許可
    - 應用：影片字幕精確對齐、多說話者內容處理

13. **Subtitle Engineering: Forced Alignment for Precise Word Timestamps**
    - URL: https://medium.com/@unicornporated/subtitle-engineering-showdown-of-speech-to-text-giants-and-building-the-ultimate-subtitle-24ea2c21c6bf
    - 內容：
      - WhisperX 與 StableTS 實現強制對齐
      - 支持 karaoke 生成、字幕精度提高

---

## 法律、授權與道德框架

14. **Voice Cloning: Legal & Ethical Guide for Creators in 2026**
    - URL: https://www.audioscripter.com/blog/voice-cloning-legal-ethical-guide
    - 核心原則：
      - **同意是關鍵：** 複製他人聲音須明確書面同意
      - **州法律：** 加州民法 3344、紐約民權法 50-51、田納西州 ELVIS Act
      - **公開音頻不自動授予權利：** 依賴隱含同意有法律風險
      - **AI 標籤要求：** EU、中國、多個美國州已強制或建議標籤

15. **AI Voice Cloning Laws & Ethics (2026): Consent, Licensing, and a Risk Checklist**
    - URL: https://magichour.ai/blog/ai-voice-cloning-laws-and-ethics
    - 詳細內容：
      - 自己的聲音：完全合法，無限制
      - 員工/承包商：需明確書面同意
      - 公眾人物：需明確合約與補償
      - 最佳實踐：書面同意、許可定義、標籤、可撤銷條款

16. **ElevenLabs Voice Cloning Consent Policy 2026**
    - URL: https://terms.law/forum/thread/elevenlabs-voice-clone-legal.html
    - 摘要：
      - 自己的聲音商用：完全合法
      - 州法律要求他人聲音須書面同意
      - ElevenLabs 付費方案自動授予商業使用權

17. **Synthetic Media & Voice Cloning: Right of Publicity Risks for 2026**
    - URL: https://holonlaw.com/entertainment-law/synthetic-media-voice-cloning-and-the-new-right-of-publicity-risk-map-for-2026
    - 內容：
      - 知情同意要求：清楚、可驗證、書面形式
      - 補償與版稅框架：演員談判趨勢
      - 行業標準進化

18. **AI Voice Cloning Regulation: Legal Updates and Concerns**
    - URL: https://www.resemble.ai/resources/ai-voice-cloning-regulation-legal-updates-concerns
    - 實踐指引：
      - Resemble AI 等平台實施同意驗證
      - 內置深度偽造檢測、音頻水印
      - 存取控制與身份驗證要求

---

## Snowy 相關文檔

19. **Shared TTS Pronunciation Strategy** (`shared/docs/tts-pronunciation-strategy.md`)
    - Snowy 專案既有策略文檔
    - Edge-TTS 預設配置與局限
    - 中英混讀發音替換規則

---

## 數據來源可信度評級

### 高可信度（Official / Benchmark Peer-reviewed）
- OpenAI 官方公告
- Microsoft Azure 官方文檔
- GitHub 官方項目文檔（F5-TTS、WhisperX）
- 獨立基準測試（BentoML、CodeSOTA）

### 中高可信度（Vendor Reports / Community Analysis）
- ElevenLabs 官方案例研究
- Inworld AI 基準報告
- 業界文章（SiliconFlow、Speechmatics）
- 法律與倫理指南（AudioScripter、Resemble AI）

### 使用注意
- 本研究基於 2026 年 6 月前的可公開信息
- 技術進展快速，建議定期更新查詢
- 定價與可用性可能隨時變化
- 法律框架因地區而異，本文針對全球通用原則

---

## 關鍵術語定義

| 術語 | 定義 |
|------|------|
| **TTS** | Text-to-Speech，文字轉語音 |
| **Voice Clone** | 聲音複製，用 AI 複製說話者的聲音特徵 |
| **Prosody** | 韻律，包括音調、速率、強度、停頓等 |
| **SSML** | Speech Synthesis Markup Language，語音合成標記語言 |
| **Forced Alignment** | 強制對齐，自動匹配文字與音頻的時間邊界 |
| **Multilingual Voice** | 多語言聲音，支持多種語言的單一聲音模型 |
| **Zero-shot Voice Cloning** | 零樣本聲音複製，不需要訓練，僅需短音頻樣本 |
| **ELO Rating** | TTS 品質排名系統，基於對比測試 |
| **Real-time TTS** | 實時 TTS，延遲通常 <200ms |
| **Edge Deployment** | 邊界部署，在本機或邊界設備運行，無需雲 API |

---

**文檔版本：** 1.0  
**最後更新：** 2026-06-02
