// =============================================================================
// Comprehensive Execution Runner for All Phase Verification Scripts
// =============================================================================
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT_DIR = path.resolve(__dirname, '..');

const phases = [
  { name: 'PHASE 1', script: 'scripts/verify-phase1.cjs' },
  { name: 'PHASE 2', script: 'scripts/verify-phase2.cjs' },
  { name: 'PHASE 3', script: 'scripts/verify-phase3.cjs' },
  { name: 'PHASE 4A', script: 'scripts/verify-phase4a.cjs' },
  { name: 'PHASE 4B', script: 'scripts/verify-phase4b.cjs' },
  { name: 'PHASE 4C', script: 'scripts/verify-phase4c.cjs' },
  { name: 'PHASE 4D', script: 'scripts/verify-phase4d.cjs' },
  { name: 'PHASE 4E', script: 'scripts/verify-phase4e.cjs' },
  { name: 'PHASE 4F', script: 'scripts/verify-phase4f.cjs' },
  { name: 'PHASE 4G', script: 'scripts/verify-phase4g.cjs' },
  { name: 'PHASE 4H', script: 'scripts/verify-phase4h.cjs' },
  { name: 'PHASE 4I', script: 'scripts/verify-phase4i.cjs' },
  { name: 'PHASE 4J', script: 'scripts/verify-phase4j.cjs' },
  { name: 'PHASE 4K', script: 'scripts/verify-phase4k.cjs' },
  { name: 'PHASE 4L', script: 'scripts/verify-phase4l.cjs' },
  { name: 'PHASE 4M', script: 'scripts/verify-phase4m.cjs' },
  { name: 'PHASE 4N', script: 'scripts/verify-phase4n.cjs' },
  { name: 'PHASE 4O', script: 'scripts/verify-phase4o.cjs' },
  { name: 'PHASE 4P', script: 'scripts/verify-phase4p.cjs' },
  { name: 'PHASE 4Q', script: 'scripts/verify-phase4q.cjs' },
  { name: 'PHASE 4R', script: 'scripts/verify-phase4r.cjs' },
  { name: 'PHASE 4S', script: 'scripts/verify-phase4s.cjs' },
  { name: 'PHASE 4T', script: 'scripts/verify-phase4t.cjs' },
];

const results = [];

function parseCounts(output) {
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let total = 0;

  // 1. Check for "TOTAL CHECKS: X | PASSED: Y | FAILED: Z"
  let m = output.match(/TOTAL CHECKS:\s*(\d+)\s*\|\s*PASSED:\s*(\d+)\s*\|\s*FAILED:\s*(\d+)/i);
  if (m) {
    return { total: parseInt(m[1], 10), passed: parseInt(m[2], 10), failed: parseInt(m[3], 10), skipped: 0 };
  }

  // 2. Check for multiline TOTAL CHECKS / PASSED CHECKS / FAILED CHECKS
  m = output.match(/TOTAL CHECKS:\s*(\d+)[\s\S]*?PASSED CHECKS:\s*(\d+)[\s\S]*?FAILED CHECKS:\s*(\d+)/i);
  if (m) {
    return { total: parseInt(m[1], 10), passed: parseInt(m[2], 10), failed: parseInt(m[3], 10), skipped: 0 };
  }

  // 3. Check for "VERIFICATION SUMMARY: X PASSED, Y FAILED" or "PHASE 4X VERIFICATION SUMMARY: X PASSED, Y FAILED"
  m = output.match(/VERIFICATION SUMMARY:\s*(\d+)\s*PASSED,\s*(\d+)\s*FAILED/i);
  if (m) {
    passed = parseInt(m[1], 10);
    failed = parseInt(m[2], 10);
    return { total: passed + failed, passed, failed, skipped: 0 };
  }

  // 4. Check for "Verification Complete: X Passed, Y Warnings, Z Failed"
  m = output.match(/Verification Complete:\s*(\d+)\s*Passed,\s*(\d+)\s*Warnings?,\s*(\d+)\s*Failed/i);
  if (m) {
    passed = parseInt(m[1], 10);
    failed = parseInt(m[3], 10);
    return { total: passed + failed, passed, failed, skipped: 0 };
  }

  // 5. Check for "PHASE X VERIFICATION SUMMARY: Passed: X, Warning: Y, Failed: Z"
  m = output.match(/Passed:\s*(\d+)[\s\S]*?Failed:\s*(\d+)/i);
  if (m) {
    passed = parseInt(m[1], 10);
    failed = parseInt(m[2], 10);
    return { total: passed + failed, passed, failed, skipped: 0 };
  }

  // 6. Check for "PASSED: X" and "FAILED: Y"
  const mPass = output.match(/PASSED:\s*(\d+)/i) || output.match(/Passed:\s*(\d+)/i);
  const mFail = output.match(/FAILED:\s*(\d+)/i) || output.match(/Failed:\s*(\d+)/i);
  if (mPass) passed = parseInt(mPass[1], 10);
  if (mFail) failed = parseInt(mFail[1], 10);
  total = passed + failed;

  return { total, passed, failed, skipped: 0 };
}

console.log('Starting Execution of All 23 Phase Verification Suites...\n');

for (const p of phases) {
  const fullPath = path.join(ROOT_DIR, p.script);
  if (!fs.existsSync(fullPath)) {
    results.push({ name: p.name, executed: 0, passed: 0, failed: 1, skipped: 0, error: 'File Not Found' });
    continue;
  }

  try {
    const output = execSync(`node "${fullPath}"`, { cwd: ROOT_DIR, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    const counts = parseCounts(output);

    results.push({
      name: p.name,
      script: p.script,
      executed: counts.total,
      passed: counts.passed,
      failed: counts.failed,
      skipped: counts.skipped,
      exitCode: 0,
    });
    console.log(`✔ ${p.name.padEnd(10)} -> Executed: ${String(counts.total).padStart(4)} | Passed: ${String(counts.passed).padStart(4)} | Failed: ${counts.failed} | Skipped: ${counts.skipped}`);
  } catch (err) {
    const output = (err.stdout || '') + (err.stderr || '');
    const counts = parseCounts(output);
    results.push({
      name: p.name,
      script: p.script,
      executed: counts.total || 1,
      passed: counts.passed,
      failed: counts.failed || 1,
      skipped: counts.skipped,
      exitCode: err.status || 1,
      error: err.message,
    });
    console.error(`✖ ${p.name.padEnd(10)} -> FAILED (Exit ${err.status}): Executed: ${counts.total} | Passed: ${counts.passed} | Failed: ${counts.failed}`);
  }
}

console.log('\n=============================================================================');
console.log('EXACT RESULTS TABLE:');
console.log('=============================================================================');
let totalExec = 0;
let totalPass = 0;
let totalFail = 0;
let totalSkip = 0;

results.forEach(r => {
  totalExec += r.executed;
  totalPass += r.passed;
  totalFail += r.failed;
  totalSkip += r.skipped;
  console.log(`${r.name.padEnd(9)} — EXECUTED: ${String(r.executed).padStart(4)} | PASSED: ${String(r.passed).padStart(4)} | FAILED: ${r.failed} | SKIPPED: ${r.skipped}`);
});

console.log('-----------------------------------------------------------------------------');
console.log(`TOTAL EXECUTED: ${totalExec}`);
console.log(`TOTAL PASSED:   ${totalPass}`);
console.log(`TOTAL FAILED:   ${totalFail}`);
console.log(`TOTAL SKIPPED:  ${totalSkip}`);
console.log(`SUCCESS RATE:   ${totalExec > 0 ? ((totalPass / totalExec) * 100).toFixed(2) : 0}%`);
console.log('=============================================================================');

fs.writeFileSync(path.join(ROOT_DIR, 'scripts/audit-results.json'), JSON.stringify({ results, totalExec, totalPass, totalFail, totalSkip }, null, 2));
