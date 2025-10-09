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

    function isNextWeek(date, base) {
        const nextWeekStart = addDays(startOfWeek(base), 7);
        const nextWeekEnd = addDays(nextWeekStart, 6);
        const d = startOfDay(date);
        return d >= nextWeekStart && d <= nextWeekEnd;
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
        const weekdayAliases = [ ['minggu',0], ['senin',1], ['selasa',2], ['rabu',3], ['kamis',4], ['jumat',5], ['jum\'at',5], ['sabtu',6] ];
        for (const [name, idx] of weekdayAliases) if (s.includes(name)) return addDays(startOfDay(base), (idx - startOfDay(base).getDay() + 7) % 7);
        const fallback = new Date(tanggalStr);
        if (!isNaN(fallback)) return fallback;
        return null;
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

    const cacheBuster = Date.now();
    // prefer daftar-tugas.csv
    fetch(`data/daftar-tugas.csv?_=${cacheBuster}`, { cache: 'no-store' }).then(r => {
        if (r.ok) return r.text().then(text => ({ type: 'daftar', text }));
        return fetch(`data/minggu-depan.csv?_=${cacheBuster}`, { cache: 'no-store' }).then(r => r.text()).then(text => ({ type: 'split', text }));
    }).then(result => {
        let data = [];
        const today = new Date();
        if (result.type === 'daftar') {
            data = parseCSV(result.text).map(t => ({...t, _source: 'daftar'}));
        } else {
            data = parseCSV(result.text).map(t => ({...t, _source: 'depan'}));
        }

        const tasksNextWeek = [];
        data.forEach(t => {
            const parsed = parseTanggalToDate(t.tanggal, today);
            if (parsed) {
                if (isNextWeek(parsed, today)) tasksNextWeek.push(t);
            } else {
                // keep non-parseable when using daftar, otherwise keep as minggu depan
                if (t._source === 'daftar' || t._source === 'depan') tasksNextWeek.push(t);
            }
        });

        if (tasksNextWeek.length === 0) {
            daftarTugasContainer.innerHTML = '<p class="text-muted">Tidak ada tugas untuk minggu depan.</p>';
            return;
        }

        renderTasks(tasksNextWeek);
    }).catch(error => {
        console.error('Error:', error);
        daftarTugasContainer.innerHTML = '<p class="text-danger">Maaf, terjadi kesalahan saat memuat data tugas.</p>';
    });
});