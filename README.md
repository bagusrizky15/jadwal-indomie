# Jadwal Indomie

Extension Chrome untuk melihat hari ini WFH atau WFO. Pola kerjanya bisa diatur (misalnya 1 hari WFH, 3 hari WFO), lalu diulang terus. Weekend dan hari libur dilewati, jadi siklusnya berhenti di hari libur dan lanjut lagi di hari kerja berikutnya.

## Fitur

### Hari ini

Kartu besar menampilkan status hari ini (WFH, WFO, atau Libur) dan posisinya dalam siklus, contohnya "WFO ke-3 dari 3, lalu WFH". Di bawahnya ada strip beberapa hari ke depan dan tanggal WFH berikutnya beserta hitung mundurnya.

<p>
  <img src="media/day-light.png" width="260" alt="Tampilan Hari ini, mode terang">
  <img src="media/day-dark.png" width="260" alt="Tampilan Hari ini, mode gelap">
</p>

### Bulan

Kalender satu bulan dengan warna per status: biru untuk WFH, abu-abu untuk WFO, merah untuk libur. Arahkan kursor ke tanggal untuk melihat nama liburnya. Di bawah kalender ada jumlah hari WFH, WFO, dan libur bulan itu. Tombol ‹ › pindah bulan, tombol "Hari ini" kembali ke bulan sekarang.

<p>
  <img src="media/month-light.png" width="260" alt="Kalender bulan, mode terang">
  <img src="media/month-dark.png" width="260" alt="Kalender bulan, mode gelap">
</p>

Kalender yang sama juga dipakai untuk catatan parkir: **Tap In** atau **Flazz**, satu pilihan per hari. Klik tanggal untuk memunculkan tombol Tap In dan Flazz di bawah kalender; klik tanggal yang sama lagi untuk menutupnya. Tekan pilihan lain untuk mengganti, atau pilihan yang sama lagi untuk menghapus. Hari yang sudah dicatat diberi huruf kecil di pojok tanggal: **T** hijau toska untuk Tap In, **F** oranye untuk Flazz. Jumlah harinya selalu tampil sebaris dengan jumlah WFH, WFO, dan libur.

<p>
  <img src="media/tap-in-light.png" width="260" alt="Mencatat Tap In pada tanggal terpilih, mode terang">
  <img src="media/tap-in-dark.png" width="260" alt="Mencatat Tap In pada tanggal terpilih, mode gelap">
</p>

### Pengaturan

- **Bahasa.** Pilih bahasa tampilan: Bahasa Indonesia (default), English, 简体中文, atau 日本語. Pilihannya diingat.
- **Hari WFH saya.** Pilih satu tanggal WFH (harus hari kerja). Hari lain dihitung dari tanggal ini, maju maupun mundur. Letaknya sejajar dengan pilihan bahasa.
- **Pola kerja.** Jumlah hari WFH dan WFO per siklus, masing-masing 1 sampai 20.
- **Libur.** Daftar semua libur yang tersimpan, bisa dihapus satu per satu. Tombol **Tambah** membuka dialog:
  - Tempel daftar libur, satu per baris dengan format `YYYY-MM-DD Label`. Labelnya opsional. Baris yang formatnya salah tetap ada di kolom supaya bisa diperbaiki.
  - **Fetch dari Internet** mengambil libur nasional tahun ini dan tahun depan dari [APIHariLibur_V2](https://github.com/guangrei/APIHariLibur_V2) lalu memasukkannya ke kolom. Daftar ini belum disimpan: hapus dulu libur yang tidak diikuti kantor Anda, baru tekan Tambah.

<p>
  <img src="media/settings-light.png" width="260" alt="Halaman pengaturan, mode terang">
  <img src="media/settings-dark.png" width="260" alt="Halaman pengaturan, mode gelap">
</p>

Kalau libur tahun yang sedang dilihat belum diisi, muncul peringatan karena jadwalnya bisa meleset.

### Mode gelap

Mengikuti tema sistem secara default. Tombol bulan/matahari di pojok kanan atas mengganti tema secara manual, dan pilihannya diingat.

## Pasang

1. Buka `chrome://extensions`.
2. Nyalakan **Developer mode**.
3. Klik **Load unpacked**, pilih folder ini.
4. Klik ikon extension, lalu tekan **Atur Jadwal WFH** untuk memilih hari WFH pertama.

Semua data (pola, tanggal WFH, daftar libur, catatan parkir, tema) disimpan di browser Anda sendiri. Satu-satunya permintaan jaringan adalah tombol Fetch dari Internet.

## Tes

Logika jadwal ada di `schedule.js` dan diuji tanpa dependensi:

```sh
node test.mjs
```
