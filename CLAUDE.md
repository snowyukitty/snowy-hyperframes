# Claude Code adapter — snowy-hyperframes

Read and follow [`AGENTS.md`](AGENTS.md) in this directory; it is the canonical agent
contract for this repository. Claude-specific memory, plans, or skills do not override
the timing-truth, preview-gate, publication-allowlist, or no-secrets rules stated there.

Fast path for a Claude Code session:

```powershell
node shared/tools/hf.mjs help          # toolkit
node shared/tools/hf.mjs audit --all   # every project, CI-equivalent, no browser
node shared/tools/hf.mjs repo-check    # publication guard
```

Latest phase summary and next steps: `shared/docs/phase-summary-2026-08-22.md`.
