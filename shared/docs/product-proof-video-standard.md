# Product-proof video standard

Product media must help a viewer notice, understand, trust, and act. Visual
polish supports that sequence; it cannot replace product meaning.

## Evidence ladder

Use the strongest available evidence in this order:

1. deterministic capture of implemented product UI with a disclosed fixture;
2. approved capture of a real run with private data removed;
3. code-native diagrams or verified conceptual art;
4. generated atmosphere as brief punctuation only.

For a functional product, generic offices, empty monitors, synthetic terminal
screens, and human actors are not product evidence. A film fails if a viewer
cannot describe at least one implemented control loop after watching it muted.

## Capture contract

A fixture capture should:

- load the real renderer, not a visual reconstruction;
- use disposable storage and inert data;
- skip accounts, credentials, production records, network calls, PTYs, and
  child agents unless the reviewed story explicitly requires them;
- carry a visible fixture disclosure;
- fix CSS-to-output pixel scale and physical dimensions;
- write a manifest containing labels, dimensions, and SHA-256 digests;
- fail when the captured pixels disagree with the receipt.

The source repository owns capture truth. HyperFrames copies verified assets
into an ignored production project and records their digests in its research
map; it does not silently turn a fixture into a claim about a live run.

## Story contract

Build around a visible change of state. A useful product beat has:

- a user problem;
- the implemented control that addresses it;
- a before/after or incomplete/complete state;
- an honest safety or capability boundary;
- one action the viewer can take next.

AI-generated visual metaphor may open or close a story, but implemented UI
should dominate the proof beats. Never use generated atmosphere to imply a
feature, integration, performance result, or live execution.

## Language contract

When one spoken master carries multiple subtitle-only translations:

- one canonical narration partitions into stable semantic cue IDs;
- every track shares the measured word-boundary timeline;
- density is checked per locale;
- every language has an independent human readability gate;
- delivery uses one clean master plus WebVTT and SRT sidecars;
- captions are not burned into the only master.

## Review gate

Before render, review product meaning, claim accuracy, fixture disclosure,
voice, pacing, UI legibility, and every subtitle track. Passing authorizes the
render only. Uploading Release assets, changing visibility, or spending paid
generation credits remains a separate owner action.

## Agent Orchestrator case study

The owner rejected the 30-second `2026-08-27` candidate because generic dark
office scenes communicated no implemented behavior. Its replacement is a
50.6-second functional hero built from authentic renderer captures: editor →
incomplete Join barrier → complete explicit handoff → protected Run Journal →
GitHub action. The ignored project and review kit are at:

```text
claude/projects/agent-orchestrator-functional-hero/
claude/projects/agent-orchestrator-functional-hero/review/index.html
```
