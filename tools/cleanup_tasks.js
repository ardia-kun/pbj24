#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const DEFAULT_FILES = [
  path.resolve(__dirname, '..', 'data', 'daftar-tugas.csv'),
  path.resolve(__dirname, '..', 'data', 'minggu-ini.csv'),
  path.resolve(__dirname, '..', 'data', 'minggu-depan.csv')
];

function parseCSV(text) {
  if (!text || !text.trim()) return [];
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const result = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const obj = {};
    const values = lines[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
    for (let j = 0; j < headers.length; j++) {
      let value = (values[j] || '').trim();
      if (value.startsWith('"') && value.endsWith('"')) { value = value.slice(1, -1); }
      obj[headers[j]] = value;
    }
    result.push(obj);
  }
  return result;
}

function toCSVText(records, headers) {
  const lines = [headers.join(',')];
  for (const r of records) {
    const row = headers.map(h => {
      const v = r[h] != null ? String(r[h]) : '';
      if (v.includes(',') || v.includes('"') || v.includes('\n')) {
        return '"' + v.replace(/"/g, '""') + '"';
      }
      return v;
    });
    lines.push(row.join(','));
  }
  return lines.join('\n') + '\n';
}

function startOfDay(d) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

function parseTanggalToDate(tanggalStr, base = new Date()) {
  if (!tanggalStr) return null;
  let s = tanggalStr.trim().toLowerCase();
  s = s.replace(/sebelum\s+jam\s+[^,;]*/g, '');
  s = s.replace(/pukul\s+[^,;]*/g, '');
  s = s.replace(/\bjam\s+\d{1,2}(:\d{2})?\b/g, '');
  s = s.replace(/,|\(|\)/g, '');
  s = s.trim();
  const isoMatch = s.match(/(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return new Date(isoMatch[1]);
  const dmyMatch = s.match(/(\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b)/);
  if (dmyMatch) {
    const norm = dmyMatch[1].replace(/-/g, '/');
    const dt = new Date(norm);
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
  const weekdayAliases = [ ['minggu',0], ['senin',1], ['selasa',2], ['rabu',3], ['kamis',4], ['jumat',5], ['jum\'at',5], ['sabtu',6] ];
  for (const [name, idx] of weekdayAliases) if (s.includes(name)) return addDays(startOfDay(base), (idx - startOfDay(base).getDay() + 7) % 7);
  const fallback = new Date(tanggalStr);
  if (!isNaN(fallback)) return fallback;
  return null;
}

function processFile(filePath, apply, today, noBackup) {
  if (!fs.existsSync(filePath)) return { file: filePath, changed: false, removed: 0 };
  const text = fs.readFileSync(filePath, 'utf8');
  const headers = text.trim().split('\n')[0].split(',').map(h => h.trim());
  const rows = parseCSV(text);
  const keep = [];
  const remove = [];
  for (const r of rows) {
    const parsed = parseTanggalToDate(r.tanggal, today);
    if (parsed && startOfDay(parsed) < startOfDay(today)) remove.push(r);
    else keep.push(r);
  }

  if (remove.length === 0) return { file: filePath, changed: false, removed: 0 };

  if (!apply) return { file: filePath, changed: true, removed: remove.length, preview: remove };

  // apply: write back (no backups)
  try {
    const out = toCSVText(keep, headers);
    fs.writeFileSync(filePath, out, 'utf8');
    return { file: filePath, changed: true, removed: remove.length };
  } catch (err) {
    throw err;
  }
}

function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const filesArgIndex = args.indexOf('--files');
  let files = DEFAULT_FILES.slice();
  if (filesArgIndex !== -1 && args[filesArgIndex + 1]) {
    files = args[filesArgIndex + 1].split(',').map(p => path.resolve(p));
  }

  const today = new Date();
  console.log('Tanggal hari ini:', today.toISOString().slice(0,10));

  const results = [];
  for (const f of files) {
    try {
      const res = processFile(f, apply, today);
      results.push(res);
      if (!res.changed) console.log('-', path.basename(f), ': tidak ada tugas kedaluwarsa');
      else if (!apply) console.log('-', path.basename(f), ':', res.removed, 'tugas kedaluwarsa (dry-run)');
      else {
        console.log('-', path.basename(f), ':', res.removed, 'tugas dihapus.');
      }
    } catch (err) {
      console.error('Gagal memproses', f, err.message);
    }
  }
  console.log('\nSelesai.');
}

if (require.main === module) main();

if (require.main === module) main();
