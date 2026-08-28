# 11 — Golden Test Specification

**Project:** Consultant AI Office — Phase 1 RAB / Engineer's Estimate  
**Jalur:** B — Golden Test dan Expected Result  
**Status:** **FINAL AS GOLDEN TEST CONTRACT** setelah minimum patch Manager Review; tiga positive scenario tanpa source-backed fixture dipisahkan sebagai `CONTRACT-DERIVED ACCEPTANCE TEST REQUIRED`  
**Tanggal analisis:** 2026-08-28  
**Output:** dataset oracle untuk membuktikan rantai `BV / harga dasar → AHSP/HSP → RAB → rekap → PPN → pembulatan final`

---

## 1. Ruang lingkup dan hierarki sumber

Spesifikasi ini mengikuti hierarki acuan Phase 1:

1. **Lampiran VI AHSP Cipta Karya Kementerian PU 2026** — acuan normatif kode, uraian, satuan, tiga kelompok komponen, koefisien, dan prinsip pembentukan HSP.
2. **Decision Log terbaru** — keputusan produk dan aturan implementasi D-011 s.d. D-022.
3. **`08-rab-ee-baseline-v1.md`** — kontrak bisnis bersama untuk Jalur A–C.
4. **`Masterfile AHSP CK.xlsx`** — Golden Reference implementasi harga dasar, detail AHSP, OH/profit, dan HSP.
5. **`Contoh Rekap RAB dan BV.xlsx`** — Golden Reference workflow BV, RAB detail, rekap, PPN, pembulatan, dan keluaran.
6. **`04-rab-ee-v1-spec.md`** — spesifikasi awal yang tetap dipakai sejauh tidak bertentangan dengan Decision Log/baseline terbaru.

Artefak legacy seperti `external link`, `#NAME?`, HSP yang dibulatkan dengan `ROUNDDOWN`, dan pembulatan proyek dengan `ROUNDUP` **tidak** diangkat menjadi aturan sistem.

**Tidak termasuk:** pengujian PDF, perubahan workbook sumber, desain database/API/UI, dan coding test runner.

---

## 2. Aturan oracle yang digunakan

### 2.1 Rantai perhitungan

```text
komponen AHSP = koefisien × harga dasar

A = subtotal tenaga
B = subtotal bahan
C = subtotal alat
D = A + B + C
E = D × tarif OH/profit
HSP = D + E

nilai item = volume × HSP
subtotal subkelompok = Σ nilai item subkelompok
subtotal kelompok = Σ item langsung + Σ subtotal subkelompok
subtotal RAB = Σ subtotal kelompok
PPN = subtotal RAB × tarif PPN proyek
total sebelum pembulatan = subtotal RAB + PPN
total final = floor((total sebelum pembulatan + 500) / 1000) × 1000
```

Ketentuan penting:

- HSP dan seluruh nilai antara **tidak dibulatkan secara matematis**.
- OH/profit diterapkan satu kali pada biaya langsung AHSP.
- PPN diterapkan satu kali pada subtotal proyek.
- Pembulatan hanya sekali pada total setelah PPN, half-up ke Rp1.000.
- HSP manual/non-AHSP, Rp0 yang disengaja, dan input volume langsung yang sah adalah **WARNING**, bukan error.
- Harga kosong, formula/referensi gagal, geometri tanpa BV, atau data wajib tidak valid adalah **ERROR**.

### 2.2 Metode rekalkulasi independen

Expected result di dokumen ini **tidak** diambil begitu saja dari cached value Excel.

Metode:

1. Formula sumber dibaca dari workbook.
2. Input dasar dibaca dari sel sumber.
3. Formula dihitung ulang secara independen dengan aritmetika desimal/rasional.
4. Cached value hanya dipakai sebagai **nilai pembanding**.
5. Untuk nilai periodik akibat pembagian, expected result ditulis sebagai pecahan eksak dan desimal berulang.
6. Untuk pengujian rekap keseluruhan yang masih memakai HSP legacy eksternal, cached HSP di kolom `RAB!J` diperlakukan hanya sebagai **fixture input downstream**. Kasus tersebut membuktikan agregasi/PPN/pembulatan, bukan validitas asal HSP.

### 2.3 Toleransi perbandingan

Toleransi di bawah hanya untuk mengakomodasi representasi IEEE-754 Excel; toleransi **bukan** aturan pembulatan bisnis.

| Jenis | Toleransi |
|---|---:|
| Nilai integer / boundary pembulatan | tepat, `0` |
| Volume dengan operasi desimal finite | `1e-9` satuan |
| Volume dengan pecahan periodik | `1e-12` satuan terhadap nilai matematis |
| HSP / nilai item / subtotal / PPN | `Rp 0,000001` |
| Total final setelah half-up | tepat, `Rp 0` |
| Formula, sumber, unit, klasifikasi validasi | exact/semantic match; toleransi numerik tidak berlaku |

Perbedaan lebih besar dari toleransi tidak boleh disembunyikan sebagai floating-point noise.

### 2.4 A → B Semantic Alignment — Jalur A final

`10-ahsp-normalization-spec.md` berstatus **FINAL AS MASTER-DATA CONTRACT** dan menjadi semantic authority Jalur B untuk identity, unit, resource, dan price-state. Jalur B tidak menetapkan encoding ID atau desain database.

| Semantic Jalur A | Penggunaan dalam Test Oracle Jalur B | Assertion |
|---|---|---|
| `ahsp_id` | logical binding AHSP fixture ke snapshot master | opaque/immutable; **bukan** nomor row Excel |
| `ahsp_component_id` | logical binding tiap komponen AHSP | component identity stabil; source row hanya locator audit |
| `resource_id` | binding komponen → resource → harga dasar | authoritative internal identity; tidak ditebak dari nama/kode saja |
| `(source_edition, official_code)` | canonical business identity AHSP untuk trace/audit | `official_code` saja tidak cukup lintas edisi |
| canonical unit | unit oracle setelah `SAFE_ALIAS` normalization | volume RAB ↔ HSP dan unit komponen ↔ base price harus sama/compatible secara eksplisit setelah normalization |
| `price_state` | state harga pada validation oracle | hanya `MISSING`, `SET`, `ZERO_CONFIRMED` |
| duplicate/ambiguity state | gate sebelum fixture dipakai untuk REVIEW/FINAL | unresolved duplicate/ambiguity **tidak boleh diterka** |

Konsekuensi untuk fixture existing:

- GT-06 dan GT-07 tetap memakai cell/range Masterfile sebagai **source locator**, tetapi identity canonical-nya harus dibind ke `ahsp_id` dari normalized snapshot; audit key-nya menggunakan `source_edition + official_code`.
- Komponen GT-06 harus dibind melalui `ahsp_component_id → resource_id`; harga yang digunakan pada source-backed positive numeric test berada pada state `SET`.
- V-ERR-03 adalah coverage `price_state=MISSING` ketika resource diperlukan proyek.
- Literal `0` pada legacy source tidak pernah otomatis menjadi `ZERO_CONFIRMED`; tanpa bukti intent ia tetap unresolved.
- `SAFE_ALIAS` hanya menormalisasi alias yang telah dinyatakan aman. Unit `REVIEW_REQUIRED` atau kebutuhan conversion yang belum eksplisit tidak boleh dibuat compatible melalui asumsi.

Tidak ada nilai literal internal ID baru yang dibuat oleh Jalur B. ID aktual berasal dari normalized master snapshot saat acceptance package dibentuk.

---

## 3. Matriks kasus uji

| ID | Kasus | Lapisan yang dibuktikan | Status |
|---|---|---|---|
| GT-01 | Pembersihan Lapangan | BV geometri sederhana | **PASS** |
| GT-02 | Pembongkaran Eksisting | BV geometri + koefisien tebal | **PASS** |
| GT-03 | Pengadaan Minipile 20×20 | BV formula jumlah/koefisien khusus | **PASS** |
| GT-04 | Pembesian Pile Cap P1 | BV kompleks + `ROUNDUP` jumlah batang | **PASS** |
| GT-05 | Pipa Air Bekas PVC AW 3" | BV formula khusus + faktor 1,25 | **PASS** |
| GT-06 | AHSP 2.2.1.5.6 beton fc'25 semi mekanis | tenaga + bahan + alat + OH/profit | **PASS** |
| GT-07 | AHSP 1.2.1.1.1 galian tanah | presisi HSP; larangan intermediate rounding | **EXPLAINED DIFFERENCE** |
| GT-08 | Subkelompok Pile Cap P1 | item → subtotal subkelompok | **EXPLAINED DIFFERENCE** |
| GT-09 | Mini-project Galian Tanah | end-to-end BV → HSP → RAB → PPN → final | **EXPLAINED DIFFERENCE** |
| GT-10 | Rekap proyek existing | item → kelompok → rekap → PPN → final | **EXPLAINED DIFFERENCE** |
| GT-11 | Boundary pembulatan | `<500`, `=500`, `>500` | **PASS** |
| GT-12 | Angkur kolom Dia.16 mm | negative validation: direct volume tanpa traceability | **EXPECTED ERROR — REVIEW BLOCKED** |

### Coverage terhadap permintaan

| Coverage | Kasus |
|---|---|
| BV geometris sederhana | GT-01 |
| BV dengan jumlah/koefisien/formula khusus | GT-02, GT-03, GT-04, GT-05 |
| Volume langsung yang sah | **NO VALID GOLDEN FIXTURE AVAILABLE**; wajib contract-derived acceptance test |
| AHSP tenaga, bahan, alat | GT-06 |
| OH/profit | GT-06, GT-07 |
| Kelompok utama | GT-10 |
| Subkelompok | GT-08 |
| HSP manual/non-AHSP | **NO VALID GOLDEN FIXTURE AVAILABLE**; wajib contract-derived acceptance test |
| PPN proyek | GT-09, GT-10 |
| Pembulatan `<500 / =500 / >500` | GT-11 |
| Harga kosong | Validation V-ERR-03 |
| `ZERO_CONFIRMED` | **NO VALID GOLDEN FIXTURE AVAILABLE**; wajib contract-derived acceptance test |
| Error legacy / external link | Validation V-ERR-01, V-ERR-02; GT-09/GT-10 |

### 3.1 BV Template Coverage Matrix — controlled / whitelisted

Golden evidence GT-01 s.d. GT-05 dapat direpresentasikan sebagai semantic operation terbatas. Cell address di bawah tetap merupakan source trace; dependency bisnis harus memakai logical input/reference, bukan fixed row.

| Test | Semantic operation | Input / reference deterministik | Expected result | Test |
|---|---|---|---:|---|
| GT-01 | `GEOMETRY_PRODUCT` | `25.6 × 15` | `384.0 m²` | **PASS** |
| GT-02 | `GEOMETRY_PRODUCT` | `25.6 × 15 × 0.15` | `57.600 m³` | **PASS** |
| GT-03 | `WEIGHTED_COUNT` | counts `[2,5,9,7,1,2]`; weights `[1,2,3,4,5,0]`; logic `Σ(count×weight)` | `72` | **PASS** |
| GT-03 | `REFERENCE_FACTOR` | logical reference `weighted_count=72`; factor `12` | `864 m¹` | **PASS** |
| GT-04 | `REBAR_ROUNDUP` | technical span/spacing references; count = `ceil(span/spacing)` sesuai source | bar-count inputs untuk child rebar | **PASS** |
| GT-04 | `SEGMENT_SUM_FACTOR` + `REFERENCE_FACTOR` | dimensi/cover/extension dan berat per meter `1.041885`; dikombinasikan dengan repeat/bar-count secara deterministik | child masses `O109:O114` sesuai oracle | **PASS** |
| GT-04 | `SUM_CHILDREN` | enam child mass: `2.62555020, 2.75057640, 4.12586460, 4.12586460, 19.50408720, 12.19005450` | `45.32199750 kg` | **PASS** |
| GT-05 | `SEGMENT_SUM_FACTOR` | `(2.1+3.6+1.1+7.7+3.9+1.4+(8×1/3)) × 1.25` | `337/12 = 28.083333… m¹` | **PASS** |

**Contract statement:** Phase 1 Golden evidence **tidak membutuhkan arbitrary `CUSTOM` Excel formula atau general-purpose formula engine**. Controlled templates di atas cukup untuk merepresentasikan GT-01 s.d. GT-05. Logical references boleh menunjuk hasil operation lain melalui stable reference; fixed row number tidak memiliki makna bisnis.

**Rounding distinction:** `ROUNDUP` pada GT-04 adalah technical operation untuk jumlah batang dan sah. Ia **tidak** menjadi aturan monetary rounding. Final project tetap `floor((x+500)/1000)×1000`; GT-11 adalah regression oracle untuk menolak legacy `ROUNDUP(...,-3)`.

### 3.2 Golden Fixture Availability Matrix

| Scenario | Source-backed Golden fixture | Status | Acceptance treatment |
|---|---|---|---|
| Core numeric GT-01 s.d. GT-11 | Ya | tersedia | Golden Reference oracle |
| Direct volume tanpa traceability | Ya — GT-12 | negative fixture | `ERROR` → REVIEW blocked |
| Valid direct volume + basis/source/note/reviewer | Tidak | **NO VALID GOLDEN FIXTURE AVAILABLE** | `CONTRACT-DERIVED ACCEPTANCE TEST REQUIRED`; expected `WARNING` |
| Explicit `MANUAL / NON-AHSP` HSP | Tidak | **NO VALID GOLDEN FIXTURE AVAILABLE** | `CONTRACT-DERIVED ACCEPTANCE TEST REQUIRED`; expected `WARNING`; HSP manual final, tanpa OH/profit tambahan |
| Explicit intentional Rp0 / `ZERO_CONFIRMED` | Tidak | **NO VALID GOLDEN FIXTURE AVAILABLE** | `CONTRACT-DERIVED ACCEPTANCE TEST REQUIRED`; expected `WARNING` hanya bila intent zero eksplisit |

Ketiadaan tiga positive fixture tersebut adalah **keterbatasan Golden Reference**, bukan alasan mengarang angka dan bukan alasan mengubah business rule.

### 3.3 Golden Tests vs Contract-Derived Acceptance Tests

**Golden Reference tests** adalah test yang expected input/result-nya dapat ditelusuri ke source nyata: GT-01 s.d. GT-11, GT-12 sebagai negative validation fixture, serta V-ERR source-backed yang relevan.

**Contract-derived acceptance tests** wajib dibuat pada pengujian implementasi untuk tiga scenario yang business contract-nya sudah jelas tetapi Golden Reference tidak mempunyai fixture sah:

1. valid direct volume → basis + source + note + reviewer lengkap → `WARNING`, non-blocking dengan reviewer confirmation;
2. `MANUAL / NON-AHSP` → uraian + satuan + final HSP + catatan/referensi → `WARNING`; final HSP dipakai apa adanya dan **tidak** ditambah OH/profit lagi;
3. `ZERO_CONFIRMED` → `price_value=0` dengan intent eksplisit → `WARNING`; literal zero yang unresolved tidak memenuhi scenario ini.

Contract-derived test tidak boleh dilabeli sebagai source-backed Golden Reference test.

---

# 4. Detail kasus dan expected result

## GT-01 — BV geometri sederhana: Pembersihan Lapangan

**Sumber**

- Workbook: `Contoh Rekap RAB dan BV.xlsx`
- `BV!F41 = 25.6`
- `BV!G41 = 15`
- `BV!O41 = F41*G41`
- `RAB!I38 = BV!O41`

**Rekalkulasi**

```text
volume = 25.6 × 15
       = 384.0 m²
```

**Expected result presisi penuh:** `384.0 m²`  
**Cached Excel:** `384`  
**Toleransi:** `0`  
**Klasifikasi:** **PASS**

**Oracle:** `RAB volume` harus sama dengan hasil BV, bukan input ulang terpisah.

---

## GT-02 — BV geometri + koefisien: Pembongkaran Bangunan Eksisting

**Sumber**

- `BV!F40 = F41 = 25.6`
- `BV!G40 = G41 = 15`
- `BV!J40 = 0.15`
- `BV!O40 = F40*G40*J40`
- `RAB!I39 = BV!O40`

**Rekalkulasi**

```text
volume = 25.6 × 15 × 0.15
       = 57.600 m³
```

**Expected result matematis:** `57.600 m³`  
**Cached Excel:** `57.599999999999994`  
**Selisih:** representasi floating-point saja  
**Toleransi:** `1e-9 m³`  
**Klasifikasi:** **PASS**

Cached value tidak boleh dipakai sebagai alasan untuk mengubah formula atau membulatkan BV.

---

## GT-03 — BV formula jumlah khusus: Pengadaan Minipile 20×20 cm

**Sumber**

- `BV!J66 = 2`
- `BV!J67 = 5`
- `BV!J68 = 9`
- `BV!J69 = 7`
- `BV!J70 = 1`
- `BV!J71 = 2`
- `BV!J75 = (J66*1)+(J67*2)+(J68*3)+(J69*4)+(J70*5)+(J71*0)`
- `BV!F75 = 12`
- `BV!O75 = F75*J75`
- `BV!O77 = J75`
- `RAB!I54 = BV!O75`
- `RAB!I55 = BV!O75`
- `RAB!I56 = BV!O77`

**Rekalkulasi**

```text
J75 = (2×1) + (5×2) + (9×3) + (7×4) + (1×5) + (2×0)
    = 2 + 10 + 27 + 28 + 5 + 0
    = 72

O75 = 12 × 72
    = 864 m¹

O77 = 72
```

**Expected:** `J75 = 72`, `O75 = 864 m¹`, `O77 = 72`  
**Toleransi:** `0`  
**Klasifikasi:** **PASS**

Kasus ini menguji `WEIGHTED_COUNT → REFERENCE_FACTOR`. Source row/cell hanya locator audit; implementasi harus mereferensikan hasil `weighted_count` secara logis, bukan alamat row tetap.

---

## GT-04 — BV kompleks: Pembesian Pile Cap P1

**Sumber utama**

- Dimensi P1: `BV!F116=0.6`, `G116=0.6`, `H116=0.5`, `J116=2`.
- Berat batang: `BV!K109 = 0.006165*13*13*1`.
- Baris pembesian: `BV!O109:O114`.
- Total: `BV!O115 = SUM(O109:O114)`.
- Volume diteruskan ke `RAB!I58 = BV!O115`.

**Formula asli penting**

```text
F109 = F116*1.05
J109 = ROUNDUP(G116/0.4,0)
O109 = F109*J109*K109*I109

F110 = G116*1.1
J110 = ROUNDUP(F116/0.4,0)

F111 = F116*1.1
J111 = ROUNDUP(G116/0.25,0)

F112 = G116*1.1
J112 = ROUNDUP(F116/0.25,0)

F113 = ((F116-0.04)+(G116-0.04)+0.05)*2
J113 = ROUNDUP(H116/0.15,0)

F114 = F113
J114 = ROUNDUP(((F116+G116)*2)/H116,0)
```

**Rekalkulasi independen**

Berat per meter:

```text
K = 0.006165 × 13 × 13 = 1.041885
```

| Baris | Expected kg |
|---|---:|
| O109 | `2.62555020` |
| O110 | `2.75057640` |
| O111 | `4.12586460` |
| O112 | `4.12586460` |
| O113 | `19.50408720` |
| O114 | `12.19005450` |

```text
O115 = 2.62555020
     + 2.75057640
     + 4.12586460
     + 4.12586460
     + 19.50408720
     + 12.19005450
     = 45.32199750 kg
```

**Expected:** `45.32199750 kg`  
**Cached Excel:** `45.321997500000009`  
**Toleransi:** `1e-9 kg`  
**Klasifikasi:** **PASS**

Tambahan cross-check P1:

- `BV!O116 = 0.6×0.6×0.5×2 = 0.36 m³`
- `BV!O117 = 2.4×0.5×2 = 2.4 m²`

**Semantic coverage:** `REBAR_ROUNDUP` menentukan jumlah batang dari span/spacing; `SEGMENT_SUM_FACTOR`/`REFERENCE_FACTOR` membentuk child mass dari input teknis; `SUM_CHILDREN` menjumlahkan enam child mass menjadi `45.32199750 kg`. `ROUNDUP` di sini adalah technical BV arithmetic, bukan final project rounding.

---

## GT-05 — BV formula khusus + faktor: Pipa Air Bekas PVC AW 3"

**Sumber**

- `BV!F1342 = 2.1+3.6+1.1+7.7+3.9+1.4+(8/3)`
- `BV!K1342 = 1.25`
- `BV!O1342 = F1342*K1342`

**Rekalkulasi eksak**

```text
F1342 = 337/15
      = 22.466666666666666...

O1342 = (337/15) × (5/4)
      = 337/12
      = 28.083333333333333... m¹
```

**Expected presisi penuh:** `337/12 m¹`  
**Cached Excel:** `28.083333333333332`  
**Toleransi:** `1e-12 m¹`  
**Klasifikasi:** **PASS**

Pecahan eksak adalah oracle utama; digit biner Excel bukan aturan bisnis. Semantic operation yang dibutuhkan adalah `SEGMENT_SUM_FACTOR`: jumlah segmen/input, termasuk `8×1/3`, kemudian dikalikan factor `1.25`; tidak diperlukan arbitrary formula.

---

## GT-06 — AHSP lengkap tenaga+bahan+alat: 2.2.1.5.6 Beton fc'25 MPa semi mekanis

### Bukti normatif

Lampiran VI AHSP CK 2026, analisa `2.2.1.5.6`, mencantumkan:

- Pekerja `1.000 OH`
- Tukang batu/tembok `0.250 OH`
- Kepala Tukang `0.025 OH`
- Mandor `0.100 OH`
- Semen Portland `407 kg`
- Pasir beton `731 kg`
- Kerikil `1,009 kg`
- Air `202 liter`
- Molen/Beton mixer 0,35 m³ `0.1475 hari`

Lampiran VI juga menyatakan HSP dibentuk dari `koefisien × HSD`, subtotal tenaga+bahan+alat, lalu biaya umum dan keuntungan 10–15%.

### Sumber Masterfile

Analisa: `AHSP!C3353:I3372`.

Harga dasar:

| Resource | Source | Nilai |
|---|---|---:|
| Pekerja | `UPAH!J6` / `AHSP!H3356` | `176000` |
| Tukang Batu | `UPAH!J11` / `AHSP!H3357` | `186000` |
| Kepala Tukang | `UPAH!J27` / `AHSP!H3358` | `196000` |
| Mandor | `UPAH!J28` / `AHSP!H3359` | `206000` |
| Semen Portland | `BAHAN!G449` | `1820/kg` |
| Pasir beton | `BAHAN!G260 = G259/1400`, `G259=664200` | `3321/7` |
| Kerikil | `BAHAN!G194 = G193/1350`, `G193=G191=535460` | `53546/135` |
| Air | `BAHAN!G6` | `100/liter` |
| Molen 350 liter | `BAHAN!G566` | `200000/hari` |
| OH/profit | `AHSP!M3`, `AHSP!H3371` | `0.10` |

### Rekalkulasi

Tenaga:

```text
A = 1×176000
  + 0.25×186000
  + 0.025×196000
  + 0.1×206000
  = 248000
```

Bahan, eksak:

```text
B = 407×1820
  + 731×(664200/1400)
  + 1009×(535460/1350)
  + 202×100

  = 1,425,016,583 / 945
  = 1,507,954.056084656084656...
```

Alat:

```text
C = 0.1475×200000
  = 29500
```

Biaya langsung:

```text
D = A+B+C
  = 1,687,254,083 / 945
  = 1,785,454.056084656084656...
```

OH/profit:

```text
E = D×0.10
  = 1,687,254,083 / 9,450
  = 178,545.405608465608465...
```

HSP:

```text
HSP = D+E
    = 18,559,794,913 / 9,450
    = 1,963,999.461693121693121...
```

**Expected:** `18,559,794,913 / 9,450 Rp/m³`  
**Masterfile precise `AHSP!I3372`:** `1,963,999.4616931218`  
**`Rekap HSP` untuk 2.2.1.5.6:** `1,963,999.4616931218`  
**Toleransi:** `Rp 0.000001`  
**Klasifikasi:** **PASS**

**Catatan legacy:** `AHSP!I3353 = ROUNDDOWN(I3372,-2) = 1,963,900`. Nilai header ini **bukan oracle HSP Phase 1** karena baseline melarang intermediate rounding.

---

## GT-07 — Presisi HSP: 1.2.1.1.1 Galian Tanah Biasa

**Sumber**

- `AHSP!C626` = kode `1.2.1.1.1`
- `AHSP!G629=0.75`, `H629=UPAH!J6=176000`
- `AHSP!G630=0.038`, `H630=UPAH!J28=206000`
- `AHSP!M3=0.10`
- `AHSP!I638` = HSP presisi
- `Rekap HSP!G115 = 153810.8`
- `AHSP!I626 = ROUNDDOWN(I638,-2)`

**Rekalkulasi**

```text
Pekerja = 0.75 × 176000 = 132000
Mandor  = 0.038 × 206000 = 7828

D = 139828
E = 139828 × 0.10 = 13982.8
HSP = 153810.8
```

**Expected baseline:** `Rp153,810.8/m³`  
**Masterfile precise:** `AHSP!I638 = 153810.8`; `Rekap HSP = 153810.8`  
**Legacy header:** `AHSP!I626 = 153800` karena `ROUNDDOWN(...,-2)`  
**Selisih legacy vs baseline:** `Rp10.8`  
**Toleransi:** `Rp0.000001`  
**Klasifikasi:** **EXPLAINED DIFFERENCE**

Calculation engine dan Excel exporter kelak harus memakai HSP presisi, bukan rounded header.

---

## GT-08 — Subkelompok: Pondasi Pile Cap P1

Golden Reference menampilkan parent `Pondasi Pile Cap ... (P1)` pada `RAB!D57`, lalu tiga child item pada row 58–60, tetapi tidak menampilkan subtotal parent tersendiri. Baseline terbaru mensyaratkan bahwa jika P1 dinormalisasi sebagai **subkelompok**, subtotalnya adalah jumlah child item.

**Fixture input child**

| Child | Volume source | HSP fixture source | Recalc nilai item |
|---|---|---|---:|
| Pembesian | `RAB!I58=BV!O115=45.3219975` | `RAB!J58=22481.963777777779` | `1,018,927.5061315350553935525` |
| Cor Beton fc'25 Ready Mix | `RAB!I59=BV!O116=0.36` | `RAB!J59=2343759` | `843,753.24` |
| Bekisting Bata Merah | `RAB!I60=BV!O117=2.4` | `RAB!J60=195485.4` | `469,164.96` |

```text
subtotal P1
= 1,018,927.5061315350553935525
+   843,753.24
+   469,164.96

= 2,331,845.7061315350553935525
```

**Expected subtotal subkelompok:** `Rp2,331,845.7061315350553935525`  
**Toleransi:** `Rp0.000001`  
**Klasifikasi:** **EXPLAINED DIFFERENCE**

Alasan: arithmetic child dapat dihitung, tetapi Golden Reference lama belum memiliki subtotal parent sebagai entity/formula eksplisit. Nilai di atas menjadi oracle untuk struktur subkelompok Phase 1.

**Batas kasus:** HSP `J58:J60` masih berasal dari external workbook `[2]`; GT-08 hanya menguji agregasi subkelompok. Validasi provenance HSP ditangani oleh V-ERR-01.

---

## GT-09 — End-to-end: Galian Tanah sebagai mini-project satu item

Ini adalah skenario minimum yang membuktikan seluruh rantai dari BV sampai total final menggunakan **volume Golden Reference** dan **HSP Masterfile current**.

### A. BV

Dari `BV!O52:O58`:

```text
P1 = 0.6×0.6×1.8×2          = 1.296
P2 = 0.6×1.2×1.8×5          = 6.48
P3 = 1.2×1.2×1.8×9          = 23.328
P4 = 1.2×1.2×1.8×7          = 18.144
P5 = 1.45×1.45×1.8×1        = 3.7845
P6 = 0.6×0.6×1.8×2          = 1.296
Menerus = 89×0.9×0.5×1×0.5 = 20.025
```

```text
volume = 74.3535 m³
```

### B. HSP

Dari GT-07 / `Masterfile AHSP CK.xlsx`:

```text
HSP 1.2.1.1.1 = Rp153,810.8/m³
```

### C. Nilai item

```text
74.3535 × 153810.8
= Rp11,436,371.31780
```

### D. Rekap mini-project

Satu kelompok, satu item:

```text
subtotal RAB = Rp11,436,371.31780
```

### E. PPN 11%

```text
PPN = 11,436,371.31780 × 0.11
    = Rp1,258,000.844958
```

### F. Total sebelum pembulatan

```text
= 11,436,371.31780 + 1,258,000.844958
= Rp12,694,372.162758
```

Sisa ke kelipatan Rp1.000 = `Rp372.162758` `< Rp500`.

### G. Total final

```text
floor((12,694,372.162758 + 500)/1000)×1000
= Rp12,694,000
```

**Selisih pembulatan:** `-Rp372.162758`

### Perbandingan dengan workbook legacy

`RAB!J46 = [2]AHSP!D70 = Rp82,793.7`, sehingga:

```text
legacy item = 74.3535 × 82,793.7
            = Rp6,156,001.37295
```

Perbedaan terhadap current Masterfile:

```text
Rp11,436,371.31780 - Rp6,156,001.37295
= Rp5,280,369.94485
```

**Expected Phase 1:** `Rp12,694,000` untuk mini-project ini  
**Toleransi:** intermediate `Rp0.000001`; final `Rp0`  
**Klasifikasi:** **EXPLAINED DIFFERENCE**

Alasan: baseline menetapkan `Masterfile AHSP CK.xlsx` sebagai Golden Reference HSP saat ini, sedangkan RAB lama masih menunjuk external workbook `[2]`.

---

## GT-10 — Rekap proyek existing + PPN + pembulatan final

Kasus ini memvalidasi **downstream arithmetic** seluruh proyek menggunakan volume dan HSP fixture yang tersimpan pada `RAB!I:J`. HSP eksternal tidak dianggap tervalidasi di sini.

### A. Formula sumber

RAB subtotal per kelompok:

```text
K36  = SUM(K13:K35)
K44  = SUM(K38:K43)
K51  = SUM(K46:L50)        [legacy range; kolom L tidak menambah nilai]
K167 = SUM(K53:K166)
K182 = SUM(K169:K181)
K189 = SUM(K184:K188)
K194 = SUM(K191:K193)
```

Rekap:

```text
Rekap!I11 = RAB!K36
...
Rekap!I17 = RAB!K194
Rekap!I19 = SUM(I11:I18)
Rekap!I20 = I19*0.11
Rekap!I21 = I19+I20
Rekap!I22 = ROUNDUP(I21,-3)   [legacy]
```

### B. Rekalkulasi independen dari setiap `RAB volume × HSP fixture`

Expected subtotal kelompok berdasarkan nilai raw fixture yang tersimpan:

| Kelompok | Expected rekalkulasi |
|---|---:|
| I | `50,900,000` |
| II | `106,830,605.91682286658826239999999994` |
| III | `103,114,961.1698250010006557` |
| IV | `2,046,816,469.114728737653351915983338391` |
| V | `471,938,324.324263277445914508641975324` |
| VI | `253,669,428.8007687296850694583333335` |
| VII | `19,225,679.60156250171741312916666664` |

```text
subtotal RAB
= Rp3,052,495,468.927971114090667112125313795

PPN 11%
= Rp335,774,501.58207682254997338233378451745

total sebelum pembulatan
= Rp3,388,269,970.51004793664064049445909831245
```

Sisa = `Rp970.51004793664064049445909831245`, sehingga baseline half-up:

```text
total final = Rp3,388,270,000
```

### C. Pembanding workbook

Cached `Rekap!I19` = `3,052,495,468.9279714`.  
Selisih terhadap independent recomputation = sekitar `Rp0.000000285909...`, yaitu floating-point noise dan berada dalam toleransi.

Cached `Rekap!I22` = `3,388,270,000` — **angka kebetulan sama** dengan baseline karena sisa `970.51... ≥ 500`.

Namun formula `ROUNDUP(I21,-3)` tidak ekuivalen dengan half-up. Untuk sisa di bawah Rp500, formula lama akan tetap menaikkan nilai dan menghasilkan hasil salah.

**Expected final:** `Rp3,388,270,000`  
**Klasifikasi:** **EXPLAINED DIFFERENCE**

Interpretasi: numerik proyek existing lolos untuk input ini, tetapi formula pembulatan sumber **tidak boleh menjadi oracle formula**.

---

## GT-11 — Boundary rounding half-up Rp1.000

Kasus boundary memakai contoh eksplisit Decision Log D-016.

| Subcase | Total sebelum pembulatan | Sisa | Expected final | Status |
|---|---:|---:|---:|---|
| GT-11A | `Rp3,561,222,350` | `350` | `Rp3,561,222,000` | PASS |
| GT-11B | `Rp385,244,500` | `500` | `Rp385,245,000` | PASS |
| GT-11C | `Rp1,450,299,600` | `600` | `Rp1,450,300,000` | PASS |

Formula oracle untuk seluruh subcase:

```text
floor((x+500)/1000)×1000
```

**Toleransi:** `Rp0`  
**Klasifikasi keseluruhan:** **PASS**

Kasus ini wajib dipakai untuk mencegah exporter mengimplementasikan `ROUNDUP(...,-3)`.

---

## GT-12 — Volume langsung: Angkur kolom Dia.16 mm

**Sumber**

- `RAB!D178 = "Angkur kolom Dia. 16mm"`
- `RAB!H178 = "Unit"`
- `RAB!I178 = 84` — hardcoded, **tanpa formula BV**
- `RAB!J178 = [2]Bahan!E388`, cached `20250`
- `RAB!K178 = 1701000`, hardcoded

Arithmetic:

```text
84 × 20,250 = Rp1,701,000
```

Arithmetic-nya konsisten. Tetapi baseline mensyaratkan input volume langsung harus menyimpan:

- dasar kuantitas;
- sumber;
- catatan;
- reviewer.

Field/bukti tersebut tidak tersedia di Golden Reference ini. Karena itu `84` tidak boleh dipromosikan sebagai contoh **volume langsung yang sah**.

**Expected validation:** `ERROR`; blok perpindahan ke REVIEW sampai traceability tersedia.  
**Numeric check:** `Rp1,701,000`  
**Klasifikasi test:** **NEGATIVE VALIDATION FIXTURE — PASS bila ERROR muncul dan REVIEW diblokir**

GT-12 **bukan** positive direct-volume fixture. Audit Golden Reference telah selesai dan tidak menemukan positive fixture dengan basis/sumber/catatan/reviewer lengkap. Status positive scenario adalah `NO VALID GOLDEN FIXTURE AVAILABLE` dan pengujiannya berpindah ke `CONTRACT-DERIVED ACCEPTANCE TEST REQUIRED`.

---

# 5. Kasus validasi ERROR dan WARNING

## 5.1 ERROR fixtures

### V-ERR-01 — External link pada formula kritis

Scan workbook `Contoh Rekap RAB dan BV.xlsx` menemukan:

- **138 formula cell** dengan referensi eksternal:
  - `Rekap`: 3 cell;
  - `RAB`: 135 cell.
- Paket `.xlsx` memuat **19 externalLink records**.
- Contoh:
  - `RAB!J38 = [2]AHSP!D32`
  - `RAB!J46 = [2]AHSP!D70`
  - `RAB!J54 = '[2]Analisa Tambahan'!J20`
  - `RAB!J56 = '[2]Analisa Tambahan'!J39`
  - `Rekap!A3:A5 = [1]NOTE!...`

**Expected:** `ERROR`; workbook Phase 1 harus mandiri dan tidak boleh bergantung pada external link.

### V-ERR-02 — Formula/reference gagal (`#NAME?`)

Saat workbook dibaca tanpa workbook eksternal, banyak harga di `RAB!J` dan identitas `Rekap!A3:A5` dievaluasi sebagai `#NAME?`.

**Expected:** `ERROR`, karena:

- formula/referensi gagal; dan
- identitas proyek wajib tidak boleh gagal sebelum REVIEW.

Cached values lama tidak boleh dipakai untuk menutupi error referensi.

### V-ERR-03 — Harga dasar kosong

Scan `Masterfile AHSP CK.xlsx`, sheet `BAHAN`, menemukan resource beruraian yang harga `G`-nya kosong. Contoh:

- `BAHAN!B277 = "Pipa Baja Ø 100 mm"`
- `BAHAN!F277 = "m"`
- `BAHAN!G277 = blank`

Dalam scan tersebut terdapat **123** baris beruraian dengan harga `G` kosong.

**Expected:** bila resource seperti ini diperlukan oleh AHSP proyek, `ERROR` dan REVIEW harus diblokir. Blank **tidak boleh** diubah menjadi Rp0.

### V-ERR-04 — Direct volume tanpa traceability

GT-12 adalah fixture konkret.

**Expected:** `ERROR/BLOCKED for REVIEW` sampai basis/sumber/catatan/reviewer tersedia.

---

## 5.2 WARNING business requirements dan fixture availability

### V-WARN-01 — `ZERO_CONFIRMED`

Golden Reference memiliki literal zero, termasuk `BAHAN!G8 = 0` dan `BAHAN!G9 = 0`, tetapi source tidak menyediakan bukti intent yang membuat record tersebut canonical `ZERO_CONFIRMED`.

Semantic Jalur A berlaku:

```text
price_state = MISSING         -> ERROR bila resource diperlukan
price_state = SET             -> normal calculation
price_state = ZERO_CONFIRMED  -> price_value = 0 + explicit zero intent -> WARNING
```

Literal `0` legacy tanpa bukti intent **tidak** boleh dipromosikan menjadi `ZERO_CONFIRMED`.

**Golden fixture availability:** `NO VALID GOLDEN FIXTURE AVAILABLE`  
**Implementation acceptance:** `CONTRACT-DERIVED ACCEPTANCE TEST REQUIRED` dengan expected `WARNING` hanya untuk explicit `ZERO_CONFIRMED`.

### V-WARN-02 — HSP manual / NON-AHSP

Golden Reference hanya menunjukkan external `Analisa Tambahan` (`RAB!J54` dan `J56`). Itu tidak membuktikan record final `MANUAL / NON-AHSP` yang memenuhi uraian, satuan, final HSP, dan catatan/alasan/referensi.

Business requirement tetap:

- valid `MANUAL / NON-AHSP` → `WARNING`;
- nilai manual HSP dianggap **final**;
- **tidak** mendapat OH/profit tambahan.

**Golden fixture availability:** `NO VALID GOLDEN FIXTURE AVAILABLE`  
**Implementation acceptance:** `CONTRACT-DERIVED ACCEPTANCE TEST REQUIRED`.

### V-WARN-03 — Input volume langsung yang sah

GT-12 membuktikan jalur negatif karena direct quantity `84` tidak mempunyai traceability lengkap. Golden Reference tidak menyediakan positive fixture yang membuktikan basis, source, note, dan reviewer.

Business requirement tetap:

- direct volume untuk simple quantity/LS yang mempunyai basis + source + note + reviewer → `WARNING`;
- WARNING tidak memblokir REVIEW, tetapi memerlukan reviewer confirmation.

**Golden fixture availability:** `NO VALID GOLDEN FIXTURE AVAILABLE`  
**Implementation acceptance:** `CONTRACT-DERIVED ACCEPTANCE TEST REQUIRED`.

### 5.3 Zero policy yang belum diputuskan

Dua policy berikut berbeda dari `ZERO_CONFIRMED` base-price resource dan **tidak** ditetapkan oleh Jalur B:

| Policy | Status |
|---|---|
| `volume item = 0` | `WAITING FOR MANAGER DECISION` |
| `manual HSP = 0` | `WAITING FOR MANAGER DECISION` |

Sampai ada keputusan Manager, acceptance test untuk kedua policy hanya boleh berupa skeleton tanpa expected PASS/WARNING/ERROR business classification.

---

# 6. Jejak sumber utama per layer

| Layer | Sumber utama | Sel/range penting |
|---|---|---|
| BV simple | `Contoh Rekap RAB dan BV.xlsx` / `BV` | `F40:O41` |
| BV earthworks | sama | `F52:O63` |
| BV minipile | sama | `J66:J71`, `F75:O77` |
| BV pile cap P1 | sama | `F109:O117` |
| BV plumbing | sama | `F1337:O1343` |
| RAB volume/value | sama / `RAB` | `I38:K60`, `I178:K178` |
| Group subtotal | sama / `RAB` | `K36,K44,K51,K167,K182,K189,K194` |
| Rekap/PPN/final | sama / `Rekap` | `I11:I22` |
| Upah | `Masterfile AHSP CK.xlsx` / `UPAH` | `J6,J11,J27,J28` |
| Material beton | sama / `BAHAN` | `G6,G194,G260,G449,G566` |
| OH project Masterfile | sama / `AHSP` | `M3=0.10` |
| AHSP galian | sama / `AHSP` | `C626:I638` |
| AHSP beton fc'25 semi mekanis | sama / `AHSP` | `C3353:I3372` |
| HSP precise summary | sama / `Rekap HSP` | code `1.2.1.1.1`; code `2.2.1.5.6` |
| Normative AHSP | Lampiran VI 2026 | HSP section printed page `-5137-`; analisa `2.2.1.5.6` printed page `-5362-` |

---

# 7. Test oracle untuk calculation engine dan Excel exporter

Bagian ini adalah **kontrak pengujian logis**, bukan skema database.

Setiap fixture Golden Test minimal harus membawa:

| Oracle field | Arti |
|---|---|
| `case_id` | ID stabil seperti `GT-06` |
| `scope` | `BV`, `AHSP`, `RAB_ITEM`, `GROUP`, `PROJECT`, `VALIDATION` |
| `semantic_operation` | controlled BV operation bila scope BV; bukan arbitrary Excel expression |
| `ahsp_id` | logical binding ke normalized master snapshot bila applicable; nilai aktual tidak diinvent Jalur B |
| `ahsp_component_id` | logical component binding bila applicable |
| `resource_id` | logical resource binding bila applicable |
| `source_edition` + `official_code` | audit/business identity canonical AHSP |
| `unit_canonical` | unit setelah SAFE_ALIAS normalization |
| `price_state` | `MISSING`, `SET`, atau `ZERO_CONFIRMED` bila harga terlibat |
| `source_workbook` | workbook asal |
| `source_sheet` | sheet asal |
| `source_cells` | sel/range asal |
| `source_formula` | formula asli bila ada |
| `input_values` | nilai input dasar yang dapat dilacak |
| `recalc_formula` | formula independen sesuai baseline |
| `expected_exact` | expected eksak; gunakan pecahan bila decimal periodik |
| `expected_decimal` | representasi decimal untuk comparison/export |
| `unit` | satuan native |
| `tolerance` | toleransi comparison, bukan rounding |
| `expected_validation` | `NONE`, `ERROR`, atau `WARNING` |
| `classification` | `PASS`, `EXPLAINED_DIFFERENCE`, `BLOCKED` |
| `legacy_observed` | cached/formula legacy sebagai pembanding, bukan oracle |
| `explanation` | alasan perbedaan/blocker |

### Assertion minimum per engine

1. `component_cost == coefficient × base_price`.
2. `direct_cost == labor + material + equipment`.
3. `oh_value == direct_cost × project_oh_rate`.
4. `hsp == direct_cost + oh_value`, tanpa intermediate rounding.
5. `rab_item_value == volume × hsp`.
6. `subgroup_subtotal == sum(child item values)`.
7. `group_subtotal == sum(direct item + subgroup subtotals)`.
8. `subtotal_rab == sum(group subtotal)`.
9. `ppn == subtotal_rab × project_ppn_rate`.
10. `total_before_rounding == subtotal_rab + ppn`.
11. `total_final == floor((total_before_rounding+500)/1000)×1000`.
12. Semua volume/HSP/unit yang dipasangkan kompatibel **setelah SAFE_ALIAS normalization**; tidak ada conversion implisit yang belum dikunci.
13. AHSP/component/resource fixture yang applicable terikat ke stable logical identity (`ahsp_id`, `ahsp_component_id`, `resource_id`); source row/cell hanya locator audit.
14. AHSP canonical trace menggunakan `source_edition + official_code`; unresolved duplicate/ambiguity tidak boleh ditebak untuk membuat fixture lewat REVIEW.
15. Base price state mengikuti `MISSING / SET / ZERO_CONFIRMED`; literal zero legacy tidak otomatis `ZERO_CONFIRMED`.
16. GT-01 s.d. GT-05 hanya menggunakan controlled/whitelisted semantic operation; tidak ada arbitrary Excel formula atau fixed-row business dependency.
17. Formula exporter tidak mengandung external workbook reference.
18. Output Excel harus menghasilkan angka yang sama dengan oracle ketika workbook dihitung ulang.

### Assertion khusus exporter

- GT-01 s.d. GT-05 harus dapat ditelusuri semantic BV operation → volume RAB melalui stable logical reference; tidak boleh bergantung pada row address.
- GT-04 `REBAR_ROUNDUP` adalah technical BV operation dan tidak boleh digunakan sebagai dasar final monetary rounding.
- GT-06/GT-07 harus mempertahankan HSP presisi; tampilan currency tidak boleh mengubah stored/calculated value.
- GT-11A harus **turun**, bukan naik; ini adalah regression test langsung untuk menggagalkan penggunaan `ROUNDUP`.
- V-ERR-01 harus gagal jika ada formula dengan token external workbook seperti `[n]Sheet!...`.
- Final amount harus exact integer kelipatan 1000.

---

# 8. Rekonsiliasi PASS / EXPLAINED DIFFERENCE / fixture availability

## PASS — source-backed numeric/semantic oracle

- GT-01 geometri sederhana → `GEOMETRY_PRODUCT`.
- GT-02 geometri × faktor → `GEOMETRY_PRODUCT`.
- GT-03 weighted count + reference factor.
- GT-04 technical rebar roundup + deterministic child sum.
- GT-05 segment sum + factor.
- GT-06 AHSP lengkap + OH/profit.
- GT-11 tiga boundary half-up.

## EXPLAINED DIFFERENCE

- **GT-07:** Masterfile menyimpan rounded header melalui `ROUNDDOWN`, tetapi HSP precise di baris F/Rekap HSP benar; baseline memilih nilai precise.
- **GT-08:** Golden Reference lama menampilkan parent P1 tanpa subtotal subkelompok; baseline baru memerlukan subtotal terhitung.
- **GT-09:** RAB lama menunjuk HSP dari workbook `[2]`; current Masterfile memberi HSP berbeda. Perbedaan dapat ditelusuri dan tidak boleh “dipaksa cocok”.
- **GT-10:** final existing numerik sama, tetapi formula source memakai `ROUNDUP` yang tidak sesuai half-up.

## NEGATIVE validation fixture

- **GT-12:** source-backed direct quantity tanpa traceability. Expected `ERROR`; REVIEW blocked. Test dianggap berhasil bila sistem menolak jalur REVIEW sesuai contract.

## NO VALID GOLDEN FIXTURE AVAILABLE

Golden Reference **tidak** menyediakan positive fixture yang sah untuk:

1. valid direct volume dengan basis/source/note/reviewer lengkap;
2. explicit `MANUAL / NON-AHSP` final HSP;
3. explicit `ZERO_CONFIRMED` base-price resource.

Ketiganya adalah `CONTRACT-DERIVED ACCEPTANCE TEST REQUIRED` untuk pengujian implementasi dan **bukan** Golden Reference test.

---

# 9. Temuan legacy penting

1. `Contoh Rekap RAB dan BV.xlsx` tidak self-contained:
   - 138 formula cells mereferensikan workbook lain;
   - paket file menyimpan 19 external-link records.
2. External link utama `[2]` menunjuk file lama `EE Kantor Lurah Sambaliung 2024 ... version 1.xlsx`; oleh karena itu HSP lama tidak boleh dianggap identik dengan `Masterfile AHSP CK.xlsx` sekarang.
3. `Rekap!I22 = ROUNDUP(I21,-3)` hanya kebetulan menghasilkan nilai sama pada proyek existing; formula bertentangan dengan half-up.
4. `Masterfile AHSP CK.xlsx` memiliki pattern `ROUNDDOWN(HSP,-2)` pada header beberapa analisa. Baseline mengharuskan HSP precise.
5. Harga kosong dan literal zero ada di `BAHAN`; keduanya harus dibedakan secara eksplisit pada sistem.
6. Cached value eksternal dapat tetap terlihat walaupun referensi aktual sudah gagal. Karena itu “ada angka di file” tidak sama dengan “dependency valid”.

---

# 10. Remaining Manager Decisions dan non-blocking implementation notes

## 10.1 WAITING FOR MANAGER DECISION

1. **Volume item = 0:** belum ditentukan sebagai ERROR/WARNING/valid DRAFT.
2. **Manual HSP = 0:** belum ditentukan sebagai ERROR/WARNING/valid.

Keduanya berbeda dari `ZERO_CONFIRMED` pada base price dan tidak menghalangi penetapan source-backed Golden numeric contract saat ini.

## 10.2 Non-blocking notes untuk implementation acceptance

- Tiga positive warning scenario tanpa Golden fixture harus diuji sebagai `CONTRACT-DERIVED ACCEPTANCE TEST REQUIRED`, bukan dicari ulang dari Golden Reference.
- Normalized snapshot yang dipakai untuk acceptance harus membawa identity Jalur A (`ahsp_id`, `ahsp_component_id`, `resource_id`), canonical unit, dan price state yang sudah resolved.
- Bila record Jalur A masih duplicate/ambiguous/unresolved dan dibutuhkan proyek, record tersebut harus diselesaikan sebelum REVIEW/FINAL; test oracle tidak boleh memilih salah satu melalui tebakan.
- External link, cached external HSP, legacy `ROUNDDOWN` HSP, dan legacy project `ROUNDUP` tetap hanya legacy evidence, bukan contract behavior.

---

# 11. Checklist penerimaan Jalur B

## Sudah terpenuhi

- [x] Menggunakan baseline dan Decision Log terbaru sebagai aturan.
- [x] Menggunakan kedua workbook nyata sebagai sumber angka.
- [x] Menggunakan AHSP CK 2026 sebagai acuan normatif.
- [x] Menyusun **12** kasus representatif.
- [x] Mencakup BV sederhana dan formula khusus.
- [x] Mencakup AHSP tenaga, bahan, alat, dan OH/profit.
- [x] Mencakup kelompok utama dan subtotal subkelompok.
- [x] Mencakup PPN proyek.
- [x] Mencakup pembulatan `<500`, `=500`, dan `>500`.
- [x] Menyusun satu skenario end-to-end dari volume sampai total final.
- [x] Expected result dihitung ulang independen, bukan menerima cached value.
- [x] Setiap kasus memiliki sumber, formula/input, expected, toleransi, dan klasifikasi.
- [x] External link dan formula legacy dipisahkan dari aturan baseline.
- [x] Harga blank dan Rp0 dicatat sebagai fixture validasi.
- [x] Tidak mengubah workbook sumber.
- [x] Tidak mengubah baseline atau Decision Log.
- [x] Tidak memasukkan pengujian PDF.
- [x] Tidak merancang database/API/UI atau test runner.

## Manager Review minimum patch — terpenuhi

- [x] Jalur A direkonsiliasi sebagai **FINAL AS MASTER-DATA CONTRACT** untuk `ahsp_id`, `ahsp_component_id`, `resource_id`, `source_edition + official_code`, unit canonical, `price_state`, dan unresolved ambiguity handling.
- [x] GT-01 s.d. GT-05 dipetakan ke controlled/whitelisted BV semantic operations tanpa arbitrary formula/fixed-row dependency.
- [x] GT-12 dipertahankan sebagai negative validation fixture: direct volume tanpa traceability → `ERROR` → REVIEW blocked.
- [x] Valid direct volume, manual HSP, dan `ZERO_CONFIRMED` direklasifikasikan menjadi **NO VALID GOLDEN FIXTURE AVAILABLE**; tidak ada angka sintetis yang dibuat.
- [x] Tiga positive warning scenario tersebut ditandai **CONTRACT-DERIVED ACCEPTANCE TEST REQUIRED** untuk implementation testing.
- [x] `ROUNDUP` technical GT-04 dipisahkan secara eksplisit dari final half-up GT-11.
- [x] `volume item = 0` dan `manual HSP = 0` tetap **WAITING FOR MANAGER DECISION**.

Tidak ada missing Golden fixture yang tersisa sebagai blocker terhadap status **Golden Test Contract**, karena keterbatasan source telah didokumentasikan dan dipisahkan dari contract-derived implementation tests.

---

# 12. Kesimpulan Jalur B

## 12.1 Status Jalur B

**FINAL AS GOLDEN TEST CONTRACT**.

Core numeric Golden Test GT-01 s.d. GT-11 diterima. GT-12 dipertahankan sebagai source-backed negative validation fixture. Jalur B tidak mengklaim tiga positive warning scenario yang tidak tersedia sebagai Golden Reference fixture.

## 12.2 A → B Semantic Alignment

Oracle telah diselaraskan dengan Jalur A final:

- `ahsp_id`, `ahsp_component_id`, `resource_id` adalah opaque/stable logical identity dan bukan nomor row;
- canonical AHSP business trace menggunakan `source_edition + official_code`;
- unit comparison dilakukan setelah `SAFE_ALIAS` normalization dan tidak membuat conversion implisit;
- price state mengikuti `MISSING / SET / ZERO_CONFIRMED`;
- unresolved duplicate/ambiguity tidak boleh diterka.

## 12.3 BV Template Coverage

GT-01 s.d. GT-05 terbukti dapat diwakili oleh controlled semantic operations:

`GEOMETRY_PRODUCT`, `WEIGHTED_COUNT`, `REFERENCE_FACTOR`, `REBAR_ROUNDUP`, `SEGMENT_SUM_FACTOR`, dan `SUM_CHILDREN`.

Golden evidence tidak menuntut arbitrary `CUSTOM` formula atau general-purpose formula engine. Technical `ROUNDUP` pada GT-04 sah untuk jumlah batang; final project rounding tetap half-up melalui GT-11.

## 12.4 Golden Fixture Availability

| Scenario | Final status |
|---|---|
| Core numeric GT-01 s.d. GT-11 | source-backed Golden oracle tersedia |
| GT-12 invalid direct volume | source-backed negative fixture tersedia; expected ERROR |
| Valid direct volume | `NO VALID GOLDEN FIXTURE AVAILABLE` → contract-derived test |
| Manual/NON-AHSP HSP | `NO VALID GOLDEN FIXTURE AVAILABLE` → contract-derived test |
| ZERO_CONFIRMED | `NO VALID GOLDEN FIXTURE AVAILABLE` → contract-derived test |

## 12.5 Golden Tests vs Contract-Derived Acceptance Tests

Golden tests hanya menggunakan data yang benar-benar dibuktikan source. Tiga positive warning scenario tetap wajib diuji saat implementation acceptance berdasarkan business contract, tetapi **tidak** disebut Golden Reference test dan tidak memakai angka yang diinvent.

## 12.6 Remaining Manager Decisions

- `volume item = 0` → `WAITING FOR MANAGER DECISION`;
- `manual HSP = 0` → `WAITING FOR MANAGER DECISION`.

Kedua policy tersebut tidak diisi oleh asumsi Jalur B.

## 12.7 Final Verdict

Jalur B **cukup lengkap menjadi acceptance oracle Jalur C** untuk:

```text
BV controlled templates
→ AHSP/HSP full precision
→ item amount
→ subgroup/group subtotal
→ subtotal RAB
→ PPN
→ total before rounding
→ half-up final
```

Oracle juga mencakup source traceability, semantic identity Jalur A, canonical unit compatibility, no-external-link rule, price-state validation, serta ERROR/WARNING distinction.

**Final recommendation:** `FINAL AS GOLDEN TEST CONTRACT`.

Keterbatasan tiga positive warning fixture telah ditutup secara kontraktual melalui klasifikasi `NO VALID GOLDEN FIXTURE AVAILABLE` + `CONTRACT-DERIVED ACCEPTANCE TEST REQUIRED`, sehingga tidak lagi menjadi alasan untuk mencari ulang Golden Reference atau menciptakan synthetic Golden data.
