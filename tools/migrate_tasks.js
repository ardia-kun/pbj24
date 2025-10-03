#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const INI_PATH = path.resolve(__dirname, '..', 'data', 'minggu-ini.csv');
const DEPAN_PATH = path.resolve(__dirname, '..', 'data', 'minggu-depan.csv');

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
      // escape if contains comma or quote
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
function startOfWeek(d) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = (day === 0) ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0,0,0,0);
  return x;
}
function isSameWeek(a, b) { return startOfWeek(a).getTime() === startOfWeek(b).getTime(); }

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
  const weekdayAliases = [ ['minggu',0], ['senin',1], ['selasa',2], ['rabu',3], ['kamis',4], ['jumat',5], ["jum'at",5], ['sabtu',6] ];
  for (const [name, idx] of weekdayAliases) if (s.includes(name)) return addDays(startOfDay(base), (idx - startOfDay(base).getDay() + 7) % 7);
  const fallback = new Date(tanggalStr);
  if (!isNaN(fallback)) return fallback;
  return null;
}

function backupFile(filePath) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = filePath + '.bak.' + ts;
  fs.copyFileSync(filePath, dest);
  return dest;
}

function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const forceUnparsed = args.includes('--force-unparsed');

  if (!fs.existsSync(INI_PATH) || !fs.existsSync(DEPAN_PATH)) {
    console.error('File CSV tidak ditemukan di data/. Pastikan file ada.');
    process.exit(1);
  }

  const iniText = fs.readFileSync(INI_PATH, 'utf8');
  const depanText = fs.readFileSync(DEPAN_PATH, 'utf8');
  const iniLines = iniText.trim().split('\n');
  const depanLines = depanText.trim().split('\n');
  const iniHeaders = iniLines[0].split(',').map(h => h.trim());
  const depanHeaders = depanLines[0].split(',').map(h => h.trim());

  const ini = parseCSV(iniText);
  const depan = parseCSV(depanText);
  const today = new Date();

  const toMove = [];
  const remain = [];

  for (const row of depan) {
    const parsed = parseTanggalToDate(row.tanggal, today);
    if (parsed && isSameWeek(parsed, today)) {
      toMove.push(row);
    } else if (!parsed && forceUnparsed) {
      toMove.push(row);
    } else {
      remain.push(row);
    }
  }

  console.log('Tanggal hari ini:', today.toISOString().slice(0,10));
  if (toMove.length === 0) {
    console.log('Tidak ada entri di minggu-depan yang perlu dipindahkan ke minggu-ini.');
    return;
  }

  console.log('Baris yang akan dipindahkan (' + toMove.length + '):');
  toMove.forEach((r, i) => {
    console.log(i+1, '-', r.judul || '(tanpa judul)', '| tanggal:', r.tanggal || '(kosong)');
  });

  if (!apply) {
    console.log('\nMode dry-run. Tidak ada perubahan file dibuat.');
    console.log('Untuk menulis perubahan, jalankan: node tools/migrate_tasks.js --apply');
    return;
  }

  // apply: backup and write
  const b1 = backupFile(INI_PATH);
  const b2 = backupFile(DEPAN_PATH);
  try {
    const newIni = ini.concat(toMove);
    const iniTextOut = toCSVText(newIni, iniHeaders);
    const depanTextOut = toCSVText(remain, depanHeaders);
    fs.writeFileSync(INI_PATH, iniTextOut, 'utf8');
    fs.writeFileSync(DEPAN_PATH, depanTextOut, 'utf8');
    console.log('Perubahan ditulis. Backup dibuat:', b1, b2);
  } catch (err) {
    console.error('Gagal menulis file:', err);
    // attempt restore
    try { fs.copyFileSync(b1, INI_PATH); fs.copyFileSync(b2, DEPAN_PATH); console.log('Mengembalikan file dari backup.'); } catch (e) { console.error('Gagal restore:', e); }
    process.exit(1);
  }
}

if (require.main === module) main();
