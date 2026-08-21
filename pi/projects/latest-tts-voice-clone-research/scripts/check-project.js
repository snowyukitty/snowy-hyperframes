const fs = require('fs');
const path = require('path');
const must = ['index.html','meta.json','data/manifest.json','captions/narration.srt','data/storyboard.json'];
for (const f of must) if (!fs.existsSync(f)) { console.error('missing', f); process.exit(1); }
const meta = JSON.parse(fs.readFileSync('meta.json','utf8'));
if (meta.slides !== 11) { console.error('expected 11 slides, got', meta.slides); process.exit(1); }
for (let i=1;i<=11;i++) {
  const n=String(i).padStart(2,'0');
  const req = [`assets/images/slide-${n}.png`,`assets/audio/slide-${n}.display.txt`,`assets/audio/slide-${n}.tts.txt`,`assets/audio/slide-${n}.mp3`];
  for (const f of req) if (!fs.existsSync(f)) { console.error('missing', f); process.exit(1); }
}
JSON.parse(fs.readFileSync('data/manifest.json','utf8'));
console.log('Full project check passed');
