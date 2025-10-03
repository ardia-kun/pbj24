const fs = require('fs');

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
  const weekdayAliases = [ ['minggu',0], ['senin',1], ['selasa',2], ['rabu',3], ['kamis',4], ['jumat',5], ['jum\'at',5], ['sabtu',6] ];
  for (const [name, idx] of weekdayAliases) if (s.includes(name)) return addDays(startOfDay(base), (idx - startOfDay(base).getDay() + 7) % 7);
  const fallback = new Date(tanggalStr);
  if (!isNaN(fallback)) return fallback;
  return null;
}

const iniText = fs.readFileSync('data/minggu-ini.csv', 'utf8');
const depanText = fs.readFileSync('data/minggu-depan.csv', 'utf8');
const ini = parseCSV(iniText).map(t => ({...t, _source: 'ini'}));
const depan = parseCSV(depanText).map(t => ({...t, _source: 'depan'}));
const all = ini.concat(depan);
const today = new Date();

const tasksThisWeek = [];
all.forEach(t => {
  const parsed = parseTanggalToDate(t.tanggal, today);
  if (parsed) {
    if (isSameWeek(parsed, today)) tasksThisWeek.push({t, parsed});
  } else {
    if (t._source === 'ini') tasksThisWeek.push({t, parsed: null});
  }
});

console.log('Tanggal hari ini:', today.toISOString().slice(0,10));
if (tasksThisWeek.length === 0) console.log('Tidak ada tugas untuk minggu ini.');
else {
  console.log('Tugas yang dianggap untuk minggu ini:');
  tasksThisWeek.forEach(({t, parsed}, i) => {
    console.log(i+1, '-', t.judul || '(tanpa judul)', '| tanggal asli:', t.tanggal || '(kosong)', '| parsed:', parsed ? parsed.toISOString().slice(0,10) : '(tidak ter-parse)');
  });
}
