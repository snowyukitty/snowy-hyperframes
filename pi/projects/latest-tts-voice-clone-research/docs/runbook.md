# Runbook: 執行 Latest TTS Voice Clone Research 專案

**專案：** latest-tts-voice-clone-research  
**Workflow：** pi  
**建立日期：** 2026-06-02  
**狀態：** 準備中

---

## 概覽

本 runbook 記錄執行此研究型 HyperFrames 專案所需的步驟、工具、資源與驗證方法。

---

## 前置要求

### 系統環境
- **OS：** Windows 10+ (PowerShell 5.1+)，或 macOS/Linux
- **Node.js：** v18+
- **Python：** 3.9+ （如需 WhisperX 實驗）

### Pi 工具配置
- Pi agent 已安裝：`pi-docparser`、`pi-codex-image-gen`
- Pi 已登入 `openai-codex` （用於 `codex_generate_image`）
- 環境變數配置完成

### 外部服務
- **Tavily Search：** 已有有效 API key（用於網絡研究）
- **HuggingFace：** 可選（若要實驗 WhisperX，需令牌）

---

## 項目結構

```
pi/projects/latest-tts-voice-clone-research/
├── project.json                           # 專案元數據
├── package.json                           # npm 依賴（待填充）
├── hyperframes.json                       # HyperFrames 配置（待填充）
├── index.html                             # 主入口（待填充）
│
├── data/
│   ├── research.json                      # ✓ 研究數據（已完成）
│   ├── storyboard.json                    # ✓ 故事版/幻燈片（已完成）
│   ├── image-prompts.json                 # ✓ 圖像生成提示（已完成）
│   ├── pronunciation-map.json             # ✓ 發音替換規則（已完成）
│
├── assets/
│   ├── images/                            # ⏳ 待生成（11 張圖）
│   ├── audio/                             # ⏳ 待生成（11 個音頻）
│   │   ├── README.md
│   │   ├── slide-01.display.txt
│   │   ├── slide-01.tts.txt
│   │   ├── slide-01.mp3 / .wav
│   │   └── ...（重複至 slide-11）
│
├── captions/
│   ├── narration.srt                      # ⏳ 待生成（字幕檔）
│
├── docs/
│   ├── references.md                      # ✓ 參考文獻（已完成）
│   ├── storyboard.md                      # ✓ 故事板細節（已完成）
│   ├── runbook.md                         # 本檔案
│   ├── retrospective.md                   # ⏳ 待填充（驗證與回顧）
│
├── scripts/
│   ├── prepare-tts.ps1                    # PowerShell: 生成 .tts.txt 檔案
│   └── generate-audio.ps1                 # PowerShell: 生成音頻
│
└── renders/
    └── output.mp4                         # ⏳ 待生成（最終影片）
```

---

## 執行步驟

### 步驟 1：驗證環境與依賴

```bash
# 檢查 Node.js 版本
node --version

# 檢查 npm 版本
npm --version

# 檢查 pi 登入狀態
pi login status

# 檢查 Tavily API 可用性
echo $env:TAVILY_API_KEY  # Windows PowerShell
# 或 echo $TAVILY_API_KEY  # macOS/Linux
```

**預期輸出：**
- Node v18+
- npm v8+
- Pi 已登入，有效 openai-codex auth
- Tavily API key 存在

---

### 步驟 2：準備 Pronunciation Map 與 TTS 文本

使用 `scripts/prepare-tts.ps1` 從 `pronunciation-map.json` 生成所有 `.tts.txt` 檔案：

```powershell
# Windows PowerShell
powershell -ExecutionPolicy Bypass -File scripts/prepare-tts.ps1

# 或直接執行
./scripts/prepare-tts.ps1
```

**功能：**
- 讀取 `data/storyboard.json` 內每個 slide 的 `displayText`
- 應用 `data/pronunciation-map.json` 規則
- 生成 `assets/audio/slide-01.tts.txt` 到 `slide-11.tts.txt`
- 保留 `assets/audio/slide-01.display.txt` 等原始檔案

**驗證：**
```bash
ls assets/audio/slide-*.tts.txt
# 應列出 11 個 .tts.txt 檔案
```

---

### 步驟 3：生成圖像素材

使用 Pi 的 `codex_generate_image` 工具生成所有 11 張幻燈片圖像：

```bash
# Pi 命令行生成每張圖像
# 基於 data/image-prompts.json

# 圖像 1
pi codex-image \
  --prompt "Create a modern, professional infographic showing the landscape of TTS technologies in 2026..." \
  --save project \
  --model gpt-image-2 \
  --output-format png

# ... 重複 slide-02 到 slide-11
```

**或使用 Python 腳本自動化：** （將創建 helper script）

```python
# scripts/generate-images.py
import json
from pi.codex_generate_image import generate_image

# 讀取 image-prompts.json
with open('data/image-prompts.json') as f:
    prompts = json.load(f)

# 逐個生成圖像
for prompt in prompts:
    image_path = generate_image(
        prompt=prompt['prompt'],
        output_format='png',
        save_dir='assets/images'
    )
    print(f"Generated: {image_path}")
```

**驗證：**
```bash
ls assets/images/slide-*.png
# 應列出 11 張 .png 圖像
```

**預期時間：** 約 15-20 分鐘（取決於 API 佇列）

---

### 步驟 4：生成 Edge-TTS 音頻

使用 Edge-TTS CLI 為所有 `.tts.txt` 檔案生成音頻：

```powershell
# 安裝 edge-tts (如果尚未安裝)
pip install edge-tts

# 批量生成音頻
$voice = "zh-TW-HsiaoChenNeural"
$rate = "+0%"
$pitch = "+0Hz"
$volume = "+0%"

for ($i = 1; $i -le 11; $i++) {
    $slide = "slide-$('{0:d2}' -f $i)"
    $tts_file = "assets/audio/$slide.tts.txt"
    $audio_file = "assets/audio/$slide.mp3"
    
    if (Test-Path $tts_file) {
        $text = Get-Content $tts_file -Raw
        edge-tts `
            --voice $voice `
            --rate $rate `
            --pitch $pitch `
            --volume $volume `
            --text $text `
            --write-media $audio_file
        
        Write-Host "✓ Generated: $audio_file"
    }
}
```

**或使用 Python：**

```bash
python -m edge_tts \
  --voice "zh-TW-HsiaoChenNeural" \
  --rate "+0%" \
  --pitch "+0Hz" \
  --file "assets/audio/slide-01.tts.txt" \
  --write-media "assets/audio/slide-01.mp3"
```

**驗證：**
```bash
ls assets/audio/slide-*.mp3
# 應列出 11 個 .mp3 檔案
# 檢查每個檔案的時長是否合理
ffprobe assets/audio/slide-01.mp3  # 需要 ffmpeg
```

**預期時間：** 約 5 分鐘（包括網絡延遲）

---

### 步驟 5：生成字幕 (SRT)

兩種選項：

**選項 A：手工或簡易自動化（基於時長估算）**

根據 `storyboard.json` 中的 `duration` 字段與旁白內容，手工創建 SRT 檔案：

```bash
# captions/narration.srt
1
00:00:00,000 --> 00:00:12,000
[Slide 1 opening text]

2
00:00:12,000 --> 00:00:27,000
[Slide 2 content...]

# ... 重複至 Slide 11
```

**選項 B：使用 WhisperX 強制對齐（進階）**

如果已安裝 WhisperX：

```bash
# 合併所有音頻為單一檔案
ffmpeg -i "concat:assets/audio/slide-01.mp3|assets/audio/slide-02.mp3|..." \
  -c copy full_narration.mp3

# 執行 WhisperX
whisperx full_narration.mp3 \
  --language zh \
  --model large-v3 \
  --diarize \
  --output_format srt \
  --output_dir captions

# 結果：captions/full_narration.srt
```

**本專案建議：** 先用選項 A 快速完成，後期可升級至 WhisperX。

---

### 步驟 6：配置 HyperFrames

建立或更新 `hyperframes.json` 與 `package.json`：

#### hyperframes.json

```json
{
  "title": "2026 年最新 TTS 與 AI Voice Clone 技術研究：為自然旁白打造決策藍圖",
  "duration": 180,
  "fps": 24,
  "width": 1920,
  "height": 1080,
  "format": "1080p",
  
  "slides": [
    {
      "id": "slide-01",
      "title": "TTS Technology Landscape 2026",
      "duration": 12,
      "image": "assets/images/slide-01-tts-technology-landscape.png",
      "audio": "assets/audio/slide-01.mp3",
      "subtitles": "captions/narration.srt"
    },
    // ... 重複至 slide-11
  ],
  
  "transitions": {
    "type": "fade",
    "duration": 300
  },
  
  "output": {
    "format": "mp4",
    "codec": "h264",
    "bitrate": "8000k",
    "path": "renders/output.mp4"
  }
}
```

#### package.json

```json
{
  "name": "latest-tts-voice-clone-research",
  "version": "1.0.0",
  "description": "2026 年最新 TTS 與 AI Voice Clone 技術研究",
  "main": "index.html",
  "scripts": {
    "check": "npm run lint && npm run validate",
    "dev": "hyperframes-cli preview",
    "render": "hyperframes-cli render hyperframes.json",
    "lint": "echo 'Checking project structure...'",
    "validate": "node scripts/validate.js"
  },
  "dependencies": {
    "hyperframes": "latest"
  }
}
```

---

### 步驟 7：項目驗證

執行 `npm run check`：

```bash
npm install
npm run check
```

**檢查項目：**
- ✓ project.json 有效性
- ✓ research.json 與 references.md 一致
- ✓ storyboard.json 有 11 個 slide
- ✓ image-prompts.json 完整
- ✓ pronunciation-map.json 語法正確
- ✓ 所有圖像檔案存在
- ✓ 所有音頻檔案存在
- ✓ 字幕檔案 narration.srt 存在
- ✓ hyperframes.json 有效
- ✓ 沒有存儲 credentials / API keys

**預期輸出：** 所有檢查都通過 ✓

---

### 步驟 8：本地預覽

```bash
npm run dev
```

**功能：**
- 在 `localhost:8080` 啟動預覽伺服器
- 逐 slide 預覽圖像、音頻、字幕同步
- 驗證時長與轉場

---

### 步驟 9：渲染最終影片

```bash
npm run render
```

**流程：**
1. 讀取 `hyperframes.json`
2. 按序組合圖像、音頻、字幕
3. 應用轉場效果
4. 編碼為 MP4 (h264, 8000 kbps, 1080p, 24fps)
5. 輸出至 `renders/output.mp4`

**預期時間：** 約 5-10 分鐘（取決於硬體）

**驗證：**
```bash
ffprobe renders/output.mp4
# 檢查：時長、解析度、音頻軌
```

---

## 故障排除

### 問題 1：edge-tts 超時或錯誤

```
EdgeTTS Error: Connection timeout
```

**解決：**
- 檢查網絡連接
- 重試或使用 VPN
- 降低速率/音調以簡化處理

### 問題 2：codex_generate_image 失敗

```
Error: openai-codex auth not found
```

**解決：**
- 確認 Pi 已登入：`pi login openai-codex`
- 檢查授權有效期
- 切換至 placeholder 圖像，後續補充

### 問題 3：WhisperX HuggingFace 令牌問題

```
Gated model access error
```

**解決：**
- 訪問 https://huggingface.co/pyannote/speaker-diarization-3.1
- 接受使用條款
- 生成令牌並設置 env：`export HUGGINGFACE_TOKEN=...`

### 問題 4：npm 依賴衝突

```
npm ERR! peer dep missing
```

**解決：**
```bash
npm install --legacy-peer-deps
# 或更新到最新版本
npm update
```

---

## 檢查清單

在聲稱完成前，確保：

- [ ] 環境驗證通過（步驟 1）
- [ ] 所有 `.tts.txt` 檔案生成（步驟 2）
- [ ] 11 張圖像生成完成（步驟 3）
- [ ] 11 個音頻檔案生成完成（步驟 4）
- [ ] 字幕檔案 narration.srt 完成（步驟 5）
- [ ] hyperframes.json 與 package.json 配置完成（步驟 6）
- [ ] `npm run check` 全部通過（步驟 7）
- [ ] `npm run dev` 預覽成功（步驟 8）
- [ ] `npm run render` 生成最終 MP4（步驟 9）
- [ ] 最終檔案大小合理 (100-500 MB)
- [ ] 無 credentials 或 API keys 寫入專案
- [ ] retrospective.md 已填充

---

## 後續資源

- HyperFrames 官方文檔：`shared/templates/hyperframes-research-project/README.md`
- TTS 策略文檔：`shared/docs/tts-pronunciation-strategy.md`
- Project Schema：`shared/schemas/project.schema.json`

---

**Runbook 版本：** 1.0  
**最後更新：** 2026-06-02

---

## Required Preview & Audio QA Gate

Before rendering, run:

```bash
npm run check
npm run preview
```

Open the local preview shown by `npm run preview` and review:

- Does each slide stay visible until narration finishes?
- Are there abrupt audio cuts?
- Are TTS pronunciations acceptable?
- Is the visual text readable at 1080p?
- Are there unwanted browser UI elements such as native audio controls?

Audio-specific audit:

```bash
npm run audio:audit
```

This checks every slide MP3 against its slide duration and fails if a clip is longer than the allotted slide time.

Current final render uses an audio-driven no-cut policy and is available at:

```text
renders/latest-tts-voice-clone-research-nocut.mp4
```


## Preview Command Note

`npm run dev` and `npm run preview` now start the real HyperFrames Studio preview:

```bash
npm run dev
# opens HyperFrames Studio at http://localhost:3002
```

The old raw HTML static server is retained only as a fallback:

```bash
npm run serve:static
```
