# 08 — Baseline Aturan RAB/EE v1

**Status:** Baseline bisnis untuk pekerjaan spesifikasi A–C  
**Cakupan:** Phase 1 — RAB / Engineer's Estimate Engine  
**Dasar keputusan:** D-003 sampai D-022, terutama D-011 sampai D-022  
**Bukan:** blueprint arsitektur, skema database final, desain UI, atau izin untuk mulai coding

## 1. Tujuan Baseline

Dokumen ini menyatukan aturan RAB/EE yang telah dikunci agar audit AHSP, penyusunan Golden Test, dan perancangan kontrak Excel menggunakan definisi, formula, serta batas scope yang sama.

Jika dokumen ini berbeda dengan decision log terbaru, decision log berlaku. Perubahan baseline hanya boleh diputuskan di sesi utama dan dicatat pada decision log.

## 2. Hierarki Acuan

1. **AHSP Cipta Karya resmi Kementerian PU 2026** menjadi acuan normatif kode, uraian, satuan, komponen, koefisien, dan prinsip pembentukan HSP.
2. **Decision Log** menjadi sumber keputusan produk dan aturan implementasi yang telah disetujui.
3. **Masterfile AHSP CK.xlsx** menjadi Golden Reference implementasi harga dasar, detail analisa, OH/profit, dan HSP.
4. **Contoh Rekap RAB dan BV.xlsx** menjadi Golden Reference workflow BV, RAB detail, rekap, PPN, pembulatan, dan keluaran.
5. Artefak atau formula legacy yang rusak, external link, metadata proyek lama, serta inkonsistensi workbook tidak otomatis menjadi aturan sistem.

## 3. Batas Scope

### Termasuk dalam core Phase 1

- master AHSP resmi;
- master harga dasar minimum untuk upah, bahan, dan alat;
- Backup Volume dan input volume langsung yang sah;
- perhitungan AHSP/HSP deterministik;
- HSP manual/non-AHSP sebagai jalur pengecualian;
- kelompok utama dan satu tingkat subkelompok RAB;
- RAB detail, rekap, PPN, dan pembulatan final;
- validasi, human review, snapshot, dan revisi;
- ekspor Excel mandiri dengan formula aktif.

### Ditunda

- zonasi, provenance, vendor, histori, approval, dan log perubahan harga;
- editor analisa custom lengkap;
- tarif OH/profit berbeda per AHSP/item;
- status `APPROVED` sebagai tahap terpisah;
- Excel values-only;
- pengembangan dan pengujian format PDF;
- RKS, Document Engine, Project Control, multi-agent product, dan AI drawing.

## 4. Istilah Utama

| Istilah | Definisi operasional |
| --- | --- |
| AHSP | Struktur analisa untuk menghasilkan harga satuan satu pekerjaan: komponen sumber daya, koefisien, dan aturan perhitungannya. |
| HSP | Hasil harga satu satuan pekerjaan setelah harga dasar dimasukkan ke AHSP dan OH/profit diterapkan. |
| BV | Perhitungan kuantitas proyek dari dimensi, jumlah, formula, dan sumber ukuran/gambar. |
| Item RAB | Pekerjaan proyek yang menghubungkan volume, satu HSP/AHSP atau HSP manual, serta kelompok/subkelompok proyek. |
| Rekap RAB | Ringkasan otomatis nilai RAB menurut kelompok utama. |
| Snapshot | Salinan nilai dan parameter perhitungan yang dibekukan untuk proses review/finalisasi. |

## 5. Rantai Data dan Perhitungan

```text
Harga dasar + koefisien AHSP
→ biaya langsung AHSP
→ OH/profit
→ HSP

BV atau input volume langsung
+ HSP
→ nilai item RAB
→ subtotal kelompok
→ subtotal RAB
→ PPN
→ pembulatan final
```

Seluruh angka kritis dihitung oleh calculation engine atau formula deterministik. AI hanya membantu mencari, memilih kandidat, menjelaskan, mendeteksi masalah, dan mengoperasikan tool. AI tidak menetapkan volume, harga, koefisien, atau total final berdasarkan improvisasi.

## 6. Aturan Volume

1. Volume item berasal dari BV atau input langsung yang dapat ditelusuri.
2. Pekerjaan geometris wajib memakai BV yang mencatat dimensi, jumlah, formula, satuan, dan sumber ukuran/gambar.
3. Input langsung hanya diperbolehkan untuk kuantitas sederhana atau lump sum ketika geometri tidak relevan.
4. Input langsung wajib memiliki dasar kuantitas, sumber, catatan, dan reviewer.
5. Satuan volume final harus kompatibel dengan satuan HSP.
6. AI tidak boleh mengasumsikan volume.

## 7. Aturan Harga Dasar

Data minimum setiap sumber daya adalah ID/kode internal, uraian, satuan, dan harga dasar.

- Kategori sumber daya: tenaga, bahan, atau alat.
- Harga kosong berarti belum lengkap dan memblokir review.
- Harga Rp0 hanya sah jika disengaja dan menghasilkan warning.
- Harga yang dipakai dibekukan dalam snapshot.
- Log, histori, sumber/vendor, lokasi, tahun, dan zonasi harga ditunda.

## 8. Aturan AHSP, HSP, dan HSP Manual

1. Master AHSP resmi tidak boleh diedit.
2. Setiap komponen AHSP dihitung sebagai `koefisien × harga dasar`.
3. HSP dibentuk dari seluruh biaya langsung ditambah OH/profit.
4. HSP tidak mengalami pembulatan matematis.
5. Jika analisa resmi belum tersedia, item boleh menggunakan HSP final manual dengan penanda `MANUAL / NON-AHSP`.
6. HSP manual minimal menyimpan uraian, satuan, nilai final, dan catatan.
7. HSP manual dianggap sudah termasuk OH/profit dan tidak otomatis masuk katalog AHSP.
8. HSP manual wajib direview manusia.
9. Editor analisa custom lengkap tetap wajib dalam roadmap, tetapi bukan pekerjaan core saat ini.

## 9. Aturan OH/Profit

```text
A = subtotal tenaga
B = subtotal bahan
C = subtotal alat
D = A + B + C
E = D × tarif OH/profit
HSP = D + E
```

- OH/profit dihitung satu kali pada subtotal biaya langsung setiap AHSP.
- OH/profit tidak dihitung pada masing-masing komponen dan tidak ditambahkan lagi pada total proyek.
- Satu tarif proyek diterapkan ke semua AHSP yang digunakan.
- Rentang tarif 10–15%; default 10%.
- Override tarif per AHSP/item ditunda.
- Tarif dan nilai OH/profit dibekukan dalam snapshot.

## 10. Struktur RAB

Core mendukung maksimal dua tingkat:

```text
Kelompok utama [wajib]
├── item langsung
└── subkelompok [opsional]
    └── item
```

- Setiap item berada tepat pada satu kelompok utama atau subkelompok.
- Subkelompok dipakai jika suatu tipe, lokasi, atau lantai memiliki beberapa item, misalnya komponen Pintu Tipe P1.
- Item tidak boleh dihitung ganda.
- Subtotal subkelompok adalah jumlah itemnya.
- Subtotal kelompok adalah jumlah item langsung dan seluruh subkelompoknya.
- Rekap hanya menampilkan nilai turunan otomatis dari RAB detail; tidak ada input ulang nilai rekap.
- Pemetaan AHSP/HSP ke kelompok merupakan data proyek, bukan atribut tetap master AHSP.

## 11. PPN dan Pembulatan

```text
Nilai item = volume × HSP
Subtotal RAB = Σ nilai item
PPN = subtotal RAB × tarif PPN proyek
Total sebelum pembulatan = subtotal RAB + PPN
Total final = floor((total sebelum pembulatan + 500) / 1000) × 1000
```

- Satu tarif PPN berlaku pada tingkat proyek setelah subtotal seluruh item.
- Default implementasi mengikuti Golden Reference, yaitu 11%, tetapi tarif dapat diubah atau menjadi 0%.
- HSP, nilai item, subtotal, dan PPN tidak dibulatkan secara matematis.
- Pembulatan hanya dilakukan satu kali pada total setelah PPN ke Rp1.000 terdekat dengan metode half-up.
- Sisa kurang dari Rp500 turun; sisa Rp500 atau lebih naik.
- Sistem menyimpan total sebelum pembulatan, total final, dan selisih pembulatan.

## 12. Status, Review, dan Revisi

```text
DRAFT → REVIEW → FINAL
```

| Status | Perilaku |
| --- | --- |
| DRAFT | Dapat diedit dan boleh belum lengkap. |
| REVIEW | Snapshot dibuat; data yang diperiksa dikunci. Koreksi harus dikembalikan ke DRAFT. |
| FINAL | Tidak dapat diedit. Perubahan membuat revisi baru berstatus DRAFT; final sebelumnya dipertahankan. |

## 13. Validasi Minimum Sebelum Review

### ERROR — memblokir REVIEW

- identitas wajib proyek belum lengkap;
- tidak ada kelompok atau item;
- item tidak memiliki tepat satu kelompok/subkelompok;
- uraian, satuan, volume, atau HSP tidak valid;
- satuan volume tidak kompatibel dengan HSP;
- pekerjaan geometris tidak memiliki BV;
- harga dasar komponen AHSP kosong;
- tarif OH/profit di luar 10–15%;
- tarif PPN tidak valid;
- formula, referensi, atau perhitungan gagal;
- subtotal, PPN, total sebelum pembulatan, atau total final gagal dihitung.

### WARNING — dapat dilanjutkan dengan konfirmasi reviewer

- HSP manual/non-AHSP;
- harga Rp0 yang disengaja;
- input volume langsung yang sah untuk jumlah sederhana atau LS.

## 14. Paket Keluaran Excel

Workbook Excel wajib:

1. memuat Rekap RAB;
2. memuat RAB detail;
3. memuat Backup Volume;
4. memuat hanya AHSP/HSP yang digunakan;
5. menunjukkan pemetaan AHSP/HSP yang digunakan ke kelompok/subkelompok proyek;
6. memakai formula aktif yang menghubungkan BV sampai pembulatan final;
7. membedakan sel input dan sel formula;
8. mandiri dalam satu workbook tanpa external link;
9. mencantumkan identitas proyek, versi/revisi, dan status;
10. berasal dari snapshot proyek yang sama tanpa input ulang nilai rekap atau mapping.

Excel merupakan keluaran kerja dan audit. Source of truth tetap data proyek dan snapshot `FINAL` di dalam sistem.

## 15. Kriteria Validasi Baseline

Baseline dianggap terbukti jika:

- kasus uji dapat ditelusuri dari sumber volume dan harga sampai total final;
- hasil sistem/Excel sama dengan Golden Reference untuk input yang sama, atau selisihnya dijelaskan sebagai koreksi terhadap artefak legacy;
- tidak ada external link;
- perubahan input yang sah memperbarui seluruh nilai turunan secara konsisten;
- validasi ERROR dan WARNING bekerja sesuai aturan;
- hasil setiap kelompok, rekap, PPN, dan pembulatan dapat direkonsiliasi secara numerik.

## 16. Pertanyaan Teknis yang Sengaja Belum Diputuskan

Pekerjaan A–C harus menjawab atau mengangkat sebagai open issue:

- struktur field dan ID internal master AHSP/resource;
- kamus satuan dan aturan kompatibilitas satuan;
- aturan normalisasi duplikasi, kode kosong, dan data legacy;
- daftar kasus Golden Test beserta expected result;
- nama sheet, kolom, hubungan formula, dan area input/output Excel;
- proteksi formula, data validation, serta tampilan audit workbook.

Jawaban teknis dari A–C belum menjadi keputusan final sampai direkonsiliasi dan disetujui di sesi utama.
