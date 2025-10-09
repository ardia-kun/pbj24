#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '..', 'data');

function findBackups() {
  return fs.readdirSync(DATA_DIR).filter(f => f.includes('.bak.'));
}

function originalForBackup(bname) {
  // remove first .bak. and everything after
  const idx = bname.indexOf('.bak.');
  if (idx === -1) return null;
  return bname.slice(0, idx);
}

function main() {
  const backups = findBackups();
  if (backups.length === 0) {
    console.log('Tidak ada file backup ditemukan di data/.');
    return;
  }

  const toDelete = [];
  for (const b of backups) {
    const bpath = path.join(DATA_DIR, b);
    let stat;
    try { stat = fs.statSync(bpath); } catch (e) { continue; }
    if (stat.size === 0) {
      toDelete.push(bpath);
      continue;
    }
    const origName = originalForBackup(b);
    if (!origName) continue;
    const origPath = path.join(DATA_DIR, origName);
    if (!fs.existsSync(origPath)) continue;
    try {
      const a = fs.readFileSync(bpath, 'utf8');
      const o = fs.readFileSync(origPath, 'utf8');
      if (a === o) {
        toDelete.push(bpath);
      }
    } catch (e) {
      // ignore read errors
    }
  }

  if (toDelete.length === 0) {
    console.log('Tidak ada backup kosong/duplikat untuk dihapus.');
    return;
  }

  for (const p of toDelete) {
    try { fs.unlinkSync(p); console.log('Menghapus backup:', p); } catch (e) { console.error('Gagal menghapus', p, e.message); }
  }
}

if (require.main === module) main();
