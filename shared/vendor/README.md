# Vendored runtime libraries

- `gsap.min.js` — GSAP 3.14.2 (https://gsap.com), copied from https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js.
  GSAP is free for all uses under the GSAP Standard License (https://gsap.com/community/standard-license/).
  Projects copy this file into `<project>/vendor/` via `hf vendor` / `hf new` so that `hyperframes check` and `render`
  never depend on a CDN at runtime (on a slow link the CDN alone exceeded the 10 s navigation timeout).
