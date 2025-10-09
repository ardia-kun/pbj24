// Simple unit tests for the date parser used in workflows/scripts.
// Runs with: node tools/test_date_parser.js

function startOfDay(d) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

function parseTanggalToDate(tanggalStr, base = new Date('2025-10-03')) {
  if (!tanggalStr) return null;
  let s = tanggalStr.toString().trim().toLowerCase();
  s = s.replace(/sebelum\s+jam\s+[^,;]*/g, '');
  s = s.replace(/pukul\s+[^,;]*/g, '');
  s = s.replace(/\bjam\s+\d{1,2}(:\d{2})?\b/g, '');
  s = s.replace(/,|\(|\)/g, '');
  s = s.trim();

  const isoMatch = s.match(/(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return new Date(isoMatch[1]);

  const dmyMatch = s.match(/(\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b)/);
  if (dmyMatch) {
    // treat as dd/mm/yyyy or dd-mm-yyyy explicitly
    const parts = dmyMatch[1].split(/[-\/]/).map(x => parseInt(x, 10));
    let day = parts[0], month = parts[1], year = parts[2];
    if (year < 100) year += 2000;
    const dt = new Date(year, month - 1, day);
    if (!isNaN(dt)) return dt;
  }

  const dmMatch = s.match(/(\b\d{1,2}[\/\-]\d{1,2}\b)/);
  if (dmMatch) {
    const parts = dmMatch[1].split(/[-\/]/).map(x => parseInt(x,10));
    const day = parts[0], month = parts[1];
    const year = base.getFullYear();
    const dt = new Date(year, month - 1, day);
    if (!isNaN(dt)) return dt;
  }

  if (s.includes('hari ini')) return startOfDay(new Date(base));
  if (s === 'besok' || /\bbesok\b/.test(s)) return addDays(startOfDay(base), 1);
  if (s === 'lusa' || s.includes('lusa')) return addDays(startOfDay(base), 2);

  const weekdayAliases = [ ['minggu',0], ['senin',1], ['selasa',2], ['rabu',3], ['kamis',4], ['jumat',5], ["jum'at",5], ['sabtu',6] ];
  for (const [name, idx] of weekdayAliases) if (s.includes(name)) {
    const b = startOfDay(base);
    const diff = (idx - b.getDay() + 7) % 7;
    return addDays(b, diff);
  }

  const fallback = new Date(tanggalStr);
  if (!isNaN(fallback)) return fallback;
  return null;
}

function iso(d) { if (!d) return null; return d.toISOString().slice(0,10); }

const base = new Date('2025-10-03'); // fixed base for deterministic tests

const cases = [
  { input: '2025-12-25', expect: '2025-12-25' },
  { input: '03/10/2025', expect: '2025-10-03' },
  { input: '3-10', expect: '2025-10-03' },
  { input: 'besok', expect: '2025-10-04' },
  { input: 'lusa', expect: '2025-10-05' },
  { input: 'hari ini', expect: '2025-10-03' },
  { input: 'Rabu Sebelum Jam 12 Malam', expect: '2025-10-08' },
  { input: 'Senin', expect: '2025-10-06' },
  { input: '', expect: null },
  { input: 'not a date', expect: null }
];

let failed = 0;
for (const c of cases) {
  const parsed = parseTanggalToDate(c.input, base);
  const out = iso(parsed);
  const ok = out === c.expect;
  if (!ok) {
    console.error(`FAIL: input='${c.input}' => got='${out}', want='${c.expect}'`);
    failed++;
  } else {
    console.log(`OK: '${c.input}' -> ${out}`);
  }
}

if (failed > 0) {
  console.error(`${failed} tests failed`);
  process.exit(1);
} else {
  console.log('All tests passed');
}
