document.addEventListener('DOMContentLoaded', () => {
    const daftarTugasContainer = document.getElementById('daftar-tugas');
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

    fetch('data/minggu-ini.csv')
        .then(response => response.text())
        .then(csvText => {
            const data = parseCSV(csvText);
            daftarTugasContainer.innerHTML = '';
            
            data.forEach((tugas, index) => { // tambahkan 'index'
                // ... (kode linkButtonHTML tetap sama) ...
                let linkButtonHTML = '';
                if (tugas.link && tugas.link.trim() !== '') {
                    linkButtonHTML = `<a href="${tugas.link}" class="btn btn-success btn-sm" target="_blank" rel="noopener noreferrer">Kumpulkan Tugas</a>`;
                }

                const card = `
                    <div class="col-md-6 col-lg-4 mb-4" style="animation-delay: ${index * 100}ms;">
                        <div class="card card-tugas h-100">
                            <div class="card-body d-flex flex-column">
                                <h5 class="card-title">${tugas.judul}</h5>
                                <p class="card-text flex-grow-1">${tugas.deskripsi}</p>
                                <div class="w-100">
                                    <span class="card-deadline">${tugas.tanggal}</span>
                                    ${linkButtonHTML}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                daftarTugasContainer.innerHTML += card;
            });
        })
        .catch(error => {
            console.error('Error:', error);
            daftarTugasContainer.innerHTML = '<p class="text-danger">Maaf, terjadi kesalahan saat memuat data tugas.</p>';
        });
});