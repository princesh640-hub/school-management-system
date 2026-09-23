const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outPath = path.resolve(__dirname, 'test.png');

console.log('Testing Chrome invocation...');
const res = spawnSync(chromePath, [
  '--headless',
  '--disable-gpu',
  `--screenshot=${outPath}`,
  '--window-size=1920,1200',
  'about:blank',
]);

console.log('Exit code:', res.status);
console.log('Exists:', fs.existsSync(outPath));
if (fs.existsSync(outPath)) {
  console.log('Size:', fs.statSync(outPath).size);
  fs.unlinkSync(outPath);
}
