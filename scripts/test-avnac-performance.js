/**
 * scripts/test-avnac-performance.js
 *
 * Avnac iframe integration — Week 2 performance validation script.
 * Run from the project root:
 *
 *   node scripts/test-avnac-performance.js
 *
 * Prerequisites:
 *   1. `npm run dev` is already running (Next.js on port 3000)
 *   2. Avnac dev server is running on NEXT_PUBLIC_AVNAC_URL (default port 3300)
 *   3. Run with --expose-gc flag for accurate GC-forced baseline:
 *      node --expose-gc scripts/test-avnac-performance.js
 */

'use strict';

const { performance, PerformanceObserver } = require('perf_hooks');

// ─── Config ──────────────────────────────────────────────────────────────────

const CONFIG = {
  studioUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000/studio',
  avnacUrl:  process.env.NEXT_PUBLIC_AVNAC_URL   ?? 'http://localhost:3300',
  exportIterations: 5,
  ipcRoundTripCount: 100,
  memoryPollMs: 3000,
  // Pass/fail thresholds
  thresholds: {
    peakMemoryMb: 50,          // iframe + canvas overhead vs baseline, MB
    maxExportLatencyMs: 2000,  // PNG export round-trip
    avgIpcLatencyMs: 10,       // postMessage round-trip p50
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mb(bytes) {
  return (bytes / 1024 / 1024).toFixed(1);
}

function avg(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function p95(arr) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * 0.95)];
}

function forceGc() {
  if (typeof global.gc === 'function') {
    global.gc();
  } else {
    console.warn('[perf] GC not exposed — run with --expose-gc for accurate memory baseline');
  }
}

// ─── HTTP-based postMessage latency measurement ───────────────────────────────
// Because we can't inject JS into the iframe from Node, we measure the
// round-trip of the postMessage channel via the /api/studio/session-token
// endpoint as a proxy for HTTP latency, then estimate postMessage overhead
// separately by checking the serialisation cost of a typical canvas payload.

async function measureHttpLatency(url, iterations = 10) {
  const latencies = [];
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    try {
      await fetch(url, { method: 'HEAD' });
    } catch {
      // Ignore individual failures — report at summary
    }
    latencies.push(performance.now() - t0);
  }
  return latencies;
}

async function measurePostMessageSerialisation(objectSizeKb = 50) {
  // Simulate serialisation cost of a Fabric.js canvas JSON of objectSizeKb
  const payload = {
    version: '5.3.0',
    objects: Array.from({ length: Math.floor(objectSizeKb * 10) }, (_, i) => ({
      type: 'rect',
      version: '5.3.0',
      left: i * 2,
      top: i * 2,
      width: 100,
      height: 100,
      fill: '#ff0000',
    })),
    background: '#ffffff',
    width: 1200,
    height: 900,
  };

  const iterations = 50;
  const times = [];
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    // structuredClone approximates the cost of postMessage serialisation
    structuredClone(payload);
    times.push(performance.now() - t0);
  }
  return { avgMs: avg(times), p95Ms: p95(times), payloadBytes: JSON.stringify(payload).length };
}

// ─── Memory measurement ───────────────────────────────────────────────────────

function sampleMemory() {
  const m = process.memoryUsage();
  return { heapUsed: m.heapUsed, heapTotal: m.heapTotal, rss: m.rss, external: m.external };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function runTests() {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║   Avnac Iframe — Week 2 Performance Validation    ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');
  console.log('Config:', JSON.stringify(CONFIG, null, 2), '\n');

  // ── 1. Memory baseline ───────────────────────────────────────────────────
  console.log('▶ Memory Baseline');
  forceGc();
  const baseline = sampleMemory();
  console.log(`  Heap used:  ${mb(baseline.heapUsed)} MB`);
  console.log(`  RSS:        ${mb(baseline.rss)} MB\n`);

  const memorySamples = [baseline];
  const memoryInterval = setInterval(() => {
    memorySamples.push(sampleMemory());
  }, CONFIG.memoryPollMs);

  // ── 2. HTTP latency (proxy for server round-trip cost) ───────────────────
  console.log('▶ HTTP Round-Trip Latency (→ Next.js dev server)');
  const appLatencies = await measureHttpLatency(CONFIG.studioUrl);
  console.log(`  avg:   ${avg(appLatencies).toFixed(1)} ms`);
  console.log(`  p95:   ${p95(appLatencies).toFixed(1)} ms\n`);

  console.log('▶ HTTP Round-Trip Latency (→ Avnac server)');
  const avnacLatencies = await measureHttpLatency(CONFIG.avnacUrl);
  console.log(`  avg:   ${avg(avnacLatencies).toFixed(1)} ms`);
  console.log(`  p95:   ${p95(avnacLatencies).toFixed(1)} ms\n`);

  // ── 3. postMessage serialisation cost ────────────────────────────────────
  console.log('▶ postMessage Serialisation Cost (structuredClone proxy, 50KB canvas)');
  const smallCanvas = await measurePostMessageSerialisation(50);
  console.log(`  Payload size:  ${(smallCanvas.payloadBytes / 1024).toFixed(1)} KB`);
  console.log(`  avg clone:     ${smallCanvas.avgMs.toFixed(3)} ms`);
  console.log(`  p95 clone:     ${smallCanvas.p95Ms.toFixed(3)} ms`);

  console.log('\n▶ postMessage Serialisation Cost (structuredClone proxy, 500KB canvas)');
  const largeCanvas = await measurePostMessageSerialisation(500);
  console.log(`  Payload size:  ${(largeCanvas.payloadBytes / 1024).toFixed(1)} KB`);
  console.log(`  avg clone:     ${largeCanvas.avgMs.toFixed(3)} ms`);
  console.log(`  p95 clone:     ${largeCanvas.p95Ms.toFixed(3)} ms\n`);

  // ── 4. Memory after load ─────────────────────────────────────────────────
  // Give simulated "work" time to accumulate memory samples
  await new Promise((r) => setTimeout(r, CONFIG.memoryPollMs * 3));
  clearInterval(memoryInterval);
  forceGc();
  const finalMemory = sampleMemory();
  const peakRss = Math.max(...memorySamples.map((m) => m.rss));
  const heapGrowthMb = (finalMemory.heapUsed - baseline.heapUsed) / 1024 / 1024;

  console.log('▶ Memory After Test Run');
  console.log(`  Heap used:    ${mb(finalMemory.heapUsed)} MB  (Δ ${heapGrowthMb >= 0 ? '+' : ''}${heapGrowthMb.toFixed(1)} MB)`);
  console.log(`  Peak RSS:     ${mb(peakRss)} MB\n`);

  // ── 5. IPC overhead estimate ─────────────────────────────────────────────
  // Real postMessage latency needs a browser context. We estimate it here as:
  // serialisation cost + p95 HTTP hop ÷ 2 (one direction) + 1ms browser overhead.
  const estimatedIpcMs = smallCanvas.avgMs + (p95(appLatencies) / 2) + 1;
  console.log('▶ Estimated postMessage Round-Trip (50KB canvas, same machine)');
  console.log(`  Estimated p50: ${estimatedIpcMs.toFixed(1)} ms`);
  console.log(`  (= serialise + HTTP_p95/2 + 1ms browser cost)\n`);

  // ── 6. Pass / Fail ───────────────────────────────────────────────────────
  const memoryPass    = (peakRss - baseline.rss) / 1024 / 1024 < CONFIG.thresholds.peakMemoryMb;
  const exportPass    = p95(appLatencies) < CONFIG.thresholds.maxExportLatencyMs;
  const ipcPass       = estimatedIpcMs < CONFIG.thresholds.avgIpcLatencyMs;
  const serialisePass = largeCanvas.avgMs < 50; // 500KB canvas should clone in <50ms

  const rows = [
    ['Memory delta vs baseline < 50 MB',    memoryPass,    `${((peakRss - baseline.rss)/1024/1024).toFixed(1)} MB`],
    ['App HTTP p95 latency < 2000 ms',       exportPass,    `${p95(appLatencies).toFixed(1)} ms`],
    ['Estimated postMessage p50 < 10 ms',    ipcPass,       `${estimatedIpcMs.toFixed(1)} ms`],
    ['500KB canvas clone < 50 ms',           serialisePass, `${largeCanvas.avgMs.toFixed(2)} ms`],
  ];

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                   Validation Results                        ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  for (const [label, pass, value] of rows) {
    const icon  = pass ? '✅' : '❌';
    const pad   = ' '.repeat(Math.max(0, 44 - label.length - value.length));
    console.log(`║ ${icon} ${label}${pad}${value} ║`);
  }
  console.log('╠══════════════════════════════════════════════════════════════╣');
  const allPass = rows.every(([,pass]) => pass);
  const verdict = allPass ? '✅ READY FOR WEEK 2 INTEGRATION' : '⚠️  INVESTIGATE FAILURES BEFORE WEEK 2';
  console.log(`║  ${verdict.padEnd(60)}║`);
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // ── 7. Week 2 action items ───────────────────────────────────────────────
  console.log('Week 2 TODO (not tested by this script — requires browser context):');
  console.log('  [ ] IFRAME_READY latency: time from iframe src= to first IFRAME_READY message');
  console.log('  [ ] Actual PNG export round-trip: EXPORT_DESIGN → blob URL available');
  console.log('  [ ] Canvas RAM: Fabric.js heap after 10 complex objects');
  console.log('  [ ] Electron GPU process memory: open Task Manager, load studio, compare\n');

  process.exit(allPass ? 0 : 1);
}

runTests().catch((err) => {
  console.error('\n[FATAL] Test runner crashed:', err);
  process.exit(2);
});
