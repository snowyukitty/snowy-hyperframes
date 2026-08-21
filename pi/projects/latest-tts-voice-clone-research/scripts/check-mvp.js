const fs = require('fs');
const required = ['index.html','meta.json','data/manifest.json','captions/narration.srt'];
for (const f of required) { if (!fs.existsSync(f)) { console.error('missing', f); process.exit(1); } }
for (let i=1;i<=5;i++) {
  const n=String(i).padStart(2,'0');
  for (const f of [`assets/audio/slide-${n}.display.txt`,`assets/audio/slide-${n}.tts.txt`]) {
    if (!fs.existsSync(f)) { console.error('missing', f); process.exit(1); }
  }
}
JSON.parse(fs.readFileSync('meta.json','utf8'));
JSON.parse(fs.readFileSync('data/manifest.json','utf8'));
console.log('MVP check passed');
