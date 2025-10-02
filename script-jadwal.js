document.addEventListener('DOMContentLoaded', () => {
    // Fungsi parseCSV tetap sama, tidak ada perubahan
    function parseCSV(text) {
        const lines = text.trim().split('\n');
        if (lines.length < 2) return []; // Kembalikan array kosong jika tidak ada data
        const headers = lines[0].split(',');
        const result = [];
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '') continue; // Lewati baris kosong
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

    // Fungsi untuk menampilkan tabel jadwal kuliah
    function renderTableKuliah(data, theadId, tbodyId) {
        const thead = document.getElementById(theadId);
        const tbody = document.getElementById(tbodyId);
        
        thead.innerHTML = '';
        tbody.innerHTML = '';

        if (data.length === 0) return;

        const headers = Object.keys(data[0]);
        let headerRow = '<tr>';
        headers.forEach(header => {
            headerRow += `<th>${header}</th>`;
        });
        headerRow += '</tr>';
        thead.innerHTML = headerRow;

        data.forEach(rowData => {
            let row = '<tr>';
            headers.forEach(header => {
                const cellData = rowData[header] === '-' ? '' : rowData[header];
                row += `<td>${cellData}</td>`;
            });
            row += '</tr>';
            tbody.innerHTML += row;
        });
    }

    // Mengambil kedua file CSV
    Promise.all([
        fetch('data/jadwal-kuliah.csv').then(response => response.ok ? response.text() : Promise.reject('File jadwal-kuliah.csv tidak ditemukan')),
        fetch('data/jadwal-piket.csv').then(response => response.ok ? response.text() : Promise.reject('File jadwal-piket.csv tidak ditemukan'))
    ])
    .then(([csvKuliah, csvPiket]) => {
        const dataKuliah = parseCSV(csvKuliah);
        const dataPiket = parseCSV(csvPiket);

        renderTableKuliah(dataKuliah, 'jadwal-kuliah-head', 'jadwal-kuliah-body');
        
        const piketContainer = document.getElementById('jadwal-piket-container');
        
        // **PERBAIKAN UTAMA ADA DI SINI**
        // Kita gunakan objek kosong {} sebagai fallback untuk mencegah error
        const minggu1 = dataPiket[0] || {};
        const minggu2 = dataPiket[1] || {};

        // Fungsi kecil untuk mendapatkan nama dan format, agar lebih aman
        const getPiketNames = (dayData) => (dayData || '').replace(/, /g, '<br>');

        let piketHTML = `
            <h2 class="mb-3">Jadwal Piket</h2>
            <h4 class="mt-4">Minggu Pertama & Ketiga</h4>
            <div class="table-responsive">
                <table class="table table-bordered table-striped table-hover">
                    <thead>
                        <tr><th>Selasa</th><th>Rabu</th><th>Kamis</th><th>Jumat</th></tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>${getPiketNames(minggu1.Selasa)}</td>
                            <td>${getPiketNames(minggu1.Rabu)}</td>
                            <td>${getPiketNames(minggu1.Kamis)}</td>
                            <td>${getPiketNames(minggu1.Jumat)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <h4 class="mt-4">Minggu Kedua & Keempat</h4>
            <div class="table-responsive">
                <table class="table table-bordered table-striped table-hover">
                    <thead>
                        <tr><th>Selasa</th><th>Rabu</th><th>Kamis</th><th>Jumat</th></tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>${getPiketNames(minggu2.Selasa)}</td>
                            <td>${getPiketNames(minggu2.Rabu)}</td>
                            <td>${getPiketNames(minggu2.Kamis)}</td>
                            <td>${getPiketNames(minggu2.Jumat)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
        piketContainer.innerHTML = piketHTML;
    })
    .catch(error => {
        console.error('Error fetching data:', error);
        document.getElementById('jadwal-kuliah-container').innerHTML = `<p class="text-danger">Gagal memuat jadwal kuliah. ${error}</p>`;
        document.getElementById('jadwal-piket-container').innerHTML = `<p class="text-danger">Gagal memuat jadwal piket. ${error}</p>`;
    });
});