document.addEventListener('DOMContentLoaded', () => {
    const materiContainer = document.getElementById('daftar-materi-container');

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

    function getIconForCategory(kategori) {
        const cat = (kategori || '').toLowerCase();
        if (cat.includes('pdf')) return '<i class="bi bi-file-earmark-pdf-fill text-danger"></i>';
        if (cat.includes('video')) return '<i class="bi bi-youtube text-danger"></i>';
        if (cat.includes('doc')) return '<i class="bi bi-file-earmark-word-fill text-primary"></i>';
        if (cat.includes('ppt') || cat.includes('slide')) return '<i class="bi bi-file-earmark-slides-fill text-warning"></i>';
        return '<i class="bi bi-link-45deg"></i>';
    }

    function renderMateri(materiList) {
        materiContainer.innerHTML = '';

        // 1. Kelompokkan materi berdasarkan mata kuliah (matkul)
        const groupedByMatkul = materiList.reduce((acc, materi) => {
            const matkul = materi.matkul || 'Lain-lain';
            if (!acc[matkul]) {
                acc[matkul] = [];
            }
            acc[matkul].push(materi);
            return acc;
        }, {});

        // 2. Buat HTML untuk setiap kelompok
        const accordionId = "materiAccordion";
        let accordionHTML = `<div class="accordion" id="${accordionId}">`;

        Object.keys(groupedByMatkul).forEach((matkul, index) => {
            const materiItems = groupedByMatkul[matkul];
            const collapseId = `collapse-${index}`;
            const headerId = `header-${index}`;

            accordionHTML += `
                <div class="accordion-item">
                    <h2 class="accordion-header" id="${headerId}">
                        <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="true" aria-controls="${collapseId}">
                            ${matkul}
                        </button>
                    </h2>
                    <div id="${collapseId}" class="accordion-collapse collapse show" aria-labelledby="${headerId}" data-bs-parent="#${accordionId}">
                        <div class="accordion-body">
                            <ul class="list-group">
                                ${materiItems.map(item => `
                                    <li class="list-group-item d-flex justify-content-between align-items-center">
                                        <div>
                                            <strong>${item.judul}</strong>
                                            ${item.deskripsi ? `<br><small class="text-muted">${item.deskripsi}</small>` : ''}
                                        </div>
                                        <a href="${item.link}" class="btn btn-outline-primary btn-sm" target="_blank" rel="noopener noreferrer">
                                            ${getIconForCategory(item.kategori)} Buka
                                        </a>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
            `;
        });

        accordionHTML += '</div>';
        materiContainer.innerHTML = accordionHTML;
    }

    fetch(`data/materi-kuliah.csv?_=${Date.now()}`)
        .then(response => response.ok ? response.text() : Promise.reject('File tidak ditemukan'))
        .then(csvText => {
            const allMateri = parseCSV(csvText);
            renderMateri(allMateri);
        })
        .catch(error => {
            console.error('Error:', error);
            materiContainer.innerHTML = '<p class="text-danger">Gagal memuat data materi.</p>';
        });
});