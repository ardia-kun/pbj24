document.addEventListener('DOMContentLoaded', () => {
    const daftarMateriContainer = document.getElementById('daftar-materi');
    // ... (fungsi parseCSV tetap sama) ...
    function parseCSV(text) {
        const lines = text.trim().split('\n');
        const headers = lines[0].split(',');
        const result = [];
        for (let i = 1; i < lines.length; i++) {
            const obj = {};
            const values = lines[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
            for (let j = 0; j < headers.length; j++) {
                let value = values[j] || '';
                if (value.startsWith('"') && value.endsWith('"')) { value = value.slice(1, -1); }
                obj[headers[j].trim()] = value;
            }
            result.push(obj);
        }
        return result;
    }

    fetch('data/materi-kuliah.csv')
        .then(response => response.text())
        .then(csvText => {
            const data = parseCSV(csvText);
            daftarMateriContainer.innerHTML = '';

            data.forEach((materi, index) => { // tambahkan 'index'
                // ... (kode linkButtonHTML tetap sama) ...
                let linkButtonHTML = '';
                if (materi.link && materi.link.trim() !== '') {
                    linkButtonHTML = `<a href="${materi.link}" class="btn btn-primary btn-sm" target="_blank" rel="noopener noreferrer">Buka Materi</a>`;
                }

                const card = `
                    <div class="col-md-6 col-lg-4 mb-4" style="animation-delay: ${index * 100}ms;">
                        <div class="card card-tugas h-100">
                            <div class="card-body d-flex flex-column">
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