document.addEventListener('DOMContentLoaded', () => {
    const daftarTugasContainer = document.getElementById('daftar-tugas');

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

    // Try to parse some common Indonesian date formats from the 'tanggal' field.
    function parseTanggalToDate(tanggalStr, base = new Date()) {
        if (!tanggalStr) return null;
        // normalize and strip common time phrases to focus on date
        let s = tanggalStr.trim().toLowerCase();
        // remove time phrases like "sebelum jam 12 malam", "pukul 08:00", "jam 7"
        s = s.replace(/sebelum\s+jam\s+[^,;]*/g, '');
        s = s.replace(/pukul\s+[^,;]*/g, '');
        s = s.replace(/\bjam\s+\d{1,2}(:\d{2})?\b/g, '');
        s = s.replace(/,|\(|\)/g, '');
        s = s.trim();
        // ISO date YYYY-MM-DD
        const isoMatch = s.match(/(\d{4}-\d{2}-\d{2})/);
        if (isoMatch) return new Date(isoMatch[1]);

        // dd-mm-yyyy or dd/mm/yyyy (treat as day/month/year explicitly)
        const dmyMatch = s.match(/(\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b)/);
        if (dmyMatch) {
            const parts = dmyMatch[1].split(/[-\/]/).map(x => parseInt(x, 10));
            let day = parts[0], month = parts[1], year = parts[2];
            if (year < 100) year += 2000;
            const dt = new Date(year, month - 1, day);
            if (!isNaN(dt)) return dt;
        }

        // dd-mm or dd/mm (no year) -> assume current year
        const dmMatch = s.match(/(\b\d{1,2}[\/\-]\d{1,2}\b)/);
        if (dmMatch) {
            const parts = dmMatch[1].split(/[-\/]/).map(x => parseInt(x,10));
            const day = parts[0], month = parts[1];
            const year = base.getFullYear();
            const dt = new Date(year, month - 1, day);
            if (!isNaN(dt)) return dt;
        }

        // relative words
        if (s.includes('hari ini')) return startOfDay(new Date(base));
        if (s === 'besok' || s.includes('\bbesok\b')) return addDays(startOfDay(base), 1);
        if (s === 'lusa' || s.includes('lusa')) return addDays(startOfDay(base), 2);

        // weekday names in Indonesian (find nearest upcoming or this week's occurrence)
        const weekdayAliases = [
            ['minggu',0], ['senin',1], ['selasa',2], ['rabu',3], ['kamis',4], ['jumat',5], ['jum\'at',5], ['sabtu',6]
        ];
        for (const [name, idx] of weekdayAliases) {
            if (s.includes(name)) return nearestWeekdayDate(base, idx);
        }

        // try to parse with Date fallback (may work for some localized strings)
        const fallback = new Date(tanggalStr);
        if (!isNaN(fallback)) return fallback;
        return null;
    }

    function startOfDay(d) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
    function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

    // return the date of this week's weekday; if that weekday already passed, return next occurrence
    function nearestWeekdayDate(base, targetWeekday) {
        const b = startOfDay(base);
        const diff = (targetWeekday - b.getDay() + 7) % 7; // days until target in this week (0..6)
        return addDays(b, diff);
    }

    function startOfWeek(d) {
        // week starts on Monday
        const x = new Date(d);
        const day = x.getDay();
        const diff = (day === 0) ? -6 : 1 - day; // if Sun (0) go back 6 days, else back to Monday
        x.setDate(x.getDate() + diff);
        x.setHours(0,0,0,0);
        return x;
    }

    function isSameWeek(a, b) {
        return startOfWeek(a).getTime() === startOfWeek(b).getTime();
    }

    function isNextWeek(date, base) {
        const nextWeekStart = addDays(startOfWeek(base), 7);
        const nextWeekEnd = addDays(nextWeekStart, 6);
        const d = startOfDay(date);
        return d >= nextWeekStart && d <= nextWeekEnd;
    }

    function renderTasks(tasks) {
        daftarTugasContainer.innerHTML = '';
        tasks.forEach((tugas, index) => {
            let linkButtonHTML = '';
            if (tugas.link && tugas.link.trim() !== '') {
                linkButtonHTML = `<a href="${tugas.link}" class="btn btn-success btn-sm" target="_blank" rel="noopener noreferrer">Kumpulkan Tugas</a>`;
            }

            const card = `
                <div class="col-md-6 col-lg-4 mb-4" style="animation-delay: ${index * 100}ms;">
                    <div class="card card-tugas h-100">
                        <div class="card-body d-flex flex-column">
                            <h5 class="card-title">${tugas.judul || ''}</h5>
                            <p class="card-text flex-grow-1">${tugas.deskripsi || ''}</p>
                            <div class="w-100 d-flex justify-content-between align-items-center gap-2">
                                <span class="card-deadline">${tugas.tanggal || ''}</span>
                                ${linkButtonHTML}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            daftarTugasContainer.innerHTML += card;
        });
    }

    // load both CSVs then decide which tasks are for minggu ini
    const cacheBuster = Date.now();

    // prefer data/daftar-tugas.csv if present
    fetch(`data/daftar-tugas.csv?_=${cacheBuster}`, { cache: 'no-store' }).then(r => {
        if (r.ok) return r.text().then(text => ({ type: 'daftar', text }));
        // fallback to old files
        return Promise.all([
            fetch(`data/minggu-ini.csv?_=${cacheBuster}`, { cache: 'no-store' }).then(r => r.text()).catch(() => ''),
            fetch(`data/minggu-depan.csv?_=${cacheBuster}`, { cache: 'no-store' }).then(r => r.text()).catch(() => '')
        ]).then(([iniText, depanText]) => ({ type: 'split', iniText, depanText }));
    }).then(result => {
        let all = [];
        if (result.type === 'daftar') {
            all = parseCSV(result.text).map(t => ({...t, _source: 'daftar'}));
        } else {
            const ini = parseCSV(result.iniText).map(t => ({...t, _source: 'ini'}));
            const depan = parseCSV(result.depanText).map(t => ({...t, _source: 'depan'}));
            all = ini.concat(depan);
        }
        const today = new Date();

        const tasksThisWeek = [];
        all.forEach(t => {
            const parsed = parseTanggalToDate(t.tanggal, today);
            if (parsed) {
                if (isSameWeek(parsed, today)) tasksThisWeek.push(t);
            } else {
                // if using daftar-tugas, keep non-parseable entries; else keep only minggu-ini source
                if (t._source === 'daftar' || t._source === 'ini') tasksThisWeek.push(t);
            }
        });

        // if no tasks found, show a friendly message
        if (tasksThisWeek.length === 0) {
            daftarTugasContainer.innerHTML = '<p class="text-muted">Tidak ada tugas untuk minggu ini.</p>';
            return;
        }

        renderTasks(tasksThisWeek);
    }).catch(err => {
        console.error(err);
        daftarTugasContainer.innerHTML = '<p class="text-danger">Maaf, terjadi kesalahan saat memuat data tugas.</p>';
    });
});