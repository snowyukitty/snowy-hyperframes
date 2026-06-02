# Latest TTS & AI Voice Cloning Research

Pi workflow HyperFrames project about current TTS and AI voice cloning options.

## Current Status

- Workflow: `pi`
- Slides: 11
- Images: 11
- Audio: 11 MP3 files generated with Edge-TTS
- Captions: `captions/narration.srt`
- Final no-cut render: `renders/latest-tts-voice-clone-research-nocut.mp4`
- Previous 168s render had audio truncation and should not be used as final.

## Preview Before Render

Use browser preview before final render:

```bash
npm run preview
# or
npm run dev
```

Review the full browser version before rendering. Check for:

- audio cutoffs
- incorrect slide timing
- unreadable small text
- unwanted native audio controls
- pronunciation or pacing problems

## Checks

```bash
npm run audio:audit
npm run check
hyperframes lint .
```

`npm run check` includes `audio:audit`, so it fails if any MP3 exceeds the slide duration.

## Render

```bash
npm run render
```

Current good render:

```text
renders/latest-tts-voice-clone-research-nocut.mp4
```

## Key Lesson From This Project

Do not render from estimated storyboard durations after TTS generation. Measure MP3 duration first, then either shorten narration or expand the timeline. Otherwise HyperFrames will stop audio at the slide `data-duration`, creating abrupt cuts.


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
