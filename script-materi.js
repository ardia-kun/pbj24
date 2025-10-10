document.addEventListener('DOMContentLoaded', () => {
    const daftarMateriContainer = document.getElementById('daftar-materi');

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

    const cacheBuster = Date.now();
    fetch(`data/materi-kuliah.csv?_=${cacheBuster}`, { cache: 'no-store' })
        .then(response => {
            if (!response.ok) throw new Error(`Gagal memuat file: ${response.statusText}`);
            return response.text();
        })
        .then(csvText => {
            const data = parseCSV(csvText);
            daftarMateriContainer.innerHTML = '';

            if (data.length === 0) {
                daftarMateriContainer.innerHTML = '<p class="text-muted">Belum ada materi yang ditambahkan.</p>';
                return;
            }

            data.forEach((materi, index) => {
                let linkButtonHTML = '';
                if (materi.link && materi.link.trim() !== '') {
                    linkButtonHTML = `<a href="${materi.link}" class="btn btn-primary btn-sm" target="_blank" rel="noopener noreferrer">Buka Materi</a>`;
                }

                const card = `
                    <div class="col-md-6 col-lg-4 mb-4" style="animation-delay: ${index * 100}ms;">
                        <div class="card card-tugas h-100">
                            <div class="card-body d-flex flex-column">
                                <h6 class="card-subtitle mb-2 text-muted">${materi.matkul}</h6>
                                <h5 class="card-title">${materi.judul}</h5>
                                <p class="card-text flex-grow-1">${materi.deskripsi}</p>
                                <div class="w-100">
                                    <span class="badge bg-secondary">${materi.kategori}</span>
                                    ${linkButtonHTML}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                daftarMateriContainer.innerHTML += card;
            });
        })
        .catch(error => {
            console.error('Error:', error);
            daftarMateriContainer.innerHTML = '<p class="text-danger">Maaf, terjadi kesalahan saat memuat data materi.</p>';
        });
});