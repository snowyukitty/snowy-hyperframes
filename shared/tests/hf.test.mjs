import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildSrt,
  buildWordCues,
  checkLocaleIds,
  childProcessOptions,
  cleanVariantWorkspace,
  computeTimeline,
  localePaths,
  normalizeRegion,
  npxEnv,
  patchCompositionLocale,
  patchGsapStartArray,
  renderAudioRegion,
  renderChart,
  renderSlidesRegion,
  renderSrt,
  resolveStoryboard,
  reviewHtml,
  splitDisplayCues,
  ttsSourceFingerprint,
  validateSchema,
  variantWorkspace,
} from "../tools/hf.mjs";

test("generated SRT accepts persisted timing and has no whitespace-only final line", () => {
  const timeline = [{ id: "slide-01", start: 0, duration: 2, mp3Duration: 1.5 }];
  const slide = buildSrt(timeline, { "slide-01": "Caption" });
  const word = renderSrt([{ start: 0.1, end: 0.8, text: "Caption" }]);

  for (const output of [slide, word]) {
    assert.match(output, /Caption\n$/);
    assert.doesNotMatch(output, /\n\n$/);
  }
  assert.match(slide, /00:00:01,500\nCaption/);
});

test("CI locale selection checks every declared deliverable", () => {
  const storyboard = { canonicalLocale: "zh-Hant", locales: ["zh-Hant", "en"] };

  assert.deepEqual(checkLocaleIds(storyboard), ["zh-Hant"]);
  assert.deepEqual(checkLocaleIds(storyboard, { locale: "en" }), ["en"]);
  assert.deepEqual(checkLocaleIds(storyboard, { allLocales: true }), ["zh-Hant", "en"]);
  assert.throws(() => checkLocaleIds(storyboard, { allLocales: true, locale: "en" }), /mutually exclusive/);
});

test("audio timing never cuts measured narration", () => {
  const storyboard = {
    slides: [
      { id: "slide-01", durationTarget: 5 },
      { id: "slide-02", durationTarget: 8 },
    ],
  };
  const result = computeTimeline(storyboard, { "slide-01": 5.01, "slide-02": 4 }, "audio", 0.6);

  assert.deepEqual(
    result.timeline.map(({ id, start, duration }) => ({ id, start, duration })),
    [
      { id: "slide-01", start: 0, duration: 5.7 },
      { id: "slide-02", start: 5.7, duration: 8 },
    ]
  );
  assert.equal(result.total, 13.7);
});

test("storyboard timing policy reports narration overflow", () => {
  const storyboard = { slides: [{ id: "slide-01", durationTarget: 5 }] };
  const result = computeTimeline(storyboard, { "slide-01": 5.4 }, "storyboard", 0.6);

  assert.equal(result.timeline[0].duration, 5);
  assert.match(result.problems[0], /exceeds storyboard target/);
});

test("legacy GSAP arrays refresh starts without changing durations", () => {
  const source = 'const slides = [["#slide-01",0,12],["#slide-02",12,29]];';
  const result = patchGsapStartArray(source, [
    { id: "slide-01", start: 0 },
    { id: "slide-02", start: 12.5 },
  ]);

  assert.equal(result.count, 2);
  assert.equal(result.html, 'const slides = [["#slide-01",0,12],["#slide-02",12.5,29]];');
});

test("locale entries rename the composition and its timeline registration together", () => {
  const source = '<div data-composition-id="main"></div><script>window.__timelines["main"] = tl;</script>';
  const result = patchCompositionLocale(source, "en");

  assert.equal(result.id, "main-en");
  assert.match(result.html, /data-composition-id="main-en"/);
  assert.match(result.html, /window\.__timelines\["main-en"\] = tl/);
  assert.doesNotMatch(result.html, /window\.__timelines\["main"\]/);
});

test("caption packing keeps technical identifiers intact and inside the slide", () => {
  const display = "請執行 project.json，再檢查結果。";
  assert(splitDisplayCues(display, 8).some((cue) => cue.includes("project.json")));

  const words = [
    { w: "請執行", t: 0.1, d: 0.8 },
    { w: "project", t: 1.0, d: 0.5 },
    { w: "json", t: 1.6, d: 0.4 },
    { w: "再檢查結果", t: 2.1, d: 1.1 },
  ];
  const cues = buildWordCues(display, words, 8, 10, 13.4);
  assert(cues.length > 1);
  assert(cues.every((cue) => cue.start >= 10 && cue.end <= 13.4 && cue.end > cue.start));
  assert.equal(cues.map((cue) => cue.text).join(""), display);
});

test("line charts keep endpoint dots inside the SVG viewport", () => {
  const html = renderChart(
    {
      chart: "line",
      min: 0,
      max: 10,
      labels: ["A", "B"],
      series: [{ label: "Series", values: [0, 10] }],
      source: "data/example.json",
    },
    ""
  ).join("\n");

  const dot = /<circle class="dot"[^>]*cx="([\d.]+)" cy="([\d.]+)"/.exec(html);
  assert(dot);
  assert(Number(dot[1]) > 7 && Number(dot[1]) < 1553);
  assert(Number(dot[2]) > 7 && Number(dot[2]) < 293);
});

test("generated audio is grouped by semantic role", () => {
  const html = renderAudioRegion(
    [{ id: "slide-01", start: 0, duration: 4, mp3: 3.2 }],
    { file: "assets/audio/music.mp3", volume: 0.14 }
  );

  assert.match(html, /id="audio-slide-01"[^>]*data-audio-group="voiceover"/);
  assert.match(html, /id="bgm"[^>]*data-audio-group="music"/);
});

test("generated slide wrappers stay compact without changing the DOM contract", () => {
  const html = renderSlidesRegion(
    [{ id: "slide-01", start: 0, duration: 4 }],
    [{ id: "slide-01", title: "A title", chapter: "Intro", subtitle: "A caption", image: "", blocks: [] }]
  );

  assert.match(html, /<section id="slide-01"[^>]*>/);
  assert.match(html, /<div class="content">.*<h1>A title<\/h1>/s);
  assert.match(html, /<div class="caption">A caption<\/div>/);
  assert(html.split("\n").length <= 8);
});

test("stale-region comparison ignores HyperFrames editor ids", () => {
  const source = '<section data-hf-id="hf-a1b2" id="slide-01" data-start="0" data-duration="4"><h1 data-hf-id="hf-c3d4">Title</h1></section>';
  const generated = '<section id="slide-01" data-start="9" data-duration="8"><h1>Title</h1></section>';

  assert.equal(normalizeRegion(source), normalizeRegion(generated));
});

test("string-only storyboards keep canonical generated semantics", () => {
  const raw = {
    title: "Canonical title",
    language: "zh-Hant",
    voice: { voice: "zh-TW-HsiaoChenNeural" },
    slides: [{ id: "slide-01", title: "標題", chapter: "intro", durationTarget: 5, image: "", subtitle: "字幕", narration: "旁白" }],
  };
  const resolved = resolveStoryboard(raw);

  assert.equal(resolved.locale, "zh-Hant");
  assert.equal(resolved.title, raw.title);
  assert.deepEqual(
    resolved.slides.map(({ id, title, chapter, durationTarget, image, subtitle, narration }) => ({ id, title, chapter, durationTarget, image, subtitle, narration })),
    raw.slides
  );
  assert.deepEqual(resolved.resolutionWarnings, []);
});

test("a locale variant requires its own spoken copy and reports visual fallback", () => {
  const raw = {
    title: { "zh-Hant": "一份分鏡", en: "One storyboard" },
    language: "zh-Hant",
    voice: { voice: "zh-TW-HsiaoChenNeural" },
    locales: { "zh-Hant": { default: true }, en: { voice: { name: "en-US-JennyNeural" } } },
    slides: [{
      id: "slide-01",
      title: "共用標題",
      chapter: { "zh-Hant": "開場", en: "Intro" },
      durationTarget: 5,
      image: "",
      subtitle: { "zh-Hant": "字幕", en: "Caption" },
      narration: { "zh-Hant": "旁白", en: "Narration" },
    }],
  };
  const resolved = resolveStoryboard(raw, "en");

  assert.equal(resolved.voice.voice, "en-US-JennyNeural");
  assert.equal(resolved.slides[0].narration, "Narration");
  assert.deepEqual(resolved.resolutionWarnings, ['slides.slide-01.title: "en" falls back to canonical "zh-Hant"']);
  assert.throws(
    () => resolveStoryboard({ ...raw, slides: [{ ...raw.slides[0], narration: "只有中文" }] }, "en"),
    /must be localized for "en"/
  );
});

test("TTS cache identity includes voice and synthesis parameters", () => {
  const base = ttsSourceFingerprint("Same script\n", "en-US-JennyNeural", "+5%", "-3Hz", "+0%");
  assert.equal(base, ttsSourceFingerprint("Same script\n", "en-US-JennyNeural", "+5%", "-3Hz", "+0%"));
  assert.notEqual(base, ttsSourceFingerprint("Same script\n", "en-US-AriaNeural", "+5%", "-3Hz", "+0%"));
  assert.notEqual(base, ttsSourceFingerprint("Same script\n", "en-US-JennyNeural", "+10%", "-3Hz", "+0%"));
});

test("browser gates stage exactly one locale entry", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "hf-locale-gate-"));
  try {
    fs.writeFileSync(path.join(root, "project.json"), '{"id":"locale-gate"}\n');
    fs.writeFileSync(path.join(root, "index.html"), "canonical");
    fs.writeFileSync(path.join(root, "index.en.html"), "english");
    const raw = {
      title: { "zh-Hant": "正體中文", en: "English" },
      language: "zh-Hant",
      voice: {},
      locales: { "zh-Hant": { default: true }, en: {} },
      slides: [],
    };
    const canonical = resolveStoryboard(raw, "zh-Hant");
    const canonicalWork = variantWorkspace(root, canonical, localePaths(root, canonical));
    assert.equal(fs.readFileSync(path.join(canonicalWork, "index.html"), "utf8"), "canonical");
    assert.equal(fs.existsSync(path.join(canonicalWork, "index.en.html")), false);
    cleanVariantWorkspace(root, canonical);

    const english = resolveStoryboard(raw, "en");
    const englishWork = variantWorkspace(root, english, localePaths(root, english));
    assert.equal(fs.readFileSync(path.join(englishWork, "index.html"), "utf8"), "english");
    assert.equal(fs.existsSync(path.join(englishWork, "index.en.html")), false);
    cleanVariantWorkspace(root, english);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("self-contained review artifacts declare UTF-8 before non-ASCII copy", () => {
  const html = reviewHtml(
    {
      id: "iconflow-film",
      title: "IconFlow — One Source, Every Surface",
      project: "codex/projects/iconflow-film",
      workflow: "codex",
      total: 15,
      narration: 0,
      voice: "",
      generatedAt: "2026-08-27T00:00:00Z",
      status: "ready-to-preview",
    },
    [],
    { artifact: true }
  );

  assert.match(html, /^<!DOCTYPE html>\n<html lang="zh-Hant">/);
  assert.match(html, /<meta charset="UTF-8">/);
  assert.match(html, /IconFlow — One Source, Every Surface/);
  assert.match(html, /人工審核包/);
  assert.match(html, /data-composition-id="iconflow-film-review"/);
  assert.match(html, /data-start="0" data-duration="15"/);
  assert.match(html, /data-width="1920" data-height="1080" data-no-timeline/);
  for (const family of ["Noto Sans TC", "PingFang TC", "Microsoft JhengHei", "SFMono-Regular"]) {
    assert.match(html, new RegExp(`@font-face \\{ font-family: "${family}";`));
  }
});

test("review kits isolate locale verdicts and localize the English gate", () => {
  const html = reviewHtml(
    {
      id: "pipeline-demo",
      title: "One storyboard, every language",
      locale: "en",
      project: "claude/projects/pipeline-demo",
      workflow: "claude",
      total: 12,
      narration: 10,
      voice: "en-US-JennyNeural",
      generatedAt: "2026-08-27T00:00:00Z",
      status: "ready-to-preview",
    },
    []
  );

  assert.match(html, /^<!DOCTYPE html>\n<html lang="en">/);
  assert.match(html, /data-composition-id="pipeline-demo-en-review"/);
  assert.match(html, /human review kit/);
  assert.match(html, /hf-review:" \+ D\.meta\.id \+ ":"/);
  assert.doesNotMatch(html, /這是 <b>/);
});

test("child processes hide Windows helper consoles by default", () => {
  assert.equal(childProcessOptions().windowsHide, true);
  assert.equal(childProcessOptions({ stdio: "inherit" }).windowsHide, true);
  assert.equal(childProcessOptions({ windowsHide: false }).windowsHide, false);
});

test("npx children opt out of HyperFrames telemetry so its detached uploader never spawns", () => {
  const saved = process.env.HYPERFRAMES_NO_TELEMETRY;
  try {
    delete process.env.HYPERFRAMES_NO_TELEMETRY;
    assert.equal(npxEnv().HYPERFRAMES_NO_TELEMETRY, "1");
    process.env.HYPERFRAMES_NO_TELEMETRY = "0";
    assert.equal(npxEnv().HYPERFRAMES_NO_TELEMETRY, "0");
    assert.equal(npxEnv({ env: { HYPERFRAMES_NO_TELEMETRY: "on" } }).HYPERFRAMES_NO_TELEMETRY, "on");
  } finally {
    if (saved === undefined) delete process.env.HYPERFRAMES_NO_TELEMETRY;
    else process.env.HYPERFRAMES_NO_TELEMETRY = saved;
  }
});

test("minimal schema validation rejects unexpected properties when requested", () => {
  const schema = {
    type: "object",
    required: ["id"],
    properties: { id: { type: "string", pattern: "^[a-z]+$" } },
    additionalProperties: false,
  };

  assert.deepEqual(validateSchema(schema, { id: "valid" }), []);
  assert.deepEqual(validateSchema(schema, { id: "INVALID", extra: true }), [
    "$.id: does not match /^[a-z]+$/",
    '$: unexpected property "extra"',
  ]);
});

test("minimal schema validation applies additional-property schemas", () => {
  const schema = {
    type: "object",
    additionalProperties: { type: "object", required: ["voice"] },
  };

  assert.deepEqual(validateSchema(schema, { en: { voice: {} } }), []);
  assert.deepEqual(validateSchema(schema, { en: {} }), ['$.en: missing required "voice"']);
});
