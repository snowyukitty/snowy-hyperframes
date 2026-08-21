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
 *   html                    generate / refresh index.html slide + audio regions from the storyboard
 *   prepare-tts             storyboard narration -> slide-NN.display.txt -> pronunciation map -> slide-NN.tts.txt
 *   tts [--only id] [--force]   Edge-TTS: slide-NN.tts.txt -> slide-NN.mp3 (voice from storyboard.voice)
 *   measure                 ffprobe every slide MP3 -> data/audio-durations.json
 *   sync [--policy audio|storyboard] [--pad 0.6] [--dry-run]
 *                           measured audio -> data/timeline.json, index.html timing attrs,
 *                           captions/narration.srt, project.json durationSeconds, legacy manifests
 *   fit-audio               keep slide windows, set each narration clip's data-duration to its MP3 length
 *                           (HyperFrames >=0.8 clip_media_fit) and fix the root data-duration — for legacy demos
 *   vendor                  copy shared/vendor/gsap.min.js into ./vendor and point index.html at it (no CDN at render)
 *   audit [--all] [--json]  structural + schema + timing + audio-cut-risk checks (CI-safe, no browser)
 *   repo-check              publication guard: allowlist, secrets, >95 MB files (run from repo root)
 *   pipeline                prepare-tts -> tts -> measure -> sync -> audit
 *
 * Global flags: --project <dir>  --json  --force  --dry-run  --quiet
 */

import fs from "node:fs";
import path from "node:path";
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
        if (next !== undefined && !next.startsWith("--") && ["project", "only", "policy", "pad", "workflow", "name", "voice", "rate", "pitch"].includes(key)) {
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
function loadStoryboard(projectRoot) {
  const p = path.join(projectRoot, "data", "storyboard.json");
  if (!exists(p)) die(`missing ${rel(projectRoot, p)}`);
  const raw = readJson(p);
  const slides = (raw.slides || []).map((s, i) => {
    const id = s.id || `slide-${String(i + 1).padStart(2, "0")}`;
    return {
      id,
      n: slideNumber(id) || i + 1,
      title: s.title || "",
      chapter: s.chapter || s.type || "",
      durationTarget: Number(s.durationTarget ?? s.duration ?? s.originalTargetDuration ?? 0) || 0,
      image: s.image || (s.visuals && s.visuals.imageName ? `assets/images/${s.visuals.imageName}` : "") || "",
      imageInferred: !s.image && !!(s.visuals && s.visuals.imageName),
      subtitle: s.subtitle ?? "",
      narration: s.narration ?? s.displayText ?? "",
      ttsText: s.ttsText ?? "",
      raw: s,
    };
  });
  return { path: p, raw, slides, voice: raw.voice || {}, title: raw.title || "" };
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
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// external tools
// ---------------------------------------------------------------------------
function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", shell: false, ...opts });
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
function patchGsapStartArray(html, timeline) {
  // legacy demos keep `["#slide-03", 40.1],` arrays; refresh them if present
  let n = 0;
  for (const s of timeline) {
    const re = new RegExp(`(\\["#${s.id}",\\s*)([0-9.]+)(\\s*\\])`, "g");
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
        const end = s.mp3 ? Math.min(s.start + s.mp3, s.start + s.duration) : s.start + s.duration;
        return `${i + 1}\n${srtTime(s.start)} --> ${srtTime(end)}\n${text}\n`;
      })
      .join("\n") + "\n"
  );
}
function countSrtCues(text) {
  return text.split(/\r?\n\r?\n/).filter((b) => /^\d+\s*\r?\n\d\d:\d\d:\d\d,\d{3} --> /.test(b.trim())).length;
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
function renderAudioRegion(timeline) {
  const lines = timeline.map(
    (s, i) =>
      `      <audio id="audio-${s.id}" class="clip narration-audio" data-start="${s.start}" data-duration="${audioSlot(s)}" data-track-index="${20 + i}" src="assets/audio/${s.id}.mp3"></audio>`
  );
  return `${HF_AUDIO_START}\n${lines.join("\n")}\n      ${HF_AUDIO_END}`;
}
function renderSlidesRegion(timeline, slides) {
  const total = timeline.length;
  const byId = Object.fromEntries(slides.map((s) => [s.id, s]));
  const blocks = timeline.map((t, i) => {
    const s = byId[t.id] || { title: t.id, chapter: "", subtitle: "", image: "" };
    const chapterClass = s.chapter ? ` ${String(s.chapter).toLowerCase().replace(/[^a-z0-9-]+/g, "-")}` : "";
    const bg = s.image
      ? `        <img class="bg" data-layout-allow-overflow="" src="${esc(s.image)}" alt="">`
      : `        <div class="bg bg-generated" data-layout-allow-overflow=""></div>\n        <svg class="deco" viewBox="0 0 100 100" aria-hidden="true"><circle class="track" cx="50" cy="50" r="46"/><circle class="arc" cx="50" cy="50" r="46" stroke-dasharray="${(((i + 1) / total) * 2 * Math.PI * 46).toFixed(2)} 999"/><circle class="dot" cx="50" cy="4" r="1.6" transform="rotate(${(((i + 1) / total) * 360).toFixed(1)} 50 50)"/></svg>`;
    return [
      `      <section id="${t.id}" class="clip slide${s.image ? "" : " no-image"}${chapterClass}" style="--i:${i}" data-start="${t.start}" data-duration="${t.duration}" data-track-index="${i + 1}">`,
      bg,
      `        <div class="shade"></div>`,
      `        <div class="content">`,
      s.chapter ? `          <div class="eyebrow">${esc(s.chapter)}</div>` : `          <div class="eyebrow">${String(i + 1).padStart(2, "0")}</div>`,
      `          <h1>${esc(s.title)}</h1>`,
      `        </div>`,
      `        <div class="caption">${esc(s.subtitle || "")}</div>`,
      `        <div class="progress">${String(i + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}</div>`,
      `      </section>`,
    ].join("\n");
  });
  return `${HF_SLIDES_START}\n${blocks.join("\n\n")}\n      ${HF_SLIDES_END}`;
}
function replaceRegion(html, startMarker, endMarker, replacement) {
  const a = html.indexOf(startMarker);
  const b = html.indexOf(endMarker);
  if (a === -1 || b === -1 || b < a) return null;
  return html.slice(0, a) + replacement + html.slice(b + endMarker.length);
}
function cmdHtml(projectRoot = findProjectRoot()) {
  const repo = repoRootOrDie(projectRoot);
  const sb = loadStoryboard(projectRoot);
  if (!sb.slides.length) die("storyboard has no slides");
  const timeline = provisionalTimeline(projectRoot, sb);
  const target = path.join(projectRoot, "index.html");
  const templateHtml = path.join(repo, "shared", "templates", "hyperframes-research-project", "index.html");
  let html;
  if (exists(target) && !FLAGS.force) {
    html = readText(target);
    const a = replaceRegion(html, HF_AUDIO_START, HF_AUDIO_END, renderAudioRegion(timeline));
    const b = a && replaceRegion(a, HF_SLIDES_START, HF_SLIDES_END, renderSlidesRegion(timeline, sb.slides));
    if (!b) die("index.html exists but has no hf:audio / hf:slides regions. Re-run with --force to regenerate from the template (this overwrites index.html).");
    html = b;
  } else {
    if (!exists(templateHtml)) die(`template missing: ${rel(repo, templateHtml)}`);
    html = readText(templateHtml);
    html = replaceRegion(html, HF_AUDIO_START, HF_AUDIO_END, renderAudioRegion(timeline)) || html;
    html = replaceRegion(html, HF_SLIDES_START, HF_SLIDES_END, renderSlidesRegion(timeline, sb.slides)) || html;
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(sb.title || "HyperFrames")}</title>`);
  }
  const total = timeline.length ? round1(timeline[timeline.length - 1].start + timeline[timeline.length - 1].duration) : 0;
  html = patchRootDuration(html, total).html;
  if (FLAGS["dry-run"]) {
    log(html);
    return;
  }
  writeText(target, html);
  log(`wrote index.html (${timeline.length} slides, ${total}s provisional; run  hf sync  after TTS)`);
}

// provisional timeline: measured mp3 where available, else storyboard targets
function provisionalTimeline(projectRoot, sb) {
  const durations = loadDurations(projectRoot, false);
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
  const sb = loadStoryboard(projectRoot);
  const audioDir = path.join(projectRoot, "assets", "audio");
  fs.mkdirSync(audioDir, { recursive: true });
  const mapPath = path.join(projectRoot, "data", "pronunciation-map.json");
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
  log(`prepare-tts: ${sb.slides.length} slides, ${wrote} tts.txt updated (map entries: ${(map.entries || []).length})`);
}

// ---------------------------------------------------------------------------
// COMMAND: tts (Edge-TTS)
// ---------------------------------------------------------------------------
function cmdTts(projectRoot = findProjectRoot()) {
  const sb = loadStoryboard(projectRoot);
  const v = sb.voice || {};
  if (v.tool && v.tool !== "edge-tts") die(`storyboard.voice.tool is "${v.tool}"; hf tts only drives edge-tts (other providers: write slide-NN.mp3 yourself, then hf measure).`);
  const voice = FLAGS.voice || v.voice || "zh-TW-HsiaoChenNeural";
  const rate = FLAGS.rate || v.rate || "+0%";
  const pitch = FLAGS.pitch || v.pitch || "+0Hz";
  const volume = v.volume || "+0%";
  const edge = resolveEdgeTts();
  if (!edge) die("edge-tts not found. Install:  pip install --user edge-tts   (or: python -m pip install edge-tts)");
  const audioDir = path.join(projectRoot, "assets", "audio");
  const only = FLAGS.only ? String(FLAGS.only).split(",") : null;
  let made = 0,
    skipped = 0,
    failed = 0;
  for (const s of sb.slides) {
    if (only && !only.includes(s.id)) continue;
    const ttsPath = path.join(audioDir, `${s.id}.tts.txt`);
    const mp3 = path.join(audioDir, `${s.id}.mp3`);
    if (!exists(ttsPath)) {
      warn(`  ${s.id}: missing ${s.id}.tts.txt (run hf prepare-tts)`);
      failed++;
      continue;
    }
    if (!FLAGS.force && exists(mp3) && fs.statSync(mp3).mtimeMs >= fs.statSync(ttsPath).mtimeMs) {
      skipped++;
      continue;
    }
    const args = [...edge.pre, "--voice", voice, `--rate=${rate}`, `--pitch=${pitch}`, `--volume=${volume}`, "--file", ttsPath, "--write-media", mp3];
    if (FLAGS.subtitles) args.push("--write-subtitles", path.join(audioDir, `${s.id}.edge.vtt`));
    const r = run(edge.cmd, args);
    if (!r.ok || !exists(mp3)) {
      failed++;
      warn(`  ${s.id}: edge-tts failed\n${(r.stderr || r.stdout || String(r.error)).trim()}`);
      continue;
    }
    made++;
    log(`  ${s.id}: ${fmt(ffprobeDuration(mp3))}s`);
  }
  log(`tts: voice=${voice} rate=${rate} pitch=${pitch} — generated ${made}, up-to-date ${skipped}, failed ${failed}`);
  if (failed) process.exit(1);
}

// ---------------------------------------------------------------------------
// COMMAND: measure
// ---------------------------------------------------------------------------
function durationsPath(projectRoot) {
  return path.join(projectRoot, "data", "audio-durations.json");
}
function loadDurations(projectRoot, strict = true) {
  const p = durationsPath(projectRoot);
  if (!exists(p)) {
    if (strict) die("no data/audio-durations.json — run  hf measure");
    return {};
  }
  return readJson(p).durations || {};
}
function cmdMeasure(projectRoot = findProjectRoot()) {
  const sb = loadStoryboard(projectRoot);
  const audioDir = path.join(projectRoot, "assets", "audio");
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
  writeJson(durationsPath(projectRoot), out);
  for (const [id, d] of Object.entries(durations)) log(`  ${id}  ${fmt(d, 3)}s`);
  if (missing.length) warn(`  missing mp3: ${missing.join(", ")}`);
  log(`measure: ${Object.keys(durations).length} clips, narration total ${fmt(out.total)}s -> data/audio-durations.json`);
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
  const sb = loadStoryboard(projectRoot);
  const policy = String(FLAGS.policy || "audio");
  const pad = FLAGS.pad !== undefined ? Number(FLAGS.pad) : PAD_DEFAULT;
  if (!["audio", "storyboard"].includes(policy)) die("--policy must be audio|storyboard");
  let durations = loadDurations(projectRoot, false);
  if (!Object.keys(durations).length) durations = cmdMeasure(projectRoot).durations;
  const { timeline, total, problems } = computeTimeline(sb, durations, policy, pad);
  for (const p of problems) warn(`  ! ${p}`);
  if (policy === "storyboard" && problems.some((p) => p.includes("exceeds"))) die("storyboard policy violated — shorten narration, speed up TTS, or use --policy audio");

  log(`sync: policy=${policy} pad=${pad}s total=${total}s`);
  log(`  ${"slide".padEnd(9)} ${"start".padStart(7)} ${"dur".padStart(7)} ${"mp3".padStart(7)} ${"target".padStart(7)}`);
  for (const t of timeline) log(`  ${t.id.padEnd(9)} ${fmt(t.start, 1).padStart(7)} ${fmt(t.duration, 1).padStart(7)} ${(t.mp3 ? fmt(t.mp3) : "-").padStart(7)} ${(t.target ? fmt(t.target, 1) : "-").padStart(7)}`);
  if (FLAGS["dry-run"]) return;

  // 1. data/timeline.json (generated artefact; the Snowy manifest of record)
  writeJson(path.join(projectRoot, "data", "timeline.json"), {
    generatedAt: nowIso(),
    generator: "shared/tools/hf.mjs sync",
    policy,
    padSeconds: pad,
    durationSeconds: total,
    slides: timeline.map((t) => ({ id: t.id, start: t.start, duration: t.duration, mp3Duration: t.mp3, storyboardTarget: t.target })),
  });

  // 2. index.html timing attributes (+ legacy GSAP start arrays)
  const htmlPath = path.join(projectRoot, "index.html");
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
    const r = patchRootDuration(html, total);
    html = r.html;
    const g = patchGsapStartArray(html, timeline);
    html = g.html;
    writeText(htmlPath, html);
    log(`  index.html: ${patched}/${timeline.length} slides patched${r.found ? ", root data-duration=" + total : ", (no root data-duration)"}${g.count ? ", gsap starts refreshed x" + g.count : ""}${missing.length ? "; NOT FOUND: " + missing.join(", ") : ""}`);
  } else warn("  index.html missing — run  hf html");

  // 3. captions/narration.srt from display text
  const textById = {};
  for (const s of sb.slides) {
    const display = path.join(projectRoot, "assets", "audio", `${s.id}.display.txt`);
    textById[s.id] = exists(display) ? readText(display) : s.narration || s.subtitle || "";
  }
  writeText(path.join(projectRoot, "captions", "narration.srt"), buildSrt(timeline, textById));
  log(`  captions/narration.srt: ${timeline.length} cues`);

  // 4. project.json
  const pjPath = path.join(projectRoot, "project.json");
  const pj = readJson(pjPath);
  pj.durationSeconds = total;
  pj.updatedAt = nowIso();
  pj.timing = { policy, padSeconds: pad, source: "data/timeline.json", measured: "data/audio-durations.json" };
  writeJson(pjPath, pj);

  // 5. legacy Snowy manifests (meta.json / hyperframes.json with slides[] / slidesData[])
  for (const name of ["meta.json", "hyperframes.json"]) {
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
  log(`sync done. Next:  hf audit  ->  npx hyperframes check  ->  preview  ->  render`);
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
  const sb = loadStoryboard(projectRoot);
  if (!sb.slides.length) E("storyboard", "storyboard has no slides");
  const ids = sb.slides.map((s) => s.id);
  const dupIds = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupIds.length) E("storyboard", `duplicate slide ids: ${dupIds.join(", ")}`);
  const renderStage = ["ready-to-render", "rendered"].includes(project.status);

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

  // captions
  if (exists(P("captions/narration.srt"))) {
    const cues = countSrtCues(readText(P("captions/narration.srt")));
    if (cues !== sb.slides.length) W("captions", `narration.srt has ${cues} cues for ${sb.slides.length} slides`);
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
  for (const f of files) {
    const m = /^([a-z-]+)\/projects\/([^/]+)\//.exec(f);
    if (m && !allow.has(`${m[1]}/projects/${m[2]}`)) problems.push(`tracked but not allowlisted in .gitignore: ${m[1]}/projects/${m[2]} (${f})`);
    if (secretRe.test(f) && !/\.example$/.test(f) && !/\/docs\//.test(f) && !/\.md$/.test(f)) problems.push(`secret-looking path tracked: ${f}`);
    if (/(^|\/)\.pi\//.test(f)) problems.push(`Pi cache tracked: ${f}`);
    try {
      const size = fs.statSync(path.join(repo, f)).size;
      if (size > maxBytes) problems.push(`file over 95 MB (GitHub limit 100 MB): ${f} (${(size / 1048576).toFixed(1)} MB)`);
    } catch {}
  }
  // every tracked project must have project.json + README + retrospective
  const tracked = new Set(files.filter((f) => /^[a-z-]+\/projects\/[^/]+\//.test(f)).map((f) => f.split("/").slice(0, 3).join("/")));
  for (const p of tracked) {
    for (const req of ["project.json", "README.md", "docs/retrospective.md"]) if (!files.includes(`${p}/${req}`)) problems.push(`${p}: missing ${req} (publication policy)`);
  }
  const mp4s = files.filter((f) => /\.mp4$/i.test(f));
  const mp4Bytes = mp4s.reduce((a, f) => a + (fs.existsSync(path.join(repo, f)) ? fs.statSync(path.join(repo, f)).size : 0), 0);
  log(`repo-check: ${files.length} tracked files, ${tracked.size} tracked project(s), ${allow.size} allowlisted, ${mp4s.length} mp4 (${(mp4Bytes / 1048576).toFixed(1)} MB)`);
  if (mp4s.length) log(`  note: future renders belong in GitHub Releases, not git history (see repo-publication-policy.md)`);
  for (const p of problems) log(`  ✖ ${p}`);
  if (JSON_OUT) console.log(JSON.stringify({ ok: problems.length === 0, problems, trackedProjects: [...tracked], allowlisted: [...allow] }, null, 2));
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
  const htmlPath = path.join(projectRoot, "index.html");
  let rewrote = false;
  if (exists(htmlPath)) {
    const html = readText(htmlPath);
    const next = html.replace(/<script\s+src="https?:\/\/[^"]*\/gsap(?:\.min)?\.js"><\/script>/g, '<script src="vendor/gsap.min.js"></script>');
    if (next !== html) {
      writeText(htmlPath, next);
      rewrote = true;
    }
  }
  return { ok: true, rewrote };
}
function cmdVendor(projectRoot = findProjectRoot()) {
  const repo = repoRootOrDie(projectRoot);
  const r = vendorGsap(projectRoot, repo);
  if (!r.ok) die(r.reason);
  log(`vendor: vendor/gsap.min.js in place${r.rewrote ? "; index.html now loads it instead of the CDN" : ""}`);
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
function usage() {
  console.log(readText(__filename).split("\n").slice(1, 24).map((l) => l.replace(/^ \*\s?/, "")).join("\n"));
}
const commands = {
  new: cmdNew,
  html: () => cmdHtml(),
  "prepare-tts": () => cmdPrepareTts(),
  tts: () => cmdTts(),
  measure: () => cmdMeasure(),
  sync: () => cmdSync(),
  "fit-audio": () => cmdFitAudio(),
  vendor: () => cmdVendor(),
  audit: cmdAudit,
  "repo-check": cmdRepoCheck,
  pipeline: cmdPipeline,
  help: usage,
};
if (!CMD || !commands[CMD]) {
  usage();
  process.exit(CMD ? 2 : 0);
}
try {
  commands[CMD]();
} catch (e) {
  die(e && e.stack ? e.stack : String(e));
}
