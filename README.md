# Studio Konten Humas — Panduan Pasang

Aplikasi pembuat konten media sosial Poltekkes Kemenkes Makassar sesuai SE Sesditjen SDM Kesehatan No. HK.02.03/F.I/9394/2026.

- **Tampilan aplikasi** → GitHub Pages (folder `web/`)
- **Server** → Google Apps Script (file `apps-script/Code.gs`)
- **Data** → Google Sheet (daftar desain) dan Google Drive (foto draf + gambar final)

---

## A. Pasang server (Apps Script) — sekali saja

1. Buka https://script.google.com → **Proyek baru**. Beri nama `Studio Konten Humas`.
2. Hapus isi `Code.gs`, tempel seluruh isi `apps-script/Code.gs` dari paket ini.
3. Di baris `PIN: 'GANTI-PIN-INI'`, ganti dengan PIN Anda (minimal 4 karakter). Simpan.
4. Di toolbar, pilih fungsi **setup**, klik **Run**, lalu izinkan akses (Drive dan Sheet).
   Setup otomatis membuat di Google Drive Anda:
   - folder **Studio Konten Humas**, berisi subfolder **Draf** dan **Hasil**
   - Google Sheet **Studio Konten Humas - Data**
5. Klik **Deploy → New deployment** → ikon roda gigi → **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Klik **Deploy**, salin **Web app URL** (berakhiran `/exec`).

> Kalau nanti Code.gs diubah: **Deploy → Manage deployments → pensil → Version: New version → Deploy**. URL tetap sama.

## B. Pasang tampilan di GitHub Pages

1. Buat repository baru di GitHub, misalnya `studio-konten-humas`.
2. Unggah **seluruh isi folder `web/`** (index.html, app.js, editor-core.js, style.css, sw.js, manifest.webmanifest, folder assets) ke repository.
3. Buka **Settings → Pages** → Source: **Deploy from a branch** → Branch: `main`, folder `/ (root)` → **Save**.
4. Tunggu 1–2 menit, aplikasi bisa dibuka di `https://<nama-akun>.github.io/studio-konten-humas/`.

## C. Hubungkan aplikasi ke server

1. Buka aplikasi → menu **Pengaturan**.
2. Isi **Alamat server** dengan Web app URL dari langkah A.6, dan **PIN** yang sama dengan Code.gs.
3. Tautan Google Form Humas dan tagar wajib sudah terisi. Ubah bila perlu.
4. Klik **Simpan dan tes koneksi**. Status di kiri bawah berubah menjadi **Terhubung**.
5. Di HP: buka lewat Chrome → menu ⋮ → **Tambahkan ke layar utama**, atau tombol **Pasang aplikasi** di menu.

## D. Alur kerja

1. **Buat Desain** → isi judul konten dan rencana tanggal unggah.
2. Buat slide: pilih bingkai, layout, unggah foto, tulis teks. Tombol **+** menambah slide (maks. 10, sesuai batas unggah formulir Humas).
3. Buat caption → **Simpan draf**.
4. **Kirim ke Humas**:
   1. Simpan gambar final ke Drive (folder *Hasil*) dan/atau unduh ke perangkat
   2. Salin judul
   3. Salin caption (otomatis digabung jadi satu baris karena kolom formulir hanya satu baris)
   4. Buka formulir → tempel judul dan caption → **Add file → My Drive → Studio Konten Humas → Hasil**
   5. Klik **Sudah saya kirim** → status menjadi *Terkirim ke Humas*
5. Saat Humas sudah menayangkan atau meminta revisi, buka **Status** di daftar desain: pilih *Tayang* (tempel tautan postingan) atau *Perlu revisi* (tulis catatan).

## E. Caption dengan AI (opsional)

Tanpa pengaturan apa pun, caption disusun dari pola otomatis. Agar ditulis AI:
Apps Script → **Project Settings → Script Properties → Add property** → nama `ANTHROPIC_API_KEY`, nilai = kunci API dari https://console.anthropic.com (berbayar per pemakaian). Jangan menempel kunci di dalam kode.

## F. Keamanan

- Server diakses dengan PIN. Jangan bagikan PIN di luar orang yang berwenang.
- Setelah 20 kali PIN salah, server menolak percobaan selama 10 menit.
- Foto draf (termasuk foto anak) tersimpan di Drive Anda sendiri. Jangan bagikan folder *Draf* secara publik.
- Mengganti PIN: ubah `CONFIG.PIN`, jalankan **setup** lagi, lalu perbarui PIN di menu Pengaturan aplikasi.

## G. Mengganti template

Template ada di `web/assets/t1.jpg` sampai `t4.jpg` (1080×1350). Untuk template 2–4, bagian dalam bingkai mengikuti file `mask-t2.png` sampai `mask-t4.png`. Kalau bentuk bingkai berubah, koordinat di objek `TPL` dalam `editor-core.js` juga perlu disesuaikan.
