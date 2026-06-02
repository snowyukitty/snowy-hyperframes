# Runbook

## Research Update

1. 更新官方價格來源：
   - OpenAI Codex pricing
   - OpenAI API pricing
   - GitHub Copilot plans
   - GitHub Copilot AI Credits docs
   - Pi providers docs
   - Claude plan and Claude Code docs
   - Claude API pricing
2. 將官方資訊寫入 `data/research.json`。
3. 將估算假設寫入 `data/cost-model.json`。
4. 不把動態用量、隱性限流或未公開配額寫成官方數字。

## TTS

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

如調整旁白，需要同步：

- `index.html` audio/section timing
- `captions/narration.srt`
- `data/storyboard.json`

## Preview

```powershell
npm run dev
```

## Verify

```powershell
npm run check
```

## Render

```powershell
npm run render
```
