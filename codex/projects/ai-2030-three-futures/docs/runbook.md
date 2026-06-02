# Runbook

## Update Research

1. 更新 `docs/references.md`。
2. 將硬約束與情境假設寫入 `data/research.json`。
3. 不把情境推估寫成官方預測。

## Update Narration

```powershell
npm run tts
```

檢查音訊長度：

```powershell
Get-ChildItem assets\audio -Filter 'slide-*.mp3' | Sort-Object Name | ForEach-Object {
  $d = ffprobe -v error -show_entries format=duration -of default=nk=1:nw=1 $_.FullName
  '{0} {1:N3}s' -f $_.Name, [double]$d
}
```

重生旁白後需要同步：

- `index.html` 的 `data-duration`、audio/section start/duration、GSAP start array。
- `captions/narration.srt`
- `data/storyboard.json`
- `project.json`

## Preview

```powershell
npm run dev
```

## Check

```powershell
npm run check
```

## Render

```powershell
npm run render
```
