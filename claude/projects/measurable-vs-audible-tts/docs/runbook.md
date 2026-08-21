# Runbook — measurable-vs-audible-tts

## 資料從哪來

所有數字來自 `claude/projects/tts-bakeoff-2026-08`：

```powershell
cd ../tts-bakeoff-2026-08
npm run bakeoff          # 合成 16 段音檔 + 量測 -> data/measurements.json
```

那份 JSON 是本片的唯一數據來源。稿子裡任何一個數字改了，都要回頭對照它。

## 製作

```powershell
npm run html                       # storyboard -> index.html
npm run pipeline                   # TTS -> 量測 -> 同步時間軸 / 字幕 / metadata -> audit
npm run sync -- --pad 1.2          # 想改頁面留白時（旁白結束後保留 1.2 秒）
npm run check                      # 0 findings 才算過
npx hyperframes@0.8.6 snapshot --at 7,25,46,68,88,108,130,155,178,200
npm run review                     # 人工 gate
npm run render
```

`durationTarget` 在第一次 TTS 之後被重新對齊成「實測旁白 + 1.2 秒」，所以 storyboard 上的秒數與
實際頁面長度一致；改稿之後要重跑 `npm run pipeline` 讓它們再次一致。

## 2026-08-22 實測

| 步驟 | 結果 |
| --- | --- |
| `hf pipeline` | 10 段旁白，共 197.95s；時間軸 210.5s；audit 0 findings |
| `hyperframes@0.8.6 check` | lint 0/0、runtime 0/0、layout 0 issues / 9 samples、motion 0/0、contrast **58/58 AA** |
| `hyperframes@0.8.6 render` | 見下方 retrospective |
| 人工 preview | **未做** |
