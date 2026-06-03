# GitHub Update Notes

Date: 2026-06-03

Repository created and pushed:

```text
https://github.com/snowyukitty/snowy-hyperframes
```

Current local branch:

```text
main -> origin/main
```

## Initial Commit Message

```text
Publish Snowy HyperFrames workflow demos
```

## Initial Commit Body

```text
- Add public demo/reference projects for codex, codex-pi, and pi workflows
- Add generated images, Edge-TTS narration, captions, metadata, and MP4 demo renders
- Add workflow comparison, production playbook, and GitHub publication policy
- Guard future production projects with a .gitignore allowlist
```

## Useful Git Commands

```bash
git status --short
git remote -v
git push
```

## Files Worth Reviewing Before Commit

- `README.md`
- `pi/README.md`
- `shared/docs/hyperframes-production-playbook.md`
- `shared/docs/workflow-test-summary.md`
- `shared/docs/repo-publication-policy.md`
- `shared/docs/workflow-boundaries.md`
- `pi/projects/latest-tts-voice-clone-research/README.md`
- `pi/projects/latest-tts-voice-clone-research/docs/completion-summary.md`
- `pi/projects/latest-tts-voice-clone-research/docs/retrospective.md`
- `pi/projects/latest-tts-voice-clone-research/docs/runbook.md`
- `pi/projects/latest-tts-voice-clone-research/package.json`
- `pi/projects/latest-tts-voice-clone-research/index.html`

## Publication Boundary

The current demo projects are allowed to be committed with assets and MP4 renders. Future production projects are ignored by default through `.gitignore`; only reusable workflow knowledge, templates, schemas, and approved demo projects should be published.

## Phase Wrap-Up

Latest public phase summary:

```text
shared/docs/phase-summary-2026-06-03.md
```

Latest TTS strategy addition:

```text
shared/docs/local-tts-no-api-key-strategy.md
```

Private local experiment created but not published:

```text
codex/projects/tts-local-bakeoff
```

Reason: new projects are ignored by default until explicitly reviewed and allowlisted. The public repo records the strategy and phase summary, while local bakeoff audio remains private.
