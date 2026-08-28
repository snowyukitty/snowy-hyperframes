#!/usr/bin/env node
/**
 * hf — Snowy HyperFrames shared toolkit (zero dependencies, Node 22+).
 *
 * One storyboard, one truth. `data/storyboard.json` + measured MP3 lengths drive
 * every other timing surface (index.html, captions, manifests, project.json), so
 * the "MP3 longer than slide → narration cut off" class of bug cannot recur.
 *
 * Commands (run inside a project dir, or pass --project <dir>):
 *   new <workflow>/<name>   scaffold a project from shared/templates (run anywhere in the repo)
 *   html [--locale id]      generate / refresh the locale entry's slide + audio regions
 *   prepare-tts [--locale id]   storyboard narration -> display text -> pronunciation map -> TTS text
 *   tts [--locale id] [--only id] [--force]   Edge-TTS audio + word boundaries
 *   measure [--locale id]   ffprobe every slide MP3 -> the locale's measured durations
 *   sync [--policy audio|storyboard] [--pad 0.6] [--dry-run]
 *                           measured audio -> data/timeline.json, index.html timing attrs,
 *                           captions/narration.srt, project.json durationSeconds, legacy manifests
 *   captions [--mode word|slide|both] [--max-chars 18]
 *                           word-level captions from the TTS engine's own WordBoundary timings
 *   fit-audio               keep slide windows, set each narration clip's data-duration to its MP3 length
 *                           (HyperFrames >=0.8 clip_media_fit) and fix the root data-duration — for legacy demos
 *   vendor                  copy shared/vendor/gsap.min.js into ./vendor and point index.html at it (no CDN at render)
 *   review [--locale id] [--artifact]  build the human preview gate: one self-contained HTML with a frame + the real
 *                           narration per slide, per-slide verdicts, and a paste-ready approval summary
 *   check [--locale id | --all-locales] [HyperFrames flags]
 *                           hf audit -> pinned HyperFrames browser gate, with child windows hidden
 *   lint|snapshot|doctor [HyperFrames flags]
 *   preview|render|publish [HyperFrames flags]
 *                           run the pinned HyperFrames CLI behind the same hidden Windows child boundary
 *   audit [--all] [--json]  structural + schema + timing + audio-cut-risk checks (CI-safe, no browser)
 *   bakeoff [--only id] [--force] [--no-kit]
 *                           TTS provider comparison: same golden samples through every engine,
 *                           an objective battery (length, rate, pauses, LUFS, RTF) and a BLIND A/B kit
 *   repo-check              publication guard: allowlist, secrets, >95 MB files (run from repo root)
 *   pipeline                prepare-tts -> tts -> measure -> sync -> audit
 *
 * Global flags: --project <dir>  --json  --force  --dry-run  --quiet
 */

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const TOOL_DIR = path.dirname(__filename);
const PAD_DEFAULT = 0.6; // seconds of breathing room after narration ends
const CUT_TOLERANCE = 0.25; // seconds; mp3 may exceed clip duration by this much before CUT_RISK
const WORKFLOWS = ["codex-pi", "codex", "pi", "claude"];

// ---------------------------------------------------------------------------
// tiny arg parser
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq > -1) {
        args.flags[a.slice(2, eq)] = a.slice(eq + 1);
      } else {
        const key = a.slice(2);
        const next = argv[i + 1];
        // booleans are the closed set; every other flag takes the next token as its value
        const BOOLEANS = ["force", "dry-run", "json", "all", "quiet", "artifact", "no-snapshot", "no-words", "subtitles", "help"];
        if (next !== undefined && !next.startsWith("--") && !BOOLEANS.includes(key)) {
          args.flags[key] = next;
          i++;
        } else {
          args.flags[key] = true;
        }
      }
    } else {
      args._.push(a);
    }
  }
  return args;
}

const ARGS = parseArgs(process.argv.slice(2));
const CMD = ARGS._[0];
const FLAGS = ARGS.flags;
const QUIET = !!FLAGS.quiet;
const JSON_OUT = !!FLAGS.json;

function log(...m) {
  if (!QUIET && !JSON_OUT) console.log(...m);
}
function warn(...m) {
  if (!JSON_OUT) console.error(...m);
}
function die(msg, code = 1) {
  console.error(`hf: ${msg}`);
  process.exit(code);
}

// ---------------------------------------------------------------------------
// fs helpers
// ---------------------------------------------------------------------------
const exists = (p) => fs.existsSync(p);
const readText = (p) => fs.readFileSync(p, "utf8").replace(/^\uFEFF/, "");
const readJson = (p) => JSON.parse(readText(p));
function writeText(p, text) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text, { encoding: "utf8" }); // UTF-8, no BOM
}
function writeJson(p, obj) {
  writeText(p, JSON.stringify(obj, null, 2) + "\n");
}
const rel = (root, p) => path.relative(root, p).split(path.sep).join("/");
const nowIso = () => new Date().toISOString();
const round1 = (n) => Math.round(n * 10) / 10;
const ceil1 = (n) => Math.ceil(n * 10 - 1e-9) / 10;
const fmt = (n, d = 2) => Number(n).toFixed(d);
const round2 = (n) => Math.round(n * 100) / 100;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const fileSha256 = (file) => sha256(fs.readFileSync(file));
const ttsSourceFingerprint = (text, voice, rate, pitch, volume) => sha256(JSON.stringify({ text, voice, rate, pitch, volume }));
// narration clip slot = exact MP3 length (HyperFrames >=0.8 shortens longer slots anyway: clip_media_fit)
const audioSlot = (t) => (t.mp3 ? Math.min(round2(t.mp3), t.duration) : t.duration);

// ---------------------------------------------------------------------------
// locate project / repo
// ---------------------------------------------------------------------------
function findUp(startDir, predicate) {
  let dir = path.resolve(startDir);
  for (;;) {
    if (predicate(dir)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}
function findRepoRoot(from) {
  return findUp(from, (d) => exists(path.join(d, "shared", "schemas", "project.schema.json")));
}
function findProjectRoot() {
  if (FLAGS.project) {
    const p = path.resolve(String(FLAGS.project));
    if (!exists(path.join(p, "project.json"))) die(`no project.json in ${p}`);
    return p;
  }
  const p = findUp(process.cwd(), (d) => exists(path.join(d, "project.json")));
  if (!p) die("not inside a HyperFrames project (no project.json found). Use --project <dir>.");
  return p;
}
function repoRootOrDie(from) {
  const r = findRepoRoot(from) || findRepoRoot(TOOL_DIR);
  if (!r) die("cannot locate repository root (shared/schemas/project.schema.json)");
  return r;
}

// ---------------------------------------------------------------------------
// storyboard model — normalises the two historical shapes into one
// ---------------------------------------------------------------------------
function slideNumber(id) {
  const m = /(\d+)$/.exec(id || "");
  return m ? Number(m[1]) : NaN;
}
function localeIds(raw) {
  const ids = new Set([String(raw.language || "").trim(), ...Object.keys(raw.locales || {})].filter(Boolean));
  return [...ids];
}
function canonicalLocale(raw) {
  const declared = Object.entries(raw.locales || {}).find(([, config]) => config && config.default === true)?.[0];
  return String(raw.language || declared || "zh-Hant");
}
function assertLocale(locale, raw) {
  const id = String(locale || canonicalLocale(raw));
  if (!/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/.test(id)) throw new Error(`invalid locale ${JSON.stringify(id)}`);
  if (id !== canonicalLocale(raw) && !localeIds(raw).includes(id)) {
    throw new Error(`locale ${JSON.stringify(id)} is not declared in storyboard.locales (${localeIds(raw).join(", ") || "none"})`);
  }
  return id;
}
function localizedValue(value, locale, canonical, context, warnings, { required = false, optional = false } = {}) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    if (typeof value[locale] === "string") return value[locale];
    if (locale === canonical && typeof value[canonical] === "string") return value[canonical];
    if (optional) return "";
    if (required) throw new Error(`${context}: missing required ${JSON.stringify(locale)} string`);
    if (typeof value[canonical] === "string") {
      warnings.push(`${context}: ${JSON.stringify(locale)} falls back to canonical ${JSON.stringify(canonical)}`);
      return value[canonical];
    }
    return "";
  }
  if (locale === canonical) return value ?? "";
  if (optional) return "";
  if (required) throw new Error(`${context}: must be localized for ${JSON.stringify(locale)}; a canonical string cannot supply a spoken variant`);
  if (value !== undefined && value !== null && value !== "") warnings.push(`${context}: ${JSON.stringify(locale)} falls back to canonical ${JSON.stringify(canonical)}`);
  return value ?? "";
}
function localizeBlock(block, locale, canonical, slideId, warnings) {
  const b = structuredClone(block || {});
  const get = (owner, key, context = `slides.${slideId}.blocks[].${key}`) => {
    if (owner && key in owner) owner[key] = localizedValue(owner[key], locale, canonical, context, warnings);
  };
  get(b, "text");
  get(b, "source");
  get(b, "unit");
  if (Array.isArray(b.labels)) b.labels = b.labels.map((label, i) => localizedValue(label, locale, canonical, `slides.${slideId}.blocks[].labels[${i}]`, warnings));
  if (Array.isArray(b.items)) {
    b.items = b.items.map((item, i) => {
      if (typeof item === "string" || (item && typeof item === "object" && !Array.isArray(item) && !Object.keys(item).some((k) => ["text", "title", "label", "value", "note", "display", "emphasis"].includes(k)))) {
        return localizedValue(item, locale, canonical, `slides.${slideId}.blocks[].items[${i}]`, warnings);
      }
      const it = structuredClone(item || {});
      for (const key of ["text", "title", "label", "note", "display"]) get(it, key, `slides.${slideId}.blocks[].items[${i}].${key}`);
      return it;
    });
  }
  if (Array.isArray(b.series)) {
    b.series = b.series.map((series, i) => {
      const out = structuredClone(series || {});
      get(out, "label", `slides.${slideId}.blocks[].series[${i}].label`);
      get(out, "last", `slides.${slideId}.blocks[].series[${i}].last`);
      return out;
    });
  }
  return b;
}
function resolveStoryboard(raw, locale) {
  const canonical = canonicalLocale(raw);
  const selected = assertLocale(locale || canonical, raw);
  const warnings = [];
  const variant = selected !== canonical;
  const slides = (raw.slides || []).map((s, i) => {
    const id = s.id || `slide-${String(i + 1).padStart(2, "0")}`;
    return {
      id,
      n: slideNumber(id) || i + 1,
      title: localizedValue(s.title, selected, canonical, `slides.${id}.title`, warnings),
      chapter: localizedValue(s.chapter || s.type || "", selected, canonical, `slides.${id}.chapter`, warnings),
      durationTarget: Number(s.durationTarget ?? s.duration ?? s.originalTargetDuration ?? 0) || 0,
      image: s.image || (s.visuals && s.visuals.imageName ? `assets/images/${s.visuals.imageName}` : "") || "",
      imageInferred: !s.image && !!(s.visuals && s.visuals.imageName),
      blocks: Array.isArray(s.blocks) ? s.blocks.map((b) => localizeBlock(b, selected, canonical, id, warnings)) : [],
      motion: s.motion || null,
      subtitle: localizedValue(s.subtitle ?? "", selected, canonical, `slides.${id}.subtitle`, warnings, { required: variant }),
      narration: localizedValue(s.narration ?? s.displayText ?? "", selected, canonical, `slides.${id}.narration`, warnings, { required: variant }),
      ttsText: localizedValue(s.ttsText ?? "", selected, canonical, `slides.${id}.ttsText`, warnings, { optional: true }),
      raw: s,
    };
  });
  const localeVoice = (raw.locales && raw.locales[selected] && raw.locales[selected].voice) || {};
  const voice = { ...(raw.voice || {}), ...localeVoice };
  if (localeVoice.name && !localeVoice.voice) voice.voice = localeVoice.name;
  else if (!voice.voice && voice.name) voice.voice = voice.name;
  return {
    raw,
    slides,
    locale: selected,
    canonicalLocale: canonical,
    isCanonical: selected === canonical,
    locales: localeIds(raw),
    resolutionWarnings: warnings,
    voice,
    title: localizedValue(raw.title || "", selected, canonical, "storyboard.title", warnings),
    music: raw.music || null,
  };
}
function loadStoryboard(projectRoot, locale) {
  const p = path.join(projectRoot, "data", "storyboard.json");
  if (!exists(p)) die(`missing ${rel(projectRoot, p)}`);
  const raw = readJson(p);
  return { path: p, ...resolveStoryboard(raw, locale) };
}
function localePaths(projectRoot, sb) {
  const suffix = sb.isCanonical ? "" : `.${sb.locale}`;
  const audioRel = sb.isCanonical ? "assets/audio" : `assets/audio/${sb.locale}`;
  const reviewRel = sb.isCanonical ? "review" : `review/${sb.locale}`;
  const projectId = exists(path.join(projectRoot, "project.json")) ? readJson(path.join(projectRoot, "project.json")).id || path.basename(projectRoot) : path.basename(projectRoot);
  const relative = {
    audioDir: audioRel,
    pronunciation: sb.isCanonical ? sb.voice.pronunciationMap || "data/pronunciation-map.json" : sb.voice.pronunciationMap || `data/pronunciation-map.${sb.locale}.json`,
    durations: `data/audio-durations${suffix}.json`,
    timeline: `data/timeline${suffix}.json`,
    entry: `index${suffix}.html`,
    captions: `captions/narration${suffix}.srt`,
    wordCaptions: `captions/narration${suffix}.word.srt`,
    review: reviewRel,
    renderOutput: `renders/${projectId}${suffix}.mp4`,
  };
  return { relative, ...Object.fromEntries(Object.entries(relative).map(([key, value]) => [key, path.join(projectRoot, ...value.split("/"))])) };
}
const padId = (n) => `slide-${String(n).padStart(2, "0")}`;

// ---------------------------------------------------------------------------
// minimal JSON-schema validator (enough for shared/schemas/*)
// ---------------------------------------------------------------------------
function validateSchema(schema, data, where = "$", out = []) {
  if (!schema || typeof schema !== "object") return out;
  if (schema.enum && !schema.enum.includes(data)) out.push(`${where}: expected one of ${JSON.stringify(schema.enum)}, got ${JSON.stringify(data)}`);
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const actual = data === null ? "null" : Array.isArray(data) ? "array" : typeof data;
    const ok = types.some((t) => (t === "integer" ? Number.isInteger(data) : t === "number" ? typeof data === "number" : t === actual));
    if (!ok) {
      out.push(`${where}: expected ${types.join("|")}, got ${actual}`);
      return out;
    }
  }
  if (typeof data === "number") {
    if (schema.minimum !== undefined && data < schema.minimum) out.push(`${where}: ${data} < minimum ${schema.minimum}`);
  }
  if (typeof data === "string") {
    if (schema.pattern && !new RegExp(schema.pattern).test(data)) out.push(`${where}: does not match /${schema.pattern}/`);
    if (schema.minLength !== undefined && data.length < schema.minLength) out.push(`${where}: shorter than ${schema.minLength}`);
    if (schema.format === "date-time" && Number.isNaN(Date.parse(data))) out.push(`${where}: not a date-time`);
  }
  if (Array.isArray(data) && schema.items) data.forEach((d, i) => validateSchema(schema.items, d, `${where}[${i}]`, out));
  if (data && typeof data === "object" && !Array.isArray(data)) {
    for (const r of schema.required || []) if (!(r in data)) out.push(`${where}: missing required "${r}"`);
    for (const [k, sub] of Object.entries(schema.properties || {})) if (k in data) validateSchema(sub, data[k], `${where}.${k}`, out);
    if (schema.additionalProperties === false) {
      for (const k of Object.keys(data)) if (!(k in (schema.properties || {})) && k !== "$schema") out.push(`${where}: unexpected property "${k}"`);
    } else if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
      for (const [k, value] of Object.entries(data)) {
        if (!(k in (schema.properties || {})) && k !== "$schema") validateSchema(schema.additionalProperties, value, `${where}.${k}`, out);
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// external tools
// ---------------------------------------------------------------------------
function childProcessOptions(opts = {}) {
  return { encoding: "utf8", windowsHide: true, ...opts };
}
function run(cmd, args, opts = {}) {
  // args === undefined means cmd is a full command line (used with shell:true)
  // On Windows, Node otherwise gives short-lived console windows to helpers such as
  // ffprobe, Edge-TTS, FFmpeg, and npx. A pipeline can launch dozens of them, so keep
  // every non-interactive child hidden unless a caller explicitly opts out.
  const spawnOpts = childProcessOptions(opts);
  const r = args === undefined
    ? spawnSync(cmd, spawnOpts)
    : spawnSync(cmd, args, { ...spawnOpts, shell: false });
  return { ok: r.status === 0, status: r.status, stdout: r.stdout || "", stderr: r.stderr || "", error: r.error };
}
function ffprobeDuration(file) {
  const r = run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nk=1:nw=1", file]);
  if (!r.ok) throw new Error(`ffprobe failed for ${file}: ${r.stderr || r.error}`);
  const d = Number(r.stdout.trim());
  if (!Number.isFinite(d)) throw new Error(`ffprobe returned no duration for ${file}`);
  return d;
}
function resolveEdgeTts() {
  if (run("edge-tts", ["--version"]).ok) return { cmd: "edge-tts", pre: [] };
  for (const py of ["python", "python3", "py"]) {
    if (run(py, ["-m", "edge_tts", "--version"]).ok) return { cmd: py, pre: ["-m", "edge_tts"] };
  }
  return null;
}
// Preferred path: our own helper, which keeps the engine's WordBoundary stream alongside
// the audio (the CLI throws those timings away). Falls back to the CLI when unavailable.
function resolvePythonEdge() {
  for (const py of ["python", "python3", "py"]) if (run(py, ["-c", "import edge_tts"]).ok) return py;
  return null;
}

// ---------------------------------------------------------------------------
// index.html patching (attribute-level, id-addressed; safe for legacy demos)
// ---------------------------------------------------------------------------
function setAttr(tag, name, value) {
  const re = new RegExp(`\\s${name}="[^"]*"`);
  if (re.test(tag)) return tag.replace(re, ` ${name}="${value}"`);
  return tag.replace(/^(<\w+)/, `$1 ${name}="${value}"`);
}
function patchTagById(html, id, attrs) {
  // match the opening tag that carries id="<id>"
  const re = new RegExp(`<(section|div|audio|video)\\b[^>]*\\bid="${id}"[^>]*>`);
  const m = re.exec(html);
  if (!m) return { html, found: false };
  let tag = m[0];
  for (const [k, v] of Object.entries(attrs)) tag = setAttr(tag, k, v);
  return { html: html.slice(0, m.index) + tag + html.slice(m.index + m[0].length), found: true };
}
function patchRootDuration(html, total) {
  const re = /<(div|section|main)\b[^>]*\bdata-composition-id="[^"]*"[^>]*>/;
  const m = re.exec(html);
  if (!m) return { html, found: false };
  const tag = setAttr(m[0], "data-duration", String(total));
  return { html: html.slice(0, m.index) + tag + html.slice(m.index + m[0].length), found: true };
}
function patchCompositionLocale(html, locale) {
  const match = /data-composition-id="([^"]*)"/.exec(html);
  if (!match) return { html, found: false, id: null };
  const oldId = match[1];
  const baseId = oldId.replace(new RegExp(`-${locale}$`), "");
  const id = `${baseId}-${locale}`;
  html = html.replace(match[0], `data-composition-id="${id}"`);
  for (const prior of new Set([oldId, baseId])) {
    html = html.split(`window.__timelines["${prior}"]`).join(`window.__timelines["${id}"]`);
    html = html.split(`window.__timelines['${prior}']`).join(`window.__timelines['${id}']`);
  }
  return { html, found: true, id };
}
function patchGsapStartArray(html, timeline) {
  // Legacy demos keep `["#slide-03", 40.1]` or `["#slide-03", 40.1, 12]`
  // arrays; refresh the first numeric field (start) without touching duration.
  let n = 0;
  for (const s of timeline) {
    const re = new RegExp(`(\\["#${s.id}",\\s*)([0-9.]+)(\\s*,)`, "g");
    html = html.replace(re, (_, a, __, c) => {
      n++;
      return `${a}${s.start}${c}`;
    });
  }
  return { html, count: n };
}
function parseTimingFromHtml(html, ids) {
  const out = {};
  for (const id of ids) {
    const sec = new RegExp(`<(section|div)\\b[^>]*\\bid="${id}"[^>]*>`).exec(html);
    const aud = new RegExp(`<audio\\b[^>]*\\bid="audio-${id}"[^>]*>`).exec(html);
    const grab = (tag, name) => {
      if (!tag) return null;
      const m = new RegExp(`\\s${name}="([^"]*)"`).exec(tag[0]);
      return m ? m[1] : null;
    };
    out[id] = {
      section: sec ? { start: Number(grab(sec, "data-start")), duration: Number(grab(sec, "data-duration")) } : null,
      audio: aud ? { start: Number(grab(aud, "data-start")), duration: Number(grab(aud, "data-duration")), tag: aud[0] } : null,
    };
  }
  const root = /<(div|section|main)\b[^>]*\bdata-composition-id="[^"]*"[^>]*>/.exec(html);
  const rootDur = root ? /\sdata-duration="([^"]*)"/.exec(root[0]) : null;
  return { slides: out, root: root ? { duration: rootDur ? Number(rootDur[1]) : null } : null };
}

// ---------------------------------------------------------------------------
// SRT
// ---------------------------------------------------------------------------
function srtTime(sec) {
  const ms = Math.round(sec * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const r = ms % 1000;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(r).padStart(3, "0")}`;
}
function buildSrt(timeline, textById) {
  return (
    timeline
      .map((s, i) => {
        const text = (textById[s.id] || "").trim();
        // cue ends when narration ends (mp3), not when the slide ends — keeps captions honest
        const mp3 = s.mp3 ?? s.mp3Duration;
        const end = mp3 != null ? Math.min(s.start + mp3, s.start + s.duration) : s.start + s.duration;
        return `${i + 1}\n${srtTime(s.start)} --> ${srtTime(end)}\n${text}`;
      })
      .join("\n\n") + "\n"
  );
}
function countSrtCues(text) {
  return text.split(/\r?\n\r?\n/).filter((b) => /^\d+\s*\r?\n\d\d:\d\d:\d\d,\d{3} --> /.test(b.trim())).length;
}
function parseSrtCues(text) {
  const cues = [];
  for (const block of text.split(/\r?\n\r?\n/)) {
    const m = /(\d\d):(\d\d):(\d\d),(\d{3}) --> (\d\d):(\d\d):(\d\d),(\d{3})/.exec(block);
    if (!m) continue;
    const at = (h, mi, s, ms) => Number(h) * 3600 + Number(mi) * 60 + Number(s) + Number(ms) / 1000;
    cues.push({ start: at(m[1], m[2], m[3], m[4]), end: at(m[5], m[6], m[7], m[8]) });
  }
  return cues;
}

// --- word-level captions ---------------------------------------------------
// The TTS engine already knows when every word is spoken (hf tts keeps its
// WordBoundary stream in assets/audio/<slide>.words.json). Packing those into
// short cues beats re-deriving timings with ASR: it is exact, free, offline, and
// it cannot mis-transcribe the zh-Hant it just spoke.
// Two sources, each used for what it is actually good at:
//   * the DISPLAY script gives the text — correctly spelled, punctuated, and free of the
//     pronunciation map's spoken-only spellings ("T T S" is heard, "TTS" is read);
//   * the engine's WORD BOUNDARIES give the clock.
// The boundary stream carries no punctuation and happily splits "storyboard" into two
// tokens, so cutting cues from it directly produces captions that read worse than the
// paragraph they replace. Instead we cut the cues from the display text at punctuation,
// and place them on the clock by matching spoken weight against the token stream.
const CUE_HARD_BREAK = /[。！？!?…]/;
const CUE_SOFT_BREAK = /[，、；：,;:]/;
const isSkippable = (ch) => /[\s。！？!?…，、；：,;:「」『』（）()《》〈〉—·．.]/.test(ch);
// spoken weight: a CJK glyph is one beat, a latin letter or digit about half of one
const weightOf = (str) => [...String(str)].reduce((a, ch) => a + (isSkippable(ch) ? 0 : /[A-Za-z0-9]/.test(ch) ? 0.5 : 1), 0);

function splitDisplayCues(text, maxChars) {
  const chars = [...String(text).replace(/\s+/g, " ").trim()];
  const cues = [];
  let cur = "";
  const flush = () => {
    if (cur.trim()) cues.push(cur.trim());
    cur = "";
  };
  for (let i = 0; i < chars.length; i++) {
    cur += chars[i];
    const len = [...cur].length;
    const next = chars[i + 1] || "";
    // keep trailing punctuation with the cue it closes
    if (CUE_HARD_BREAK.test(chars[i]) && !CUE_HARD_BREAK.test(next)) flush();
    else if (CUE_SOFT_BREAK.test(chars[i]) && len >= Math.ceil(maxChars * 0.55)) flush();
    // never cut through an identifier like index.html or project.json
    else if (len >= maxChars && !/[A-Za-z0-9._-]/.test(next)) flush();
    // The emergency length ceiling must obey the same identifier boundary as the
    // normal ceiling. Otherwise a long token such as project.json is split even
    // though the comment and caption contract explicitly promise it will not be.
    else if (len >= Math.ceil(maxChars * 1.6) && !/[A-Za-z0-9._-]/.test(next)) flush();
  }
  flush();
  return cues;
}
// time at a fraction of the clip's total spoken weight, interpolated inside the token it lands in
function timeAtRatio(words, ratio, totals) {
  if (!words.length) return 0;
  const target = Math.max(0, Math.min(1, ratio)) * totals.total;
  let acc = 0;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const ww = totals.each[i];
    if (acc + ww >= target || i === words.length - 1) {
      const f = ww > 0 ? Math.max(0, Math.min(1, (target - acc) / ww)) : 0;
      return w.t + f * w.d;
    }
    acc += ww;
  }
  return words[words.length - 1].t + words[words.length - 1].d;
}
function buildWordCues(displayText, words, maxChars, offset, limit) {
  const usable = (words || []).filter((w) => String(w.w || "").trim());
  if (!usable.length) return [];
  const totals = { each: usable.map((w) => weightOf(w.w) || 0.5), total: 0 };
  totals.total = totals.each.reduce((a, b) => a + b, 0) || 1;
  const speechStart = usable[0].t;
  const speechEnd = usable[usable.length - 1].t + usable[usable.length - 1].d;

  const texts = displayText && displayText.trim() ? splitDisplayCues(displayText, maxChars) : usable.map((w) => w.w);
  const weights = texts.map((t) => Math.max(weightOf(t), 0.2));
  const sum = weights.reduce((a, b) => a + b, 0) || 1;

  const cues = [];
  let acc = 0;
  for (let i = 0; i < texts.length; i++) {
    const r0 = acc / sum;
    acc += weights[i];
    const r1 = acc / sum;
    let start = i === 0 ? speechStart : timeAtRatio(usable, r0, totals);
    let end = i === texts.length - 1 ? speechEnd : timeAtRatio(usable, r1, totals);
    if (end <= start) end = start + 0.35;
    cues.push({ start: offset + start, end: Math.min(offset + end, limit), text: texts[i] });
  }
  for (let i = 0; i < cues.length - 1; i++) cues[i].end = Math.min(cues[i].end, cues[i + 1].start);
  return cues.filter((c) => c.end > c.start && c.text.trim());
}
function renderSrt(cues) {
  return cues.map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text.trim()}`).join("\n\n") + "\n";
}
function wordCuesFor(projectRoot, timeline, paths = localePaths(projectRoot, loadStoryboard(projectRoot))) {
  const maxChars = Number(FLAGS["max-chars"] || 18);
  const out = [];
  let missing = 0;
  for (const t of timeline) {
    const p = path.join(paths.audioDir, `${t.id}.words.json`);
    if (!exists(p)) {
      missing++;
      continue;
    }
    const words = readJson(p).words || [];
    const display = path.join(paths.audioDir, `${t.id}.display.txt`);
    out.push(...buildWordCues(exists(display) ? readText(display) : "", words, maxChars, t.start, t.start + t.duration));
  }
  return { cues: out, missing, maxChars };
}
function writeWordCaptions(projectRoot, timeline, { quiet = false, paths = localePaths(projectRoot, loadStoryboard(projectRoot)) } = {}) {
  const { cues, missing, maxChars } = wordCuesFor(projectRoot, timeline, paths);
  const target = paths.wordCaptions;
  if (!cues.length) {
    if (!quiet) warn(`  no word timings found (run hf tts --force to capture them); ${target} not written`);
    return null;
  }
  writeText(target, renderSrt(cues));
  if (!quiet) log(`  ${paths.relative.wordCaptions}: ${cues.length} cues (<=${maxChars} chars)${missing ? `, ${missing} slide(s) without word data` : ""}`);
  return cues.length;
}
function cmdCaptions(projectRoot = findProjectRoot()) {
  const sb = loadStoryboard(projectRoot, FLAGS.locale);
  const paths = localePaths(projectRoot, sb);
  const timeline = exists(paths.timeline) ? readJson(paths.timeline).slides : provisionalTimeline(projectRoot, sb, paths);
  const mode = String(FLAGS.mode || "word");
  if (!["word", "slide", "both"].includes(mode)) die("--mode must be word|slide|both");
  if (mode === "slide" || mode === "both") {
    const textById = {};
    for (const s of sb.slides) {
      const display = path.join(paths.audioDir, `${s.id}.display.txt`);
      textById[s.id] = exists(display) ? readText(display) : s.narration || s.subtitle || "";
    }
    writeText(paths.captions, buildSrt(timeline, textById));
    log(`  ${paths.relative.captions}: ${timeline.length} cues (one per slide)`);
  }
  if (mode === "word" || mode === "both") writeWordCaptions(projectRoot, timeline, { paths });
}

// ---------------------------------------------------------------------------
// COMMAND: new
// ---------------------------------------------------------------------------
function cmdNew() {
  const repo = repoRootOrDie(process.cwd());
  let workflow = FLAGS.workflow;
  let name = FLAGS.name;
  const spec = ARGS._[1];
  if (spec && spec.includes("/")) [workflow, name] = spec.split("/");
  if (!workflow || !name) die("usage: hf new <workflow>/<project-name>   (workflows: " + WORKFLOWS.join(", ") + ")");
  if (!WORKFLOWS.includes(workflow)) die(`unknown workflow "${workflow}"; expected ${WORKFLOWS.join(", ")}`);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) die(`project name must be kebab-case: ${name}`);
  const src = path.join(repo, "shared", "templates", "hyperframes-research-project");
  const dst = path.join(repo, workflow, "projects", name);
  if (exists(dst)) die(`already exists: ${rel(repo, dst)}`);
  fs.cpSync(src, dst, { recursive: true });
  // project.json
  const pj = path.join(dst, "project.json");
  const project = readJson(pj);
  project.id = name;
  project.workflow = workflow;
  project.createdAt = nowIso();
  project.updatedAt = project.createdAt;
  project.paths = project.paths || {};
  project.paths.renderOutput = `renders/${name}.mp4`;
  writeJson(pj, project);
  // package.json name + render target
  const pk = path.join(dst, "package.json");
  if (exists(pk)) {
    const pkg = readJson(pk);
    pkg.name = name;
    if (pkg.scripts && pkg.scripts.render) pkg.scripts.render = pkg.scripts.render.replace(/renders\/[^\s"]+\.mp4/, `renders/${name}.mp4`);
    writeJson(pk, pkg);
  }
  for (const d of ["assets/images", "assets/audio", "captions", "renders", "docs", "data", "scripts"]) fs.mkdirSync(path.join(dst, d), { recursive: true });
  const v = vendorGsap(dst, repo);
  if (!v.ok) warn(`  (${v.reason}; index.html will need a GSAP source)`);
  log(`created ${rel(repo, dst)}`);
  log(`next: edit data/storyboard.json, then run  npm run pipeline  (or: node ../../../shared/tools/hf.mjs pipeline)`);
  log(`note: new projects are git-ignored by default; allowlist in .gitignore only after publication review.`);
}

// ---------------------------------------------------------------------------
// COMMAND: html  — generate index.html regions from storyboard
// ---------------------------------------------------------------------------
const HF_AUDIO_START = "<!-- hf:audio:start -->";
const HF_AUDIO_END = "<!-- hf:audio:end -->";
const HF_SLIDES_START = "<!-- hf:slides:start -->";
const HF_SLIDES_END = "<!-- hf:slides:end -->";

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// --- content blocks -------------------------------------------------------
// A slide may carry `blocks: [...]` — the information layer of a research slide.
// Deliberately a small, typographic vocabulary: every type has a fixed shape, so
// `hf html` can render it, `hf audit` can judge its density, and a human editing
// the storyboard never has to touch HTML. See shared/docs/design-v2.md §2B.
const BLOCK_TYPES = ["lead", "metrics", "cards", "list", "quote", "source", "chart"];
const BLOCK_LIMITS = { metrics: [2, 4], cards: [2, 3], list: [2, 5] };
// four is the whole motion vocabulary; see the template's timeline script
const MOTIONS = ["rise", "hold", "focus", "reveal"];

// --- chart block -----------------------------------------------------------
// A research slide that only states numbers makes the viewer do the comparison.
// Drawing it is the whole point of this block. Deliberately NOT a charting library:
// bars and splits are HTML boxes (so CJK labels and tabular numerals render as text,
// which SVG text does badly), and only the line uses SVG, where geometry is the point.
// Zero dependencies, our palette, deterministic offline.
const CHART_KINDS = ["bar", "split", "line"];
const CHART_LIMITS = { bar: [2, 6], split: [2, 4], line: [1, 2] };
const LINE_MAX_POINTS = 12;

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : Number.NaN);
const pct = (v) => `${Math.round(v * 10000) / 100}`;

function chartDisplay(item, unit) {
  if (item.display !== undefined) return String(item.display);
  const v = num(item.value);
  const s = Number.isFinite(v) ? (Math.abs(v) >= 100 || Number.isInteger(v) ? String(v) : v.toFixed(2)) : "";
  return unit ? `${s}` : s;
}

function renderChart(b, pad) {
  const kind = b.chart || "bar";
  if (!CHART_KINDS.includes(kind)) throw new Error(`unknown chart kind ${JSON.stringify(kind)} (expected: ${CHART_KINDS.join(", ")})`);
  const out = [`${pad}<figure class="block chart chart-${kind}">`];

  if (kind === "bar") {
    const items = Array.isArray(b.items) ? b.items : [];
    const values = items.map((i) => num(i.value)).filter(Number.isFinite);
    // headroom so the longest bar never touches the value column
    const max = num(b.max) || (values.length ? Math.max(...values) * 1.18 : 1);
    for (const it of items) {
      const v = num(it.value);
      const p = Number.isFinite(v) && max > 0 ? Math.max(0, Math.min(1, v / max)) : 0;
      out.push(
        `${pad}  <div class="row"${it.emphasis ? ' data-emphasis=""' : ""}>`,
        `${pad}    <div class="rl">${esc(it.label || "")}</div>`,
        `${pad}    <div class="rt"><i class="rf" style="--p:${p.toFixed(4)}"></i></div>`,
        `${pad}    <div class="rv">${esc(chartDisplay(it, b.unit))}${b.unit ? `<span class="ru">${esc(b.unit)}</span>` : ""}</div>`,
        `${pad}  </div>`
      );
    }
  } else if (kind === "split") {
    const items = Array.isArray(b.items) ? b.items : [];
    const total = items.reduce((a, i) => a + (Number.isFinite(num(i.value)) ? num(i.value) : 0), 0) || 1;
    out.push(`${pad}  <div class="splitbar">`);
    for (const [i, it] of items.entries()) {
      out.push(
        `${pad}    <span class="seg" style="--p:${(num(it.value) / total).toFixed(4)}" data-i="${i}"><b>${esc(chartDisplay(it, b.unit))}</b></span>`
      );
    }
    out.push(`${pad}  </div>`, `${pad}  <div class="splitkey">`);
    for (const [i, it] of items.entries()) out.push(`${pad}    <span data-i="${i}">${esc(it.label || "")}</span>`);
    out.push(`${pad}  </div>`);
  } else {
    // line: normalise every series into one viewBox; pathLength="1" makes the draw-on
    // animation exact without measuring geometry at runtime
    const series = Array.isArray(b.series) ? b.series : [];
    const all = series.flatMap((s) => (s.values || []).map(num)).filter(Number.isFinite);
    const lo = b.min !== undefined ? num(b.min) : Math.min(...all, 0);
    const hi = b.max !== undefined ? num(b.max) : Math.max(...all, 1);
    const span = hi - lo || 1;
    const W = 1560;
    const H = 300;
    // Keep endpoint dots fully inside the SVG viewport. HyperFrames 0.8.11's
    // container audit correctly caught the old last point (cx=W, r=7) being
    // clipped by 7 px; the inset also protects values at an explicit min/max.
    const inset = 10;
    out.push(`${pad}  <svg class="lines" viewBox="0 0 ${W} ${H}" aria-hidden="true">`);
    for (let g = 1; g <= 3; g++) out.push(`${pad}    <line class="grid" x1="0" y1="${((H / 4) * g).toFixed(1)}" x2="${W}" y2="${((H / 4) * g).toFixed(1)}"/>`);
    for (const [si, s] of series.entries()) {
      const vals = (s.values || []).map(num).filter(Number.isFinite);
      if (vals.length < 2) continue;
      const pts = vals.map((v, i) => {
        const x = inset + (i / (vals.length - 1)) * (W - inset * 2);
        const ratio = Math.max(0, Math.min(1, (v - lo) / span));
        const y = H - inset - ratio * (H - inset * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      });
      out.push(`${pad}    <polyline class="ln" data-i="${si}" pathLength="1" points="${pts.join(" ")}"/>`);
      const last = pts[pts.length - 1].split(",");
      out.push(`${pad}    <circle class="dot" data-i="${si}" cx="${last[0]}" cy="${last[1]}" r="7"/>`);
    }
    out.push(`${pad}  </svg>`);
    if (series.length) {
      out.push(`${pad}  <div class="linekey">`);
      for (const [si, s] of series.entries())
        out.push(`${pad}    <span data-i="${si}"><i></i>${esc(s.label || "")}${s.last !== undefined ? ` <b>${esc(String(s.last))}</b>` : ""}</span>`);
      out.push(`${pad}  </div>`);
    }
    if (Array.isArray(b.labels) && b.labels.length) {
      out.push(`${pad}  <div class="lineaxis">`);
      for (const l of b.labels) out.push(`${pad}    <span>${esc(String(l))}</span>`);
      out.push(`${pad}  </div>`);
    }
  }

  // A drawn comparison claims more than a stated one, so the source is not optional —
  // and a chart whose axis does not start at zero must say so, in the chart, every time.
  const zeroed = kind === "line" ? b.min === undefined || num(b.min) === 0 : b.max === undefined;
  const baseline = zeroed ? "" : kind === "line" ? `（縱軸自 ${esc(String(b.min))} 起）` : `（軸上限 ${esc(String(b.max))}）`;
  out.push(`${pad}  <figcaption>${esc(b.source || "")}${baseline}</figcaption>`, `${pad}</figure>`);
  return out;
}

function renderBlocks(blocks, pad = "          ") {
  const out = [];
  for (const b of blocks) {
    const type = b && b.type;
    if (!BLOCK_TYPES.includes(type)) throw new Error(`unknown storyboard block type ${JSON.stringify(type)} (expected: ${BLOCK_TYPES.join(", ")})`);
    const items = Array.isArray(b.items) ? b.items : [];
    if (type === "lead") out.push(`${pad}<p class="block lead">${esc(b.text || "")}</p>`);
    else if (type === "source") out.push(`${pad}<p class="block source">${esc(b.text || "")}</p>`);
    else if (type === "quote")
      out.push(
        `${pad}<figure class="block quote">`,
        `${pad}  <p>${esc(b.text || "")}</p>`,
        b.source ? `${pad}  <figcaption>${esc(b.source)}</figcaption>` : null,
        `${pad}</figure>`
      );
    else if (type === "metrics")
      out.push(
        `${pad}<div class="block metrics" style="--n:${items.length || 1}">`,
        ...items.map((m) =>
          [
            `${pad}  <div class="metric">`,
            `${pad}    <div class="label">${esc(m.label || "")}</div>`,
            `${pad}    <div class="value">${esc(m.value ?? "")}</div>`,
            m.note ? `${pad}    <div class="note">${esc(m.note)}</div>` : null,
            `${pad}  </div>`,
          ]
            .filter(Boolean)
            .join("\n")
        ),
        `${pad}</div>`
      );
    else if (type === "cards")
      out.push(
        `${pad}<div class="block cards" style="--n:${items.length || 1}">`,
        ...items.map((c) =>
          [
            `${pad}  <div class="card">`,
            `${pad}    <strong>${esc(c.title || "")}</strong>`,
            c.text ? `${pad}    <p>${esc(c.text)}</p>` : null,
            `${pad}  </div>`,
          ]
            .filter(Boolean)
            .join("\n")
        ),
        `${pad}</div>`
      );
    else if (type === "chart") out.push(...renderChart(b, pad));
    else if (type === "list")
      out.push(
        `${pad}<${b.ordered ? "ol" : "ul"} class="block list">`,
        ...items.map((li) => `${pad}  <li>${esc(typeof li === "string" ? li : li.text || "")}</li>`),
        `${pad}</${b.ordered ? "ol" : "ul"}>`
      );
  }
  return out.filter(Boolean).join("\n");
}
function renderAudioRegion(timeline, music, audioBase = "assets/audio") {
  const lines = timeline.map(
    (s, i) =>
      `      <audio id="audio-${s.id}" class="clip narration-audio" data-audio-group="voiceover" data-start="${s.start}" data-duration="${audioSlot(s)}" data-track-index="${20 + i}" src="${esc(audioBase)}/${s.id}.mp3"></audio>`
  );
  // Optional music bed on its own track, under every narration clip. Sourcing a track is out of
  // scope for this toolkit (bring a file you have the rights to, or use upstream /media-use);
  // hf only places it, levels it, and audits that it is long enough and quiet enough.
  if (music && music.file) {
    const total = timeline.length ? round1(timeline[timeline.length - 1].start + timeline[timeline.length - 1].duration) : 0;
    const vol = music.volume === undefined ? 0.14 : Number(music.volume);
    lines.unshift(
      `      <audio id="bgm" class="clip music-bed" data-audio-group="music" data-start="0" data-duration="${total}" data-track-index="19" data-volume="${vol}" src="${esc(music.file)}"></audio>`
    );
  }
  return `${HF_AUDIO_START}\n${lines.join("\n")}\n      ${HF_AUDIO_END}`;
}
function renderSlidesRegion(timeline, slides) {
  const total = timeline.length;
  const byId = Object.fromEntries(slides.map((s) => [s.id, s]));
  const sections = timeline.map((t, i) => {
    const s = byId[t.id] || { title: t.id, chapter: "", subtitle: "", image: "", blocks: [] };
    // chapter classes are namespaced: a bare chapter name like "quote" or "list" would
    // collide with the block vocabulary's own class names and restyle the whole slide.
    const chapterClass = s.chapter ? ` chapter-${String(s.chapter).toLowerCase().replace(/[^a-z0-9-]+/g, "-")}` : "";
    const blocks = Array.isArray(s.blocks) ? s.blocks : [];
    const ring = `        <svg class="deco" viewBox="0 0 100 100" aria-hidden="true"><circle class="track" cx="50" cy="50" r="46"/><circle class="arc" cx="50" cy="50" r="46" stroke-dasharray="${(((i + 1) / total) * 2 * Math.PI * 46).toFixed(2)} 999"/><circle class="dot" cx="50" cy="4" r="1.6" transform="rotate(${(((i + 1) / total) * 360).toFixed(1)} 50 50)"/></svg>`;
    const bg = s.image
      ? `        <img class="bg" data-layout-allow-overflow="" src="${esc(s.image)}" alt="">`
      : `        <div class="bg bg-generated" data-layout-allow-overflow=""></div>` + (blocks.length ? "" : `\n${ring}`);
    // Generated regions are intentionally compact: the storyboard is the readable
    // source, while keeping the entry composition below HyperFrames' large-file lint
    // threshold makes the surrounding hand-authored CSS/JS easier to inspect.
    const eyebrow = s.chapter ? esc(s.chapter) : String(i + 1).padStart(2, "0");
    return [
      `      <section id="${t.id}" class="clip slide${s.image ? "" : " no-image"}${blocks.length ? " with-blocks" : ""}${chapterClass}" style="--i:${i}"${s.motion ? ` data-motion="${esc(s.motion)}"` : ""} data-start="${t.start}" data-duration="${t.duration}" data-track-index="${i + 1}">${bg.trim()}<div class="shade"></div><div class="content"><div class="eyebrow">${eyebrow}</div><h1>${esc(s.title)}</h1>`,
      blocks.length ? `          <div class="blocks">\n${renderBlocks(blocks, "            ")}\n          </div>` : null,
      `        </div><div class="caption">${esc(s.subtitle || "")}</div><div class="progress">${String(i + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}</div></section>`,
    ]
      .filter(Boolean)
      .join("\n");
  });
  return `${HF_SLIDES_START}\n${sections.join("\n\n")}\n      ${HF_SLIDES_END}`;
}
function regionOf(html, startMarker, endMarker) {
  const a = html.indexOf(startMarker);
  const b = html.indexOf(endMarker);
  return a === -1 || b === -1 || b < a ? null : html.slice(a + startMarker.length, b);
}
const normalizeRegion = (s) => s.replace(/\sdata-(start|duration|hf-id)="[^"]*"/g, "").replace(/\s+/g, " ").trim();

function replaceRegion(html, startMarker, endMarker, replacement) {
  const a = html.indexOf(startMarker);
  const b = html.indexOf(endMarker);
  if (a === -1 || b === -1 || b < a) return null;
  return html.slice(0, a) + replacement + html.slice(b + endMarker.length);
}
function cmdHtml(projectRoot = findProjectRoot()) {
  const repo = repoRootOrDie(projectRoot);
  const sb = loadStoryboard(projectRoot, FLAGS.locale);
  const paths = localePaths(projectRoot, sb);
  if (!sb.slides.length) die("storyboard has no slides");
  const timeline = provisionalTimeline(projectRoot, sb, paths);
  const target = paths.entry;
  const templateHtml = path.join(repo, "shared", "templates", "hyperframes-research-project", "index.html");
  let html;
  if (exists(target) && !FLAGS.force) {
    html = readText(target);
    const a = replaceRegion(html, HF_AUDIO_START, HF_AUDIO_END, renderAudioRegion(timeline, sb.music, paths.relative.audioDir));
    const b = a && replaceRegion(a, HF_SLIDES_START, HF_SLIDES_END, renderSlidesRegion(timeline, sb.slides));
    if (!b) die("index.html exists but has no hf:audio / hf:slides regions. Re-run with --force to regenerate from the template (this overwrites index.html).");
    html = b;
  } else {
    const canonicalEntry = path.join(projectRoot, "index.html");
    const base = !sb.isCanonical && exists(canonicalEntry) ? canonicalEntry : templateHtml;
    if (!exists(base)) die(`template missing: ${rel(repo, base)}`);
    html = readText(base);
    html = replaceRegion(html, HF_AUDIO_START, HF_AUDIO_END, renderAudioRegion(timeline, sb.music, paths.relative.audioDir)) || html;
    html = replaceRegion(html, HF_SLIDES_START, HF_SLIDES_END, renderSlidesRegion(timeline, sb.slides)) || html;
  }
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(sb.title || "HyperFrames")}</title>`);
  if (!sb.isCanonical) {
    html = html.replace(/<html\b[^>]*\blang="[^"]*"/, (tag) => setAttr(tag, "lang", sb.locale));
    html = patchCompositionLocale(html, sb.locale).html;
  }
  const total = timeline.length ? round1(timeline[timeline.length - 1].start + timeline[timeline.length - 1].duration) : 0;
  html = patchRootDuration(html, total).html;
  if (FLAGS["dry-run"]) {
    log(html);
    return;
  }
  writeText(target, html);
  log(`wrote ${paths.relative.entry} (${timeline.length} slides, ${total}s provisional; run  hf sync${sb.isCanonical ? "" : ` --locale ${sb.locale}`} after TTS)`);
}

// provisional timeline: measured mp3 where available, else storyboard targets
function provisionalTimeline(projectRoot, sb, paths = localePaths(projectRoot, sb)) {
  const durations = loadDurations(projectRoot, false, paths);
  let cursor = 0;
  return sb.slides.map((s) => {
    const mp3 = durations[s.id];
    const duration = mp3 ? Math.max(s.durationTarget || 0, ceil1(mp3 + PAD_DEFAULT)) : s.durationTarget || 10;
    const t = { id: s.id, start: round1(cursor), duration: round1(duration), mp3: mp3 || null };
    cursor = round1(cursor + duration);
    return t;
  });
}

// ---------------------------------------------------------------------------
// COMMAND: prepare-tts
// ---------------------------------------------------------------------------
function applyPronunciationMap(text, map) {
  // legacy shape (pi workflow, 2026-06): { rules: [{ pattern, replacement }] } — regex entries
  const entries = map.entries || (map.rules || []).map((r) => ({ match: r.pattern, tts: r.replacement, matchType: "regex", enabled: r.enabled }));
  for (const e of entries) {
    if (e.enabled === false) continue;
    if ((e.matchType || "literal") === "regex") text = text.replace(new RegExp(e.match, "g"), e.tts);
    else text = text.split(e.match).join(e.tts);
  }
  return text;
}
function cmdPrepareTts(projectRoot = findProjectRoot()) {
  const sb = loadStoryboard(projectRoot, FLAGS.locale);
  const paths = localePaths(projectRoot, sb);
  const audioDir = paths.audioDir;
  fs.mkdirSync(audioDir, { recursive: true });
  const mapPath = paths.pronunciation;
  const map = exists(mapPath) ? readJson(mapPath) : { entries: [] };
  let wrote = 0;
  for (const s of sb.slides) {
    const display = path.join(audioDir, `${s.id}.display.txt`);
    const legacy = path.join(audioDir, `${s.id}.txt`);
    if (s.narration && s.narration.trim()) {
      const current = exists(display) ? readText(display).trim() : null;
      if (current !== s.narration.trim()) writeText(display, s.narration.trim() + "\n");
    } else if (!exists(display) && exists(legacy)) {
      fs.copyFileSync(legacy, display);
    }
    if (!exists(display)) {
      warn(`  ${s.id}: no narration in storyboard and no ${s.id}.display.txt — skipped`);
      continue;
    }
    const ttsSource = s.ttsText && s.ttsText.trim() ? s.ttsText.trim() : readText(display).trim();
    const tts = applyPronunciationMap(ttsSource, map).trim() + "\n";
    const ttsPath = path.join(audioDir, `${s.id}.tts.txt`);
    if (!exists(ttsPath) || readText(ttsPath) !== tts) {
      writeText(ttsPath, tts);
      wrote++;
    }
  }
  log(`prepare-tts${sb.isCanonical ? "" : ` --locale ${sb.locale}`}: ${sb.slides.length} slides, ${wrote} tts.txt updated (map entries: ${(map.entries || []).length})`);
}

// ---------------------------------------------------------------------------
// COMMAND: tts (Edge-TTS)
// ---------------------------------------------------------------------------
function cmdTts(projectRoot = findProjectRoot()) {
  const sb = loadStoryboard(projectRoot, FLAGS.locale);
  const paths = localePaths(projectRoot, sb);
  const v = sb.voice || {};
  if (v.tool && v.tool !== "edge-tts") die(`storyboard.voice.tool is "${v.tool}"; hf tts only drives edge-tts (other providers: write slide-NN.mp3 yourself, then hf measure).`);
  const voice = FLAGS.voice || v.voice || "zh-TW-HsiaoChenNeural";
  const rate = FLAGS.rate || v.rate || "+0%";
  const pitch = FLAGS.pitch || v.pitch || "+0Hz";
  const volume = v.volume || "+0%";
  const edge = resolveEdgeTts();
  const py = FLAGS["no-words"] ? null : resolvePythonEdge();
  const helper = path.join(repoRootOrDie(projectRoot), "shared", "tools", "edge_tts_words.py");
  const useHelper = py && exists(helper);
  if (!edge && !useHelper) die("edge-tts not found. Install:  pip install --user edge-tts   (or: python -m pip install edge-tts)");
  const audioDir = paths.audioDir;
  const only = FLAGS.only ? String(FLAGS.only).split(",") : null;
  let made = 0,
    skipped = 0,
    failed = 0,
    noWords = 0;
  for (const s of sb.slides) {
    if (only && !only.includes(s.id)) continue;
    const ttsPath = path.join(audioDir, `${s.id}.tts.txt`);
    const mp3 = path.join(audioDir, `${s.id}.mp3`);
    if (!exists(ttsPath)) {
      warn(`  ${s.id}: missing ${s.id}.tts.txt (run hf prepare-tts)`);
      failed++;
      continue;
    }
    const wordsPath = path.join(audioDir, `${s.id}.words.json`);
    const providerPath = path.join(audioDir, `${s.id}.provider.json`);
    const sourceFingerprint = ttsSourceFingerprint(readText(ttsPath), voice, rate, pitch, volume);
    const provider = exists(providerPath) ? readJson(providerPath) : null;
    if (!FLAGS.force && exists(mp3) && fs.statSync(mp3).mtimeMs >= fs.statSync(ttsPath).mtimeMs && provider?.sourceFingerprint === sourceFingerprint) {
      skipped++;
      if (useHelper && !exists(wordsPath)) noWords++;
      continue;
    }
    const r = useHelper
      ? run(
          py,
          [helper, "--text-file", ttsPath, "--voice", voice, `--rate=${rate}`, `--pitch=${pitch}`, `--volume=${volume}`, "--out-audio", mp3, "--out-words", wordsPath],
          { env: { ...process.env, PYTHONIOENCODING: "utf-8" } }
        )
      : run(edge.cmd, [...edge.pre, "--voice", voice, `--rate=${rate}`, `--pitch=${pitch}`, `--volume=${volume}`, "--file", ttsPath, "--write-media", mp3]);
    if (!r.ok || !exists(mp3)) {
      failed++;
      warn(`  ${s.id}: edge-tts failed\n${(r.stderr || r.stdout || String(r.error)).trim()}`);
      continue;
    }
    made++;
    const words = exists(wordsPath) ? readJson(wordsPath).words.length : 0;
    writeJson(providerPath, {
      version: 1,
      provider: "edge-tts",
      requiresApiKey: false,
      charge: { currency: "USD", amount: 0, credits: 0 },
      locale: sb.locale,
      slide: s.id,
      voice,
      params: { rate, pitch, volume },
      inputFile: rel(projectRoot, ttsPath),
      outputAudio: rel(projectRoot, mp3),
      wordTimings: exists(wordsPath) ? rel(projectRoot, wordsPath) : null,
      sourceFingerprint,
      sha256: {
        audio: fileSha256(mp3),
        words: exists(wordsPath) ? fileSha256(wordsPath) : null,
      },
      generatedAt: new Date(fs.statSync(mp3).mtimeMs).toISOString(),
    });
    log(`  ${s.id}: ${fmt(ffprobeDuration(mp3))}s${words ? `  (${words} word timings)` : ""}`);
  }
  log(`tts: voice=${voice} rate=${rate} pitch=${pitch}${useHelper ? " via edge_tts_words.py" : " via edge-tts CLI (no word timings)"} — generated ${made}, up-to-date ${skipped}, failed ${failed}`);
  if (noWords) warn(`  ${noWords} clip(s) predate word timings; re-run with --force to get word-level captions for them.`);
  if (failed) process.exit(1);
}

// ---------------------------------------------------------------------------
// COMMAND: measure
// ---------------------------------------------------------------------------
function durationsPath(projectRoot, paths) {
  return paths ? paths.durations : path.join(projectRoot, "data", "audio-durations.json");
}
function loadDurations(projectRoot, strict = true, paths) {
  const p = durationsPath(projectRoot, paths);
  if (!exists(p)) {
    if (strict) die("no data/audio-durations.json — run  hf measure");
    return {};
  }
  return readJson(p).durations || {};
}
function cmdMeasure(projectRoot = findProjectRoot()) {
  const sb = loadStoryboard(projectRoot, FLAGS.locale);
  const paths = localePaths(projectRoot, sb);
  const audioDir = paths.audioDir;
  const durations = {};
  const missing = [];
  for (const s of sb.slides) {
    const mp3 = path.join(audioDir, `${s.id}.mp3`);
    if (!exists(mp3)) {
      missing.push(s.id);
      continue;
    }
    durations[s.id] = Math.round(ffprobeDuration(mp3) * 1000) / 1000;
  }
  const out = { generatedAt: nowIso(), tool: "ffprobe", durations, total: Math.round(Object.values(durations).reduce((a, b) => a + b, 0) * 1000) / 1000 };
  writeJson(durationsPath(projectRoot, paths), out);
  for (const [id, d] of Object.entries(durations)) log(`  ${id}  ${fmt(d, 3)}s`);
  if (missing.length) warn(`  missing mp3: ${missing.join(", ")}`);
  log(`measure: ${Object.keys(durations).length} clips, narration total ${fmt(out.total)}s -> ${paths.relative.durations}`);
  return out;
}

// ---------------------------------------------------------------------------
// COMMAND: sync
// ---------------------------------------------------------------------------
function computeTimeline(sb, durations, policy, pad) {
  let cursor = 0;
  const problems = [];
  const timeline = sb.slides.map((s) => {
    const mp3 = durations[s.id] ?? null;
    let duration;
    if (policy === "storyboard") {
      duration = s.durationTarget || (mp3 ? ceil1(mp3 + pad) : 10);
      if (mp3 && mp3 > duration + CUT_TOLERANCE) problems.push(`${s.id}: mp3 ${fmt(mp3)}s exceeds storyboard target ${fmt(duration)}s (policy=storyboard)`);
    } else {
      // audio policy: never shorter than narration + pad; honour a longer visual hold if the storyboard asks for it
      duration = mp3 ? Math.max(s.durationTarget || 0, ceil1(mp3 + pad)) : s.durationTarget || 10;
      if (!mp3) problems.push(`${s.id}: no mp3 measured; using storyboard target ${fmt(duration)}s`);
    }
    const t = { id: s.id, start: round1(cursor), duration: round1(duration), mp3, target: s.durationTarget || null };
    cursor = round1(cursor + t.duration);
    return t;
  });
  return { timeline, total: round1(cursor), problems };
}
function cmdSync(projectRoot = findProjectRoot()) {
  const sb = loadStoryboard(projectRoot, FLAGS.locale);
  const paths = localePaths(projectRoot, sb);
  const policy = String(FLAGS.policy || "audio");
  const pad = FLAGS.pad !== undefined ? Number(FLAGS.pad) : PAD_DEFAULT;
  if (!["audio", "storyboard"].includes(policy)) die("--policy must be audio|storyboard");
  let durations = loadDurations(projectRoot, false, paths);
  if (!Object.keys(durations).length) durations = cmdMeasure(projectRoot).durations;
  const { timeline, total, problems } = computeTimeline(sb, durations, policy, pad);
  for (const p of problems) warn(`  ! ${p}`);
  if (policy === "storyboard" && problems.some((p) => p.includes("exceeds"))) die("storyboard policy violated — shorten narration, speed up TTS, or use --policy audio");

  log(`sync: policy=${policy} pad=${pad}s total=${total}s`);
  log(`  ${"slide".padEnd(9)} ${"start".padStart(7)} ${"dur".padStart(7)} ${"mp3".padStart(7)} ${"target".padStart(7)}`);
  for (const t of timeline) log(`  ${t.id.padEnd(9)} ${fmt(t.start, 1).padStart(7)} ${fmt(t.duration, 1).padStart(7)} ${(t.mp3 ? fmt(t.mp3) : "-").padStart(7)} ${(t.target ? fmt(t.target, 1) : "-").padStart(7)}`);
  if (FLAGS["dry-run"]) return;

  // 1. data/timeline.json (generated artefact; the Snowy manifest of record)
  writeJson(paths.timeline, {
    generatedAt: nowIso(),
    generator: "shared/tools/hf.mjs sync",
    policy,
    padSeconds: pad,
    durationSeconds: total,
    slides: timeline.map((t) => ({ id: t.id, start: t.start, duration: t.duration, mp3Duration: t.mp3, storyboardTarget: t.target })),
  });

  // 2. index.html timing attributes (+ legacy GSAP start arrays)
  const htmlPath = paths.entry;
  if (exists(htmlPath)) {
    let html = readText(htmlPath);
    let patched = 0,
      missing = [];
    for (const t of timeline) {
      const a = patchTagById(html, t.id, { "data-start": t.start, "data-duration": t.duration });
      html = a.html;
      const b = patchTagById(html, `audio-${t.id}`, { "data-start": t.start, "data-duration": audioSlot(t) });
      html = b.html;
      if (a.found) patched++;
      if (!a.found) missing.push(t.id);
      if (!b.found) missing.push(`audio-${t.id}`);
    }
    if (sb.music && sb.music.file) html = patchTagById(html, "bgm", { "data-start": 0, "data-duration": total }).html;
    const r = patchRootDuration(html, total);
    html = r.html;
    const g = patchGsapStartArray(html, timeline);
    html = g.html;
    writeText(htmlPath, html);
    log(`  ${paths.relative.entry}: ${patched}/${timeline.length} slides patched${r.found ? ", root data-duration=" + total : ", (no root data-duration)"}${g.count ? ", gsap starts refreshed x" + g.count : ""}${missing.length ? "; NOT FOUND: " + missing.join(", ") : ""}`);
  } else warn(`  ${paths.relative.entry} missing — run  hf html${sb.isCanonical ? "" : ` --locale ${sb.locale}`}`);

  // 3. captions/narration.srt from display text
  const textById = {};
  for (const s of sb.slides) {
    const display = path.join(paths.audioDir, `${s.id}.display.txt`);
    textById[s.id] = exists(display) ? readText(display) : s.narration || s.subtitle || "";
  }
  writeText(paths.captions, buildSrt(timeline, textById));
  log(`  ${paths.relative.captions}: ${timeline.length} cues`);
  writeWordCaptions(projectRoot, timeline, { quiet: true, paths }) && log(`  ${paths.relative.wordCaptions}: refreshed from word timings`);

  // 4. project.json
  const pjPath = path.join(projectRoot, "project.json");
  const pj = readJson(pjPath);
  pj.updatedAt = nowIso();
  if (sb.isCanonical) {
    pj.durationSeconds = total;
    pj.timing = { policy, padSeconds: pad, source: paths.relative.timeline, measured: paths.relative.durations };
  }
  const existing = (pj.deliverables && pj.deliverables[sb.locale]) || {};
  pj.deliverables = pj.deliverables || {};
  pj.deliverables[sb.locale] = {
    locale: sb.locale,
    durationSeconds: total,
    entry: paths.relative.entry,
    measuredAudio: paths.relative.durations,
    timeline: paths.relative.timeline,
    captions: { slide: paths.relative.captions, word: paths.relative.wordCaptions },
    renderOutput: paths.relative.renderOutput,
    review: { kit: `${paths.relative.review}/index.html`, status: existing.review?.status || "pending" },
  };
  writeJson(pjPath, pj);

  // 5. legacy Snowy manifests (meta.json / hyperframes.json with slides[] / slidesData[])
  for (const name of sb.isCanonical ? ["meta.json", "hyperframes.json"] : []) {
    const p = path.join(projectRoot, name);
    if (!exists(p)) continue;
    const m = readJson(p);
    if (m.registry) continue; // upstream HyperFrames config — not ours to touch
    const arr = m.slidesData || m.slides;
    if (!Array.isArray(arr)) continue;
    for (const t of timeline) {
      const row = arr.find((x) => x.id === t.id);
      if (row) {
        row.start = t.start;
        row.duration = t.duration;
        if (t.mp3 != null) row.mp3Duration = t.mp3;
      }
    }
    m.durationSeconds = total;
    writeJson(p, m);
    log(`  ${name}: legacy manifest timings refreshed`);
  }
  log(`sync done. Next:  hf check  ->  preview  ->  render`);
}

// ---------------------------------------------------------------------------
// COMMAND: audit
// ---------------------------------------------------------------------------
function auditProject(projectRoot, repo) {
  const findings = []; // {level: 'error'|'warn'|'info', code, msg}
  const E = (code, msg) => findings.push({ level: "error", code, msg });
  const W = (code, msg) => findings.push({ level: "warn", code, msg });
  const I = (code, msg) => findings.push({ level: "info", code, msg });
  const P = (p) => path.join(projectRoot, p);

  // A project without a storyboard but with data/bakeoff.json is an audio-research
  // project (no composition, no timeline) — judge it by its own contract.
  if (!exists(P("data/storyboard.json")) && exists(P("data/bakeoff.json"))) return auditBakeoff(projectRoot, repo, findings, { E, W, I, P });

  // files
  for (const f of ["project.json", "index.html", "data/storyboard.json", "package.json"]) if (!exists(P(f))) E("missing-file", `${f} missing`);
  for (const f of ["data/pronunciation-map.json", "docs/references.md", "docs/runbook.md", "docs/retrospective.md", "captions/narration.srt", "README.md"]) if (!exists(P(f))) W("missing-file", `${f} missing`);
  if (!exists(P("project.json")) || !exists(P("data/storyboard.json"))) return findings;

  // schemas
  const schemas = {
    "project.json": "project.schema.json",
    "data/storyboard.json": "storyboard.schema.json",
    "data/pronunciation-map.json": "pronunciation-map.schema.json",
  };
  for (const [file, schemaName] of Object.entries(schemas)) {
    if (!exists(P(file))) continue;
    const schemaPath = path.join(repo, "shared", "schemas", schemaName);
    if (!exists(schemaPath)) continue;
    let data;
    try {
      data = readJson(P(file));
    } catch (e) {
      E("invalid-json", `${file}: ${e.message}`);
      continue;
    }
    const errs = validateSchema(readJson(schemaPath), data);
    for (const e of errs) (file === "data/storyboard.json" ? W : E)("schema", `${file} ${e}`);
  }

  const project = readJson(P("project.json"));
  // A placeholder left in project.json silently reaches every generated artefact
  // (a review kit published with the title "Replace with project title" is how this
  // check was earned). Catch it here, before anything downstream embeds it.
  for (const [k, v] of Object.entries(project)) {
    if (typeof v === "string" && /replace[- ]with/i.test(v)) E("placeholder", `project.json.${k} is still the template placeholder: ${JSON.stringify(v)}`);
  }
  const sb = loadStoryboard(projectRoot);
  if (!sb.slides.length) E("storyboard", "storyboard has no slides");
  const ids = sb.slides.map((s) => s.id);
  const dupIds = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupIds.length) E("storyboard", `duplicate slide ids: ${dupIds.join(", ")}`);
  const renderStage = ["ready-to-render", "rendered"].includes(project.status);

  // content blocks: shape + density (a slide a viewer cannot read in its narration window is a defect)
  for (const s of sb.slides) {
    const seen = {};
    for (const b of s.blocks) {
      const type = b && b.type;
      if (!BLOCK_TYPES.includes(type)) {
        E("block-type", `${s.id}: unknown block type ${JSON.stringify(type)} (expected: ${BLOCK_TYPES.join(", ")})`);
        continue;
      }
      seen[type] = (seen[type] || 0) + 1;
      const n = Array.isArray(b.items) ? b.items.length : 0;
      const lim = BLOCK_LIMITS[type];
      if (lim && (n < lim[0] || n > lim[1])) W("block-density", `${s.id}: ${type} has ${n} item(s); readable range is ${lim[0]}-${lim[1]} at 1080p`);
      if (type === "metrics") for (const m of b.items || []) if (!m || m.value === undefined || !m.label) W("block-shape", `${s.id}: a metrics item needs both label and value`);
      if (type === "cards") for (const c of b.items || []) if (!c || !c.title) W("block-shape", `${s.id}: a cards item needs a title`);
      if ((type === "lead" || type === "quote" || type === "source") && !(b.text || "").trim()) W("block-shape", `${s.id}: ${type} block has no text`);
      if (type === "chart") {
        const kind = b.chart || "bar";
        if (!CHART_KINDS.includes(kind)) {
          E("chart", `${s.id}: unknown chart kind ${JSON.stringify(kind)} (expected: ${CHART_KINDS.join(", ")})`);
          continue;
        }
        // a drawn comparison asserts more than a stated one — it must be attributable
        if (!(b.source || "").trim()) E("chart", `${s.id}: a ${kind} chart has no source; every drawn comparison must be attributable`);
        const lim = CHART_LIMITS[kind];
        if (kind === "line") {
          if (b.min !== undefined && !Number.isFinite(num(b.min))) E("chart", `${s.id}: line chart min must be numeric`);
          if (b.max !== undefined && !Number.isFinite(num(b.max))) E("chart", `${s.id}: line chart max must be numeric`);
          if (Number.isFinite(num(b.min)) && Number.isFinite(num(b.max)) && num(b.min) >= num(b.max))
            E("chart", `${s.id}: line chart min ${b.min} must be below max ${b.max}`);
          const series = Array.isArray(b.series) ? b.series : [];
          if (series.length < lim[0] || series.length > lim[1]) W("block-density", `${s.id}: line chart has ${series.length} series; ${lim[0]}-${lim[1]} stays readable`);
          for (const ser of series) {
            const vals = (ser.values || []).map((v) => (typeof v === "number" && Number.isFinite(v) ? v : NaN));
            if (vals.length < 2) E("chart", `${s.id}: line series ${JSON.stringify(ser.label || "")} needs at least 2 points`);
            if (vals.some((v) => !Number.isFinite(v))) E("chart", `${s.id}: line series ${JSON.stringify(ser.label || "")} has a non-numeric value`);
            if (vals.length > LINE_MAX_POINTS) W("block-density", `${s.id}: line series has ${vals.length} points; over ${LINE_MAX_POINTS} is unreadable at 1080p`);
          }
        } else {
          if (kind === "bar" && b.max !== undefined && !(Number.isFinite(num(b.max)) && num(b.max) > 0))
            E("chart", `${s.id}: bar chart max must be a positive number`);
          const its = Array.isArray(b.items) ? b.items : [];
          if (its.length < lim[0] || its.length > lim[1]) W("block-density", `${s.id}: ${kind} chart has ${its.length} item(s); ${lim[0]}-${lim[1]} stays readable`);
          for (const it of its) {
            if (!it || !String(it.label || "").trim()) W("block-shape", `${s.id}: a ${kind} chart item has no label`);
            if (!(typeof it.value === "number" && Number.isFinite(it.value))) E("chart", `${s.id}: ${kind} chart item ${JSON.stringify(it && it.label)} has a non-numeric value`);
          }
        }
      }
      if (type === "lead" && (b.text || "").length > 60) W("block-density", `${s.id}: lead is ${b.text.length} chars; keep it under ~60 so it reads as one breath`);
    }
    if (s.motion && !MOTIONS.includes(s.motion)) E("motion", `${s.id}: unknown motion ${JSON.stringify(s.motion)} (expected: ${MOTIONS.join(", ")})`);
    for (const t of ["metrics", "cards", "quote"]) if (seen[t] > 1) W("block-density", `${s.id}: ${seen[t]} ${t} blocks on one slide; split it`);
    if (s.blocks.length > 3) W("block-density", `${s.id}: ${s.blocks.length} blocks on one slide; 1-3 is the readable range`);
  }

  // assets
  const images = new Map();
  for (const s of sb.slides) {
    if (s.image) {
      if (!exists(P(s.image))) (renderStage && !s.imageInferred ? E : W)("missing-image", `${s.id}: image ${s.image} not found${s.imageInferred ? " (inferred from visuals.imageName; set slides[].image explicitly)" : ""}`);
      images.set(s.image, [...(images.get(s.image) || []), s.id]);
    }
    for (const ext of ["display.txt", "tts.txt"]) if (!exists(P(`assets/audio/${s.id}.${ext}`))) W("missing-text", `${s.id}: assets/audio/${s.id}.${ext} missing`);
    if (!exists(P(`assets/audio/${s.id}.mp3`))) (renderStage ? E : W)("missing-audio", `${s.id}: assets/audio/${s.id}.mp3 missing`);
  }
  for (const [img, users] of images) if (users.length > 1) W("duplicate-image", `${img} used by ${users.join(", ")} (HyperFrames duplicate-media warning; use slide-specific copies)`);

  // index.html timing + audio cut risk
  if (exists(P("index.html"))) {
    const html = readText(P("index.html"));
    if (!/data-composition-id=/.test(html)) E("composition", "index.html has no data-composition-id root");
    if (/<audio\b[^>]*\bcontrols\b/.test(html)) E("audio-controls", "an <audio> element has native controls — they render into the video");
    if (/<script[^>]+src="https?:\/\//.test(html)) I("cdn-script", "index.html loads a script from a CDN (render needs network; consider vendoring for determinism)");
    // is the generated region still what the storyboard says? (timing attrs are excluded — `sync` owns those)
    const currentRegion = regionOf(html, HF_SLIDES_START, HF_SLIDES_END);
    if (currentRegion !== null) {
      try {
        const expected = renderSlidesRegion(sb.slides.map((s) => ({ id: s.id, start: 0, duration: 0 })), sb.slides);
        if (normalizeRegion(currentRegion) !== normalizeRegion(regionOf(expected, HF_SLIDES_START, HF_SLIDES_END) || ""))
          W("stale-html", "index.html's generated slide region no longer matches data/storyboard.json — run `hf html` then `hf sync`");
      } catch (e) {
        E("block-type", String(e.message || e));
      }
    }
    // Modern projects group every narration clip as one voiceover bus. HyperFrames
    // 0.8.11 can then carve a future music bed against the stable group instead of a
    // brittle list of slide ids. Keep legacy demos untouched; markers identify output
    // owned by this generator.
    const audioRegion = regionOf(html, HF_AUDIO_START, HF_AUDIO_END);
    if (audioRegion !== null) {
      const audioTags = audioRegion.match(/<audio\b[^>]*>/g) || [];
      const narration = audioTags.filter((tag) => /\bid="audio-slide-[^"]+"/.test(tag));
      const ungrouped = narration.filter((tag) => !/\bdata-audio-group="voiceover"/.test(tag));
      if (ungrouped.length)
        W("audio-group", `${ungrouped.length} narration clip(s) are not in data-audio-group="voiceover" — run \`hf html\` then \`hf sync\``);
      const bgm = audioTags.find((tag) => /\bid="bgm"/.test(tag));
      if (bgm && !/\bdata-audio-group="music"/.test(bgm)) W("audio-group", `the music bed is not in data-audio-group="music" — run \`hf html\` then \`hf sync\``);
    }
    const timing = parseTimingFromHtml(html, ids);
    let prevEnd = 0;
    let lastEnd = 0;
    let hasFfprobe = true;
    for (const s of sb.slides) {
      const t = timing.slides[s.id];
      if (!t.section) {
        E("timing", `${s.id}: no element with id="${s.id}" in index.html`);
        continue;
      }
      if (!t.audio) W("timing", `${s.id}: no <audio id="audio-${s.id}">`);
      const { start, duration } = t.section;
      if (!Number.isFinite(start) || !Number.isFinite(duration)) E("timing", `${s.id}: data-start/data-duration not numeric`);
      if (Math.abs(start - prevEnd) > 0.05) W("timing", `${s.id}: starts at ${start}s but previous slide ends at ${prevEnd}s`);
      prevEnd = round1(start + duration);
      lastEnd = Math.max(lastEnd, prevEnd);
      if (t.audio && (Math.abs(t.audio.start - start) > 0.05 || t.audio.duration > duration + 0.05)) W("timing", `${s.id}: audio clip window (${t.audio.start}+${t.audio.duration}) does not match slide window (${start}+${duration})`);
      const mp3 = P(`assets/audio/${s.id}.mp3`);
      if (exists(mp3) && hasFfprobe) {
        try {
          const d = ffprobeDuration(mp3);
          const clip = t.audio ? t.audio.duration : duration;
          if (d > clip + CUT_TOLERANCE) E("cut-risk", `${s.id}: mp3 ${fmt(d)}s > clip ${fmt(clip)}s — narration will be cut (run hf sync)`);
          else if (t.audio && clip - d > 0.05) W("clip-media-fit", `${s.id}: audio slot ${fmt(clip)}s > mp3 ${fmt(d)}s — HyperFrames >=0.8 shortens the slot at render (run hf fit-audio or hf sync)`);
          if (duration - d < 0.3) I("tight", `${s.id}: only ${fmt(duration - d)}s of slide after narration ends`);
        } catch (e) {
          hasFfprobe = false;
          W("ffprobe", `ffprobe unavailable: ${e.message.split("\n")[0]} (audio cut-risk not checked)`);
        }
      }
    }
    if (timing.root && timing.root.duration != null && Math.abs(timing.root.duration - lastEnd) > 0.05) W("timing", `root data-duration=${timing.root.duration} but last slide ends at ${lastEnd}`);
    if (timing.root && timing.root.duration == null) W("timing", "composition root has no data-duration");
    if (project.durationSeconds && Math.abs(project.durationSeconds - lastEnd) > 1) W("timing", `project.json durationSeconds=${project.durationSeconds} but composition ends at ${lastEnd}s`);
  }

  // music bed
  if (sb.music && sb.music.file) {
    const f = P(sb.music.file);
    const vol = sb.music.volume === undefined ? 0.14 : Number(sb.music.volume);
    if (!exists(f)) E("music", `storyboard.music.file ${sb.music.file} not found`);
    else if (exists(P("data/timeline.json"))) {
      const tl = readJson(P("data/timeline.json")).slides || [];
      const total = tl.length ? tl[tl.length - 1].start + tl[tl.length - 1].duration : 0;
      try {
        const d = ffprobeDuration(f);
        if (d < total - 0.05) E("music", `music bed is ${fmt(d)}s but the piece is ${fmt(total)}s — the bed stops early (HyperFrames shortens a slot to its media)`);
      } catch {}
    }
    if (!(vol > 0 && vol <= 0.35)) W("music", `music.volume ${vol} is outside 0.01-0.35; a bed above ~0.35 fights the narration`);
    // A quiet source times a small volume is silence. Measured on a real render: a bed
    // mastered to -20 LUFS at volume 0.14 lands ~-37.7 LUFS under narration at ~-15.8,
    // i.e. 22 dB of separation. Judge the bed by where it will actually land, not by
    // either number alone.
    if (exists(f)) {
      try {
        const src = loudness(f).lufs;
        if (src != null && vol > 0) {
          const landed = src + 20 * Math.log10(vol);
          if (landed < -48) W("music", `bed is ${fmt(src, 1)} LUFS at volume ${vol} → about ${fmt(landed, 1)} LUFS in the mix; that is inaudible (master the bed nearer -20 LUFS or raise the volume)`);
          else if (landed > -28) W("music", `bed lands at about ${fmt(landed, 1)} LUFS against narration near -19; it will compete with the voice`);
          else I("music", `bed lands at about ${fmt(landed, 1)} LUFS in the mix (source ${fmt(src, 1)} LUFS × volume ${vol})`);
        }
      } catch {}
    }
    if (exists(P("index.html")) && !/id="bgm"/.test(readText(P("index.html")))) W("music", "storyboard declares music but index.html has no bgm clip — run hf html");
  }

  // captions
  if (exists(P("captions/narration.srt"))) {
    const cues = countSrtCues(readText(P("captions/narration.srt")));
    if (cues !== sb.slides.length) W("captions", `narration.srt has ${cues} cues for ${sb.slides.length} slides`);
  }
  if (exists(P("captions/narration.word.srt")) && exists(P("data/timeline.json"))) {
    const tl = readJson(P("data/timeline.json")).slides || [];
    const end = tl.length ? tl[tl.length - 1].start + tl[tl.length - 1].duration : 0;
    const cues = parseSrtCues(readText(P("captions/narration.word.srt")));
    if (cues.length < tl.length) W("captions", `narration.word.srt has only ${cues.length} cues for ${tl.length} slides — word timings look stale (hf captions)`);
    let out = 0, overlap = 0;
    for (let i = 0; i < cues.length; i++) {
      if (cues[i].start < -0.001 || cues[i].end > end + 0.05) out++;
      if (i && cues[i].start < cues[i - 1].end - 0.001) overlap++;
    }
    if (out) E("captions", `narration.word.srt: ${out} cue(s) fall outside the composition (0-${fmt(end)}s)`);
    if (overlap) W("captions", `narration.word.srt: ${overlap} overlapping cue(s)`);
  }

  // hyperframes.json collision + deprecated CLI usage
  if (exists(P("hyperframes.json"))) {
    const h = readJson(P("hyperframes.json"));
    if (!h.registry) W("hyperframes-json", "hyperframes.json is a legacy Snowy manifest, but HyperFrames >=0.7 reserves this filename for its project config (registry/paths). Keep timings in data/timeline.json; see shared/docs/hyperframes-0.8-upgrade-notes.md");
  }
  if (exists(P("package.json"))) {
    const pkgText = readText(P("package.json"));
    if (/hyperframes(@[^ "]+)?\s+(validate|inspect|layout)\b/.test(pkgText)) W("deprecated-cli", "package.json uses hyperframes validate/inspect/layout — deprecated aliases; use `hyperframes check`");
    const pin = /hyperframes@([0-9][^ "]*)/.exec(pkgText);
    if (pin && /^0\.[0-6]\./.test(pin[1])) I("old-pin", `package.json pins hyperframes@${pin[1]} (current line is 0.8.x)`);
  }
  // renders
  const renderOut = project.paths && project.paths.renderOutput;
  if (project.status === "rendered" && renderOut && !exists(P(renderOut))) I("render", `status=rendered but ${renderOut} not present locally (fine if renders live in Releases)`);
  for (const locale of sb.locales.filter((id) => id !== sb.canonicalLocale)) {
    findings.push(...auditLocaleVariant(projectRoot, locale));
  }
  return findings;
}

// A variant is a deliverable inside the same project, not a copied project. Audit its
// complete chain independently: resolved copy -> audio -> measured timeline -> entry ->
// captions -> human gate metadata. Canonical checks above deliberately keep their old
// paths and semantics.
function auditLocaleVariant(projectRoot, locale) {
  const findings = [];
  const add = (level, code, msg) => findings.push({ level, code, msg: `${locale}: ${msg}` });
  const E = (code, msg) => add("error", code, msg);
  const W = (code, msg) => add("warn", code, msg);
  let sb;
  try {
    sb = loadStoryboard(projectRoot, locale);
  } catch (error) {
    E("locale", String(error.message || error));
    return findings;
  }
  const paths = localePaths(projectRoot, sb);
  for (const warning of sb.resolutionWarnings) W("locale-fallback", warning);
  for (const [label, file] of Object.entries({
    entry: paths.entry,
    pronunciation: paths.pronunciation,
    "measured audio": paths.durations,
    timeline: paths.timeline,
    captions: paths.captions,
    "word captions": paths.wordCaptions,
  })) {
    if (!exists(file)) E("missing-variant-file", `${label} missing (${rel(projectRoot, file)})`);
  }
  if (exists(paths.pronunciation)) {
    const schema = path.join(repoRootOrDie(projectRoot), "shared", "schemas", "pronunciation-map.schema.json");
    for (const error of validateSchema(readJson(schema), readJson(paths.pronunciation))) E("schema", `${paths.relative.pronunciation} ${error}`);
  }
  for (const slide of sb.slides) {
    for (const ext of ["display.txt", "tts.txt", "mp3", "words.json", "provider.json"]) {
      const file = path.join(paths.audioDir, `${slide.id}.${ext}`);
      if (!exists(file)) E("missing-variant-audio", `${rel(projectRoot, file)} missing`);
    }
    const provider = path.join(paths.audioDir, `${slide.id}.provider.json`);
    const mp3 = path.join(paths.audioDir, `${slide.id}.mp3`);
    const words = path.join(paths.audioDir, `${slide.id}.words.json`);
    if (exists(provider)) {
      const receipt = readJson(provider);
      if (receipt.provider !== "edge-tts" || receipt.locale !== locale || receipt.slide !== slide.id) E("audio-provenance", `${rel(projectRoot, provider)} identity does not match the deliverable`);
      if (exists(mp3) && receipt.sha256?.audio !== fileSha256(mp3)) E("audio-provenance", `${slide.id}: MP3 hash does not match its provider receipt`);
      if (exists(words) && receipt.sha256?.words !== fileSha256(words)) E("audio-provenance", `${slide.id}: word-boundary hash does not match its provider receipt`);
    }
  }
  if (!exists(paths.timeline)) return findings;
  let timeline;
  try {
    timeline = readJson(paths.timeline).slides || [];
  } catch (error) {
    E("invalid-json", `${paths.relative.timeline}: ${error.message}`);
    return findings;
  }
  if (timeline.length !== sb.slides.length) E("variant-timing", `${paths.relative.timeline} has ${timeline.length} slide(s), expected ${sb.slides.length}`);
  const total = timeline.length ? round1(timeline[timeline.length - 1].start + timeline[timeline.length - 1].duration) : 0;
  let cursor = 0;
  for (const [i, slide] of sb.slides.entries()) {
    const t = timeline[i];
    if (!t || t.id !== slide.id) {
      E("variant-timing", `timeline row ${i + 1} does not match ${slide.id}`);
      continue;
    }
    if (Math.abs(t.start - cursor) > 0.05) E("variant-timing", `${slide.id} starts at ${t.start}s, expected ${cursor}s`);
    cursor = round1(t.start + t.duration);
    const mp3 = path.join(paths.audioDir, `${slide.id}.mp3`);
    if (exists(mp3)) {
      try {
        const measured = ffprobeDuration(mp3);
        if (measured > t.duration + CUT_TOLERANCE) E("cut-risk", `${slide.id}: mp3 ${fmt(measured)}s > slide ${fmt(t.duration)}s`);
        if (t.mp3Duration != null && Math.abs(measured - t.mp3Duration) > 0.05) E("variant-timing", `${slide.id}: timeline MP3 ${fmt(t.mp3Duration)}s != ffprobe ${fmt(measured)}s`);
      } catch (error) {
        W("ffprobe", error.message.split("\n")[0]);
      }
    }
  }
  if (exists(paths.entry)) {
    const html = readText(paths.entry);
    if (!new RegExp(`data-composition-id="[^"]*-${locale}"`).test(html)) E("composition", `${paths.relative.entry} does not carry a locale-specific composition id`);
    const current = regionOf(html, HF_SLIDES_START, HF_SLIDES_END);
    const expected = renderSlidesRegion(sb.slides.map((s) => ({ id: s.id, start: 0, duration: 0 })), sb.slides);
    if (current === null || normalizeRegion(current) !== normalizeRegion(regionOf(expected, HF_SLIDES_START, HF_SLIDES_END) || "")) {
      E("stale-html", `${paths.relative.entry} does not match the ${locale} storyboard resolution`);
    }
    const timing = parseTimingFromHtml(html, sb.slides.map((s) => s.id));
    if (!timing.root || Math.abs((timing.root.duration ?? -1) - total) > 0.05) E("variant-timing", `${paths.relative.entry} root duration does not match ${total}s`);
    for (const t of timeline) {
      const found = timing.slides[t.id];
      if (!found?.section || Math.abs(found.section.start - t.start) > 0.05 || Math.abs(found.section.duration - t.duration) > 0.05) E("variant-timing", `${t.id}: entry timing differs from ${paths.relative.timeline}`);
      if (!found?.audio || !found.audio.tag.includes(`src="${paths.relative.audioDir}/${t.id}.mp3"`)) E("variant-audio", `${t.id}: entry does not use ${paths.relative.audioDir}/${t.id}.mp3`);
    }
  }
  if (exists(paths.captions)) {
    const actual = readText(paths.captions);
    if (countSrtCues(actual) !== sb.slides.length) E("captions", `${paths.relative.captions} must have one cue per slide`);
    const textById = Object.fromEntries(sb.slides.map((slide) => {
      const display = path.join(paths.audioDir, `${slide.id}.display.txt`);
      return [slide.id, exists(display) ? readText(display) : slide.narration || slide.subtitle || ""];
    }));
    const expected = buildSrt(timeline.map((row) => ({ ...row, mp3: row.mp3Duration ?? row.mp3 })), textById);
    if (actual !== expected) E("captions", `${paths.relative.captions} does not match display copy and ${paths.relative.timeline}`);
  }
  if (exists(paths.wordCaptions)) {
    const cues = parseSrtCues(readText(paths.wordCaptions));
    if (cues.length < sb.slides.length) E("captions", `${paths.relative.wordCaptions} has only ${cues.length} cue(s)`);
    for (let i = 0; i < cues.length; i++) {
      if (cues[i].start < -0.001 || cues[i].end > total + 0.05) E("captions", `${paths.relative.wordCaptions} cue ${i + 1} falls outside 0-${total}s`);
      if (i && cues[i].start < cues[i - 1].end - 0.001) E("captions", `${paths.relative.wordCaptions} cue ${i + 1} overlaps its predecessor`);
    }
  }
  const project = readJson(path.join(projectRoot, "project.json"));
  const deliverable = project.deliverables && project.deliverables[locale];
  if (!deliverable) E("deliverable", `project.json.deliverables.${locale} missing`);
  else {
    const expected = {
      entry: paths.relative.entry,
      measuredAudio: paths.relative.durations,
      timeline: paths.relative.timeline,
      renderOutput: paths.relative.renderOutput,
    };
    for (const [key, value] of Object.entries(expected)) if (deliverable[key] !== value) E("deliverable", `${key} is ${JSON.stringify(deliverable[key])}; expected ${JSON.stringify(value)}`);
    if (Math.abs(Number(deliverable.durationSeconds) - total) > 0.05) E("deliverable", `durationSeconds does not match ${total}s`);
    if (!deliverable.review || !["pending", "passed", "failed"].includes(deliverable.review.status)) E("deliverable", `review status must be pending|passed|failed`);
  }
  return findings;
}

// Audit contract for an audio-research (bakeoff) project: every sample must exist for
// every provider, carry its provider record, and be represented in measurements.json.
function auditBakeoff(projectRoot, repo, findings, { E, W, I, P }) {
  for (const f of ["project.json", "README.md", "docs/retrospective.md", "docs/references.md"]) if (!exists(P(f))) W("missing-file", `${f} missing`);
  let cfg;
  try {
    cfg = readJson(P("data/bakeoff.json"));
  } catch (e) {
    E("invalid-json", `data/bakeoff.json: ${e.message}`);
    return findings;
  }
  if (/replace[- ]with/i.test(JSON.stringify(cfg.title || ""))) E("placeholder", "data/bakeoff.json title is still the template placeholder");
  const providers = cfg.providers || [];
  const samples = cfg.samples || [];
  if (!providers.length) E("bakeoff", "no providers declared");
  if (!samples.length) E("bakeoff", "no samples declared");
  const ids = samples.map((s) => s.id);
  if (new Set(ids).size !== ids.length) E("bakeoff", "duplicate sample ids");
  const measured = exists(P("data/measurements.json")) ? readJson(P("data/measurements.json")).results || [] : [];
  const seen = new Set(measured.map((r) => `${r.sample}|${r.provider}`));
  for (const s of samples) {
    if (!(s.text || "").trim()) E("bakeoff", `${s.id}: empty text`);
    for (const pr of providers) {
      const base = `assets/audio/${s.id}.${pr.id}`;
      const audio = [".mp3", ".wav"].map((e) => `${base}${e}`).find((f) => exists(P(f)));
      if (!audio) W("bakeoff", `${s.id} · ${pr.id}: no audio yet (run hf bakeoff)`);
      else if (!exists(P(`${base}.provider.json`))) W("bakeoff", `${s.id} · ${pr.id}: missing provider record`);
      if (audio && !seen.has(`${s.id}|${pr.id}`)) W("bakeoff", `${s.id} · ${pr.id}: audio exists but is not in data/measurements.json (re-run hf bakeoff)`);
    }
  }
  // an evaluation whose scorecard is still empty must not be published as if it had a result
  const card = P("docs/listening-scorecard.md");
  if (exists(card)) {
    const text = readText(card);
    const undecided = /待人工聽測|pending human/i.test(text);
    if (undecided) I("bakeoff", "listening scorecard is still open — no naturalness conclusion may be published yet");
  }
  return findings;
}

function listProjects(repo) {
  const out = [];
  for (const wf of WORKFLOWS) {
    const dir = path.join(repo, wf, "projects");
    if (!exists(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      if (exists(path.join(p, "project.json"))) out.push({ workflow: wf, name, path: p });
    }
  }
  return out;
}
function printFindings(label, findings) {
  const errors = findings.filter((f) => f.level === "error").length;
  const warns = findings.filter((f) => f.level === "warn").length;
  log(`\n${label}: ${errors} error(s), ${warns} warning(s)`);
  for (const f of findings) log(`  ${f.level === "error" ? "✖" : f.level === "warn" ? "▲" : "·"} [${f.code}] ${f.msg}`);
  return errors;
}
function cmdAudit() {
  if (FLAGS.all) {
    const repo = repoRootOrDie(process.cwd());
    const projects = listProjects(repo);
    const report = [];
    let errors = 0;
    for (const p of projects) {
      const findings = auditProject(p.path, repo);
      errors += printFindings(`${p.workflow}/projects/${p.name}`, findings);
      report.push({ project: `${p.workflow}/projects/${p.name}`, findings });
    }
    if (JSON_OUT) console.log(JSON.stringify({ ok: errors === 0, projects: report }, null, 2));
    else log(`\naudit --all: ${projects.length} project(s), ${errors} error(s)`);
    process.exit(errors ? 1 : 0);
  }
  const projectRoot = findProjectRoot();
  const repo = repoRootOrDie(projectRoot);
  const findings = auditProject(projectRoot, repo);
  const errors = printFindings(rel(repo, projectRoot), findings);
  if (JSON_OUT) console.log(JSON.stringify({ ok: errors === 0, findings }, null, 2));
  process.exit(errors ? 1 : 0);
}

// ---------------------------------------------------------------------------
// COMMAND: repo-check (publication guard)
// ---------------------------------------------------------------------------
function cmdRepoCheck() {
  const repo = repoRootOrDie(process.cwd());
  const ls = run("git", ["-C", repo, "ls-files", "-z"]);
  if (!ls.ok) die("git ls-files failed — is this a git checkout?");
  const files = ls.stdout.split("\0").filter(Boolean);
  const problems = [];
  // allowlist from .gitignore
  const gi = exists(path.join(repo, ".gitignore")) ? readText(path.join(repo, ".gitignore")) : "";
  const allow = new Set();
  for (const line of gi.split(/\r?\n/)) {
    const m = /^!([a-z-]+)\/projects\/([^/*]+)\/\*\*$/.exec(line.trim());
    if (m) allow.add(`${m[1]}/projects/${m[2]}`);
  }
  const secretRe = /(^|\/)(\.env(\..*)?|auth\.json|.*token.*|.*secret.*|credentials\.json)$/i;
  const maxBytes = 95 * 1024 * 1024;
  const unchecked = [];
  for (const f of files) {
    const m = /^([a-z-]+)\/projects\/([^/]+)\//.exec(f);
    if (m && !allow.has(`${m[1]}/projects/${m[2]}`)) problems.push(`tracked but not allowlisted in .gitignore: ${m[1]}/projects/${m[2]} (${f})`);
    if (secretRe.test(f) && !/\.example$/.test(f) && !/\/docs\//.test(f) && !/\.md$/.test(f)) problems.push(`secret-looking path tracked: ${f}`);
    if (/(^|\/)\.pi\//.test(f)) problems.push(`Pi cache tracked: ${f}`);
    try {
      const size = fs.statSync(path.join(repo, f)).size;
      if (size > maxBytes) problems.push(`file over 95 MB (GitHub limit 100 MB): ${f} (${(size / 1048576).toFixed(1)} MB)`);
    } catch {
      // tracked but not in the working tree — a sparse checkout. Silently counting it as
      // 0 bytes would let the size guard "pass" on a file it never looked at.
      unchecked.push(f);
    }
  }
  // every tracked project must have project.json + README + retrospective
  const tracked = new Set(files.filter((f) => /^[a-z-]+\/projects\/[^/]+\//.test(f)).map((f) => f.split("/").slice(0, 3).join("/")));
  for (const p of tracked) {
    for (const req of ["project.json", "README.md", "docs/retrospective.md"]) if (!files.includes(`${p}/${req}`)) problems.push(`${p}: missing ${req} (publication policy)`);
  }
  for (const f of files.filter((name) => /(^|\/)package\.json$/.test(name))) {
    const packagePath = path.join(repo, f);
    if (!exists(packagePath)) continue;
    let pkg;
    try {
      pkg = readJson(packagePath);
    } catch {
      continue;
    }
    for (const [name, script] of Object.entries(pkg.scripts || {})) {
      if (/\bnpx(?:\.cmd)?\b[^\r\n]*\bhyperframes@/i.test(String(script))) {
        problems.push(`${f}: script "${name}" bypasses hf's hidden-window HyperFrames proxy`);
      }
    }
    const usesProxy = Object.values(pkg.scripts || {}).some((script) => /hf\.mjs\s+(?:check|lint|snapshot|doctor|preview|render|publish)(?:\s|$)/.test(String(script)));
    if (usesProxy && !/^[0-9][\w.-]*$/.test(String(pkg.hyperframesVersion || ""))) {
      problems.push(`${f}: hidden-window HyperFrames proxy has no explicit hyperframesVersion pin`);
    }
  }
  const mp4s = files.filter((f) => /\.mp4$/i.test(f));
  const mp4Local = mp4s.filter((f) => fs.existsSync(path.join(repo, f)));
  const mp4Bytes = mp4Local.reduce((a, f) => a + fs.statSync(path.join(repo, f)).size, 0);
  const mp4Note = mp4Local.length === mp4s.length ? `${(mp4Bytes / 1048576).toFixed(1)} MB` : `${mp4Local.length}/${mp4s.length} present locally, ${(mp4Bytes / 1048576).toFixed(1)} MB measured`;
  log(`repo-check: ${files.length} tracked files, ${tracked.size} tracked project(s), ${allow.size} allowlisted, ${mp4s.length} mp4 (${mp4Note})`);
  if (unchecked.length) log(`  note: ${unchecked.length} tracked file(s) are not in this working tree (sparse checkout) — the >95 MB guard could not inspect them`);
  if (mp4s.length) log(`  note: future renders belong in GitHub Releases, not git history (see repo-publication-policy.md)`);
  for (const p of problems) log(`  ✖ ${p}`);
  if (JSON_OUT) console.log(JSON.stringify({ ok: problems.length === 0, problems, trackedProjects: [...tracked], allowlisted: [...allow], notInWorkingTree: unchecked }, null, 2));
  process.exit(problems.length ? 1 : 0);
}

// ---------------------------------------------------------------------------
// COMMAND: fit-audio  (legacy demos: keep slide windows, tighten audio slots to MP3 length)
// ---------------------------------------------------------------------------
function cmdFitAudio(projectRoot = findProjectRoot()) {
  const sb = loadStoryboard(projectRoot);
  const htmlPath = path.join(projectRoot, "index.html");
  if (!exists(htmlPath)) die("index.html missing");
  let html = readText(htmlPath);
  const timing = parseTimingFromHtml(html, sb.slides.map((s) => s.id));
  let changed = 0;
  let lastEnd = 0;
  for (const s of sb.slides) {
    const t = timing.slides[s.id];
    if (!t.section) continue;
    lastEnd = Math.max(lastEnd, round1(t.section.start + t.section.duration));
    const mp3 = path.join(projectRoot, "assets", "audio", `${s.id}.mp3`);
    if (!t.audio || !exists(mp3)) continue;
    const d = round2(ffprobeDuration(mp3));
    const slot = Math.min(d, t.section.duration);
    if (Math.abs(t.audio.duration - slot) > 0.005 || Math.abs(t.audio.start - t.section.start) > 0.005) {
      html = patchTagById(html, `audio-${s.id}`, { "data-start": t.section.start, "data-duration": slot }).html;
      changed++;
      log(`  audio-${s.id}: slot ${t.audio.duration} -> ${slot}`);
    }
  }
  const r = patchRootDuration(html, lastEnd);
  if (r.found) html = r.html;
  if (FLAGS["dry-run"]) return log(`fit-audio (dry-run): ${changed} clip(s) would change; root data-duration=${lastEnd}`);
  writeText(htmlPath, html);
  const pjPath = path.join(projectRoot, "project.json");
  if (exists(pjPath)) {
    const pj = readJson(pjPath);
    if (pj.durationSeconds !== lastEnd) {
      pj.durationSeconds = lastEnd;
      pj.updatedAt = nowIso();
      writeJson(pjPath, pj);
    }
  }
  log(`fit-audio: ${changed} clip(s) updated, root data-duration=${lastEnd}`);
}

// ---------------------------------------------------------------------------
// COMMAND: vendor  (no CDN at render time — determinism + slow-network safety)
// ---------------------------------------------------------------------------
function vendorGsap(projectRoot, repo) {
  const src = path.join(repo, "shared", "vendor", "gsap.min.js");
  if (!exists(src)) return { ok: false, reason: "shared/vendor/gsap.min.js missing" };
  const dstDir = path.join(projectRoot, "vendor");
  fs.mkdirSync(dstDir, { recursive: true });
  fs.copyFileSync(src, path.join(dstDir, "gsap.min.js"));
  // index.html plus any installed registry block: upstream blocks ship with a CDN <script>
  // for GSAP, which is precisely what blows the 10 s navigation timeout inside `check`.
  const targets = [path.join(projectRoot, "index.html")];
  const compDir = path.join(projectRoot, "compositions");
  if (exists(compDir)) for (const f of fs.readdirSync(compDir)) if (f.endsWith(".html")) targets.push(path.join(compDir, f));
  let rewrote = 0;
  for (const t of targets) {
    if (!exists(t)) continue;
    const html = readText(t);
    const depth = path.relative(path.dirname(t), path.join(projectRoot, "vendor")).split(path.sep).join("/");
    const next = html.replace(/<script\s+src="https?:\/\/[^"]*\/gsap(?:\.min)?\.js"><\/script>/g, `<script src="${depth}/gsap.min.js"></script>`);
    if (next !== html) {
      writeText(t, next);
      rewrote++;
    }
  }
  return { ok: true, rewrote };
}
function cmdVendor(projectRoot = findProjectRoot()) {
  const repo = repoRootOrDie(projectRoot);
  const r = vendorGsap(projectRoot, repo);
  if (!r.ok) die(r.reason);
  log(`vendor: vendor/gsap.min.js in place${r.rewrote ? `; ${r.rewrote} file(s) now load it instead of the CDN` : ""}`);
}

// --- the review kit page (self-contained; no external requests, no build step) ---
const REVIEW_CSS = `
@font-face { font-family: "Noto Sans TC"; src: local("Noto Sans TC"), local("NotoSansTC-Regular"); }
@font-face { font-family: "PingFang TC"; src: local("PingFang TC"); }
@font-face { font-family: "Microsoft JhengHei"; src: local("Microsoft JhengHei"), local("微軟正黑體"); }
@font-face { font-family: "SFMono-Regular"; src: local("SFMono-Regular"); }
:root {
  --bg: #0a0d10; --panel: #121820; --panel-2: #171f28; --line: #26313c;
  --ink: #eef3ef; --ink-dim: #a9b6b2; --accent: #94f0e7; --warm: #ffe6a3;
  --ok: #7fe0a8; --warn: #ffcf85; --bad: #ff9a8b;
  --radius: 12px;
  color-scheme: dark;
}
/* Deliberately single-theme: this page frames stills from a dark 1080p composition,
   so a light ground would fight the content. Every colour is painted explicitly from
   the tokens above, and the font stack matches the video's own (no web font, no CDN —
   the kit has to open offline, on a plane, from a file:// URL). */
* { box-sizing: border-box; margin: 0; padding: 0; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 6px; }
body {
  background: var(--bg); color: var(--ink); line-height: 1.5;
  font-family: "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", -apple-system, system-ui, sans-serif;
  -webkit-text-size-adjust: 100%;
}
.wrap { max-width: 1180px; margin: 0 auto; padding: 0 20px 80px; }
header.top {
  position: sticky; top: 0; z-index: 20; background: rgba(10,13,16,.94);
  border-bottom: 1px solid var(--line); backdrop-filter: blur(8px);
}
.top-in { max-width: 1180px; margin: 0 auto; padding: 14px 20px; display: flex; gap: 10px 14px; align-items: center; flex-wrap: wrap; }
.top h1 { font-size: 19px; font-weight: 800; letter-spacing: .01em; }
.chips { display: flex; gap: 8px; flex-wrap: wrap; }
.chip {
  font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 999px;
  border: 1px solid var(--line); color: var(--ink-dim); white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.chip.accent { color: var(--accent); border-color: rgba(148,240,231,.35); }
#tally { font-variant-numeric: tabular-nums; }
.chip.ok { color: var(--ok); border-color: rgba(127,224,168,.4); }
.chip.warn { color: var(--warn); border-color: rgba(255,207,133,.4); }
.chip.bad { color: var(--bad); border-color: rgba(255,154,139,.45); }
.spacer { flex: 1 1 auto; }
button {
  font: inherit; font-weight: 700; font-size: 13px; cursor: pointer;
  background: var(--panel-2); color: var(--ink); border: 1px solid var(--line);
  border-radius: 999px; padding: 8px 16px;
}
button:hover { border-color: var(--accent); color: var(--accent); }
button.primary { background: var(--accent); color: #06231f; border-color: var(--accent); }
button.primary:hover { filter: brightness(1.08); color: #06231f; }
.lede { padding: 26px 0 6px; color: var(--ink-dim); font-size: 14px; max-width: 74ch; }
.lede b { color: var(--ink); }
.card {
  margin-top: 22px; background: var(--panel); border: 1px solid var(--line);
  border-radius: var(--radius); overflow: hidden;
  display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
}
.card.done { border-color: rgba(127,224,168,.45); }
.shot { background: #05070a; display: grid; place-items: center; }
.shot img { display: block; width: 100%; height: auto; }
.shot .noimg { aspect-ratio: 16/9; display: grid; place-items: center; color: var(--ink-dim); font-size: 13px; }
.body { padding: 20px 22px 22px; display: flex; flex-direction: column; gap: 12px; }
.eyebrow { display: flex; gap: 8px; align-items: center; font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: var(--accent); }
.eyebrow .num { color: var(--ink-dim); font-variant-numeric: tabular-nums; letter-spacing: 0; }
h2 { font-size: 22px; font-weight: 800; line-height: 1.25; }
.sub { color: var(--ink-dim); font-size: 14px; }
.narr {
  background: var(--panel-2); border-left: 3px solid var(--accent); border-radius: 0 8px 8px 0;
  padding: 12px 14px; font-size: 15px; color: var(--ink);
}
audio { width: 100%; height: 34px; }
.gates { display: flex; gap: 8px; flex-wrap: wrap; }
.gate {
  display: inline-flex; align-items: center; gap: 7px; cursor: pointer; user-select: none;
  font-size: 13px; font-weight: 700; padding: 7px 13px; border-radius: 999px;
  border: 1px solid var(--line); color: var(--ink-dim); background: var(--panel-2);
}
.gate input { position: absolute; opacity: 0; width: 0; height: 0; }
.gate .box { width: 15px; height: 15px; border-radius: 4px; border: 1.5px solid var(--ink-dim); display: grid; place-items: center; font-size: 10px; color: transparent; }
.gate.on { color: var(--ok); border-color: rgba(127,224,168,.5); }
.gate.on .box { background: var(--ok); border-color: var(--ok); color: #05291a; }
.note {
  width: 100%; font: inherit; font-size: 13px; color: var(--ink); background: var(--panel-2);
  border: 1px solid var(--line); border-radius: 8px; padding: 9px 11px; resize: vertical; min-height: 38px;
}
.note:focus { outline: none; border-color: var(--accent); }
footer { margin-top: 34px; color: var(--ink-dim); font-size: 12.5px; border-top: 1px solid var(--line); padding-top: 16px; }
code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: .93em; color: var(--warm); }
/* cinema */
#cinema { position: fixed; inset: 0; z-index: 50; background: #000; display: none; }
#cinema.on { display: grid; grid-template-rows: 1fr auto; }
#cinema .stage { position: relative; display: grid; place-items: center; overflow: hidden; }
#cinema .stage img { max-width: 100%; max-height: 100%; display: block; }
#cinema .cap {
  position: absolute; left: 4%; right: 4%; bottom: 5%; padding: 14px 20px; border-radius: 10px;
  background: rgba(5,10,13,.8); border: 1px solid rgba(255,255,255,.14); font-size: clamp(14px, 1.7vw, 22px);
  font-weight: 600; text-align: left;
}
#cinema .hud { position: absolute; top: 3%; right: 4%; font-variant-numeric: tabular-nums; color: rgba(255,255,255,.75); font-weight: 700; }
#cinema .bar { height: 3px; background: #1b2229; }
#cinema .bar > i { display: block; height: 100%; width: 0; background: var(--accent); }
#cinema .ctl { display: flex; gap: 10px; align-items: center; padding: 12px 18px; background: #0a0d10; border-top: 1px solid var(--line); flex-wrap: wrap; }
@media (max-width: 900px) { .card { grid-template-columns: 1fr; } .top h1 { font-size: 16px; } }
`;

function reviewHtml(meta, slides, opts = {}) {
  const english = String(meta.locale || "").toLowerCase().startsWith("en");
  const copy = english
    ? {
        narration: "Narration", passed: "passed", playAll: "▶ Play full cut", copy: "Copy review summary",
        lede: `This is the <b>${esc(meta.project)}</b> human review kit: one real frame, narration clip, caption, and timing margin per slide. Check <b>pronunciation</b>, <b>pacing</b>, and <b>readability</b>. When every slide passes, copy the summary into the work session or <code>docs/retrospective.md</code>. Verdicts stay only in this browser.`,
        footer: `Generated by <code>hf review</code> at ${esc(meta.generatedAt)} · deliverable status <code>${esc(meta.status)}</code> · A passed locale may proceed to render; keep the MP4 in GitHub Releases, not Git.`,
        prev: "◀ Previous", pause: "Pause", next: "Next ▶", exit: "Exit (Esc)", gates: [["p", "Pronunciation"], ["r", "Pacing"], ["l", "Readability"]],
        noAudio: "No audio", margin: "Margin", noFrame: "No frame (snapshot failed during hf review)", subtitle: "Caption: ", noNarration: "(No narration script)",
        start: "Start", page: "Slide", note: "What should change? (included in the review summary)",
        summaryTitle: "## Human preview review — ", project: "- Project: ", generated: "- Generated: ", length: " · length ", conclusion: "- Verdict: ",
        passConclusion: "**passed** — render/publication may proceed", failConclusion: "**not passed** — fixes remain below", missing: " — missing: ",
        copied: "Copied ✓", prompt: "Copy this text:", play: "Play",
      }
    : {
        narration: "旁白", passed: "已通過", playAll: "▶ 連續播放", copy: "複製審核結論",
        lede: `這是 <b>${esc(meta.project)}</b> 的人工審核包：每頁一張實際畫格、真實旁白音檔、字幕與時間餘裕。請確認三件事 —— <b>發音</b>（中英混讀是否自然）、<b>節奏</b>（旁白與頁面長度是否舒服）、<b>可讀性</b>（字幕與畫面文字是否看得清）。全部通過後按「複製審核結論」，把結果貼回工作階段或 <code>docs/retrospective.md</code>。勾選只存在你這台裝置的瀏覽器裡。`,
        footer: `由 <code>hf review</code> 產生於 ${esc(meta.generatedAt)} · 專案狀態 <code>${esc(meta.status)}</code> · 通過後才可 render，成片放到 GitHub Releases（不要進 git）。`,
        prev: "◀ 上一頁", pause: "暫停", next: "下一頁 ▶", exit: "結束（Esc）", gates: [["p", "發音"], ["r", "節奏"], ["l", "可讀性"]],
        noAudio: "無音檔", margin: "餘裕", noFrame: "沒有畫格（跑 hf review 時 snapshot 失敗）", subtitle: "字幕：", noNarration: "（無旁白稿）",
        start: "起", page: "頁面", note: "需要修的地方（會出現在審核結論裡）",
        summaryTitle: "## 人工 preview 審核 — ", project: "- 專案：", generated: "- 產生：", length: " · 長度 ", conclusion: "- 結論：",
        passConclusion: "**通過**，可以 render / 發布", failConclusion: "**未通過**，見下方待修項", missing: " — 未通過：",
        copied: "已複製 ✓", prompt: "複製這段：", play: "播放",
      };
  const data = JSON.stringify({ meta, slides, copy }).replace(/</g, "\\u003c");
  const head = `<title>${esc(meta.title)}</title>\n<style>${REVIEW_CSS}</style>`;
  const compositionId = `${meta.id}${meta.locale && meta.locale !== "zh-Hant" ? `-${meta.locale}` : ""}-review`;
  const body = `<div id="review-root" data-composition-id="${esc(compositionId)}" data-start="0" data-duration="${Number(meta.total) || 0}" data-width="1920" data-height="1080" data-no-timeline>
<header class="top">
  <div class="top-in">
    <h1>${esc(meta.title)}</h1>
    <div class="chips">
      <span class="chip accent">${esc(meta.workflow)}</span>
      <span class="chip">${meta.total}s</span>
      <span class="chip">${copy.narration} ${meta.narration}s</span>
      ${meta.voice ? `<span class="chip">${esc(meta.voice)}</span>` : ""}
      <span class="chip" id="tally">0 / ${slides.length} ${copy.passed}</span>
    </div>
    <span class="spacer"></span>
    <button id="play">${copy.playAll}</button>
    <button id="copy" class="primary">${copy.copy}</button>
  </div>
</header>

<div class="wrap">
  <p class="lede">${copy.lede}</p>
  <div id="list"></div>
  <footer>${copy.footer}</footer>
</div>

<div id="cinema">
  <div class="stage"><img id="c-img" alt=""><div class="hud" id="c-hud"></div><div class="cap" id="c-cap"></div></div>
  <div>
    <div class="bar"><i id="c-bar"></i></div>
    <div class="ctl">
      <button id="c-prev">${copy.prev}</button>
      <button id="c-toggle" class="primary">${copy.pause}</button>
      <button id="c-next">${copy.next}</button>
      <span class="chip" id="c-meta"></span>
      <span class="spacer"></span>
      <button id="c-exit">${copy.exit}</button>
    </div>
  </div>
</div>

<script>
var D = ${data};
var KEY = "hf-review:" + D.meta.id + ":" + (D.meta.locale || "zh-Hant");
var state = {};
try { state = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { state = {}; }
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
function st(id) { if (!state[id]) state[id] = { p: false, r: false, l: false, note: "" }; return state[id]; }
function passed(id) { var s = st(id); return s.p && s.r && s.l; }
function fmt(n) { return (Math.round(n * 100) / 100).toFixed(2); }
var GATES = D.copy.gates;

function marginChip(s) {
  if (s.mp3 == null) return '<span class="chip warn">' + D.copy.noAudio + '</span>';
  var m = s.duration - s.mp3;
  var cls = m < 0 ? "bad" : m < 0.3 ? "warn" : "ok";
  return '<span class="chip ' + cls + '">' + D.copy.margin + ' ' + fmt(m) + 's</span>';
}
function render() {
  var list = document.getElementById("list");
  list.innerHTML = "";
  D.slides.forEach(function (s) {
    var el = document.createElement("article");
    el.className = "card" + (passed(s.id) ? " done" : "");
    el.id = "card-" + s.id;
    var shot = s.img ? '<img src="' + s.img + '" alt="">' : '<div class="noimg">' + D.copy.noFrame + '</div>';
    var gates = GATES.map(function (g) {
      var on = st(s.id)[g[0]];
      return '<label class="gate' + (on ? " on" : "") + '" data-slide="' + s.id + '" data-gate="' + g[0] + '">' +
        '<input type="checkbox"' + (on ? " checked" : "") + '><span class="box">✓</span>' + g[1] + "</label>";
    }).join("");
    el.innerHTML =
      '<div class="shot">' + shot + "</div>" +
      '<div class="body">' +
        '<div class="eyebrow">' + (s.chapter ? "<span>" + s.chapter + "</span>" : "") +
          '<span class="num">' + String(s.n).padStart(2, "0") + " / " + String(D.slides.length).padStart(2, "0") + "</span></div>" +
        "<h2>" + s.title + "</h2>" +
        (s.subtitle ? '<div class="sub">' + D.copy.subtitle + s.subtitle + "</div>" : "") +
        '<div class="narr">' + (s.narration || D.copy.noNarration) + "</div>" +
        (s.audio ? '<audio controls preload="none" src="' + s.audio + '"></audio>' : "") +
        '<div class="chips"><span class="chip">' + D.copy.start + ' ' + fmt(s.start) + "s</span>" +
          '<span class="chip">' + D.copy.page + ' ' + fmt(s.duration) + "s</span>" +
          '<span class="chip">' + D.copy.narration + ' ' + (s.mp3 == null ? "—" : fmt(s.mp3) + "s") + "</span>" + marginChip(s) + "</div>" +
        '<div class="gates">' + gates + "</div>" +
        '<textarea class="note" data-slide="' + s.id + '" placeholder="' + D.copy.note + '">' + (st(s.id).note || "") + "</textarea>" +
      "</div>";
    list.appendChild(el);
  });
  tally();
}
function tally() {
  var n = D.slides.filter(function (s) { return passed(s.id); }).length;
  var t = document.getElementById("tally");
  t.textContent = n + " / " + D.slides.length + " " + D.copy.passed;
  t.className = "chip " + (n === D.slides.length ? "ok" : n ? "warn" : "");
}
document.addEventListener("click", function (e) {
  var g = e.target.closest ? e.target.closest(".gate") : null;
  if (!g) return;
  e.preventDefault();
  var s = st(g.dataset.slide);
  s[g.dataset.gate] = !s[g.dataset.gate];
  save();
  g.classList.toggle("on", s[g.dataset.gate]);
  g.querySelector("input").checked = s[g.dataset.gate];
  var card = document.getElementById("card-" + g.dataset.slide);
  if (card) card.classList.toggle("done", passed(g.dataset.slide));
  tally();
});
document.addEventListener("input", function (e) {
  if (!e.target.classList || !e.target.classList.contains("note")) return;
  st(e.target.dataset.slide).note = e.target.value;
  save();
});

document.getElementById("copy").addEventListener("click", function () {
  var all = D.slides.every(function (s) { return passed(s.id); });
  var lines = [D.copy.summaryTitle + D.meta.title, "", D.copy.project + "\`" + D.meta.project + "\`",
    D.copy.generated + D.meta.generatedAt + D.copy.length + D.meta.total + "s (" + D.copy.narration + " " + D.meta.narration + "s)",
    D.copy.conclusion + (all ? D.copy.passConclusion : D.copy.failConclusion), ""];
  D.slides.forEach(function (s) {
    var v = st(s.id);
    var miss = GATES.filter(function (g) { return !v[g[0]]; }).map(function (g) { return g[1]; });
    lines.push("- [" + (miss.length ? " " : "x") + "] " + s.id + " " + s.title +
      (miss.length ? D.copy.missing + miss.join(", ") : "") + (v.note ? " — " + v.note : ""));
  });
  var text = lines.join("\\n");
  var done = function () { var b = document.getElementById("copy"); b.textContent = D.copy.copied; setTimeout(function () { b.textContent = D.copy.copy; }, 1800); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { window.prompt(D.copy.prompt, text); });
  else window.prompt(D.copy.prompt, text);
});

/* cinema — plays the real narration in order, so pacing can be judged without a render */
var cin = document.getElementById("cinema"), ci = 0, timer = null, playing = false;
var au = new Audio();
function show(i) {
  ci = Math.max(0, Math.min(D.slides.length - 1, i));
  var s = D.slides[ci];
  document.getElementById("c-img").src = s.img || "";
  document.getElementById("c-cap").textContent = s.subtitle || s.narration || "";
  document.getElementById("c-hud").textContent = String(s.n).padStart(2, "0") + " / " + String(D.slides.length).padStart(2, "0");
  document.getElementById("c-meta").textContent = s.title;
  document.getElementById("c-bar").style.width = ((ci + 1) / D.slides.length * 100) + "%";
  clearTimeout(timer);
  au.pause();
  if (!playing) return;
  if (s.audio) {
    au.src = s.audio;
    au.currentTime = 0;
    au.play().catch(function () {});
    au.onended = function () { timer = setTimeout(next, Math.max(0, (s.duration - (s.mp3 || 0)) * 1000)); };
  } else timer = setTimeout(next, s.duration * 1000);
}
function next() { if (ci >= D.slides.length - 1) { stop(); return; } show(ci + 1); }
function stop() { playing = false; au.pause(); clearTimeout(timer); document.getElementById("c-toggle").textContent = D.copy.play; }
document.getElementById("play").addEventListener("click", function () { cin.classList.add("on"); playing = true; document.getElementById("c-toggle").textContent = D.copy.pause; show(0); });
document.getElementById("c-exit").addEventListener("click", function () { stop(); cin.classList.remove("on"); });
document.getElementById("c-next").addEventListener("click", function () { show(ci + 1); });
document.getElementById("c-prev").addEventListener("click", function () { show(ci - 1); });
document.getElementById("c-toggle").addEventListener("click", function () {
  playing = !playing;
  document.getElementById("c-toggle").textContent = playing ? D.copy.pause : D.copy.play;
  if (playing) show(ci); else stop();
});
document.addEventListener("keydown", function (e) {
  if (!cin.classList.contains("on")) return;
  if (e.key === "Escape") { stop(); cin.classList.remove("on"); }
  if (e.key === "ArrowRight") show(ci + 1);
  if (e.key === "ArrowLeft") show(ci - 1);
});
render();
</script>
</div>`;
  return `<!DOCTYPE html>\n<html lang="${esc(meta.locale || "zh-Hant")}">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n${head}\n</head>\n<body>\n${body}\n</body>\n</html>\n`;
}

// ---------------------------------------------------------------------------
// COMMAND: review  — build a self-contained review kit for the human preview gate
// ---------------------------------------------------------------------------
// Rule 2 of AGENTS.md says a human must preview pacing, pronunciation and
// readability before render. That gate used to cost a dev server, a browser and
// a timeline scrub. This builds ONE offline HTML file — slide frames + the real
// narration audio inlined — that plays the piece end to end, records a per-slide
// verdict in localStorage, and hands back a paste-ready approval summary. It can
// be opened locally or published (e.g. as an Artifact) so the gate can happen
// from a phone, away from the machine that rendered it.
function hfPin(projectRoot) {
  const pk = path.join(projectRoot, "package.json");
  if (exists(pk)) {
    const pkg = readJson(pk);
    const configured = String(pkg.hyperframesVersion || "");
    if (/^[0-9][\w.-]*$/.test(configured)) return configured;
    const m = /hyperframes@([0-9][\w.-]*)/.exec(JSON.stringify(pkg.scripts || {}));
    if (m) return m[1];
  }
  return "0.8.16";
}
function dataUri(file, mime) {
  return `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
}
// The HyperFrames CLI flushes telemetry on exit by spawning a detached `node -e fetch(...)`
// child without windowsHide, so on Windows every invocation flashes a visible console for
// up to 5 s — a pipeline run flashes dozens. Opt out through the CLI's documented switch
// (an explicit HYPERFRAMES_NO_TELEMETRY in the caller's environment still wins).
function npxEnv(opts = {}) {
  return { HYPERFRAMES_NO_TELEMETRY: "1", ...process.env, ...(opts.env || {}) };
}
// Node >=20 refuses to spawn .cmd/.bat without a shell (EINVAL), so npx needs shell:true on Windows.
function runNpx(args, opts = {}) {
  const win = process.platform === "win32";
  const env = npxEnv(opts);
  // with shell:true Node warns about un-escaped arg arrays, so pass one command string instead
  return win ? run(["npx.cmd", ...args].join(" "), undefined, { ...opts, shell: true, env }) : run("npx", args, { ...opts, env });
}
function forwardedHyperframesArgs() {
  const tail = process.argv.slice(3);
  const forwarded = [];
  for (let i = 0; i < tail.length; i++) {
    if (tail[i] === "--project" || tail[i] === "--locale") {
      i++;
      continue;
    }
    if (tail[i].startsWith("--project=") || tail[i].startsWith("--locale=") || tail[i] === "--all-locales") continue;
    forwarded.push(tail[i]);
  }
  return forwarded;
}
function cmdHyperframes(command) {
  const projectRoot = findProjectRoot();
  const sb = loadStoryboard(projectRoot, FLAGS.locale);
  const paths = localePaths(projectRoot, sb);
  const forwarded = forwardedHyperframesArgs();
  const hasComposition = forwarded.some((arg) => arg === "--composition" || arg.startsWith("--composition="));
  if (command === "render" && !hasComposition) forwarded.push("--composition", paths.relative.entry);
  const isolate = ["lint", "snapshot", "doctor"].includes(command) || (command === "preview" && !sb.isCanonical);
  let cwd = projectRoot;
  let r;
  try {
    if (isolate) cwd = variantWorkspace(projectRoot, sb, paths);
    r = runNpx(
      ["--yes", `hyperframes@${hfPin(projectRoot)}`, command, ...forwarded],
      { cwd, stdio: "inherit" }
    );
  } finally {
    if (isolate) cleanVariantWorkspace(projectRoot, sb);
  }
  if (!r.ok) process.exit(r.status || 1);
}
function variantWorkspace(projectRoot, sb, paths) {
  const root = path.join(projectRoot, ".hf-locale-work", sb.locale);
  fs.rmSync(root, { recursive: true, force: true });
  fs.mkdirSync(root, { recursive: true });
  fs.copyFileSync(paths.entry, path.join(root, "index.html"));
  for (const dir of ["assets", "vendor", "compositions"]) {
    const source = path.join(projectRoot, dir);
    if (exists(source)) fs.cpSync(source, path.join(root, dir), { recursive: true });
  }
  for (const file of ["hyperframes.json", "index.motion.json"]) {
    const source = path.join(projectRoot, file);
    if (exists(source)) fs.copyFileSync(source, path.join(root, file));
  }
  return root;
}
function cleanVariantWorkspace(projectRoot, sb) {
  fs.rmSync(path.join(projectRoot, ".hf-locale-work", sb.locale), { recursive: true, force: true });
}
function takeSnapshots(projectRoot, times) {
  const r = runNpx(["--yes", `hyperframes@${hfPin(projectRoot)}`, "snapshot", "--at", times.map((t) => String(t)).join(",")], { cwd: projectRoot });
  if (!r.ok) warn(`  snapshot failed (kit will be built without frames):\n${(r.stderr || r.stdout || "").split("\n").slice(-4).join("\n")}`);
  return r.ok;
}
function collectFrames(projectRoot) {
  const dir = path.join(projectRoot, "snapshots");
  if (!exists(dir)) return [];
  return fs
    .readdirSync(dir)
    .map((f) => ({ file: path.join(dir, f), t: Number((/at-([0-9.]+)s\.png$/.exec(f) || [])[1]) }))
    .filter((x) => Number.isFinite(x.t))
    .sort((a, b) => a.t - b.t);
}
function cmdReview(projectRoot = findProjectRoot()) {
  const repo = repoRootOrDie(projectRoot);
  const sb = loadStoryboard(projectRoot, FLAGS.locale);
  const paths = localePaths(projectRoot, sb);
  const project = readJson(path.join(projectRoot, "project.json"));
  const timeline = exists(paths.timeline) ? readJson(paths.timeline).slides : provisionalTimeline(projectRoot, sb, paths);
  const byId = Object.fromEntries(sb.slides.map((s) => [s.id, s]));
  let captureRoot = projectRoot;

  // one frame per slide, taken after the entrance animation has settled
  const times = timeline.map((t) => Math.round((t.start + Math.min(2.4, Math.max(0.8, t.duration * 0.3))) * 10) / 10);
  try {
    if (!FLAGS["no-snapshot"]) {
      captureRoot = variantWorkspace(projectRoot, sb, paths);
      log(`review${sb.isCanonical ? "" : ` (${sb.locale})`}: capturing ${times.length} frame(s) at ${times.join(", ")}s …`);
      takeSnapshots(captureRoot, times);
    }
    const frames = collectFrames(captureRoot);
    const tmp = path.join(projectRoot, ".hf-review-tmp");
    fs.mkdirSync(tmp, { recursive: true });

    let bytes = 0;
    const slides = timeline.map((t, i) => {
      const s = byId[t.id] || {};
      const frame = frames.find((f) => f.t >= t.start && f.t < t.start + t.duration) || frames[i];
      let img = null;
      if (frame && exists(frame.file)) {
        const jpg = path.join(tmp, `${sb.locale}-${t.id}.jpg`);
        const r = run("ffmpeg", ["-y", "-loglevel", "error", "-i", frame.file, "-vf", "scale=1180:-1", "-q:v", "5", jpg]);
        if (r.ok && exists(jpg)) img = dataUri(jpg, "image/jpeg");
      }
      const mp3 = path.join(paths.audioDir, `${t.id}.mp3`);
      const audio = exists(mp3) ? dataUri(mp3, "audio/mpeg") : null;
      const displayPath = path.join(paths.audioDir, `${t.id}.display.txt`);
      bytes += (img ? img.length : 0) + (audio ? audio.length : 0);
      return {
        id: t.id,
        n: i + 1,
        chapter: s.chapter || "",
        title: s.title || t.id,
        subtitle: s.subtitle || "",
        narration: exists(displayPath) ? readText(displayPath).trim() : s.narration || "",
        start: t.start,
        duration: t.duration,
        mp3: t.mp3Duration ?? t.mp3 ?? null,
        img,
        audio,
      };
    });
    try {
      fs.rmSync(tmp, { recursive: true, force: true });
    } catch {}

    const total = timeline.length ? round1(timeline[timeline.length - 1].start + timeline[timeline.length - 1].duration) : 0;
    const meta = {
      id: project.id || path.basename(projectRoot),
      title: sb.title || project.title || project.id,
      locale: sb.locale,
      workflow: project.workflow || "",
      status: project.status || "",
      total,
      narration: Math.round(slides.reduce((a, s) => a + (s.mp3 || 0), 0) * 10) / 10,
      voice: (sb.voice && sb.voice.voice) || "",
      generatedAt: nowIso().slice(0, 19).replace("T", " ") + "Z",
      project: rel(repo, projectRoot),
    };
    const outDir = path.resolve(projectRoot, String(FLAGS.out || paths.relative.review));
    const outFile = path.join(outDir, FLAGS.artifact ? "review.artifact.html" : "index.html");
    writeText(outFile, reviewHtml(meta, slides, { artifact: !!FLAGS.artifact }));
    const mb = fs.statSync(outFile).size / 1048576;
    log(`review: ${outFile}`);
    log(`  ${slides.length} slide(s), ${slides.filter((s) => s.img).length} frame(s), ${slides.filter((s) => s.audio).length} clip(s), ${mb.toFixed(1)} MB self-contained`);
    if (mb > 14) warn("  ! over 14 MB — too large to publish as an Artifact; re-run with fewer slides or smaller frames");
    log(sb.locale.toLowerCase().startsWith("en") ? "  open it, play the full cinema pass, tick all three gates per slide, then copy the review summary." : "  open it, run 連續播放 (cinema), tick the three gates per slide, then press 複製審核結論.");
  } finally {
    cleanVariantWorkspace(projectRoot, sb);
  }
}

// --- the blind A/B listening kit (same self-contained pattern as the review kit) ---
const BAKEOFF_CSS = `
.samples { display: flex; flex-direction: column; gap: 22px; }
.sample { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); padding: 20px 22px; }
.sample.judged { border-color: rgba(127,224,168,.45); }
.sample h2 { font-size: 20px; }
.purpose { color: var(--ink-dim); font-size: 13px; margin-top: 4px; }
.script {
  margin-top: 14px; padding: 14px 16px; border-radius: 8px; background: var(--panel-2);
  border-left: 3px solid var(--warm); font-size: 15px; line-height: 1.62;
}
.takes { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; margin-top: 16px; }
.take { border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px; background: var(--panel-2); }
.take .tag {
  display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px;
  border-radius: 8px; background: var(--accent); color: #06231f; font-weight: 900; font-size: 14px;
}
.take .who { margin-left: 9px; font-size: 13px; font-weight: 700; color: var(--ink-dim); }
.take.revealed .who { color: var(--accent); }
.metrics-row { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
.metrics-row .chip { font-size: 11.5px; padding: 3px 8px; }
.hidden-until-reveal { visibility: hidden; }
.verdict { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px; align-items: center; }
.pick { border-radius: 999px; padding: 7px 15px; font-size: 13px; }
.pick.on { background: var(--accent); color: #06231f; border-color: var(--accent); }
.tallies { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-top: 18px; }
.tallybox { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); padding: 16px 18px; }
.tallybox .n { font-size: 34px; font-weight: 900; color: var(--warm); font-variant-numeric: tabular-nums; }
`;

function bakeoffHtml(cfg, results, projectRoot, opts = {}) {
  const byKey = {};
  for (const r of results) byKey[`${r.sample}|${r.provider}`] = r;
  // deterministic per-sample order so the test is blind but rebuilds are stable
  const orderFor = (id, n) => {
    let h = 0;
    for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const idx = [...Array(n).keys()];
    for (let i = idx.length - 1; i > 0; i--) {
      h = (h * 1103515245 + 12345) >>> 0;
      const j = h % (i + 1);
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    return idx;
  };
  const samples = cfg.samples.map((s) => ({
    id: s.id,
    title: s.title || s.id,
    purpose: s.purpose || "",
    text: s.text,
    order: orderFor(s.id, cfg.providers.length),
    takes: cfg.providers.map((p) => {
      const r = byKey[`${s.id}|${p.id}`];
      const file = r ? path.join(projectRoot, r.file) : null;
      return {
        provider: p.id,
        label: p.label || p.id,
        audio: file && exists(file) ? dataUri(file, file.endsWith(".wav") ? "audio/wav" : "audio/mpeg") : null,
        m: r || null,
      };
    }),
  }));
  const meta = {
    id: cfg.id || path.basename(projectRoot),
    title: cfg.title || "TTS bakeoff",
    language: cfg.language || "",
    generatedAt: nowIso().slice(0, 19).replace("T", " ") + "Z",
    providers: cfg.providers.map((p) => ({ id: p.id, label: p.label || p.id, voice: p.voice, engine: p.engine, notes: p.notes || "" })),
  };
  const data = JSON.stringify({ meta, samples }).replace(/</g, "\\u003c");
  const head = `<title>${esc(meta.title)}</title>\n<style>${REVIEW_CSS}${BAKEOFF_CSS}</style>`;
  const body = `
<header class="top">
  <div class="top-in">
    <h1>${esc(meta.title)}</h1>
    <div class="chips">
      <span class="chip accent">${samples.length} 段</span>
      <span class="chip">${meta.providers.length} 個引擎</span>
      <span class="chip" id="tally">0 / ${samples.length} 已評</span>
    </div>
    <span class="spacer"></span>
    <button id="reveal">揭曉引擎</button>
    <button id="copy" class="primary">複製評測結論</button>
  </div>
</header>

<div class="wrap">
  <p class="lede">
    <b>盲測</b>：每段稿子由所有引擎各念一次，標籤只有 A / B，順序由 sample id 決定（每段不同）。
    先聽完再選，選完全部之後再按「揭曉引擎」——客觀數據也一併藏到揭曉之後，避免看到秒數就先入為主。
    八段稿子各針對一個弱點：純中文、中英混讀、數字日期、長句切分、柔和語氣、強調轉折、模型名稱、長稿穩定性。
  </p>
  <div class="samples" id="list"></div>
  <div class="tallies" id="tallies"></div>
  <footer>
    由 <code>hf bakeoff</code> 產生於 ${esc(meta.generatedAt)} · 客觀數據在 <code>data/measurements.json</code> ·
    結論寫回 <code>shared/docs/local-tts-no-api-key-strategy.md</code>。
  </footer>
</div>

<script>
var D = ${data};
var KEY = "hf-bakeoff:" + D.meta.id;
var state = {};
try { state = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { state = {}; }
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
function st(id) { if (!state[id]) state[id] = { pick: null, note: "" }; return state[id]; }
var revealed = false;
var LETTERS = "ABCD";
function fmt(n, d) { return n == null ? "—" : Number(n).toFixed(d == null ? 2 : d); }

function metricChips(m) {
  if (!m) return "";
  var rows = [
    ["長度", fmt(m.durationSeconds) + "s"],
    ["語速", fmt(m.rate) + " 拍/秒"],
    ["發聲語速", fmt(m.articulationRate)],
    ["內部停頓", String(m.internalPauses)],
    ["靜音比", fmt(m.silenceRatio)],
    ["響度", m.lufs == null ? "—" : fmt(m.lufs, 1) + " LUFS"],
    ["峰值", m.truePeakDb == null ? "—" : fmt(m.truePeakDb, 1) + " dB"]
  ];
  if (m.realTimeFactor != null) rows.push(["生成 RTF", fmt(m.realTimeFactor)]);
  return rows.map(function (r) { return '<span class="chip">' + r[0] + " " + r[1] + "</span>"; }).join("");
}
function render() {
  var list = document.getElementById("list");
  list.innerHTML = "";
  D.samples.forEach(function (s) {
    var el = document.createElement("article");
    el.className = "sample" + (st(s.id).pick ? " judged" : "");
    el.id = "s-" + s.id;
    var takes = s.order.map(function (ti, pos) {
      var t = s.takes[ti];
      return '<div class="take' + (revealed ? " revealed" : "") + '">' +
        '<div><span class="tag">' + LETTERS[pos] + '</span><span class="who">' +
          (revealed ? t.label : "？？？") + "</span></div>" +
        (t.audio ? '<audio controls preload="none" src="' + t.audio + '" style="margin-top:10px"></audio>'
                 : '<div class="purpose" style="margin-top:10px">（沒有音檔）</div>') +
        '<div class="metrics-row' + (revealed ? "" : " hidden-until-reveal") + '">' + metricChips(t.m) + "</div>" +
      "</div>";
    }).join("");
    var picks = s.order.map(function (ti, pos) {
      var on = st(s.id).pick === LETTERS[pos];
      return '<button class="pick' + (on ? " on" : "") + '" data-s="' + s.id + '" data-p="' + LETTERS[pos] + '">' + LETTERS[pos] + " 較好</button>";
    }).join("") + '<button class="pick' + (st(s.id).pick === "tie" ? " on" : "") + '" data-s="' + s.id + '" data-p="tie">平手</button>';
    el.innerHTML =
      "<h2>" + s.title + "</h2>" +
      (s.purpose ? '<div class="purpose">' + s.purpose + "</div>" : "") +
      '<div class="script">' + s.text + "</div>" +
      '<div class="takes">' + takes + "</div>" +
      '<div class="verdict">' + picks + "</div>" +
      '<textarea class="note" data-s="' + s.id + '" placeholder="哪裡不自然？（會出現在結論裡）" style="margin-top:10px">' + (st(s.id).note || "") + "</textarea>";
    list.appendChild(el);
  });
  tally();
}
function tally() {
  var done = D.samples.filter(function (s) { return st(s.id).pick; }).length;
  var t = document.getElementById("tally");
  t.textContent = done + " / " + D.samples.length + " 已評";
  t.className = "chip " + (done === D.samples.length ? "ok" : done ? "warn" : "");
  var box = document.getElementById("tallies");
  if (!revealed) { box.innerHTML = ""; return; }
  var wins = {}, ties = 0;
  D.meta.providers.forEach(function (p) { wins[p.id] = 0; });
  D.samples.forEach(function (s) {
    var pick = st(s.id).pick;
    if (!pick) return;
    if (pick === "tie") { ties++; return; }
    var pos = LETTERS.indexOf(pick);
    var t = s.takes[s.order[pos]];
    if (t) wins[t.provider] = (wins[t.provider] || 0) + 1;
  });
  box.innerHTML = D.meta.providers.map(function (p) {
    return '<div class="tallybox"><div class="chip accent">' + p.label + '</div><div class="n">' + wins[p.id] + "</div>" +
      '<div class="purpose">段勝出 · ' + (p.voice || "") + "</div></div>";
  }).join("") + '<div class="tallybox"><div class="chip">平手</div><div class="n">' + ties + '</div><div class="purpose">段</div></div>';
}
document.addEventListener("click", function (e) {
  var b = e.target.closest ? e.target.closest(".pick") : null;
  if (!b) return;
  var s = st(b.dataset.s);
  s.pick = s.pick === b.dataset.p ? null : b.dataset.p;
  save(); render();
});
document.addEventListener("input", function (e) {
  if (!e.target.classList || !e.target.classList.contains("note")) return;
  st(e.target.dataset.s).note = e.target.value; save();
});
document.getElementById("reveal").addEventListener("click", function () {
  revealed = !revealed;
  this.textContent = revealed ? "隱藏引擎" : "揭曉引擎";
  render();
});
document.getElementById("copy").addEventListener("click", function () {
  var lines = ["## TTS bakeoff — " + D.meta.title, "", "- 產生：" + D.meta.generatedAt, "- 引擎："];
  D.meta.providers.forEach(function (p) { lines.push("  - \`" + p.id + "\` " + p.label + (p.notes ? " — " + p.notes : "")); });
  lines.push("", "| 段落 | 針對 | 勝出 | 備註 |", "| --- | --- | --- | --- |");
  var wins = {}; var ties = 0;
  D.samples.forEach(function (s) {
    var v = st(s.id), who = "未評";
    if (v.pick === "tie") { who = "平手"; ties++; }
    else if (v.pick) {
      var t = s.takes[s.order[LETTERS.indexOf(v.pick)]];
      who = t ? t.label : v.pick;
      if (t) wins[t.provider] = (wins[t.provider] || 0) + 1;
    }
    lines.push("| " + s.id + " " + s.title + " | " + (s.purpose || "") + " | " + who + " | " + (v.note || "") + " |");
  });
  lines.push("", "總計：" + D.meta.providers.map(function (p) { return p.label + " " + (wins[p.id] || 0) + " 勝"; }).join("、") + "、平手 " + ties + " 段。");
  lines.push("", "客觀數據見 \`data/measurements.json\`（長度、語速、停頓、LUFS、RTF）。");
  var text = lines.join("\\n");
  var done = function () { var b = document.getElementById("copy"); b.textContent = "已複製 ✓"; setTimeout(function () { b.textContent = "複製評測結論"; }, 1800); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { window.prompt("複製這段：", text); });
  else window.prompt("複製這段：", text);
});
render();
</script>`;
  if (opts.artifact) return `${head}\n${body}\n`;
  return `<!DOCTYPE html>\n<html lang="zh-Hant">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n${head}\n</head>\n<body>\n${body}\n</body>\n</html>\n`;
}

// ---------------------------------------------------------------------------
// COMMAND: bakeoff  — compare TTS providers on one fixed set of golden samples
// ---------------------------------------------------------------------------
// The 2026-06 phase summary asked for this and it never happened, because the
// work was "listen to 16 clips and form an opinion" with no harness. This builds
// the harness: same text through every provider, objective measurements from
// ffmpeg, and a BLIND A/B listening kit so the subjective half is a 10-minute
// task with a defensible result instead of a vibe.
//
// data/bakeoff.json  { title, language, providers[], samples[] }
//   provider: { id, label, engine: "edge-tts"|"hyperframes-kokoro", voice, ... }
//   sample:   { id, title, purpose, text }
//
// hf bakeoff [--only id] [--force] [--no-kit]
//   -> assets/audio/<sample>.<provider>.(mp3|wav)  + .provider.json
//   -> data/measurements.json      objective battery
//   -> bakeoff/index.html          blind A/B listening kit (git-ignored)

function bakeoffConfig(projectRoot) {
  const p = path.join(projectRoot, "data", "bakeoff.json");
  if (!exists(p)) die(`missing ${rel(projectRoot, p)} — a bakeoff project needs data/bakeoff.json`);
  const cfg = readJson(p);
  if (!Array.isArray(cfg.providers) || !cfg.providers.length) die("data/bakeoff.json: providers[] is empty");
  if (!Array.isArray(cfg.samples) || !cfg.samples.length) die("data/bakeoff.json: samples[] is empty");
  return cfg;
}

// --- objective battery ------------------------------------------------------
function loudness(file) {
  // EBU R128 integrated loudness + true peak; ffmpeg prints the summary on stderr
  const r = run("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "ebur128=peak=true", "-f", "null", "-"]);
  const text = r.stderr || "";
  const grab = (label) => {
    const m = new RegExp(`${label}:\\s*(-?[0-9.]+)`).exec(text.slice(text.lastIndexOf("Summary")));
    return m ? Number(m[1]) : null;
  };
  return { lufs: grab("I"), lra: grab("LRA"), truePeakDb: grab("Peak") };
}
function silences(file, thresholdDb = -35, minPause = 0.18) {
  const r = run("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", `silencedetect=noise=${thresholdDb}dB:d=${minPause}`, "-f", "null", "-"]);
  const text = r.stderr || "";
  const out = [];
  const re = /silence_start:\s*(-?[0-9.]+)[\s\S]*?silence_end:\s*([0-9.]+)/g;
  let m;
  while ((m = re.exec(text))) out.push({ start: Math.max(0, Number(m[1])), end: Number(m[2]) });
  return out;
}
function measureClip(file, text) {
  const dur = ffprobeDuration(file);
  const pauses = silences(file);
  const total = pauses.reduce((a, p) => a + (p.end - p.start), 0);
  const lead = pauses.length && pauses[0].start < 0.05 ? pauses[0].end - pauses[0].start : 0;
  const tail = pauses.length && pauses[pauses.length - 1].end >= dur - 0.05 ? pauses[pauses.length - 1].end - pauses[pauses.length - 1].start : 0;
  const w = weightOf(text);
  const speaking = Math.max(0.01, dur - total);
  const l = loudness(file);
  return {
    durationSeconds: round2(dur),
    spokenWeight: round2(w),
    // beats per second over the whole clip vs over voiced time only
    rate: round2(w / dur),
    articulationRate: round2(w / speaking),
    silenceSeconds: round2(total),
    silenceRatio: round2(total / dur),
    leadSilence: round2(lead),
    tailSilence: round2(tail),
    // pauses that are neither the lead-in nor the tail: the ones a listener reads as phrasing
    internalPauses: pauses.filter((p) => p.start > 0.05 && p.end < dur - 0.05).length,
    ...l,
  };
}

// --- synthesis --------------------------------------------------------------
function synthEdge(projectRoot, repo, prov, sample, outBase) {
  const audioDir = path.dirname(outBase);
  const txt = `${outBase}.txt`;
  writeText(txt, sample.text.trim() + "\n");
  const mp3 = `${outBase}.mp3`;
  const py = resolvePythonEdge();
  const helper = path.join(repo, "shared", "tools", "edge_tts_words.py");
  if (py && exists(helper)) {
    const r = run(
      py,
      [helper, "--text-file", txt, "--voice", prov.voice, `--rate=${prov.rate || "+0%"}`, `--pitch=${prov.pitch || "+0Hz"}`, `--volume=${prov.volume || "+0%"}`, "--out-audio", mp3, "--out-words", `${outBase}.words.json`],
      { env: { ...process.env, PYTHONIOENCODING: "utf-8" } }
    );
    if (r.ok && exists(mp3)) return { file: mp3, ok: true };
    return { ok: false, why: (r.stderr || r.stdout || "").trim().split("\n").slice(-2).join(" ") };
  }
  const edge = resolveEdgeTts();
  if (!edge) return { ok: false, why: "edge-tts not installed" };
  const r = run(edge.cmd, [...edge.pre, "--voice", prov.voice, `--rate=${prov.rate || "+0%"}`, `--pitch=${prov.pitch || "+0Hz"}`, "--file", txt, "--write-media", mp3]);
  return r.ok && exists(mp3) ? { file: mp3, ok: true } : { ok: false, why: (r.stderr || "").trim().slice(-160) };
}
function synthKokoro(projectRoot, repo, prov, sample, outBase) {
  const txt = `${outBase}.txt`;
  writeText(txt, sample.text.trim() + "\n");
  const wav = `${outBase}.wav`;
  const args = ["--yes", `hyperframes@${hfPin(projectRoot)}`, "tts", `"${txt}"`, "--voice", prov.voice, "--lang", prov.lang || "zh", "--speed", String(prov.speed || 1), "-o", `"${wav}"`, "--json"];
  const r = runNpx(args, { cwd: projectRoot, timeout: 600000 });
  if (!exists(wav)) return { ok: false, why: (r.stdout || r.stderr || "").trim().split("\n").slice(-2).join(" ") };
  // a compact mp3 next to the wav keeps the listening kit small
  const mp3 = `${outBase}.mp3`;
  run("ffmpeg", ["-y", "-loglevel", "error", "-i", wav, "-codec:a", "libmp3lame", "-b:a", "96k", mp3]);
  return { file: exists(mp3) ? mp3 : wav, ok: true };
}

function cmdBakeoff(projectRoot = findProjectRoot()) {
  const repo = repoRootOrDie(projectRoot);
  const cfg = bakeoffConfig(projectRoot);
  const audioDir = path.join(projectRoot, "assets", "audio");
  fs.mkdirSync(audioDir, { recursive: true });
  const only = FLAGS.only ? String(FLAGS.only).split(",") : null;
  const results = [];
  let made = 0,
    reused = 0,
    failed = 0;

  for (const sample of cfg.samples) {
    if (only && !only.includes(sample.id)) continue;
    for (const prov of cfg.providers) {
      const outBase = path.join(audioDir, `${sample.id}.${prov.id}`);
      const existing = [".mp3", ".wav"].map((e) => `${outBase}${e}`).find(exists);
      let file = existing;
      let elapsed = null;
      if (!existing || FLAGS.force) {
        const t0 = process.hrtime.bigint();
        const r = prov.engine === "hyperframes-kokoro" ? synthKokoro(projectRoot, repo, prov, sample, outBase) : synthEdge(projectRoot, repo, prov, sample, outBase);
        elapsed = Number(process.hrtime.bigint() - t0) / 1e9;
        if (!r.ok) {
          failed++;
          warn(`  ✖ ${sample.id} · ${prov.id}: ${r.why}`);
          continue;
        }
        file = r.file;
        made++;
      } else reused++;
      const m = measureClip(file, sample.text);
      if (elapsed != null) {
        m.synthSeconds = round2(elapsed);
        m.realTimeFactor = round2(elapsed / Math.max(0.01, m.durationSeconds));
      }
      writeJson(`${outBase}.provider.json`, {
        provider: prov.id,
        label: prov.label,
        engine: prov.engine,
        voice: prov.voice,
        params: { rate: prov.rate, pitch: prov.pitch, speed: prov.speed, lang: prov.lang },
        requiresApiKey: false,
        sample: sample.id,
        inputText: sample.text,
        outputAudio: rel(projectRoot, file),
        measurements: m,
      });
      results.push({ sample: sample.id, provider: prov.id, file: rel(projectRoot, file), ...m });
      log(`  ${sample.id} · ${prov.id}: ${fmt(m.durationSeconds)}s  rate ${fmt(m.rate)}  pauses ${m.internalPauses}  ${m.lufs != null ? fmt(m.lufs) + " LUFS" : ""}`);
    }
  }
  writeJson(path.join(projectRoot, "data", "measurements.json"), {
    generatedAt: nowIso(),
    generator: "shared/tools/hf.mjs bakeoff",
    note: "Objective battery only. Naturalness is decided by the blind listening kit, not by these numbers.",
    providers: cfg.providers.map((p) => ({ id: p.id, label: p.label, engine: p.engine, voice: p.voice })),
    results,
  });
  log(`bakeoff: ${made} generated, ${reused} reused, ${failed} failed → data/measurements.json`);
  if (!FLAGS["no-kit"]) {
    const out = path.join(projectRoot, "bakeoff", "index.html");
    writeText(out, bakeoffHtml(cfg, results, projectRoot, { artifact: !!FLAGS.artifact }));
    if (FLAGS.artifact) writeText(path.join(projectRoot, "bakeoff", "bakeoff.artifact.html"), bakeoffHtml(cfg, results, projectRoot, { artifact: true }));
    log(`  listening kit: ${out}  (${(fs.statSync(out).size / 1048576).toFixed(1)} MB, blind A/B)`);
  }
  if (failed) process.exit(1);
}

// ---------------------------------------------------------------------------
// COMMAND: pipeline
// ---------------------------------------------------------------------------
function cmdPipeline() {
  const projectRoot = findProjectRoot();
  cmdPrepareTts(projectRoot);
  cmdTts(projectRoot);
  cmdMeasure(projectRoot);
  cmdSync(projectRoot);
  FLAGS.all = false;
  cmdAudit();
}

// ---------------------------------------------------------------------------
// COMMAND: check
// ---------------------------------------------------------------------------
// Keep the required static -> browser gate behind the same hidden subprocess
// boundary as ffprobe/TTS. This prevents npm/npx/Chrome helper consoles from
// flashing across the user's desktop during a non-interactive verification run.
function checkLocaleIds(sb, { allLocales = false, locale = null } = {}) {
  if (allLocales && locale) throw new Error("--locale and --all-locales are mutually exclusive");
  return allLocales ? sb.locales : [locale || sb.canonicalLocale];
}
function cmdCheck() {
  const projectRoot = findProjectRoot();
  const repo = repoRootOrDie(projectRoot);
  const findings = auditProject(projectRoot, repo);
  const errors = printFindings(rel(repo, projectRoot), findings);
  if (errors) process.exit(1);

  // Forward HyperFrames check flags while consuming hf's own project/locale selectors.
  const declared = loadStoryboard(projectRoot);
  let locales;
  try {
    locales = checkLocaleIds(declared, { allLocales: !!FLAGS["all-locales"], locale: FLAGS.locale || null });
  } catch (error) {
    die(error.message);
  }
  for (const locale of locales) {
    const sb = loadStoryboard(projectRoot, locale);
    const paths = localePaths(projectRoot, sb);
    let checkRoot = projectRoot;
    let r;
    log(`check: browser gate ${locale}${locales.length > 1 ? ` (${locales.indexOf(locale) + 1}/${locales.length})` : ""}`);
    try {
      checkRoot = variantWorkspace(projectRoot, sb, paths);
      r = runNpx(["--yes", `hyperframes@${hfPin(projectRoot)}`, "check", ...forwardedHyperframesArgs()], { cwd: checkRoot });
    } finally {
      cleanVariantWorkspace(projectRoot, sb);
    }
    if (r.stdout) process.stdout.write(r.stdout);
    if (r.stderr) process.stderr.write(r.stderr);
    if (!r.ok) process.exit(r.status || 1);
  }
}

// ---------------------------------------------------------------------------
function usage() {
  const lines = readText(__filename).split("\n");
  const end = lines.findIndex((line, i) => i > 0 && line.trim() === "*/");
  console.log(lines.slice(2, end === -1 ? 24 : end).map((l) => l.replace(/^ \*\s?/, "")).join("\n"));
}
const commands = {
  new: cmdNew,
  html: () => cmdHtml(),
  "prepare-tts": () => cmdPrepareTts(),
  tts: () => cmdTts(),
  measure: () => cmdMeasure(),
  sync: () => cmdSync(),
  captions: () => cmdCaptions(),
  bakeoff: () => cmdBakeoff(),
  "fit-audio": () => cmdFitAudio(),
  review: () => cmdReview(),
  check: cmdCheck,
  lint: () => cmdHyperframes("lint"),
  snapshot: () => cmdHyperframes("snapshot"),
  doctor: () => cmdHyperframes("doctor"),
  preview: () => cmdHyperframes("preview"),
  render: () => cmdHyperframes("render"),
  publish: () => cmdHyperframes("publish"),
  vendor: () => cmdVendor(),
  audit: cmdAudit,
  "repo-check": cmdRepoCheck,
  pipeline: cmdPipeline,
  help: usage,
};
const IS_MAIN = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (IS_MAIN) {
  if (!CMD || !commands[CMD]) {
    usage();
    process.exit(CMD ? 2 : 0);
  }
  try {
    commands[CMD]();
  } catch (e) {
    die(e && e.stack ? e.stack : String(e));
  }
}

// Small, pure seams for zero-dependency regression tests. The CLI remains one file;
// exporting these does not introduce a package or change its command-line contract.
export { buildSrt, buildWordCues, checkLocaleIds, childProcessOptions, npxEnv, cleanVariantWorkspace, computeTimeline, localePaths, normalizeRegion, patchCompositionLocale, patchGsapStartArray, renderAudioRegion, renderBlocks, renderChart, renderSlidesRegion, renderSrt, resolveStoryboard, reviewHtml, splitDisplayCues, ttsSourceFingerprint, validateSchema, variantWorkspace };
