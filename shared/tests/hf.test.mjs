import assert from "node:assert/strict";
import test from "node:test";

import {
  buildWordCues,
  computeTimeline,
  patchGsapStartArray,
  renderAudioRegion,
  renderChart,
  renderSlidesRegion,
  splitDisplayCues,
  validateSchema,
} from "../tools/hf.mjs";

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
