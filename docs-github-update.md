# GitHub Update Notes

Date: 2026-06-02

This workspace currently has no `.git` directory and no configured GitHub remote, so changes cannot be committed or pushed from here yet.

## Suggested Commit Message

```text
Complete Pi TTS voice cloning HyperFrames project
```

## Suggested Commit Body

```text
- Add full 11-slide Pi-led HyperFrames project for latest TTS and AI voice cloning research
- Add generated slide images, Edge-TTS narration text/MP3s, captions, and no-cut render metadata
- Add audio audit to prevent MP3 clips being truncated by slide duration
- Fix dev/preview script to use real HyperFrames Studio preview
- Document Pi workflow strengths, limitations, preview gate, and audio timing lessons
- Add project completion summary and update root/shared/Pi documentation
```

## Recommended Git Commands Once Repo Is Initialized

```bash
git init
git add .
git commit -m "Complete Pi TTS voice cloning HyperFrames project"
git remote add origin <your-github-repo-url>
git push -u origin main
```

If this workspace should connect to an existing GitHub repository, add the remote first instead of creating a new repository.

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
