# 10 — AHSP Normalization Specification

**Jalur:** A — Audit dan Normalisasi Master AHSP  
**Project:** Consultant AI Office — Phase 1 RAB / Engineer's Estimate Engine  
**Status:** **FINAL AS MASTER-DATA CONTRACT** setelah rekonsiliasi Manager; anomaly per-record yang belum terselesaikan tetap dicatat dan tidak mengubah semantic contract  
**Tanggal audit:** 2026-08-28  
**Scope:** audit dan spesifikasi data logis; **bukan** desain database fisik, API, UI, kode import, atau perubahan AHSP resmi

---

## 1. Tujuan dan Batas Dokumen

Dokumen ini menyusun spesifikasi minimum agar data AHSP Cipta Karya dapat dipisahkan menjadi:

1. **definisi AHSP normatif** yang mempertahankan kode, uraian, satuan pekerjaan, komponen, satuan komponen, koefisien, dan referensi resmi;
2. **resource master** untuk tenaga, bahan, dan alat;
3. **harga dasar minimum** yang terpisah dari definisi AHSP; dan
4. **relasi yang stabil** tanpa menggunakan nomor baris Excel sebagai identitas.

Dokumen ini tidak:

- mengubah AHSP resmi;
- mengembangkan analisa custom;
- memasukkan zonasi, vendor, histori, atau log harga ke core;
- menetapkan skema SQL, teknologi database, API, UI, atau kode import;
- mengubah `06-decision-log.md` atau `08-rab-ee-baseline-v1.md`;
- menetapkan jawaban final untuk open issues yang memang belum dikunci baseline.

Semua usulan teknis dalam dokumen ini harus direkonsiliasi di sesi utama sebelum dianggap keputusan produk.

---

## 2. Sumber dan Hierarki Acuan yang Digunakan

Hierarki mengikuti `08-rab-ee-baseline-v1.md` dan Decision Log terbaru:

1. **Lampiran VI Surat Edaran Direktur Jenderal Bina Konstruksi Nomor 47/SE/Dk/2026 — AHSP Bidang Cipta Karya**: acuan normatif kode, uraian, satuan, komponen, koefisien, serta prinsip pembentukan HSP.
2. **Decision Log terbaru, D-001 s.d. D-022**: aturan produk/implementasi yang telah dikunci.
3. **`Masterfile AHSP CK.xlsx`**: Golden Reference implementasi harga dasar, detail analisa, OH/profit, dan HSP; bukan acuan normatif bila bertentangan dengan sumber resmi atau baseline.
4. **`04-rab-ee-v1-spec.md`** dan **`05-data-tool-output-model.md`**: fondasi entitas dan prinsip source of truth, sepanjang tidak bertentangan dengan Decision Log/baseline terbaru.

Catatan versi: spesifikasi awal `04-rab-ee-v1-spec.md` masih menyebut lokasi/tahun/sumber/status pada Base Price dan state `APPROVED`. Untuk core Phase 1, Decision Log terbaru D-012 dan D-018 serta baseline terbaru yang berlaku: harga dasar minimum tidak membawa zonasi/provenance/vendor/histori, dan state core adalah `DRAFT → REVIEW → FINAL`.

---

## 3. Ringkasan Temuan

### 3.1 Kesimpulan utama

`Masterfile AHSP CK.xlsx` **tidak aman untuk diperlakukan sebagai master data yang dapat diimpor apa adanya**. Workbook tersebut mencampur empat lapisan yang harus dipisahkan:

- definisi AHSP yang sebagian mengikuti dokumen resmi;
- harga dasar lokal/Golden Reference;
- formula perhitungan HSP;
- artefak legacy seperti kode lama, rounding, external link, fixed row reference, duplicate block, dan broken defined names.

Struktur resmi sendiri konsisten secara konsep: satu AHSP memiliki kode/uraian/satuan pekerjaan dan tiga kelompok komponen — **tenaga kerja, bahan, peralatan** — dengan setiap komponen membawa uraian, kode bila tersedia, satuan, dan koefisien. HSP dibentuk dari `koefisien × HSD`, dijumlahkan menjadi biaya langsung, lalu ditambah biaya umum dan keuntungan 10–15%.

### 3.2 Temuan paling berdampak

| Temuan | Bukti utama | Dampak |
| --- | --- | --- |
| Kode AHSP legacy tidak selalu sama dengan kode resmi 2026 | Official `1.1.1.1`; Master `AHSP!B8 = A.1.1.1.1` | **HIGH** — salah identitas bila kode Master dianggap resmi |
| Collision kode `3.9.1` | Official: `3.9.1` adalah heading **UBIN PC**, item pertama `3.9.1.1`; Master `AHSP!C8723` heading `3.9.1`, `C8724` item juga `3.9.1` | **CRITICAL** — business key tidak unik dan item salah kode |
| Duplicate AHSP identik `1.3.1.6` | `AHSP!C1405:I1418` dan `AHSP!C1420:I1433` | **HIGH** — duplikasi katalog dan risiko pemilihan ganda |
| HSP dibulatkan di dalam Master | 721 formula `ROUNDDOWN`; contoh `AHSP!I8724 = ROUNDDOWN(I8741,-2)` | **CRITICAL** — bertentangan dengan D-016/baseline yang melarang pembulatan HSP |
| Material wajib memiliki harga 0 pada analisa resmi | `AHSP!C81:I100` untuk `1.1.1.6`; bahan pada H90:H94 = 0 | **CRITICAL** — HSP dapat hanya berisi tenaga kerja walaupun official AHSP mewajibkan bahan |
| External link masih tertanam | 2 external-link parts menuju file lokal Windows | **HIGH** — workbook tidak mandiri dan melanggar arah D-021 untuk output audit |
| Name Manager sangat tercemar legacy | 45.606 defined names; 45.054 memuat `#REF!` | **HIGH** — workbook structure tidak layak dijadikan model identitas |
| Harga komponen banyak ditanam langsung | Scan struktural mendeteksi 4.297 baris komponen; 3.485 harga di kolom komponen hard-coded, 812 formula-linked | **HIGH** — harga dan definisi AHSP bercampur; update master harga tidak konsisten |
| `BAHAN` juga memuat `ALAT SEWA` | `BAHAN!B550:B572` | **HIGH** — tipe resource tidak dapat ditentukan dari nama sheet |
| Daftar harga bahan tidak lengkap | 567 row bernama; 123 harga kosong; 39 harga = 0; 2 satuan kosong | **HIGH** — harga kosong harus ERROR; Rp0 hanya sah bila disengaja |
| Kode tenaga kerja Master tidak sepenuhnya cocok dengan kodifikasi CK 2026 | `UPAH!C37:G44` antara lain L.12, L.13, L.15, L.16 serta 2 kode kosong | **HIGH** — tidak boleh auto-remap ke kode normatif |
| Unit sangat bervariasi | `Bh/bh/Buah/buah`, `Kg/kg`, `M2/m2`, `M3/m3`, `Lbr/Lembar`, `M/M'/M1`, dll. | **MEDIUM–HIGH** — join harga dan validasi satuan rentan gagal |
| Ada formula legacy yang benar hanya karena struktur baris tertentu | `AHSP!I53 = SUM(I36:I52)/2`, `I77 = SUM(I60:I76)/2` | **MEDIUM** — bukan formula normatif; rapuh terhadap perubahan layout |

### 3.3 Prinsip normalisasi yang dihasilkan

1. **Definisi AHSP dan harga dasar dipisahkan.** Harga bukan atribut normatif komponen AHSP.
2. **Kode resmi tidak ditimpa oleh kode legacy.** Kode lama hanya kandidat crosswalk/mapping, bukan business key resmi.
3. **Nomor baris Excel hanya source locator**, tidak pernah menjadi ID atau key.
4. **Internal ID harus opaque dan immutable.** Encoding aktual (UUID/ULID/dll.) ditunda ke blueprint.
5. **Business key AHSP harus memasukkan edisi sumber**, bukan kode saja.
6. **Kode resource tenaga kerja tidak cukup sebagai key**, karena official CK memang menggunakan satu kode untuk beberapa spesialisasi, terutama `L.02`.
7. **Satuan dinormalisasi secara konservatif.** Alias tipografi/case boleh disatukan; konversi dimensi tidak dilakukan diam-diam.
8. **Golden Reference hanya mengisi implementasi yang tidak bertentangan dengan aturan normatif/baseline.** Rounding, external links, hard-coded price, dan formula layout-specific tidak dipromosikan menjadi aturan sistem.

---

## 4. Struktur Normatif AHSP Cipta Karya 2026

### 4.1 Hierarki dokumen

Lampiran VI membagi AHSP CK menjadi antara lain:

- I. Bangunan Gedung dan Perumahan
  - Divisi 1 Persiapan Lapangan/Site Work
  - Divisi 2 Pekerjaan Struktur
  - Divisi 3 Pekerjaan Arsitektur
  - Divisi 4 Pekerjaan Lansekap
  - Divisi 5 Pekerjaan Mekanikal dan Elektrikal
  - Divisi 6 Pekerjaan Plambing
  - Divisi 7 Jalan pada Permukiman
  - Divisi 8 Drainase Jalan
  - Divisi 9 Jaringan Pipa di Luar Gedung
  - Divisi 10 Sistem Struktur RISHA
  - Divisi 11 Tipologi RISHA
- II. SPAM, SPALD, dan Bangunan Persampahan

Daftar isi resmi membawa kolom `Kode`, `Uraian Pekerjaan`, `Satuan`, `Tipe AHSP`, dan `Status`. Contoh status yang ditemukan adalah `Tetap`, `Baru`, dan `Ada Perubahan`; tipe yang terlihat adalah `Normatif`.

**Penting:** hierarki/divisi resmi adalah **klasifikasi normatif sumber**, bukan kelompok RAB proyek. D-020 menyatakan kelompok/subkelompok proyek adalah mapping tingkat proyek dan tidak boleh dijadikan atribut tetap master AHSP.

### 4.2 Struktur satu analisa

Bentuk normatif berulang:

```text
Kode + Uraian Pekerjaan

A. Tenaga Kerja
   Uraian | Kode | Satuan | Koefisien | Harga Satuan | Jumlah Harga

B. Bahan
   Uraian | Kode | Satuan | Koefisien | Harga Satuan | Jumlah Harga

C. Peralatan
   Uraian | Kode | Satuan | Koefisien | Harga Satuan | Jumlah Harga

D. Jumlah Harga Tenaga Kerja, Bahan dan Peralatan (A+B+C)
E. Biaya Umum dan Keuntungan (10%-15%) × D
F. Harga Satuan Pekerjaan (D+E)
```

Untuk master normatif, field `Harga Satuan` dan `Jumlah Harga` **bukan bagian dari definisi tetap AHSP**, karena nilainya bergantung pada HSD/harga dasar yang dimasukkan. Yang tetap adalah kode/uraian/satuan/koefisien dan referensi analisa.

### 4.3 Kodifikasi tenaga kerja

Official CK 2026 pada awal Lampiran VI memuat antara lain:

- `L.01` Pekerja;
- `L.02` Tukang dan banyak spesialisasi tukang;
- `L.03` Kepala tukang / Kepala tukang tanam;
- `L.04` Mandor;
- `L.05` Juru ukur;
- `L.06` Pembantu juru ukur;
- `L.07` Mekanik alat berat;
- `L.08` Operator alat berat;
- `L.09` Pembantu operator;
- `L.10` Supir truk;
- `L.11` Kenek truk;
- `L.12a–L.12d` Tenaga ahli;
- `L.13a–L.13c` Narasumber;
- `L.14a–L.14c` Tenaga terampil;
- `L.15` Lainnya.

Implikasi penting: **`L.02` bukan unique identifier satu resource**. `Tukang Kayu | L.02 | OH` dan `Tukang Batu | L.02 | OH` harus tetap menjadi resource berbeda meski kodenya sama.

Official menyatakan kodifikasi bahan dan peralatan mengikuti pengembangan pada SIPASTI. Namun banyak tabel CK tidak menampilkan kode bahan/peralatan secara eksplisit. Karena itu `normative_code` untuk bahan/alat harus boleh kosong; internal ID tetap wajib.

### 4.4 Referensi normatif

Sebagian analisa membawa referensi eksplisit seperti:

- official `1.1.1.1` merujuk Permen PUPR No. 8 Tahun 2023 Lampiran B `U.1.1.1 (c)`;
- official `1.1.1.6` merujuk Lampiran B `U.1.1.7 (c)`.

Referensi semacam ini harus dipertahankan sebagai metadata normatif AHSP, bukan dipakai sebagai ID utama.

---

## 5. Perbandingan Official vs `Masterfile AHSP CK.xlsx`

### 5.1 Struktur workbook

Workbook memiliki 4 sheet utama:

| Sheet | Peran aktual | Catatan audit |
| --- | --- | --- |
| `UPAH` | harga tenaga kerja | Mengandung kode/nama/unit, dua kolom harga, dan parameter `Jam Kerja Eff. = 8`; sebagian kode legacy/blank |
| `BAHAN` | harga bahan **dan alat sewa** | Judul `HARGA BAHAN ZONA 3`; `ALAT SEWA` dimulai baris 550; tidak memiliki kolom kode resource |
| `Rekap HSP` | daftar kode/uraian/satuan/HSP | Mencampur heading dan item analisa; berisi blok legacy dan formula yang menunjuk `AHSP` |
| `AHSP` | detail analisa + harga + perhitungan HSP | Mencampur definisi normatif, local price mapping, OH 10%, rounding, kode legacy, dan formula layout-specific |

### 5.2 Contoh perbandingan nyata — pagar sementara kayu

**Official, PDF page 158**

- Kode: `1.1.1.1`
- Uraian: `Pembuatan 1 m’ Pagar Sementara dari Kayu Tinggi 2 meter`
- Komponen tenaga: Pekerja `L.01` 0,600 OH; Tukang Kayu `L.02` 0,200 OH; Tukang batu `L.02` 0,200 OH; Kepala Tukang `L.03` 0,040 OH; Mandor `L.04` 0,013 OH.
- Bahan: Kayu Kaso 5/7 kelas II 0,0387 m3; Papan Kayu 2/20 0,0396 m3; Paku biasa 5 inch 0,5872 kg; Semen Portland (PC) 26,406 kg; Pasir Beton 61,56 kg; Kerikil 83,349 kg; Air 17,415 liter; Residu 0,400 liter.

**Masterfile, `AHSP!B8:I31`**

- Kode: `A.1.1.1.1` — **bukan kode official 2026**.
- Uraian sama secara substansi.
- Koefisien tenaga sesuai official.
- Beberapa nama bahan berubah:
  - official `Kayu Kaso 5/7 kelas II` → Master `Kayu kaso 5/7`;
  - official `Papan Kayu 2/20` → Master `Kayu papan 3/20`;
  - official `Paku biasa 5 inch` → Master `Paku biasa 2” - 5”`.
- Harga komponen mengambil campuran hard-coded dan lookup `BAHAN`.
- `AHSP!I31 = ROUNDDOWN(I29+I30,0)`.

**Klasifikasi:** koefisien official adalah normatif; kode `A.1.1.1.1`, substitusi nama bahan, mapping harga, dan rounding adalah implementasi/legacy Master dan tidak boleh mengganti definisi official.

### 5.3 Contoh duplicate nyata — `1.3.1.6`

Official PDF page 201 mendefinisikan:

- `1.3.1.6` — `1m3 Urukan Batu Kerikil Tanpa Pemadatan Secara Manual`;
- Pekerja `L.01` 0,300 OH;
- Mandor `L.04` 0,015 OH;
- Batu kerikil uk. 2–3 cm 1,130 m3.

Masterfile memuat **dua blok identik**:

- `AHSP!C1405:I1418`; dan
- `AHSP!C1420:I1433`.

Kedua blok menggunakan resource bernama `Kerikil` dan harga `BAHAN!G198 = 535460`, sedangkan `BAHAN!B198` bernama `Koral`.

**Klasifikasi:** duplicate block adalah legacy error. Mapping `Batu kerikil uk. 2–3 cm` → `Kerikil` → `Koral` adalah mapping Golden Reference yang perlu review; tidak boleh mengubah nama resource normatif.

### 5.4 Contoh code collision nyata — `3.9.1`

Official:

- `3.9.1` = heading `UBIN PC`;
- `3.9.1.1` = `Pemasangan 1 m2 Lantai Ubin PC Abu-Abu Ukuran 20 cm x 20 cm (1SP : 2PP)` — PDF page 409.

Masterfile:

- `AHSP!C8723 = 3.9.1`, `D8723 = UBIN PC`;
- `AHSP!C8724 = 3.9.1`, `D8724 = Pemasangan ... 20x20 cm`.

Koefisien item Master cocok dengan official `3.9.1.1`, tetapi kodenya kehilangan suffix `.1`.

**Klasifikasi:** ini bukan sekadar duplicate row; ini **collision antara hierarchy node dan analysis record**, sehingga kode Master tidak dapat digunakan langsung sebagai business key.

### 5.5 Contoh harga nol pada komponen wajib — `1.1.1.6`

Official PDF page 161 untuk `1.1.1.6 Pemasangan 1 m2 Panel Beton Pracetak 50x50x240 untuk Pagar` memuat bahan:

- Panel beton pracetak 0,986 lembar;
- Kolom beton pracetak 0,525 batang;
- Semen Portland (PC) 45,000 kg;
- Pasir Beton 0,074 m3;
- Kerikil 0,146 m3.

Masterfile `AHSP!C81:I100` memuat koefisien yang sama, tetapi `H90:H94 = 0`. Akibatnya harga bahan menjadi nol pada perhitungan block tersebut.

Sesuai D-012/baseline, Rp0 hanya sah jika disengaja dan harus menghasilkan warning. Tidak ada bukti pada source bahwa lima Rp0 tersebut telah dikonfirmasi sebagai nilai disengaja. Untuk normalisasi, nilai tersebut harus diperlakukan **unresolved**, bukan diasumsikan sah.

---

## 6. Data Dictionary Minimum — Logical Specification

> Ini adalah **kamus data logis**, bukan skema database fisik. Setelah rekonsiliasi Manager, nama field pada bagian ini diperlakukan sebagai **canonical logical field names untuk Phase 1**. Encoding fisik ID, tipe database, API, dan detail implementasi tetap ditunda.

### 6.1 Entity: Master AHSP

| Field | Wajib | Tipe/Domain logis | Aturan |
| --- | --- | --- | --- |
| `ahsp_id` | Ya | opaque immutable ID | Internal identity; tidak berasal dari row Excel dan tidak mengandung makna bisnis. Format encoding belum diputuskan. |
| `official_code` | Ya untuk official AHSP | text | Simpan kode official sebagaimana diterbitkan setelah trim whitespace; jangan mengganti dengan kode legacy Master. |
| `official_description` | Ya | text | Uraian official; normalisasi whitespace boleh, substansi/ejaan teknis tidak boleh diubah diam-diam. |
| `work_unit_raw` | Ya | text | Satuan pekerjaan dari official source. |
| `work_unit_canonical` | Ya | canonical unit | Hasil normalisasi satuan yang tidak mengubah dimensi/semantik. |
| `official_hierarchy_path` | Ya | ordered text/path | Divisi/section/subsection official; **bukan** kelompok RAB proyek. |
| `official_type` | Opsional | text | Contoh: `Normatif`, bila tersedia dari daftar isi resmi. |
| `official_status` | Opsional | text | Contoh: `Tetap`, `Baru`, `Ada Perubahan`, bila tersedia. |
| `normative_reference` | Opsional | text | Referensi internal official, mis. Permen PUPR 8/2023 Lampiran B `U.1.1.1 (c)`. |
| `source_edition` | Ya | text | Identitas edisi official, mis. SE Dirjen Bina Konstruksi No. 47/SE/Dk/2026. |
| `source_locator` | Ya | text | Page/table/section untuk audit; bukan identity. |

**Tidak masuk entity ini:** harga dasar, OH/profit proyek, kelompok RAB proyek, vendor, zona, histori harga, hasil HSP.

**Canonical naming note:** untuk integrasi lintas-jalur, istilah generik `description` pada Jalur C memetakan ke `official_description`; istilah generik `unit` untuk AHSP memetakan ke `work_unit_canonical`. `work_unit_raw` tetap dipertahankan untuk traceability sumber.

### 6.2 Entity: AHSP Component

| Field | Wajib | Tipe/Domain logis | Aturan |
| --- | --- | --- | --- |
| `ahsp_component_id` | Ya | opaque immutable ID | Identity internal komponen. |
| `ahsp_id` | Ya | relation | Menghubungkan komponen ke satu Master AHSP. |
| `component_group` | Ya | `TENAGA` / `BAHAN` / `ALAT` | Berasal dari section A/B/C official. |
| `source_component_no` | Opsional | text/integer | Nomor urut yang tercetak di official jika ada; tidak menjadi primary identity. |
| `source_resource_name` | Ya | text | Uraian resource persis/substantif dari official; dipertahankan untuk audit walaupun resource master memiliki nama canonical. |
| `source_resource_code` | Opsional | text | Kode official/SIPASTI bila tersedia. |
| `source_unit_raw` | Ya | text | Satuan komponen dari official. |
| `source_unit_canonical` | Ya | canonical unit | Hasil normalisasi unit. |
| `coefficient` | Ya | decimal, presisi penuh source | Tidak dibulatkan ulang. |
| `resource_id` | Ya setelah mapping selesai | relation | Menghubungkan komponen ke resource master. Mapping yang belum pasti harus ditandai unresolved pada proses audit, bukan ditebak. |
| `source_order` | Ya | integer ordinal within AHSP | Menjaga urutan komponen; **bukan nomor baris Excel**. |
| `source_locator` | Ya | text | Page/range source untuk jejak audit. |

**Tidak masuk entity ini:** base price aktif, jumlah harga komponen, HSP final, OH/profit proyek.

### 6.3 Entity: Resource

| Field | Wajib | Tipe/Domain logis | Aturan |
| --- | --- | --- | --- |
| `resource_id` | Ya | opaque immutable ID | Satu ID internal stabil per resource canonical. |
| `resource_type` | Ya | `TENAGA` / `BAHAN` / `ALAT` | Tipe tidak boleh diinfer hanya dari nama sheet legacy. |
| `normative_code` | Opsional | text | `L.xx` untuk tenaga bila didukung official; bahan/alat boleh kosong jika source tidak menyediakan kode. |
| `resource_name` | Ya | text | Nama canonical yang mempertahankan arti teknis; tidak boleh menyatukan resource berbeda hanya karena mirip teks. |
| `unit_raw_reference` | Ya | text | Unit yang dipakai source canonical/reference. |
| `unit_canonical` | Ya | canonical unit | Unit yang dipakai untuk join ke base price. |

**Aturan khusus tenaga:** `normative_code` tidak unique. `L.02` + nama + unit membedakan Tukang Kayu, Tukang Batu, dll.

**Canonical naming note:** istilah generik `description` pada kontrak lain memetakan ke `resource_name`. `normative_code` bersifat nullable bila kode resmi/native memang tidak tersedia; blank code tidak boleh diisi dengan tebakan.

### 6.4 Entity: Base Price Minimum

Sesuai D-012, core hanya perlu harga dasar sederhana. Tidak ada zona/vendor/source/tahun/histori/log harga di entity ini.

| Field | Wajib | Tipe/Domain logis | Aturan |
| --- | --- | --- | --- |
| `resource_id` | Ya | relation | Harga harus menunjuk satu resource internal. |
| `price_unit` | Ya | canonical unit | Harus sama/kompatibel secara eksplisit dengan `resource.unit_canonical`. |
| `price_value` | Nullable | decimal currency | `null` = belum lengkap dan memblokir review; tidak boleh dikonversi menjadi 0. |
| `price_state` | Ya | `MISSING` / `SET` / `ZERO_CONFIRMED` | Canonical semantic state untuk Phase 1. `MISSING` berarti harga belum tersedia/terverifikasi; `SET` berarti harga non-zero telah ditetapkan; `ZERO_CONFIRMED` berarti `price_value = 0` dan intent Rp0 telah dikonfirmasi. |

`price_state ∈ {MISSING, SET, ZERO_CONFIRMED}` adalah **semantic contract final Jalur A**. Literal `0` pada legacy source **tidak** otomatis menjadi `ZERO_CONFIRMED`; tanpa bukti intent, record tetap unresolved dan memblokir REVIEW bila resource tersebut dipakai. Implementasi UI/approval untuk konfirmasi intent berada di luar scope Jalur A.

### 6.5 Entity/Relation summary

```text
Master AHSP 1 ───────< AHSP Component >────── 1 Resource
                                                 │
                                                 │ 1 current minimum price in core
                                                 ▼
                                             Base Price
```

Relasi ke project RAB, BV, snapshot, kelompok/subkelompok, PPN, dan output Excel berada di layer project/Jalur C, bukan di master AHSP core ini.

---

## 7. Aturan Identitas dan Business Key

### 7.1 Internal ID

Canonical internal identifiers Jalur A adalah:

- `ahsp_id`;
- `ahsp_component_id`;
- `resource_id`.

Ketiganya menggunakan **opaque immutable internal ID**.

Aturan:

- tidak berasal dari nomor baris Excel;
- tidak berubah ketika record dipindahkan, di-sort, atau ketika baris baru ditambahkan;
- tidak dibentuk dari harga;
- tidak dibentuk hanya dari nama yang dapat diperbaiki ejaannya;
- encoding aktual seperti UUID/ULID/sejenisnya **belum diputuskan** dan menjadi pilihan blueprint.

### 7.2 Business key Master AHSP

Business identity official yang menjadi canonical business key Jalur A:

```text
(source_edition, official_code)
```

Bukan `official_code` saja, karena kode dapat digunakan ulang pada edisi/sumber berbeda.

Contoh konsep, bukan ID literal:

```text
SE Dirjen Bina Konstruksi 47/SE/Dk/2026 + 1.1.1.1
```

### 7.3 Business key Resource

**Tenaga dengan kode normatif:**

```text
(resource_type, normative_code, normalized_resource_name, canonical_unit)
```

Alasan: `L.02` digunakan oleh banyak spesialisasi.

**Bahan/alat tanpa kode normatif:**

```text
(resource_type, normalized_resource_name, canonical_unit)
```

Namun kombinasi ini hanya **matching/business uniqueness candidate**, bukan identity permanen. Internal `resource_id` tetap authoritative karena nama dapat berubah atau ternyata ambigu.

### 7.4 Identity AHSP Component

Jangan gunakan:

```text
ahsp_code + resource_code
```

sebagai unique key, karena:

- resource code dapat kosong;
- kode tenaga dapat dipakai banyak spesialisasi;
- satu resource dapat muncul lebih dari sekali dalam satu analisa untuk fungsi berbeda;
- urutan/subgroup peralatan dapat memiliki arti audit.

Gunakan `ahsp_component_id` sebagai identity, dengan `ahsp_id + source_order` sebagai urutan stabil di dalam satu definisi source.

### 7.5 Legacy code crosswalk

Kode legacy seperti `A.1.1.1.1` **tidak boleh ditulis ke `official_code`**. Jika kelak dibutuhkan untuk migrasi Golden Reference, mapping legacy→official harus diperlakukan sebagai **crosswalk audit/migration**, bukan penggantian kode normatif.

Contoh kandidat crosswalk yang didukung bukti tetapi belum boleh dianggap final otomatis:

| Legacy Master | Official | Status audit |
| --- | --- | --- |
| `A.1.1.1.1` | `1.1.1.1` | Kandidat kuat: uraian dan koefisien tenaga sama, tetapi terdapat perubahan nama bahan pada Master |
| `3.9.1` item lantai 20x20 | `3.9.1.1` | Kandidat kuat: official hierarchy menunjukkan `3.9.1` hanya heading; koefisien item cocok official `3.9.1.1` |

Crosswalk tetap perlu disetujui/ditest sebelum migrasi.

---

## 8. Kamus dan Normalisasi Satuan

### 8.1 Aturan umum

Normalisasi dibagi menjadi tiga kelas:

1. **SAFE_ALIAS** — beda case, whitespace, atau simbol tipografi tanpa perubahan semantik. **Boleh dinormalisasi otomatis** dan dua nilai dianggap kompatibel bila canonical unit-nya sama.
2. **CONVERTIBLE** — dimensi sama tetapi nilai numeriknya membutuhkan faktor konversi. **Tidak dikonversi otomatis pada core Phase 1**. Compatibility hanya boleh diberikan setelah ada conversion rule eksplisit; tanpa rule tersebut hasil check adalah tidak kompatibel/ERROR untuk REVIEW.
3. **REVIEW_REQUIRED** — token ambigu, typo, context-dependent, atau composite unit yang belum dapat dipastikan hanya dari teks. **Tidak boleh dinormalisasi atau dianggap kompatibel secara otomatis**; wajib source/human review.

Satuan original tetap disimpan sebagai `*_unit_raw`; canonical unit dipakai untuk validasi/matching. Canonicalization **tidak pernah mengubah nilai numerik**.

### 8.2 Dictionary satuan yang ditemukan

| Canonical | Alias/token ditemukan | Kelas | Catatan |
| --- | --- | --- | --- |
| `OH` | `OH`, `OH ` | SAFE_ALIAS | Orang-hari; jangan otomatis dikonversi ke OJ. |
| `OJ` | `OJ` | exact | Orang-jam. |
| `jam` | `Jam`, `jam`, `jam ` | SAFE_ALIAS | Umumnya peralatan/sewa. |
| `hari` | `Hari`, `hari`, `hari ` | SAFE_ALIAS | Umumnya rental/day. |
| `liter` | `Liter`, `liter` | SAFE_ALIAS | `L` diperlakukan terpisah sebagai `REVIEW_REQUIRED` sampai konteks/source memastikan bahwa token tersebut berarti liter. |
| `m` | `m`, `m'`, `m’`, `M'`, `M’` | SAFE_ALIAS | Official notation `m'`/`m’` berarti meter panjang. Token legacy `M` dan `M1` adalah `REVIEW_REQUIRED` sampai konteks/source memastikannya sebagai meter panjang. |
| `cm` | `cm` | exact/CONVERTIBLE | Panjang; konversi ke m hanya bila quantity benar-benar panjang. |
| `m2` | `m2`, `M2`, `m²` | SAFE_ALIAS | Luas. |
| `m3` | `m3`, `M3`, `m³` | SAFE_ALIAS | Volume. |
| `kg` | `kg`, `Kg`, trailing-space variants | SAFE_ALIAS | Massa. |
| `buah` | `Bh`, `bh`, `Buah`, `buah`, trailing-space variants | SAFE_ALIAS | Unit diskret. Typo `bauh` tidak auto-accept. |
| `lembar` | `Lbr`, `lbr`, `Lembar`, `lembar` | SAFE_ALIAS | Unit lembar. |
| `batang` | `Batang`, `btg`, `batang` | SAFE_ALIAS | Unit batang. |
| `unit` | `Unit`, `unit` | SAFE_ALIAS | Unit diskret. |
| `set` | `Set`, `set` | SAFE_ALIAS | Set/perangkat. |
| `LS` | `Ls`, `LS`, `ls` | SAFE_ALIAS | Lump sum. |
| `pasang` | `psg` | SAFE_ALIAS | Abreviasi `psg` dinormalisasi ke `pasang`; tidak disetarakan dengan `set` atau `buah`. |
| `unit-hari` | `Unit hari`, `unit/hari` | SAFE_ALIAS | Keduanya adalah representasi composite `unit-hari`; jangan disamakan dengan `unit`, `hari`, atau `buah-hari`. |
| `buah-hari` | `buah hari` | REVIEW_REQUIRED | Composite quantity; jangan disatukan ke `unit-hari` tanpa validasi. |
| `Ha` | `Ha` | exact | Hektar. |
| `tube` | `Tube` | SAFE_ALIAS case | Kemasan. |
| `zak` | `zak` | exact | Kemasan. |
| `ikat` | `Ikat` | SAFE_ALIAS case | Kemasan/unit kelompok. |
| `dus` | `dus` | exact | Kemasan. |
| `daun` | `daun` | exact | Unit diskret khusus. |
| `pohon` | `pohon` | exact | Unit tanaman. |

Token legacy `L`, `M`, `M1`, `bauh`, dan `buah hari` berada pada kelas `REVIEW_REQUIRED` kecuali source review sudah menetapkan meaning yang spesifik. Khusus `bauh`, jangan otomatis mengubahnya menjadi `buah` tanpa pemeriksaan source.

### 8.3 Compatibility rules

#### A. Volume item RAB ↔ satuan HSP

Core compatibility check Phase 1 adalah:

```text
canonical_volume_unit = canonical_hsp_unit
```

Check tersebut dijalankan **setelah SAFE_ALIAS normalization**. Dengan demikian:

- `m` dan official notation `m'`/`m’` kompatibel karena canonical menjadi `m`;
- `m2` hanya kompatibel dengan `m2`;
- `m3` hanya kompatibel dengan `m3`;
- `kg` hanya kompatibel dengan `kg`;
- `LS` hanya kompatibel dengan `LS`;
- unit diskret (`buah`, `unit`, `set`, `lembar`, `batang`, `pasang`) **tidak saling dipertukarkan otomatis**.

Jika pasangan hanya `CONVERTIBLE` tetapi canonical unit tidak sama, core Phase 1 **tidak** menganggapnya compatible sampai conversion rule eksplisit tersedia.

#### B. Resource coefficient unit ↔ base price unit

Default Phase 1: harus sama setelah SAFE_ALIAS normalization.

Contoh:

```text
Kg ↔ kg             = kompatibel
Bh ↔ buah           = kompatibel
M2 ↔ m2             = kompatibel
M' ↔ m              = kompatibel jika context = linear meter
OH ↔ OJ             = TIDAK otomatis kompatibel
kg ↔ m3             = TIDAK kompatibel tanpa conversion rule resource-specific
liter ↔ m3          = dimensi sama tetapi tidak auto-convert pada core tanpa aturan eksplisit
```

#### C. Larangan konversi implisit

Jangan mengonversi `kg ↔ m3` menggunakan density asumsi. Contoh Master `Pasir beton kg` adalah resource/price representation tersendiri dalam Golden Reference; hal itu tidak memberi izin membuat conversion density generik untuk semua pasir.

Jangan mengonversi `OH ↔ OJ` dari parameter jam kerja Master secara otomatis. Official menyebut jam kerja per hari dan jam efektif dalam konteks perhitungan tenaga, tetapi itu bukan izin conversion generik. Pada core Phase 1, harga harus tersedia dalam unit yang dipakai komponen.

Larangan yang sama berlaku untuk penyamaan unit diskret tanpa keputusan eksplisit: `buah ↔ unit`, `set ↔ buah`, `lembar ↔ buah`, `pasang ↔ set`, dan bentuk sejenis tidak boleh dikonversi diam-diam.

---

### 8.4 Duplicate/Ambiguity Contract

Aturan canonical untuk duplicate dan ambiguity:

1. **Duplicate AHSP identik** pada business key `(source_edition, official_code)` dan substansi normatif yang sama dinormalisasi menjadi **satu** canonical AHSP. Kemunculan legacy tambahan dipertahankan sebagai source/audit locator, bukan record AHSP kedua.
2. Jika satu business key menunjuk isi normatif yang berbeda atau tidak dapat direkonsiliasi terhadap official source, statusnya **AMBIGUOUS/UNRESOLVED**; tidak ada pemilihan berdasarkan urutan baris atau “yang paling mirip”.
3. **Hierarchy node bukan analysis record.** Kode heading seperti `3.9.1` tidak boleh dipromosikan menjadi AHSP item bila official source menunjukkan item analisa berada pada child code seperti `3.9.1.1`.
4. **Resource duplicate** hanya boleh disatukan bila type, meaning teknis, unit canonical, dan normative/native code (jika tersedia) konsisten. Kemiripan nama saja tidak cukup. Nama sama dengan unit berbeda bukan duplicate otomatis.
5. **Blank `normative_code`** sah bila official/native source memang tidak menyediakan kode. Blank code pada legacy source tidak boleh diisi dengan tebakan. Internal `resource_id` tetap menjadi identity canonical.
6. **Legacy code** hanya boleh menjadi crosswalk audit/migration; tidak pernah menggantikan `official_code`.
7. **Placeholder/fragment/heading** tidak menjadi canonical AHSP/resource sampai meaning dan source-nya tervalidasi.
8. Tidak ada mekanisme **best guess** untuk unresolved mapping.
9. Record unresolved boleh tetap tercatat pada audit/staging atau DRAFT sebagai ERROR, tetapi **tidak boleh masuk snapshot REVIEW atau FINAL** sampai issue selesai.

---

## 9. Audit Resource dan Harga Dasar Masterfile

### 9.1 `UPAH`

Data nyata yang perlu diperhatikan:

- `UPAH!C6:G36` sebagian besar mengikuti pola kode tenaga `L.01–L.11`.
- Official memang mengizinkan beberapa nama di bawah satu kode, khususnya `L.02`; sehingga duplicate kode saja **bukan error**.
- Duplicate ejaan candidate:
  - `UPAH!C19 = Tukang Pengayam Bronjong`, `G19 = L.02`;
  - `UPAH!C26 = Tukang penganyam bronjong`, `G26 = L.02`.
- Relative terhadap kodifikasi CK 2026, baris berikut perlu mapping/review, bukan auto-accept sebagai kode official:
  - `UPAH!C37 Penjaga Malam | L.12`;
  - `C38 Juru Gambar (Drafter) | L.13`;
  - `C39 Design Engineer | L.15`;
  - `C40 Operator Printer/Plotter | L.16`;
  - `C43 Bor Master | kode kosong`;
  - `C44 Operator Mesin Bor | kode kosong`.
- Official 2026 menggunakan `L.12a–d`, `L.13a–c`, `L.14a–c`, dan `L.15 Lainnya`; tidak ditemukan `L.16` pada tabel kodifikasi tenaga CK awal Lampiran VI.
- Harga tenaga yang digunakan dalam AHSP awal adalah kolom J, contoh `UPAH!J6 = 176000` untuk Pekerja. `UPAH!I6 = TRUNC(J6/$N$4,-2)` dengan `N4 = 8`, menunjukkan kalkulasi turunan berbasis row/layout dan pembulatan ke ratusan.

**Normalisasi:** resource tenaga disimpan terpisah dari harga; kode legacy yang tidak cocok official tetap unresolved sampai sumbernya jelas.

### 9.2 `BAHAN`

Audit row bernama pada `BAHAN`:

- 567 row bernama di area data (termasuk heading/fragment legacy yang harus disaring);
- 123 harga kosong;
- 39 harga bernilai 0;
- 2 satuan kosong (`BAHAN!B550 = ALAT SEWA` adalah heading; `B563 = dan mata bor masing masing diameter` adalah fragment/placeholder);
- tidak ada kolom kode resource bahan/alat;
- section `ALAT SEWA` berada di `BAHAN!B550:B572`, sehingga nama sheet tidak dapat menjadi resource type.

Duplicate/ambiguity nyata:

| Lokasi | Nilai | Klasifikasi |
| --- | --- | --- |
| `BAHAN!B223 = Meni besi`, unit `Kg`, harga 30000; `B224 = Meni besi`, unit `Liter`, harga 30000 | nama sama, unit berbeda | **Ambiguous; jangan merge** |
| `BAHAN!B499 = ubin teralux  marmer ukuran 40cm x40cm`, `Bh`, 13800; `B502 = ubin teralux marmer ukuran 40cm x40cm`, `Bh`, 41040 | nama normalized + unit sama, harga berbeda | **Duplicate conflict; HIGH** |
| `BAHAN!B8 Air test (air bersih)`, m3, 0; `B9 Air Bersih / PDAM`, Liter, 0 | zero price | Perlu konfirmasi intentional zero; bila tidak, MISSING/ERROR |

### 9.3 Harga ditanam langsung di `AHSP`

Scan struktural terhadap row yang memiliki `Uraian + Satuan + Koefisien` menemukan 4.297 component-like rows:

| Group | Hard-coded price | Formula-linked price |
| --- | ---: | ---: |
| Tenaga | 2.480 | 76 |
| Bahan | 780 | 703 |
| Alat | 225 | 33 |
| **Total** | **3.485** | **812** |

Angka ini adalah **scan struktural legacy workbook**, bukan jumlah normatif AHSP resmi. Tujuannya menunjukkan pola: harga komponen jauh lebih sering tersimpan langsung daripada diambil dari satu price source.

Contoh:

- `AHSP!H11 = 176000` Pekerja — hard-coded;
- `AHSP!H18 = VLOOKUP(...BAHAN...)` — formula-linked;
- `AHSP!H90:H94 = 0` — hard-coded zero.

**Konsekuensi spesifikasi:** normalized AHSP component tidak menyimpan harga aktif. Harga hanya diambil lewat `resource_id → Base Price` ketika HSP dihitung/snapshot dibuat.

---

## 10. Audit Formula, Link, dan Artefak Legacy

### 10.1 Rounding yang bertentangan dengan baseline

D-016/baseline menetapkan HSP dan nilai antara tidak mengalami mathematical rounding. Masterfile memuat **721 formula `ROUNDDOWN`**.

Contoh:

- `AHSP!I31 = ROUNDDOWN(I29+I30,0)`;
- `AHSP!I81 = ROUNDDOWN(I100,-2)`;
- `AHSP!I8724 = ROUNDDOWN(I8741,-2)`.

Pada `3.9.1` legacy item 20x20:

- pre-round HSP `AHSP!I8741 = 177635.524`;
- displayed/summary HSP `AHSP!I8724 = 177600`.

**Klasifikasi:** legacy implementation, tidak menjadi aturan normalized master.

### 10.2 Layout-dependent formulas

Contoh:

- `AHSP!I53 = SUM(I36:I52)/2`;
- `AHSP!I77 = SUM(I60:I76)/2`.

Dalam block tersebut, range menjumlahkan baris komponen **dan** subtotal sehingga kemudian dibagi dua. Nilainya dapat kebetulan benar untuk layout saat ini, tetapi rumus bukan representasi normatif `A+B+C` dan akan rapuh jika layout berubah.

**Klasifikasi:** legacy formula pattern; calculation engine/normalized logic harus menggunakan semantic groups, bukan posisi baris.

### 10.3 External links

Paket XLSX mengandung dua external link:

1. `file:///C:/TAHUN%202026/MASTER/RAB-%20MASTER.xlsb`
2. `file:///C:/Users/KHAIRUL/Downloads/AHSP%20CIPTA%20KARYA%20SE%20BINA%20KONTRUKSI%20NO.%2047%20TAHUN%202026.xlsm`

Tidak ditemukan formula worksheet yang secara literal masih mengandung `[workbook]`, tetapi external-link parts tetap tertanam dan workbook menyimpan cached external structures.

### 10.4 Broken defined names

Audit OpenXML:

- total defined names: **45.606**;
- defined names yang memuat `#REF!`: **45.054**;
- defined names yang memuat referensi external/file: **65**;
- worksheet cell dengan type error (`t="e"`): **0** pada saat scan.

Artinya tidak ada bukti bahwa setiap cell saat ini menampilkan error, tetapi Name Manager/metadata workbook sangat tercemar dan tidak boleh dijadikan blueprint source.

### 10.5 Fixed row reference

Contoh mapping harga menggunakan row langsung atau VLOOKUP range yang bergantung layout:

- `AHSP!H49 = BAHAN!G6`;
- `AHSP!H1412 = BAHAN!G198`;
- `AHSP!H8733 = BAHAN!G495`;
- banyak `VLOOKUP` dengan fixed source range.

**Aturan normalisasi:** baris Excel disimpan hanya sebagai `source_locator`. Join runtime harus berdasarkan internal resource identity, bukan row number.

---

## 11. Classification: Normatif vs Golden Reference vs Legacy vs Open Issue

| Area | Normatif | Golden Reference habit | Legacy/problem | Open issue |
| --- | --- | --- | --- | --- |
| Kode AHSP | Kode official 2026 | Kode lama/prefixed dipakai di workbook | `A.1.1.1.1`; collision `3.9.1` | Crosswalk legacy→official mana yang disetujui |
| Uraian AHSP | Uraian official | Uraian dipersingkat/diubah minor | Beberapa bahan diganti nama/spesifikasi | Apakah mapping tertentu benar-benar resource sama |
| Satuan pekerjaan | Official unit | Variasi `m`/`m'`, case | Token tidak konsisten | Final alias dictionary untuk ambiguous tokens |
| Komponen | A Tenaga, B Bahan, C Alat | Harga langsung berada di row komponen | Type/harga bercampur | Tidak ada keputusan baru; separation model diajukan |
| Koefisien | Official coefficient | Banyak coefficient cocok official | Duplicate block / possible stale data | Reconciliation untuk setiap mismatch |
| Harga dasar | Bukan angka normatif AHSP | UPAH/BAHAN Golden prices | Banyak hard-coded, blank, zero | Konfirmasi zero price & conflicting duplicate price |
| OH/profit | 10–15% × biaya langsung | `AHSP!M3 = 10%` | Tidak masalah jika mengikuti baseline | Tidak ada; baseline sudah menentukan default 10% |
| HSP rounding | Official formula D+E; baseline no interim rounding | Master memakai rounding | 721 `ROUNDDOWN` | Tidak ada; baseline sudah mengalahkan legacy |
| Unit tenaga | OH/OJ sesuai analysis | Master punya derived hourly column | Divider/rounding layout-specific | Apakah konversi OH↔OJ perlu didukung sama sekali |
| Resource code | Labor code official; material/alat mengikuti SIPASTI | Banyak bahan/alat tanpa code | L.12/L.13/L.15/L.16 legacy; blank code | Sumber code untuk legacy resources bila ingin dipertahankan |
| Workbook references | Tidak normatif | lookup antar sheet | external links, 45k broken names | Tidak ada; normalized data tidak mewarisi link |
| Project category | Bukan atribut AHSP tetap | Master punya label kategori | Berpotensi tertukar dengan official hierarchy | Tidak ada; D-020 sudah menetapkan project mapping terpisah |

---

## 12. Daftar Masalah Data dan Tingkat Dampak

### 12.1 Definisi dampak

- **CRITICAL:** dapat menghasilkan HSP salah secara diam-diam atau membuat identitas AHSP tidak dapat dipercaya.
- **HIGH:** dapat menyebabkan duplicate/missing mapping, gagal join, atau data tidak portabel; harus dibereskan sebelum master dipakai engine.
- **MEDIUM:** tidak selalu mengubah angka tetapi membuat audit/maintenance rapuh atau membutuhkan review manual.
- **LOW:** mostly presentation/cleanup, tidak memengaruhi semantics bila ditangani.

### 12.2 Issue register

| ID | Masalah | Bukti | Dampak | Perlakuan normalisasi |
| --- | --- | --- | --- | --- |
| A-001 | Code collision `3.9.1` | Official heading `3.9.1`, item `3.9.1.1`; Master `C8723` dan `C8724` sama-sama `3.9.1` | CRITICAL | Official code authoritative; legacy code tidak dipromosikan |
| A-002 | HSP rounded di level AHSP | 721 `ROUNDDOWN`; contoh `I8724` | CRITICAL | Drop legacy rounding from normalized rule; preserve only as audit evidence |
| A-003 | Zero price pada bahan wajib `1.1.1.6` | `AHSP!H90:H94 = 0`; official page 161 mewajibkan bahan | CRITICAL | Treat unresolved unless explicitly zero-confirmed; block review otherwise |
| A-004 | Duplicate full AHSP `1.3.1.6` | blocks `C1405:I1418` dan `C1420:I1433` | HIGH | Deduplicate by official business key + content comparison; retain one normalized definition |
| A-005 | Legacy code berbeda official | `A.1.1.1.1` vs official `1.1.1.1` | HIGH | Build reviewed crosswalk; never overwrite official code |
| A-006 | Resource description/spec substitution | Official Papan 2/20 vs Master Papan 3/20; Paku 5 inch vs 2”-5” | HIGH | Preserve official source resource; Golden price mapping remains unresolved until verified |
| A-007 | External link parts | 2 local Windows targets | HIGH | Do not carry into normalized master/output |
| A-008 | Broken defined names | 45.054 `#REF!` names | HIGH | Ignore legacy named ranges as source of identity/logic |
| A-009 | Harga dasar kosong | `BAHAN`: 123 blank price rows | HIGH | `price_value = null/MISSING`; blocks review if resource used |
| A-010 | Harga 0 belum terbukti disengaja | `BAHAN`: 39 zero rows | HIGH | Require explicit zero-confirmed state before use |
| A-011 | Material and equipment mixed | `BAHAN!B550:B572 = ALAT SEWA` section | HIGH | Resource type derived from explicit classification, not sheet name |
| A-012 | Tenaga code legacy/blank | `UPAH!C37:G44` | HIGH | Keep unresolved/legacy; do not auto-map to current official code |
| A-013 | Conflicting duplicate material | `BAHAN!B499` vs `B502`, same normalized name/unit, prices 13800 vs 41040 | HIGH | Do not choose automatically; open issue/review |
| A-014 | Direct price embedded in AHSP | 3.485 hard-coded price cells in component-like rows | HIGH | Separate definition from Base Price; source cell only trace |
| A-015 | Inconsistent unit tokens | many case/notation variants | MEDIUM–HIGH | Apply canonical unit dictionary with conservative aliases |
| A-016 | Typo unit `bauh` | AHSP component scan | MEDIUM | REVIEW_REQUIRED; do not silently coerce |
| A-017 | Duplicate labor spelling | `UPAH!C19` vs `C26` | MEDIUM | Candidate merge only after normalized name/code/unit comparison |
| A-018 | Same name, different units | `Meni besi` Kg vs Liter | MEDIUM | Keep separate; name alone never unique |
| A-019 | Layout-dependent `/2` subtotal formulas | `AHSP!I53`, `I77` | MEDIUM | Replace semantic logic with explicit component sums in engine; do not copy formula pattern |
| A-020 | `Rekap HSP` mixes headings and records | Example `3.9.1 UBIN PC` heading with blank unit/HSP | MEDIUM | Parse hierarchy vs analysis separately; blank heading fields are not automatically “missing data” |
| A-021 | Fixed row based price references | examples `BAHAN!G6`, `G198`, `G495` | MEDIUM | Source locator only; runtime join by resource ID |
| A-022 | `BAHAN` heading/fragment rows look like resource | rows 550, 563 | MEDIUM | Classify non-resource rows before resource ingestion |

### 12.3 Status anomaly setelah rekonsiliasi

Setiap temuan dipisahkan menjadi empat status agar semantic contract tidak tercampur dengan cleanup data:

1. **RESOLVED_NORMALIZATION_RULE** — aturan semantik sudah final, misalnya official code authoritative, hierarchy node bukan analysis, no implicit unit conversion, dan `price_state` tiga-state.
2. **KNOWN_LEGACY_ANOMALY** — artefak source yang diketahui tetapi tidak diwariskan ke canonical model, misalnya external link, broken defined names, `ROUNDDOWN`, fixed-row lookup, dan duplicate block legacy.
3. **UNRESOLVED_RECORD_ISSUE** — record tertentu belum dapat dipilih/di-map secara grounded, misalnya conflicting material price atau legacy resource substitution.
4. **HUMAN_REVIEW_REQUIRED** — source/context harus diperiksa sebelum normalisasi, misalnya token unit ambigu atau literal zero tanpa bukti intent.

Kategori 2–4 tidak otomatis mengubah semantic contract Jalur A. Namun kategori 3–4 yang menyentuh resource/AHSP yang dipakai proyek memblokir REVIEW sampai selesai.

---

## 13. Contoh Record Ternormalisasi dari Data Nyata

> Internal ID literal **tidak diisi** di contoh agar tidak mengarang identifier. Field ID ditulis `<generated internal id>` dan hanya menunjukkan bahwa ID harus dibuat oleh sistem kelak.

### 13.1 Master AHSP — official `1.1.1.1`

```yaml
ahsp_id: <generated internal id>
official_code: "1.1.1.1"
official_description: "Pembuatan 1 m’ Pagar Sementara dari Kayu Tinggi 2 meter"
work_unit_raw: "m'"
work_unit_canonical: "m"
official_hierarchy_path:
  - "I Bangunan Gedung dan Perumahan"
  - "Divisi 1 Persiapan Lapangan/Site Work"
  - "1.1 Pekerjaan Persiapan"
  - "1.1.1 Pembuatan pagar proyek"
normative_reference: "Permen PUPR Nomor 8 Tahun 2023 Lampiran B U.1.1.1 (c)"
source_edition: "SE Dirjen Bina Konstruksi Nomor 47/SE/Dk/2026, Lampiran VI"
source_locator: "PDF page 158"
```

**Jejak Golden Reference:** `Masterfile AHSP CK.xlsx`, `AHSP!B8:C8` berisi legacy code `A.1.1.1.1` dan uraian yang sama. Legacy code tidak dipakai sebagai official code.

### 13.2 AHSP Component — Pekerja pada `1.1.1.1`

```yaml
ahsp_component_id: <generated internal id>
ahsp_id: <id of official 1.1.1.1>
component_group: "TENAGA"
source_resource_name: "Pekerja"
source_resource_code: "L.01"
source_unit_raw: "OH"
source_unit_canonical: "OH"
coefficient: 0.600
resource_id: <id of Pekerja|L.01|OH>
source_order: 1
source_locator: "Lampiran VI PDF page 158"
```

**Cross-check Master:** `AHSP!D11:G11` = Pekerja, L.01, OH, 0.6.

### 13.3 Resource + Base Price — Pekerja

```yaml
resource:
  resource_id: <generated internal id>
  resource_type: "TENAGA"
  normative_code: "L.01"
  resource_name: "Pekerja"
  unit_raw_reference: "OH"
  unit_canonical: "OH"

base_price:
  resource_id: <same resource id>
  price_unit: "OH"
  price_value: 176000
  price_state: "SET"
```

**Jejak:** `UPAH!C6 = Pekerja`, `G6 = L.01`, `H6 = OH`, `J6 = 176000`; `AHSP!H11` menggunakan 176000.

### 13.4 AHSP Component — Air pada `1.1.1.1`

```yaml
ahsp_component_id: <generated internal id>
ahsp_id: <id of official 1.1.1.1>
component_group: "BAHAN"
source_resource_name: "Air"
source_resource_code: null
source_unit_raw: "liter"
source_unit_canonical: "liter"
coefficient: 17.415
resource_id: <id of Air|liter>
source_order: 12
source_locator: "Lampiran VI PDF page 158"
```

Base price Golden Reference:

```yaml
resource_id: <id of Air|liter>
price_unit: "liter"
price_value: 100
price_state: "SET"
```

**Jejak:** `BAHAN!B6 = Air`, `F6 = Liter`, `G6 = 100`; `AHSP!D25:G25` official-equivalent component dan `AHSP!H25 = BAHAN!G6` pada block awal.

### 13.5 Master AHSP — official `3.9.1.1` setelah koreksi identity dari legacy source

```yaml
ahsp_id: <generated internal id>
official_code: "3.9.1.1"
official_description: "Pemasangan 1 m2 Lantai Ubin PC Abu-Abu Ukuran 20 cm x 20 cm (1SP : 2PP)"
work_unit_raw: "m2"
work_unit_canonical: "m2"
source_edition: "SE Dirjen Bina Konstruksi Nomor 47/SE/Dk/2026, Lampiran VI"
source_locator: "PDF page 409"
```

Komponen official yang nyata:

| Group | Resource | Code | Unit | Koefisien |
| --- | --- | --- | --- | ---: |
| TENAGA | Pekerja | L.01 | OH | 0.1333 |
| TENAGA | Tukang | L.02 | OH | 0.0667 |
| TENAGA | Kepala Tukang | L.03 | OH | 0.0067 |
| TENAGA | Mandor | L.04 | OH | 0.0022 |
| BAHAN | Ubin PC Abu-Abu uk. 20 x 20cm | — | buah | 26.250 |
| BAHAN | Semen Portland | — | kg | 13.632 |
| BAHAN | Pasir Pasang | — | m3 | 0.027 |

**Jejak Master:** `AHSP!C8724:I8741` memiliki koefisien yang sama tetapi code `3.9.1`, sedangkan `C8723 = 3.9.1` sudah dipakai heading `UBIN PC`. Normalized record wajib memakai official `3.9.1.1`.

Golden price example yang dapat dipisahkan:

- `BAHAN!B495 = ubin PC abu-abu ukuran 20cm x20 cm`;
- `F495 = Bh` → canonical `buah`;
- `G495 = 3630`.

Harga tersebut adalah Golden Reference price, bukan angka normatif official.

### 13.6 Record yang **tidak boleh langsung dinormalisasi sebagai valid** — `1.1.1.6`

Official component bahan nyata ada, tetapi Master menyimpan harga 0 pada `H90:H94`. Contoh staging result yang benar adalah:

```yaml
resource_name: "Panel beton pracetak"
unit_canonical: "lembar"
coefficient: 0.986
price_value: 0
price_state: <UNRESOLVED: zero belum terbukti disengaja>
```

Bukan:

```yaml
price_state: ZERO_CONFIRMED
```

karena source tidak memberi bukti bahwa zero tersebut disengaja.

---

## 14. Aturan Normalisasi yang Diusulkan untuk Jalur C / Blueprint

Aturan berikut telah direkonsiliasi dan menjadi **semantic contract Jalur A untuk Phase 1**. Per-record anomaly yang belum selesai tetap ditangani sebagai data issue, bukan alasan untuk mengubah contract.

### 14.1 AHSP ingestion semantics

1. Sumber official menentukan `official_code`, `official_description`, work unit, component group, resource source label, unit, coefficient, dan normative reference.
2. Masterfile dipakai untuk:
   - candidate mapping resource;
   - harga dasar Golden Reference;
   - expected implementation behavior yang tidak bertentangan baseline;
   - menemukan legacy aliases/errors.
3. Bila official dan Master berbeda, **jangan overwrite official**. Buat conflict/open issue.
4. Hierarchy row tidak boleh diperlakukan sebagai analysis record.
5. Setiap official analysis harus unique pada `(source edition, official_code)`.

### 14.2 Resource matching semantics

Order of confidence:

1. exact normative code + normalized name + canonical unit;
2. exact normalized name + canonical unit jika code tidak tersedia;
3. alias candidate dengan spelling/format difference;
4. semantic substitution/specification difference → **manual review**, tidak auto-merge.

Contoh SAFE candidate:

```text
Tukang Pengayam Bronjong
Tukang penganyam bronjong
```

Contoh **tidak aman** auto-merge:

```text
Papan Kayu 2/20
Kayu papan 3/20
```

### 14.3 Price semantics

1. Harga kosong → MISSING → ERROR bila resource dipakai.
2. Rp0 → tidak sama dengan kosong; harus mempunyai bukti intentional zero.
3. Harga Golden Reference disimpan pada resource, bukan di component definition.
4. Satu resource memakai satu price unit canonical untuk core Phase 1.
5. Formula harga turunan legacy boleh dipakai sebagai bukti audit, tetapi normalized output harus menyimpan **nilai harga dasar yang dipakai** dan source trace pada artefak audit; provenance price yang lebih lengkap tetap deferred.

### 14.4 HSP semantics

Normalized master tidak menyimpan HSP sebagai source of truth permanen. HSP adalah hasil:

```text
Σ(coefficient × base price) per TENAGA/BAHAN/ALAT
+ project OH/profit
```

Tidak ada `ROUNDDOWN` pada HSP sesuai baseline.

### 14.5 Mapping final Jalur A → Jalur C

Mapping ini menyelesaikan placeholder semantic Jalur C tanpa menciptakan field baru bila maknanya sudah tersedia.

| OLD FIELD C | CANONICAL FIELD A | Rule integrasi |
| --- | --- | --- |
| `component_id` | `ahsp_component_id` | Ganti nama semantic; stable component identity berasal dari Jalur A. |
| `component_order` | `source_order` | Urutan canonical komponen dalam satu AHSP; bukan row Excel. |
| `resource_type` pada `AHSP_COMPONENTS` | `component_group` | Gunakan group A/B/C canonical (`TENAGA`/`BAHAN`/`ALAT`). `Resource.resource_type` harus konsisten dan dapat dipakai sebagai cross-check, bukan semantic field kedua pada component. |
| `ahsp_code` | `official_code` | Hanya official code dari source normatif. |
| `resource_code` | `normative_code` | Nullable bila official/native code tidak tersedia. |
| `resource_name` | `resource_name` | Tidak berubah; canonical resource description Jalur A. |
| `resource_unit` | `unit_canonical` | Raw source unit tetap dapat ditampilkan terpisah bila audit memerlukan. |
| `base_price` | `price_value` | Nilai harga snapshot yang dipakai. |
| `zero_intentional` | `price_state = ZERO_CONFIRMED` | Boolean terpisah tidak diperlukan bila `price_state` dibawa. |
| `price_status` | `price_state` | Gunakan enum canonical `MISSING` / `SET` / `ZERO_CONFIRMED`. |
| `source_reference` | `normative_reference` dan/atau `source_locator` | Pilih sesuai tujuan: reference normatif vs locator audit; jangan campur menjadi identity. |
| `description` pada HSP/AHSP official | `official_description` | Mapping naming; substansi tetap official description. |
| `unit` pada HSP/AHSP official | `work_unit_canonical` | Dipakai untuk check terhadap canonical volume unit. |

Catatan: `hsp_id` tetap merupakan identity snapshot/project layer Jalur C dan **bukan** pengganti `ahsp_id`. Untuk HSP official, Jalur C membawa referensi `ahsp_id`; untuk HSP manual, `ahsp_id` tetap null sesuai kontrak Jalur C.

### 14.6 Integration gate ke Jalur C

Jalur C dapat memperlakukan kontrak berikut sebagai resolved dependency:

- canonical internal IDs: `ahsp_id`, `ahsp_component_id`, `resource_id`;
- official business identity: `(source_edition, official_code)`;
- unit check: equality setelah SAFE_ALIAS canonicalization;
- component classification: `component_group`;
- resource native code: nullable `normative_code`;
- base-price semantics: `price_value` + `price_state`;
- no best guess untuk duplicate/ambiguous mapping;
- unresolved record yang dipakai proyek memblokir REVIEW/FINAL.

---

## 15. Remaining Unresolved Data Issues

Semantic contract yang diperlukan Jalur C sudah diputuskan. Bagian ini hanya mencatat **remaining per-record / migration issues** yang tidak menghalangi Jalur A menjadi master-data contract, kecuali record tersebut dipakai oleh suatu proyek.

### OI-A01 — Encoding internal ID

Semantik sudah jelas: opaque, immutable, generated. Pilihan UUID/ULID/format lain menunggu blueprint.

### OI-A02 — Crosswalk kode legacy

Perlu daftar crosswalk terverifikasi untuk legacy codes seperti `A.1.1.1.1`. Pertanyaan: apakah crosswalk hanya dipakai migration/audit, atau juga ditampilkan sebagai alias pencarian?

### OI-A03 — Conflict `3.9.1` — RESOLVED RULE

Normalization rule sudah final: official `3.9.1` adalah hierarchy node dan item analisa menggunakan official `3.9.1.1`. Workbook source tidak diubah; legacy occurrence tetap dicatat sebagai anomaly/crosswalk evidence.

### OI-A04 — Duplicate `1.3.1.6` — RESOLVED RULE

Dua block identik dinormalisasi menjadi satu canonical official record berdasarkan `(source_edition, official_code)`. Kemunculan legacy tambahan dipertahankan sebagai source/audit occurrence, bukan canonical AHSP kedua.

### OI-A05 — Resource substitution vs alias

Perlu keputusan mapping khusus ketika Master mengganti spesifikasi source, misalnya:

- `Papan Kayu 2/20` official vs `Kayu papan 3/20` Master;
- `Paku biasa 5 inch` official vs `Paku biasa 2” - 5”` Master;
- `Batu kerikil uk. 2–3 cm` official vs `Kerikil/Koral` Master.

Tidak boleh dianggap alias otomatis karena spesifikasinya dapat berbeda.

### OI-A06 — Zero prices — PER-RECORD UNRESOLVED

Semantic contract sudah final: `ZERO_CONFIRMED` hanya untuk Rp0 dengan intent terkonfirmasi; selain itu tidak boleh lolos sebagai harga valid. Namun 39 literal zero di `BAHAN` dan zero component prices pada legacy AHSP masih memerlukan konfirmasi per record.

### OI-A07 — Conflicting duplicate material price

`ubin teralux marmer ukuran 40cm x40cm` muncul dua kali dengan unit sama (`Bh`) tetapi harga 13.800 dan 41.040. Tidak ada dasar di source untuk memilih salah satu otomatis.

### OI-A08 — Legacy tenaga di luar mapping CK awal

Perlu sumber/keputusan untuk `Penjaga Malam L.12`, `Juru Gambar L.13`, `Design Engineer L.15`, `Operator Printer/Plotter L.16`, `Bor Master` dan `Operator Mesin Bor` tanpa kode. Jangan auto-map ke kodifikasi CK 2026.

### OI-A09 — Ambiguous/composite unit aliases — PER-RECORD REVIEW

Rule sudah final: `Unit hari` dan `unit/hari` → `unit-hari` sebagai SAFE_ALIAS. `M`, `M1`, `L`, `buah hari`, dan typo `bauh` tetap `REVIEW_REQUIRED` sampai source/context memastikannya. Tidak ada auto-conversion.

### OI-A10 — OH ↔ OJ price conversion — RESOLVED FOR PHASE 1

Core Phase 1 **tidak melakukan conversion otomatis OH ↔ OJ**. Harga harus tersedia sesuai unit komponen yang digunakan. Conversion rule baru hanya boleh ditambahkan lewat keputusan eksplisit jika kebutuhan nyata muncul.

### OI-A11 — BAHAN title `ZONA 3` — RESOLVED FOR CORE

D-012 menunda zonasi. Nilai Golden Reference dapat menjadi current minimum price yang dipakai/snapshot tanpa membawa `Zona 3` sebagai field core. Label source tetap dapat disimpan pada jejak audit di luar core price entity.

### OI-A12 — Resource code bahan/alat — RESOLVED FOR CORE

Core Phase 1 menerima `resource_id` sebagai identity authoritative dan `normative_code` nullable bila official/native code tidak tersedia. Tidak perlu menunggu katalog kode lengkap untuk mengunci semantic contract.

---

## 16. Checklist Penerimaan Jalur A

### 16.1 Struktur normatif

- [x] Struktur kode, uraian, satuan pekerjaan, komponen A/B/C, resource, satuan resource, koefisien, dan referensi dipetakan.
- [x] Hierarki official dibedakan dari kategori/kelompok RAB proyek.
- [x] Kodifikasi tenaga kerja official dan implikasi shared code `L.02` diidentifikasi.

### 16.2 Perbandingan Masterfile

- [x] Sheet `UPAH`, `BAHAN`, `Rekap HSP`, dan `AHSP` diaudit secara struktural.
- [x] Perbedaan kode official vs legacy ditemukan dan diberi contoh nyata.
- [x] Duplicate code/block dan code collision ditemukan.
- [x] Harga blank, Rp0, harga hard-coded, dan mixed resource type ditemukan.
- [x] External link dan broken defined names ditemukan.
- [x] Legacy rounding dan layout-dependent formula diidentifikasi.

### 16.3 Data dictionary dan identity

- [x] Data dictionary minimum Master AHSP disusun.
- [x] Data dictionary minimum AHSP Component disusun.
- [x] Data dictionary minimum Resource disusun.
- [x] Data dictionary minimum Base Price disusun tanpa zonasi/vendor/histori/log harga.
- [x] Aturan internal ID dan business key disusun tanpa row-number identity.
- [x] Relasi logical AHSP → component → resource → price disusun tanpa physical DB design.

### 16.4 Unit normalization

- [x] Unit aliases nyata dari workbook dipetakan.
- [x] SAFE_ALIAS, CONVERTIBLE, dan REVIEW_REQUIRED dibedakan.
- [x] Compatibility volume/HSP dan resource/base-price dirumuskan konservatif.
- [x] OH dan OJ tidak disatukan secara otomatis.

### 16.5 Traceability dan boundaries

- [x] Contoh normalized records menggunakan kode/angka nyata dan mencantumkan source locator.
- [x] Tidak ada kode/koefisien AHSP resmi yang diubah.
- [x] Tidak ada analisa custom baru.
- [x] Tidak ada physical DB/API/UI/import code.
- [x] Tidak ada perubahan Decision Log atau baseline.
- [x] Hal yang belum ditentukan baseline diletakkan sebagai open issues, bukan keputusan diam-diam.

### 16.6 Acceptance gate yang direkomendasikan sebelum Jalur A dinyatakan final

- [x] Canonical ID semantics dikunci: `ahsp_id`, `ahsp_component_id`, `resource_id` opaque dan immutable; encoding ditunda.
- [x] Business identity official dikunci pada `(source_edition, official_code)`.
- [x] Unit contract dikunci: SAFE_ALIAS auto-normalize; CONVERTIBLE memerlukan explicit rule; REVIEW_REQUIRED tidak auto-map.
- [x] Core unit check dikunci sebagai `canonical_volume_unit = canonical_hsp_unit` setelah SAFE_ALIAS normalization.
- [x] Legacy code hanya crosswalk audit/migration dan tidak menjadi official identity.
- [x] Price semantics dikunci sebagai `MISSING / SET / ZERO_CONFIRMED`; intent zero per-record dapat tetap unresolved.
- [x] Duplicate/ambiguity contract dikunci dan melarang best guess.
- [x] Mapping field Jalur C → canonical Jalur A didokumentasikan pada §14.5.
- [x] Jalur A cukup stabil menjadi dependency canonical Jalur C; per-record anomalies diselesaikan ketika record terkait akan dipakai.

---

## 17. Source Trace Index

### Official PDF

| Topic | Source locator |
| --- | --- |
| Ketentuan umum + tiga komponen AHSP | Lampiran VI PDF pp. 1–3 |
| Kodifikasi tenaga kerja | Lampiran VI PDF pp. 2–3 |
| HSP = component cost + OH/profit | Lampiran VI PDF p. 44 |
| `1.1.1.1` pagar sementara kayu | Lampiran VI PDF p. 158 |
| `1.1.1.6` panel beton pracetak | Lampiran VI PDF p. 161 |
| `1.3.1.6` urukan batu kerikil | Lampiran VI PDF p. 201 |
| `3.9.1` hierarchy UBIN PC / `3.9.1.1` item 20×20 | TOC sekitar PDF p. 68; detailed analysis PDF p. 409 |
| Contoh unit bahan penanaman | Lampiran VI PDF p. 32–33 |

### `Masterfile AHSP CK.xlsx`

| Topic | Source locator |
| --- | --- |
| Profit default | `AHSP!M3 = 0.1` |
| Legacy first analysis | `AHSP!B8:I31` |
| `SUM(...)/2` formula | `AHSP!I53`, `I77` |
| Zero material prices `1.1.1.6` | `AHSP!C81:I100`, terutama `H90:H94` |
| Duplicate `1.3.1.6` | `AHSP!C1405:I1418`, `C1420:I1433` |
| Collision `3.9.1` | `AHSP!C8723:C8724`; official-equivalent detail `C8724:I8741` |
| Labor master sample | `UPAH!C6:J44` |
| Pekerja price | `UPAH!C6`, `G6`, `H6`, `J6` |
| `Jam Kerja Eff.` | `UPAH!M4:N4` |
| Bahan price master | `BAHAN!B6:G572` |
| Alat sewa embedded in BAHAN | `BAHAN!B550:G572` |
| Duplicate ubin teralux marmer | `BAHAN!B499:G499`, `B502:G502` |
| Air zero prices | `BAHAN!B8:G9` |
| Rekap collision `3.9.1` | `Rekap HSP!A1106:G1107` |
| Legacy top Rekap code | `Rekap HSP!A12:G12` and formula-linked records beginning around row 48 |

---

## 18. Handoff untuk Rekonsiliasi

Jalur A menghasilkan satu boundary yang tegas:

```text
OFFICIAL AHSP DEFINITION
(code + description + work unit + component + coefficient + reference)
        │
        ├── links by internal resource identity
        ▼
RESOURCE MASTER
(type + code if available + canonical name + canonical unit)
        │
        ▼
CURRENT BASE PRICE MINIMUM
(resource + unit + nullable price + zero/missing distinction)
```

Semua hal berikut harus tetap berada di luar definisi master AHSP:

- kelompok/subkelompok RAB proyek;
- volume/BV;
- OH/profit proyek;
- PPN;
- hasil HSP yang bergantung pada price snapshot;
- vendor/zona/history/provenance harga;
- formula Excel row-specific;
- legacy code sebagai official identity.

Dengan pemisahan tersebut, Jalur C dapat membawa hanya AHSP/HSP yang digunakan ke workbook audit tanpa mewarisi struktur workbook legacy, dan blueprint berikutnya dapat membangun source of truth yang tidak bergantung pada nomor baris Excel.

**Final verdict Jalur A:** **FINAL AS MASTER-DATA CONTRACT**. Semantic contract identity, field, unit, price-state, duplicate/ambiguity handling, dan mapping ke Jalur C sudah cukup stabil untuk dikunci. Remaining issues adalah anomaly/per-record review dan tidak mengubah kontrak ini; record unresolved yang diperlukan proyek tetap harus diselesaikan sebelum REVIEW/FINAL snapshot.
