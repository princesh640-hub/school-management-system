const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const originalHtml = fs.readFileSync(path.join(__dirname, 'fixtures/mobile-dashboard.html'), 'utf-8');

// Instead of putting pre in DOM, dump to a cookie or dump to document title or dump to console or local file
const debugHtml = originalHtml.replace('</body>', `
<script>
  window.addEventListener('DOMContentLoaded', () => {
    const overflows = [];
    document.querySelectorAll('*').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.right > 390.5 || rect.width > 390.5) {
        overflows.push({
          tag: el.tagName,
          class: el.className,
          id: el.id,
          width: Math.round(rect.width),
          right: Math.round(rect.right),
          text: (el.innerText || '').slice(0, 40).replace(/\\n/g, ' ')
        });
      }
    });
    // Store in title so we can read it easily via DevTools or we can write to DOM
    document.title = 'OVERFLOW_COUNT:' + overflows.length + ':::' + JSON.stringify(overflows);
  });
</script>
</body>`);

fs.writeFileSync(path.join(__dirname, 'fixtures/debug.html'), debugHtml);
const debugPath = 'file:///' + path.join(__dirname, 'fixtures/debug.html').replace(/\\/g, '/');

// Run Chrome to capture console/DOM
const res = spawnSync(CHROME_PATH, [
  '--headless',
  '--disable-gpu',
  '--no-sandbox',
  '--dump-dom',
  '--window-size=390,844',
  debugPath,
]);

const dom = res.stdout.toString('utf-8');
const match = dom.match(/<title>OVERFLOW_COUNT:(\d+):::([\s\S]*?)<\/title>/);
if (match) {
  const count = match[1];
  const items = JSON.parse(match[2]);
  console.log('TOTAL OVERFLOW ELEMENTS:', count);
  items.forEach((item, idx) => {
    console.log(`[${idx}] ${item.tag}.${item.class || '(no-class)'} width=${item.width} right=${item.right} text="${item.text}"`);
  });
} else {
  console.log('No overflow match found in title. Title was:', dom.match(/<title>(.*?)<\/title>/)?.[1]);
}
