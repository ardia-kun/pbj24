#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const TUGAS_PATH = path.resolve(__dirname, '..', 'data', 'daftar-tugas.csv');
const HEADERS = ['judul', 'deskripsi', 'tanggal', 'link'];

// --- Fungsi Utilitas CSV ---

function parseCSV(text) {
  if (!text || !text.trim()) return [];
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
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

function readTasks() {
    if (!fs.existsSync(TUGAS_PATH)) {
        console.error(`File tidak ditemukan: ${TUGAS_PATH}`);
        process.exit(1);
    }
    const text = fs.readFileSync(TUGAS_PATH, 'utf8');
    return parseCSV(text);
}

function writeTasks(tasks) {
    const text = toCSVText(tasks, HEADERS);
    fs.writeFileSync(TUGAS_PATH, text, 'utf8');
}

// --- Fungsi Utilitas Tanggal (diadaptasi dari script.js) ---

function startOfDay(d) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

function nearestWeekdayDate(base, targetWeekday) {
    const b = startOfDay(base);
    const diff = (targetWeekday - b.getDay() + 7) % 7;
    return addDays(b, diff);
}

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

    const weekdayAliases = [
        ['minggu',0], ['senin',1], ['selasa',2], ['rabu',3], ['kamis',4], ['jumat',5], ['jum\'at',5], ['sabtu',6]
    ];
    for (const [name, idx] of weekdayAliases) {
        if (s.includes(name)) {
            let date = nearestWeekdayDate(base, idx);
            // Jika kata "depan" ada dan hari target sebenarnya ada di minggu yang sama (misal: hari ini Senin, target "Rabu depan"),
            // maka kita perlu menambahkan 7 hari untuk pindah ke minggu berikutnya.
            if (s.includes('depan') && date.getDay() >= base.getDay() && date > base) {
                date = addDays(date, 7);
            }
            return date;
        }
    }

    const fallback = new Date(tanggalStr);
    if (!isNaN(fallback)) return fallback;
    return null;
}

// --- Fungsi Perintah ---

function listTasks() {
    const tasks = readTasks();
    if (tasks.length === 0) {
        console.log('Tidak ada tugas dalam daftar.');
        return;
    }
    console.log('Daftar Tugas:');
    tasks.forEach((task, index) => {
        console.log(`${index + 1}. [${task.tanggal || 'Tanpa Tanggal'}] ${task.judul}`);
    });
}

function addTask(args) {
    if (!args.judul) {
        console.error('Error: --judul harus diisi.');
        console.log('Contoh: node tools/manage_tasks.js add --judul "Tugas Baru" --tanggal "2024-12-31"');
        return;
    }
    const tasks = readTasks();
    const newTask = {
        judul: args.judul || '',
        deskripsi: args.deskripsi || '',
        tanggal: args.tanggal || '',
        link: args.link || ''
    };
    tasks.push(newTask);
    writeTasks(tasks);
    console.log('Tugas berhasil ditambahkan:');
    console.log(newTask);
}

function removeTask(index) {
    if (isNaN(index) || index < 1) {
        console.error('Error: Index harus berupa angka yang valid, mulai dari 1.');
        console.log('Gunakan `list` untuk melihat index tugas.');
        return;
    }
    const tasks = readTasks();
    if (index > tasks.length) {
        console.error(`Error: Index ${index} tidak valid. Hanya ada ${tasks.length} tugas.`);
        return;
    }
    const removed = tasks.splice(index - 1, 1);
    writeTasks(tasks);
    console.log('Tugas berhasil dihapus:');
    console.log(removed[0]);
}

function editTask(index, args) {
    if (isNaN(index) || index < 1) {
        console.error('Error: Index harus berupa angka yang valid, mulai dari 1.');
        return;
    }
    const tasks = readTasks();
    if (index > tasks.length) {
        console.error(`Error: Index ${index} tidak valid. Hanya ada ${tasks.length} tugas.`);
        return;
    }
    const taskToEdit = tasks[index - 1];
    let changed = false;
    for (const key of HEADERS) {
        if (args[key] !== undefined) {
            taskToEdit[key] = args[key];
            changed = true;
        }
    }

    if (!changed) {
        console.log('Tidak ada perubahan yang diberikan. Gunakan flag seperti --judul, --deskripsi, dll.');
        return;
    }

    writeTasks(tasks);
    console.log('Tugas berhasil diupdate:');
    console.log(tasks[index - 1]);
}

function purgeExpiredTasks() {
    const allTasks = readTasks();
    const today = startOfDay(new Date());
    
    const keptTasks = [];
    const removedTasks = [];

    allTasks.forEach(task => {
        const parsedDate = parseTanggalToDate(task.tanggal);
        if (parsedDate && parsedDate < today) {
            removedTasks.push(task);
        } else {
            keptTasks.push(task);
        }
    });

    if (removedTasks.length > 0) {
        writeTasks(keptTasks);
        console.log(`Berhasil menghapus ${removedTasks.length} tugas yang sudah kedaluwarsa:`);
        removedTasks.forEach(t => console.log(`- [${t.tanggal}] ${t.judul}`));
    } else {
        console.log('Tidak ada tugas kedaluwarsa yang ditemukan.');
    }
}

function printHelp() {
    console.log(`
Pengelola Tugas v1.0

Penggunaan: node tools/manage_tasks.js <perintah> [argumen]

Perintah:
  list                      Menampilkan semua tugas dengan index-nya.
  add                       Menambahkan tugas baru.
    --judul "Teks"          (Wajib) Judul tugas.
    --deskripsi "Teks"      Deskripsi tugas.
    --tanggal "YYYY-MM-DD"  Tanggal deadline.
    --link "URL"            Link pengumpulan.

  rm <index>                Menghapus tugas berdasarkan index dari 'list'.

  edit <index>              Mengedit tugas berdasarkan index.
    --judul "Teks Baru"     Mengubah judul.
    --deskripsi "Teks Baru" Mengubah deskripsi.
    --tanggal "Tanggal"     Mengubah tanggal.
    --link "URL Baru"       Mengubah link.

  purge                     Menghapus semua tugas yang tanggalnya sudah lewat.

  help                      Menampilkan pesan bantuan ini.

Contoh:
  node tools/manage_tasks.js list
  node tools/manage_tasks.js purge
  node tools/manage_tasks.js add --judul "Presentasi Proyek" --tanggal "besok"
  node tools/manage_tasks.js rm 3
  node tools/manage_tasks.js edit 1 --link "http://baru.com"
    `);
}

// --- Main Logic ---

function main() {
    const rawArgs = process.argv.slice(2);
    const command = rawArgs[0];
    const args = {};
    for (let i = 1; i < rawArgs.length; i++) {
        if (rawArgs[i].startsWith('--')) {
            const key = rawArgs[i].substring(2);
            const value = (i + 1 < rawArgs.length && !rawArgs[i + 1].startsWith('--')) ? rawArgs[i + 1] : true;
            args[key] = value;
            if (value !== true) i++;
        }
    }

    switch (command) {
        case 'list':
            listTasks();
            break;
        case 'add':
            addTask(args);
            break;
        case 'rm':
        case 'remove':
            removeTask(parseInt(rawArgs[1], 10));
            break;
        case 'edit':
            editTask(parseInt(rawArgs[1], 10), args);
            break;
        case 'purge':
            purgeExpiredTasks();
            break;
        case 'help':
        default:
            printHelp();
            break;
    }
}

if (require.main === module) {
    main();
}