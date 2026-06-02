const fs = require('fs');
const cp = require('child_process');
const meta = JSON.parse(fs.readFileSync('meta.json','utf8'));
let bad = 0;
for (const sl of meta.slidesData) {
  if (!fs.existsSync(sl.audio)) { console.error(`missing audio ${sl.audio}`); bad++; continue; }
  const out = cp.execFileSync('ffprobe', ['-v','error','-show_entries','format=duration','-of','default=nk=1:nw=1', sl.audio], {encoding:'utf8'}).trim();
  const mp3 = Number(out);
  const allowed = Number(sl.duration) + 0.25;
  const margin = Number(sl.duration) - mp3;
  const status = mp3 <= allowed ? 'ok' : 'CUT_RISK';
  console.log(`${sl.id} slide=${Number(sl.duration).toFixed(2)}s mp3=${mp3.toFixed(2)}s margin=${margin.toFixed(2)}s ${status}`);
  if (mp3 > allowed) bad++;
}
if (bad) { console.error(`Audio audit failed: ${bad} clip(s) exceed slide duration.`); process.exit(1); }
console.log('Audio audit passed');
