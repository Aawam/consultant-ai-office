# 06 — Decision Log

Dokumen ini menyimpan keputusan arsitektur agar project tidak kehilangan arah.

**Status:** CANONICAL — D-001 s.d. D-025  
**Last updated:** 2026-08-28  

## D-001 — Dua Workflow Utama

**Decision:** Perencanaan dan Pengawasan diperlakukan sebagai workflow terpisah.

**Reason:** Produk dan ritme kerja berbeda.

---

## D-002 — Gambar Rencana Tetap Manual

**Decision:** AI tidak membuat gambar rencana pada tahap awal.

**Reason:**
- kompleksitas integrasi CAD tinggi,
- risiko error tinggi,
- human review tetap dibutuhkan,
- ROI awal lebih tinggi di RAB dan dokumen.

---

## D-003 — RAB/EE Menjadi Capability Pertama

**Decision:** Setelah AI Office shell, RAB/EE Engine menjadi tool utama pertama.

**Reason:**
- workflow terstruktur,
- dapat divalidasi terhadap proses manual,
- terhubung ke RKS dan laporan,
- berpotensi menghemat waktu besar.

---

## D-004 — Human Review Wajib

**Decision:** Output penting tidak boleh langsung dianggap final.

**Core Phase 1 state:**

```text
DRAFT
→ REVIEW
→ FINAL
```

**Deferred:** Status `APPROVED` sebagai tahap terpisah dapat ditambahkan ketika proses persetujuan dan penerbitan final sudah melibatkan fungsi atau pihak yang berbeda.

---

## D-005 — AI Tidak Menghitung Angka Final

**Decision:** Perhitungan RAB dilakukan deterministic calculation engine.

**AI role:**
- search
- interpret
- recommend
- explain
- orchestrate

---

## D-006 — Data adalah Fondasi

**Decision:** AI Office tidak menjadi source of truth.

**Hierarchy:**

```text
AI / AUTOMATION
      ↑
   WORKFLOW
      ↑
    TOOLS
      ↑
     DATA
```

---

## D-007 — AI Office Dibuat Lebih Dulu sebagai Shell

**Decision:** AI Office Foundation dibuat sebelum RAB/EE, tetapi hanya sebagai shell minimal.

**Reason:** Membuat arsitektur tool calling dan approval sejak awal tanpa membangun orchestrator kosong yang terlalu kompleks.

---

## D-008 — Multi-Agent Ditunda

**Decision:** Tidak meniru Munder Difflin secara penuh pada V1.

**Reason:** Multi-agent hanya ditambahkan jika specialization atau parallel work terbukti memberi nilai nyata.

---

## D-009 — Two Initial Roles

**Decision:** Role awal hanya:

- Technical
- Admin

**Reason:** Sesuai struktur perusahaan saat ini.

---

## D-010 — Fokus Integrasi, Bukan Sekadar Pengurangan Kerja

**Decision:** Efisiensi adalah outcome, bukan satu-satunya tujuan.

**Core objective:** Integrasi data, tool, output, dan dependency.

---

## D-011 — Sumber dan Ketertelusuran Volume RAB/EE

**Decision:** Volume item pekerjaan dapat berasal dari:

1. perhitungan Backup Volume (BV); atau
2. input langsung yang dapat ditelusuri.

**Rules:**

- Pekerjaan geometris wajib dihitung melalui BV berdasarkan dimensi, jumlah, formula, satuan, dan sumber ukuran/gambar.
- Kuantitas sederhana atau lump sum (LS) boleh diinput langsung apabila perhitungan geometris tidak relevan.
- Input langsung wajib menyimpan dasar kuantitas, sumber, catatan, dan reviewer.
- Volume final yang diteruskan ke RAB harus memiliki satuan yang kompatibel dengan satuan item/HSP.
- AI tidak boleh mengasumsikan atau menetapkan volume tanpa input dan sumber yang dapat diperiksa.

**Reason:** AHSP menghitung kebutuhan sumber daya dan harga untuk satu satuan pekerjaan, sedangkan volume proyek berasal dari gambar, dimensi, jumlah, atau ketentuan dokumen proyek. Kedua fungsi tersebut harus dipisahkan agar perhitungan dapat diaudit.

---

## D-012 — Master Harga Dasar Minimum pada Phase 1

**Decision:** Phase 1 hanya menyediakan master harga dasar sederhana untuk upah, bahan, dan alat.

**Minimum data:**

- ID/kode internal sumber daya;
- uraian;
- satuan;
- nilai harga dasar.

**Rules:**

- Harga kosong berarti data belum lengkap dan tidak boleh otomatis dianggap Rp0.
- Nilai Rp0 hanya boleh digunakan apabila memang merupakan nilai yang disengaja, bukan akibat data kosong.
- Nilai harga yang digunakan dibekukan dalam snapshot perhitungan HSP/RAB agar hasil lama tidak berubah ketika master harga diedit.

**Deferred:**

- zonasi harga;
- sumber atau vendor harga;
- lokasi dan tahun/tanggal berlaku;
- perbandingan beberapa sumber harga;
- histori harga;
- alasan, approval, dan log perubahan harga.

**Reason:** Sasaran Phase 1 adalah memvalidasi rantai perhitungan harga dasar → AHSP/HSP → RAB. Pengelolaan provenance dan histori harga menambah kompleksitas yang belum diperlukan untuk membuktikan engine perhitungan awal.

---

## D-013 — HSP Manual Sekarang, Penyusunan Analisa Custom Kemudian

**Decision:** Core Phase 1 menggunakan AHSP resmi dan menyediakan input HSP manual sebagai jalur pengecualian. Penyusunan analisa custom lengkap tetap menjadi fitur wajib dalam roadmap RAB/EE, tetapi dikerjakan setelah core Phase 1 selesai dan tervalidasi.

**Current Phase 1 rules:**

- Master AHSP resmi tidak boleh diedit.
- Item yang belum tersedia dalam AHSP resmi dapat menggunakan HSP final yang dimasukkan secara manual.
- Item manual minimal menyimpan uraian pekerjaan, satuan, nilai HSP final, catatan, dan penanda `MANUAL / NON-AHSP`.
- HSP manual dianggap sudah memuat seluruh pembentuk harga yang diperlukan sehingga OH/profit tidak ditambahkan kembali oleh sistem.
- Item manual wajib melewati human review dan tidak otomatis menjadi bagian dari katalog AHSP.
- Nilai item RAB tetap dihitung secara deterministik: volume × HSP manual.

**Deferred but required:**

- editor analisa custom;
- komponen upah, bahan, dan alat custom;
- koefisien custom;
- kode dan versi analisa custom;
- penyimpanan analisa custom ke katalog;
- review dan snapshot analisa custom lengkap.

**Reason:** Jalur HSP manual mencegah pekerjaan yang belum tersedia dalam AHSP resmi menghambat penyusunan RAB, tanpa membebani core Phase 1 dengan editor dan tata kelola analisa custom. Analisa custom tidak dibatalkan karena tetap diperlukan untuk menangani kebutuhan proyek nyata secara lengkap.

---

## D-014 — Posisi dan Tarif OH/Profit pada Core Phase 1

**Decision:** OH/profit dihitung satu kali pada tingkat setiap analisa AHSP, berdasarkan subtotal seluruh biaya langsung analisa tersebut. OH/profit tidak dihitung pada setiap komponen sumber daya dan tidak ditambahkan kembali pada total RAB.

**Formula:**

```text
A = subtotal tenaga kerja
B = subtotal bahan
C = subtotal alat
D = A + B + C
E = D × tarif OH/profit
HSP = D + E
Nilai item RAB = volume × HSP
```

**Core Phase 1 rules:**

- Satu tarif OH/profit ditetapkan untuk satu proyek dan diterapkan pada setiap AHSP yang digunakan dalam proyek tersebut.
- Tarif yang diizinkan mengikuti AHSP resmi, yaitu 10–15%; nilai awal/default adalah 10%.
- HSP manual dianggap sudah termasuk OH/profit sehingga sistem tidak menambahkannya kembali.
- Perubahan tarif per analisa/item, jika kelak diperlukan, ditunda sebagai fitur tambahan.
- Tarif dan nilai OH/profit yang digunakan ikut dibekukan dalam snapshot perhitungan.

**Reason:** Aturan ini sesuai struktur AHSP resmi dan Golden Reference, yang menggunakan satu nilai profit proyek lalu menerapkannya pada subtotal biaya langsung masing-masing analisa. Cara ini mencegah penghitungan ganda sekaligus menjaga core Phase 1 tetap sederhana.

---

## D-015 — PPN Dihitung pada Tingkat Proyek

**Decision:** PPN dihitung satu kali setelah subtotal seluruh item RAB, bukan di dalam AHSP/HSP dan bukan secara terpisah pada setiap item pekerjaan.

**Formula:**

```text
Subtotal RAB = Σ(volume × HSP)
PPN = Subtotal RAB × tarif PPN proyek
Total setelah PPN = Subtotal RAB + PPN
```

**Core Phase 1 rules:**

- Satu tarif PPN berlaku untuk satu proyek.
- Golden Reference menggunakan 11% sebagai nilai awal/default implementasi.
- Tarif PPN dapat diubah atau ditetapkan 0% sesuai kebutuhan proyek; tarif tidak di-hardcode secara permanen.
- Tidak ada tarif PPN berbeda untuk setiap item pada core Phase 1.
- Tarif dan nilai PPN yang digunakan ikut dibekukan dalam snapshot perhitungan.

**Reason:** AHSP membentuk HSP sampai biaya umum dan keuntungan, sedangkan PPN diterapkan setelah total mata pembayaran. Menjadikan tarif sebagai parameter proyek menjaga implementasi tetap sederhana sekaligus menghindari ketergantungan permanen pada satu tarif.

---

## D-016 — Presisi HSP dan Pembulatan Final ke Ribuan Terdekat

**Decision:** HSP dan seluruh nilai antara tidak mengalami pembulatan matematis. Pembulatan hanya dilakukan satu kali pada total setelah PPN, menggunakan metode pembulatan normal (*half-up*) ke kelipatan Rp1.000 terdekat.

**Calculation order:**

```text
HSP = biaya langsung + OH/profit              [tanpa pembulatan]
Nilai item = volume × HSP                     [tanpa pembulatan]
Subtotal RAB = Σ nilai item                    [tanpa pembulatan]
PPN = subtotal RAB × tarif PPN                [tanpa pembulatan]
Total sebelum pembulatan = subtotal RAB + PPN
Total final = pembulatan half-up ke Rp1.000 terdekat
```

**Rounding rule:**

- Sisa terhadap kelipatan Rp1.000 kurang dari Rp500 dibulatkan ke bawah.
- Sisa sama dengan atau lebih dari Rp500 dibulatkan ke atas.
- Untuk nilai nonnegatif, rumus ekuivalennya adalah `floor((total + 500) / 1000) × 1000`.
- Sistem menyimpan total sebelum pembulatan, total final, dan selisih pembulatan.
- Pemformatan tampilan tidak boleh mengubah nilai perhitungan yang disimpan.

**Examples:**

```text
Rp1.450.299.600 → Rp1.450.300.000
Rp3.561.222.350 → Rp3.561.222.000
Rp385.244.500   → Rp385.245.000
```

**Reason:** Menjaga presisi sampai akhir mencegah akumulasi selisih dari pembulatan berulang. Pembulatan final ke ribuan menghasilkan angka akhir yang rapi tanpa mengubah HSP dan subtotal antara.

---

## D-017 — Kelompok Utama dan Subkelompok Opsional pada RAB

**Decision:** Core Phase 1 mendukung maksimal dua tingkat pengelompokan RAB: kelompok utama wajib dan satu tingkat subkelompok opsional.

**Structure:**

```text
Proyek
└── Kelompok Utama
    ├── Item RAB langsung
    └── Subkelompok [opsional]
        └── Item RAB
```

**Rules:**

- Setiap item RAB harus berada tepat pada satu kelompok utama atau satu subkelompok; item tidak boleh dihitung ganda.
- Subkelompok digunakan ketika satu jenis, lokasi, lantai, atau tipe memiliki beberapa item yang perlu dihitung dan dijumlahkan bersama.
- Jika suatu jenis hanya memiliki satu baris harga, jenis tersebut cukup menjadi item RAB dan tidak perlu dijadikan subkelompok.
- Subtotal subkelompok adalah jumlah seluruh nilai item di dalamnya.
- Subtotal kelompok utama adalah jumlah item langsung dalam kelompok ditambah seluruh subtotal subkelompoknya.
- Subtotal RAB adalah jumlah seluruh subtotal kelompok utama.
- Detail RAB menampilkan kelompok, subkelompok, item, dan subtotal terkait.
- Rekap utama menampilkan subtotal kelompok utama dan selalu diturunkan otomatis dari detail RAB; nilai Rekap tidak diinput ulang secara manual.

**Example use:** Subkelompok dapat dipakai untuk `Pintu Tipe P1`, `Pintu Tipe P2`, atau `Jendela Tipe J1` apabila masing-masing terdiri dari beberapa item seperti kusen, daun, kaca, dan aksesori.

**Reason:** Beberapa proyek memerlukan pemisahan berdasarkan lantai atau tipe, terutama pada pekerjaan kusen, pintu, dan jendela. Membatasi kedalaman hingga dua tingkat mengakomodasi kebutuhan nyata tersebut tanpa membuat struktur core Phase 1 terlalu kompleks.

---

## D-018 — Perilaku Status dan Revisi RAB/EE

**Decision:** Core Phase 1 menggunakan alur status `DRAFT → REVIEW → FINAL` dengan penguncian data selama review dan setelah finalisasi.

**Rules:**

- `DRAFT`: seluruh data RAB/EE dapat diedit.
- Saat dikirim ke `REVIEW`, sistem membentuk snapshot dan mengunci data yang sedang diperiksa.
- Dokumen berstatus `REVIEW` tidak boleh diedit langsung.
- Jika ada koreksi, reviewer mengembalikan dokumen dari `REVIEW` ke `DRAFT` sebelum perubahan dilakukan.
- Jika hasil review benar, dokumen dapat diubah dari `REVIEW` menjadi `FINAL`.
- `FINAL` bersifat tetap dan tidak boleh diedit langsung.
- Perubahan terhadap dokumen `FINAL` harus membuat revisi baru berstatus `DRAFT`; versi final sebelumnya tetap dipertahankan.

**Reason:** Reviewer harus memeriksa satu versi angka yang stabil. Penguncian dan revisi baru mencegah dokumen yang telah diperiksa atau diterbitkan berubah diam-diam.

---

## D-019 — Validasi ERROR dan WARNING Sebelum REVIEW

**Decision:** Dokumen `DRAFT` boleh belum lengkap, tetapi harus melewati validasi otomatis sebelum dapat dikirim ke `REVIEW`. Temuan validasi dibedakan menjadi `ERROR` dan `WARNING`.

**Severity rules:**

- `ERROR` memblokir perpindahan dari `DRAFT` ke `REVIEW`.
- `WARNING` tidak memblokir perpindahan, tetapi harus ditampilkan dan dikonfirmasi oleh reviewer.

**Minimum validation before REVIEW:**

- identitas wajib proyek telah terisi;
- terdapat minimal satu kelompok dan satu item RAB;
- setiap item berada tepat dalam satu kelompok atau subkelompok;
- setiap item memiliki uraian, satuan, volume, dan HSP yang valid;
- satuan volume kompatibel dengan satuan HSP;
- pekerjaan geometris memiliki perhitungan BV;
- input volume langsung hanya digunakan untuk jumlah sederhana atau LS sesuai D-011;
- seluruh komponen AHSP yang diperlukan memiliki harga dasar;
- OH/profit berada dalam rentang 10–15%;
- tarif PPN valid;
- tidak ada formula, referensi, atau hasil perhitungan yang gagal;
- subtotal, PPN, total sebelum pembulatan, dan total final berhasil dihitung.

**Examples:**

- `ERROR`: harga dasar kosong, satuan tidak cocok, pekerjaan geometris tanpa BV, item tanpa kelompok, atau formula gagal.
- `WARNING`: penggunaan HSP manual/non-AHSP, harga Rp0 yang disengaja, atau input volume langsung yang sah untuk jumlah sederhana/LS.

**Reason:** Pemisahan severity mencegah kesalahan numerik atau struktural masuk ke review tanpa menghambat pengecualian yang memang diperbolehkan dan dapat diperiksa manusia.

---

## D-020 — Paket Keluaran RAB/EE dan Pemetaan AHSP ke Kelompok Proyek

**Decision:** Core Phase 1 menghasilkan satu paket keluaran proyek yang mencakup Rekap RAB, RAB detail, Backup Volume, AHSP/HSP terpakai, dan pemetaan AHSP/HSP terpakai ke kategori atau kelompok RAB proyek.

**Required contents:**

1. Rekap RAB;
2. RAB detail;
3. Backup Volume (BV);
4. AHSP/HSP yang digunakan;
5. daftar AHSP/HSP yang digunakan menurut kategori, kelompok utama, dan subkelompok RAB terkait.

**Rules:**

- Paket keluaran hanya memuat AHSP/HSP yang benar-benar digunakan dalam proyek, bukan seluruh master AHSP.
- Kategori atau kelompok RAB merupakan pemetaan tingkat proyek, bukan atribut tetap pada master AHSP.
- AHSP yang sama dapat ditempatkan pada kelompok berbeda di proyek lain sesuai struktur RAB proyek tersebut.
- Setiap item RAB menghubungkan volume, AHSP/HSP yang digunakan, serta satu kelompok atau subkelompok proyek.
- Item HSP manual/non-AHSP tetap dicantumkan dengan penanda yang jelas.
- Rekap, RAB detail, BV, AHSP/HSP terpakai, dan pemetaan kategori harus dibentuk dari snapshot proyek yang sama.
- Tidak boleh ada input ulang angka Rekap atau pemetaan terpisah yang dapat menyebabkan perbedaan dengan RAB detail.

**Example:**

```text
Kategori Pekerjaan SMKK
├── Pembersihan Lokasi
└── K3 dan Papan K3

Pekerjaan Struktur
├── Beton Bertulang
└── Kolom Pancang
```

**Reason:** Paket ini memungkinkan pemeriksaan dari angka ringkasan sampai volume dan analisa pembentuk harga, sekaligus menunjukkan posisi setiap AHSP/HSP dalam struktur pekerjaan proyek.

---

## D-021 — Excel Berformula Aktif sebagai Keluaran Audit

**Decision:** Core Phase 1 menghasilkan satu workbook Excel mandiri dengan formula aktif sebagai keluaran kerja dan audit perhitungan RAB/EE.

**Rules:**

- Workbook memuat Rekap RAB, RAB detail, Backup Volume, AHSP/HSP terpakai, serta pemetaan AHSP/HSP ke kelompok proyek sesuai D-020.
- Formula menghubungkan alur perhitungan `BV → volume RAB → HSP → nilai item → subtotal → PPN → pembulatan final`.
- Sel input dan sel formula harus dapat dibedakan dengan jelas.
- Seluruh referensi perhitungan berada di dalam workbook yang sama; external link ke workbook lain tidak diperbolehkan.
- Perubahan pada input yang sah memperbarui hasil perhitungan terkait secara otomatis.
- Workbook mencantumkan identitas proyek, versi/revisi, dan status dokumen.
- Excel berformula aktif berfungsi sebagai dokumen kerja dan audit; sumber data yang berstatus `FINAL` tetap merupakan snapshot final di dalam sistem.
- Pembuatan Excel terpisah yang hanya berisi nilai tetap (*values-only*) ditunda sebagai fitur lanjutan.

**Reason:** Formula aktif memungkinkan pengguna menelusuri dan menguji rantai perhitungan, sementara workbook mandiri menghindari kerusakan akibat external link seperti yang ditemukan pada Golden Reference.

---

## D-022 — Pengembangan dan Pengujian PDF Ditunda

**Decision:** PDF tetap dipertahankan sebagai keluaran yang direncanakan dalam Phase 1, tetapi pengembangan format dan pengujiannya ditunda sampai keluaran Excel berformula aktif selesai dan tervalidasi.

**Current priority:**

- Fokus implementasi dan pengujian awal adalah workbook Excel sesuai D-021.
- Validasi mencakup struktur sheet, formula, aliran referensi, konsistensi angka, dan kelengkapan paket keluaran sesuai D-020.
- Desain tata letak PDF, pemenggalan halaman, halaman pengesahan, serta pengujian hasil cetak belum menjadi target implementasi awal.
- Penundaan PDF tidak menghapusnya dari rencana keluaran Phase 1.
- Ketika mulai dikembangkan, PDF harus dibentuk dari snapshot data yang sama dengan keluaran Excel agar tidak terjadi input ulang atau perbedaan angka.

**Reason:** Excel merupakan media utama untuk membuktikan bahwa struktur data dan rantai perhitungan RAB/EE telah benar. Pengujian PDF sebelum fondasi tersebut stabil akan menambah pekerjaan tata letak yang berpotensi harus diulang.

---

## D-023 — Zero Volume Policy

**Decision:** Nilai `volume = 0` boleh disimpan pada status `DRAFT` sebagai kondisi data belum lengkap, tetapi diklasifikasikan sebagai `ERROR`. Setiap item RAB aktif pada `REVIEW` dan `FINAL` wajib memiliki `volume > 0`.

**Rules:**

- `DRAFT`:
  - `volume = 0` boleh tersimpan;
  - validation state = `ERROR / incomplete`.
- `REVIEW`:
  - setiap item RAB aktif wajib memiliki `volume > 0`;
  - `volume = 0` memblokir perpindahan ke `REVIEW`.
- `FINAL`:
  - setiap item RAB aktif wajib memiliki `volume > 0`.
- Tidak ada override zero-volume pada Phase 1.
- Jika item tidak digunakan, kondisi tersebut tidak direpresentasikan sebagai item aktif dengan volume nol.

**Reason:** Nilai nol pada volume item aktif dapat menyamarkan BV belum selesai, input belum lengkap, atau formula yang gagal. Pada Phase 1 tidak ada business requirement yang membutuhkan item aktif bernilai volume nol pada REVIEW/FINAL.

---

## D-024 — Zero Manual HSP Policy

**Decision:** Nilai `manual_hsp = 0` boleh disimpan pada status `DRAFT` sebagai kondisi data belum lengkap, tetapi diklasifikasikan sebagai `ERROR`. HSP `MANUAL / NON-AHSP` pada `REVIEW` dan `FINAL` wajib memiliki `manual_hsp > 0`.

**Rules:**

- `DRAFT`:
  - `manual_hsp = 0` boleh tersimpan;
  - validation state = `ERROR / incomplete`.
- `REVIEW`:
  - HSP `MANUAL / NON-AHSP` wajib memiliki `manual_hsp > 0`;
  - `manual_hsp = 0` memblokir perpindahan ke `REVIEW`.
- `FINAL`:
  - HSP `MANUAL / NON-AHSP` wajib memiliki `manual_hsp > 0`.
- Tidak ada override zero-manual-HSP pada Phase 1.
- Keputusan ini tidak mengubah intentional zero pada base-price resource:
  - literal Rp0 tanpa intent eksplisit = unresolved / `ERROR`;
  - `price_state = ZERO_CONFIRMED` + `price_value = 0` + explicit intent = `WARNING` dan memerlukan reviewer confirmation.

**Reason:** HSP manual adalah nilai harga satuan final untuk jalur pengecualian non-AHSP. Nilai nol tidak dapat dibedakan secara aman dari nilai yang belum diisi tanpa business requirement khusus; Phase 1 tidak memiliki kebutuhan tersebut.

---

## D-025 — Architecture Foundation Diterima

**Decision:** Dokumen `08-architecture-foundation-proposal.md` diterima sebagai Architecture Foundation kanonik untuk Consultant AI Office dan menjadi baseline bagi penyusunan Technical Blueprint serta implementasi bertahap Phase 0–5.

**Accepted foundation:**

- core application berupa browser-based local-first web application yang server-ready;
- struktur aplikasi berupa modular monolith;
- RAB/EE Engine dan business/domain logic bersifat deterministic dan tetap berfungsi tanpa AI;
- manusia dan AI menggunakan Application/Domain Layer yang sama;
- AI hanya bekerja melalui controlled tools dan tidak memiliki akses langsung ke database, SQL, terminal, atau filesystem;
- authorization, approval, revision, dan audit ditegakkan pada Application Layer dengan kebijakan yang sadar terhadap jenis aktor;
- AI awal bersifat opsional dan menggunakan satu orchestrator request-response, bukan multi-agent;
- Phase awal menggunakan satu PostgreSQL instance dan project file storage;
- model menjaga stable `hsp_id` yang berbeda perannya dari `ahsp_id`;
- Backup Volume menggunakan controlled/versioned templates dan tidak memakai arbitrary formula engine pada Phase 1;
- Golden Reference Tests dibedakan dari Contract-Derived Acceptance Tests;
- scope tetap memakai tiga bucket: `BUILD NOW`, `DESIGN FOR LATER`, dan `DO NOT BUILD YET`;
- Phase 0–5 diselesaikan secara progresif dengan prioritas risiko rendah; item tertunda tetap terdokumentasi dan tidak otomatis dipromosikan menjadi requirement.

**Reason:** Fondasi ini memungkinkan validasi manfaat operasional dengan biaya dan kompleksitas awal yang terkendali, menjaga AI bukan source of truth, serta mempertahankan jalur migrasi ke server dan perluasan fitur di kemudian hari.

**Impact:**

- Architecture Foundation berubah dari `PROPOSED` menjadi `ACCEPTED` dan menjadi baseline yang terkunci.
- Penyusunan Technical Blueprint dapat dimulai dengan tunduk pada Architecture Foundation, Decision Log, dan kontrak final Jalur A/B/C.
- Perubahan arsitektur berikutnya memerlukan revisi/addendum, analisis dampak, dan approval eksplisit.
- Keputusan ini tidak mengubah D-001 s.d. D-024, tidak membuka ulang kontrak bisnis RAB/EE, dan tidak memindahkan item `DESIGN FOR LATER` atau `DO NOT BUILD YET` ke `BUILD NOW`.
