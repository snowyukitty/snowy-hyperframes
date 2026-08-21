# Runbook — block-vocabulary-reference

```powershell
npm run html        # storyboard -> index.html 的 slide/audio 區塊
npm run pipeline    # prepare-tts -> tts -> measure -> sync -> audit
npm run check       # hf audit + npx hyperframes@0.8.6 check（0 findings）
npm run review      # 人工審核包（離線可開，含畫格與旁白）
npm run preview     # HyperFrames Studio
npm run render      # renders/block-vocabulary-reference.mp4（不進 git）
```

改動 `shared/templates/hyperframes-research-project/index.html` 的樣式後，把新的 `<style>` 區塊同步到這裡的
`index.html`（`hf html` 只重寫 `hf:*` 標記之間的內容，樣式屬於手寫區），再跑 `npm run check` 與
`npx hyperframes@0.8.6 snapshot --at 5,15,25,35,45` 目視比對，這個專案就是 block 樣式的視覺回歸測試。
