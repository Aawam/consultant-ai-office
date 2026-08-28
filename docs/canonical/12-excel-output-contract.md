# 12 — Kontrak Keluaran Excel Berformula Aktif

**Project:** Consultant AI Office — Phase 1 RAB / Engineer's Estimate  
**Jalur:** C — Kontrak Keluaran Excel  
**Status dokumen:** **FINAL FOR IMPLEMENTATION — A–B–C RECONCILIATION CLOSED**; seluruh blocker business-contract Jalur C telah ditutup oleh keputusan Manager. Dokumen ini **bukan** workbook produksi, exporter, skema database/API, atau desain PDF  
**Acuan keputusan:** Decision Log D-011 s.d. D-022 dan `08-rab-ee-baseline-v1.md`  
**Output target:** satu workbook `.xlsx` mandiri, tanpa macro/VBA dan tanpa external link, dengan formula aktif untuk audit

---

## 1. Tujuan dan prinsip kontrak

Workbook Excel Phase 1 harus menjadi **representasi kerja dan audit** dari satu snapshot proyek yang sama. Workbook bukan source of truth baru dan tidak boleh menciptakan angka rekap, mapping, harga, atau volume melalui input ulang yang terpisah.

Rantai perhitungan yang wajib dapat ditelusuri di dalam workbook adalah:

```text
Resource snapshot + koefisien AHSP
→ biaya komponen
→ subtotal tenaga/bahan/alat
→ biaya langsung AHSP
→ OH/profit
→ HSP

BV atau input volume langsung
+ HSP
→ nilai item RAB
→ subtotal subkelompok/kelompok
→ subtotal RAB
→ PPN
→ total sebelum pembulatan
→ pembulatan half-up Rp1.000
→ total final
```

Prinsip implementasi workbook:

1. **Formula deterministik.** Nilai kritis tidak di-hardcode jika merupakan nilai turunan.
2. **Mandiri.** Semua formula hanya merujuk sheet, Excel Table, dan defined name dalam workbook yang sama.
3. **Tidak ada external link.** Tidak boleh terdapat formula seperti `'[workbook-lain.xlsx]Sheet'!A1`, external defined name, data connection, atau Power Query yang menjadi dependency perhitungan.
4. **Hanya membawa data yang dipakai.** Tidak menyalin seluruh master AHSP/resource ke workbook proyek.
5. **Tanpa fixed row dependency.** Formula tidak boleh bergantung pada asumsi seperti "kelompok IV selalu berakhir di K167".
6. **Excel Table + stable ID.** Seluruh dataset tabular menggunakan Table dan key konseptual yang stabil, bukan nomor baris Excel.
7. **Presisi dijaga.** HSP, nilai item, subtotal, dan PPN tidak dibulatkan secara matematis. Format tampilan tidak mengubah nilai.
8. **Pembulatan hanya sekali.** Total final menggunakan half-up ke Rp1.000 terdekat setelah PPN.
9. **Status terbaru berlaku.** Core Phase 1 memakai `DRAFT → REVIEW → FINAL`; status `APPROVED` terpisah ditunda.
10. **Tidak ada VBA/macro sebagai core.** Semua kebutuhan inti harus dapat dipenuhi dengan formula, Excel Table, data validation, conditional formatting, defined name, dan proteksi sheet biasa.

---

## 2. Temuan sumber yang memengaruhi kontrak

### 2.1 Golden Reference `Contoh Rekap RAB dan BV.xlsx`

Workbook memiliki tiga sheet utama: `Rekap`, `RAB`, dan `BV`.

Pola yang valid dan dipertahankan secara konseptual:

- volume RAB mengacu ke BV, contoh `RAB!I13 = BV!O15`;
- nilai item dihitung `volume × harga satuan`, contoh `RAB!K13 = I13*J13`;
- rekap mengambil subtotal dari RAB;
- subtotal RAB → PPN → total setelah PPN;
- BV memuat geometri sederhana maupun formula khusus, contoh:
  - `BV!O40 = F40*G40*J40`;
  - `BV!O59 = SUM(O52,O53,O54,O55,O56,O57,O58)`;
  - `BV!K61 = 1/3`, `BV!L61 = O59`, `BV!O61 = K61*L61`;
  - `BV!F47 = (25.6*5)+(15*6)`;
  - formula pembesian dan jumlah batang memakai kombinasi koefisien serta `ROUNDUP` pada BV.

Artefak legacy yang **tidak** dijadikan kontrak:

- banyak harga satuan RAB berasal dari workbook lain, misalnya `='[2]K3 Gedung'!K18`, `=[2]AHSP!D32`, dan `='[2]Analisa Tambahan'!J20`;
- metadata juga memiliki referensi eksternal seperti `[1]NOTE`;
- formula pembulatan Golden Reference menggunakan `ROUNDUP(I21,-3)`, sedangkan baseline terbaru menetapkan **half-up**, bukan selalu naik.

### 2.2 Golden Reference `Masterfile AHSP CK.xlsx`

Workbook memiliki sheet `UPAH`, `BAHAN`, `Rekap HSP`, dan `AHSP`.

Pola yang valid dan dipertahankan secara konseptual:

- komponen AHSP = `koefisien × harga dasar`, contoh pola `I11 = G11*H11`;
- subtotal tenaga/bahan/alat dijumlahkan;
- biaya langsung = subtotal A+B+C;
- tarif OH/profit proyek dipakai pada analisa;
- HSP = biaya langsung + OH/profit;
- `BAHAN` dan `UPAH` berfungsi sebagai lookup harga dasar.

Artefak legacy yang **tidak** dijadikan kontrak:

- beberapa HSP menggunakan `ROUNDDOWN`, sedangkan baseline terbaru menyatakan HSP tidak dibulatkan secara matematis;
- ada harga bahan Rp0 yang tidak memiliki penanda eksplisit apakah benar-benar disengaja;
- struktur lookup banyak bergantung pada posisi/range baris dan variasi kode/uraian legacy.

### 2.3 AHSP Cipta Karya Kementerian PU 2026

Acuan normatif menyatakan tiga komponen AHSP adalah **tenaga kerja, bahan, dan peralatan**. Perhitungan HSP dilakukan dari koefisien × HSD setiap komponen, dijumlahkan sebagai biaya langsung, kemudian ditambahkan biaya umum dan keuntungan pada rentang 10–15%. HPP/HPS selanjutnya merupakan total mata pembayaran ditambah PPN. Kontrak workbook mengikuti struktur ini, dengan tarif OH/profit proyek dan PPN proyek sesuai keputusan Phase 1.

### 2.4 Governance Decision Log dan konflik dokumen lama

Hanya **Decision Log authoritative terbaru yang memuat D-001 sampai D-022** yang dipakai oleh kontrak ini. Untuk core Phase 1, D-004/D-018 menetapkan:

```text
DRAFT
→ REVIEW
→ FINAL
```

Aturan legacy `DRAFT → REVIEW → APPROVED → FINAL` pada dokumen/decision-log lama **diabaikan untuk core Phase 1**. `APPROVED` sebagai state terpisah tetap deferred. Sesi Jalur C ini tidak mengedit seluruh dokumen legacy; ia hanya menetapkan precedence agar implementasi tidak membaca state obsolete sebagai aturan aktif.

Konsekuensi editability yang authoritative:

- `DRAFT`: data RAB/EE dapat diedit; pada workbook, seluruh cell yang diklasifikasikan sebagai input sah dapat diedit dan formula terkait harus menghitung ulang;
- masuk `REVIEW`: snapshot dibentuk dan workbook/data yang diperiksa dikunci;
- `REVIEW`: tidak ada edit langsung; koreksi kembali ke DRAFT;
- `FINAL`: immutable; perubahan memerlukan revisi baru berstatus DRAFT.

---

## 3. Struktur workbook minimum

Kontrak mempertahankan **reference layout 9 sheet** berikut. Delapan fungsi data/perhitungan inti wajib ada; `HSP_MAPPING` adalah **required audit capability** menurut D-020, tetapi **physical sheet terpisah bukan business requirement absolut**.

| No | Nama sheet kontrak | Fungsi utama | Sifat |
|---|---|---|---|
| 00 | `PROJECT` | identitas proyek, parameter perhitungan, versi/revisi/status, snapshot, legenda | sumber/snapshot |
| 01 | `REKAP` | subtotal kelompok utama, subtotal RAB, PPN, total sebelum pembulatan, total final | formula-only |
| 02 | `RAB_DETAIL` | satu baris per item berharga; menghubungkan kelompok/subkelompok, volume, dan HSP | campuran input/formula |
| 03 | `BV` | detail Backup Volume dengan formula template terkontrol dan dapat diaudit | campuran input/formula |
| 04 | `HSP_USED` | hanya AHSP/HSP yang benar-benar dipakai proyek; termasuk HSP manual | formula + snapshot |
| 05 | `AHSP_COMPONENTS` | detail tenaga/bahan/alat untuk HSP resmi yang dipakai | snapshot + formula |
| 06 | `RESOURCE_SNAPSHOT` | hanya resource dan base price yang dipakai oleh `AHSP_COMPONENTS` | snapshot |
| 07 | `HSP_MAPPING` | derived audit view: item → kelompok/subkelompok → AHSP/HSP | formula/derived; **recommended** |
| 08 | `CHECKS` | rekonsiliasi, ERROR/WARNING, confirmation state, completeness, self-containment | formula + generator checks |

### 3.1 Posisi `HSP_MAPPING`

`RAB_DETAIL` sudah membawa `group_id`, `subgroup_id`, dan `hsp_id`, sehingga secara semantik mapping dapat direkonstruksi dari sana. D-020 tetap mewajibkan mapping AHSP/HSP terpakai terhadap kelompok/subkelompok **terlihat eksplisit dan dapat direkonsiliasi**.

Reference layout mempertahankan `HSP_MAPPING` sebagai sheet terpisah karena memberi auditability terbaik: reviewer dapat melihat *where used* tanpa menelusuri seluruh `RAB_DETAIL`. Namun physical placement ini **NON-BLOCKER**. Blueprint boleh menggabungkannya bila mapping tetap eksplisit, derived dari source yang sama, tidak ambigu, dan lolos `C-MAP-001/C-MAP-002`.

---

# 4. Data dictionary per sheet

> **Status dependency setelah rekonsiliasi**  
> Semantic master-data Jalur A sudah **resolved** dan dipakai secara canonical di bagian ini.  
> Golden Test Jalur B sudah diintegrasikan ke acceptance coverage. Untuk valid direct volume, HSP manual, dan `ZERO_CONFIRMED` resource, status source fixture adalah `NO VALID GOLDEN FIXTURE AVAILABLE`; ketiganya wajib diuji sebagai `CONTRACT-DERIVED ACCEPTANCE TEST REQUIRED` dan bukan dengan synthetic Golden data.

## 4.1 `PROJECT`

**Tujuan:** satu tempat untuk identitas snapshot dan parameter global workbook. Semua sheet lain menampilkan metadata proyek dengan formula/named reference dari sini, bukan copy-paste manual.

Disarankan satu Excel Table bernama `tbl_PROJECT` dengan tepat satu row, ditambah workbook-level defined names untuk parameter yang sering dipakai formula.

| Field | Tipe | Sumber | Input / formula | Validasi / aturan | Relasi |
|---|---|---|---|---|---|
| `project_id` | text/ID | snapshot proyek | source value | wajib, tidak kosong | seluruh workbook |
| `project_name` | text | snapshot proyek | source value | wajib | header seluruh sheet |
| `activity_name` | text | snapshot proyek | source value | wajib bila dipakai proyek | identitas |
| `work_name` | text | snapshot proyek | source value | wajib | identitas |
| `location` | text | snapshot proyek | source value | wajib | identitas |
| `fiscal_year` | integer/text | snapshot proyek | source value | 4 digit jika tersedia | identitas |
| `document_version` | text | versioning sistem | source value | wajib | audit |
| `revision_no` | integer/text | revisioning sistem | source value | wajib | audit |
| `status` | enum | snapshot | source value | `DRAFT`, `REVIEW`, `FINAL` saja | proteksi workbook |
| `snapshot_id` | text/ID | snapshot sistem | source value | wajib untuk REVIEW/FINAL | seluruh sheet |
| `snapshot_created_at` | datetime | snapshot sistem | source value | ISO/date-time | audit |
| `generated_at` | datetime | exporter | source value | wajib | audit |
| `oh_profit_rate` | percentage | parameter proyek | source/input | 10%–15%; default 10% | `HSP_USED` |
| `ppn_rate` | percentage | parameter proyek | source/input | ≥0; default Golden Reference 11% | `REKAP` |
| `rounding_unit` | currency integer | baseline | constant source | harus `1000` pada core Phase 1 | `REKAP` |
| `rounding_method` | enum | baseline | constant source | `HALF_UP` | `REKAP` |
| `currency` | text | kontrak | constant source | `IDR` | format |
| `official_ahsp_reference` | text | snapshot metadata | source value | contoh: Lampiran VI SE 47/SE/Dk/2026 | audit |
| `excel_contract_version` | text | exporter/spec | source value | wajib | audit |

**Defined names yang direkomendasikan:**

- `P_PROJECT_ID`
- `P_SNAPSHOT_ID`
- `P_STATUS`
- `P_OH_RATE`
- `P_PPN_RATE`
- `P_ROUND_UNIT`

Defined name harus menunjuk field pada `tbl_PROJECT`, bukan nomor sel absolut yang dianggap permanen.

---

## 4.2 `REKAP`

**Tujuan:** menampilkan ringkasan otomatis per kelompok utama dan total proyek. Tidak ada input ulang nilai kelompok, PPN, atau total.

Table: `tbl_REKAP`.

| Field | Tipe | Sumber | Input / formula | Validasi / aturan | Relasi |
|---|---|---|---|---|---|
| `group_id` | text/ID | struktur proyek | source/generated | unik per kelompok | `RAB_DETAIL.group_id` |
| `group_order` | integer | struktur proyek | source/generated | unik/terurut | display |
| `group_code` | text | struktur proyek | source/generated | optional | display |
| `group_name` | text | struktur proyek | source/generated | wajib | display |
| `group_subtotal` | currency decimal | `RAB_DETAIL` | formula | `SUMIFS` berdasarkan `group_id` | subtotal RAB |

Summary block di bawah/atas table:

| Field | Tipe | Sumber | Formula kontrak |
|---|---|---|---|
| `subtotal_rab` | currency decimal | `tbl_REKAP` | `=SUM(tbl_REKAP[group_subtotal])` |
| `ppn_rate` | percentage | `PROJECT` | `=P_PPN_RATE` |
| `ppn_value` | currency decimal | subtotal | `=subtotal_rab*ppn_rate` |
| `total_before_rounding` | currency decimal | subtotal + PPN | `=subtotal_rab+ppn_value` |
| `total_final` | currency integer | total sebelum pembulatan | half-up Rp1.000 |
| `rounding_difference` | currency decimal | final − pre-round | `=total_final-total_before_rounding` |

**Aturan:**

- Rekap utama hanya menampilkan **kelompok utama** sesuai D-017.
- Subkelompok tidak menjadi input rekap; subtotal subkelompok tersedia di `HSP_MAPPING`/audit check jika dibutuhkan.
- Semua angka rekap wajib formula.
- Tidak boleh ada formula `SUM(K13:K35)` berbasis posisi kelompok pada row tertentu.

---

## 4.3 `RAB_DETAIL`

**Tujuan:** dataset utama item RAB. Setiap row adalah **satu item berharga**, bukan baris judul kelompok atau subtotal.

Table: `tbl_RAB`.

| Field | Tipe | Sumber | Input / formula | Validasi / aturan | Relasi |
|---|---|---|---|---|---|
| `item_id` | text/ID | snapshot proyek | source | wajib, unik | key utama workbook |
| `item_order` | integer | struktur proyek | source | ≥1 | display |
| `item_code` | text | proyek | source | optional | display |
| `item_name` | text | proyek | source | wajib | display |
| `group_id` | text/ID | proyek | source | wajib | `REKAP`, mapping |
| `group_name` | text | proyek | source/snapshot | wajib | display |
| `subgroup_id` | text/ID/null | proyek | source | optional; maksimal satu level | mapping |
| `subgroup_name` | text/null | proyek | source/snapshot | harus konsisten dengan `subgroup_id` | display |
| `volume_unit_raw` | text | proyek/source | source/input | raw notation dipertahankan | audit |
| `volume_unit_canonical` | text | normalisasi unit | source/generated | hasil SAFE_ALIAS normalization; wajib sebelum REVIEW | unit check |
| `volume_source_type` | enum | proyek | source/input | `BV` atau `DIRECT` | volume |
| `bv_id` | text/ID/null | proyek | source | wajib jika `BV`, kosong jika `DIRECT` | `BV` |
| `direct_volume` | decimal/null | proyek | input/source | hanya jika `DIRECT` | volume |
| `direct_basis` | text/null | proyek | input/source | wajib jika `DIRECT` | audit |
| `direct_source` | text/null | proyek | input/source | wajib jika `DIRECT` | audit |
| `direct_note` | text/null | proyek | input/source | wajib jika `DIRECT` | audit |
| `direct_reviewer` | text/ID/null | proyek | input/source | wajib jika `DIRECT`; encoding identitas ditunda | warning/review |
| `volume` | decimal | BV/direct | **formula** | DRAFT boleh `0` hanya sebagai incomplete+ERROR; REVIEW/FINAL item aktif wajib `>0` | item amount |
| `hsp_id` | text/ID | snapshot | source | wajib | `HSP_USED` |
| `hsp_type` | enum | `HSP_USED` | formula lookup | `AHSP` / `MANUAL` | warning |
| `hsp_unit_canonical` | text | `HSP_USED.work_unit_canonical` | formula lookup | wajib | unit check |
| `unit_check` | enum/formula | canonical volume vs HSP unit | formula | `OK` hanya jika canonical units equal; selain itu `ERROR` | CHECKS |
| `hsp_value` | currency decimal | `HSP_USED` | formula lookup | tidak boleh kosong | item amount |
| `item_amount` | currency decimal | volume × HSP | formula | tidak dibulatkan | Rekap |
| `warning_code` | text/null | validation | formula/derived | `DIRECT_VOLUME` hanya untuk DIRECT valid; warning invalid tidak boleh menutupi ERROR | CHECKS |
| `error_code` | text/null | validation | formula/derived | formula/structural/unit error | CHECKS |

**Aturan struktur:**

- setiap item memiliki tepat satu `group_id`; `subgroup_id` optional dan tidak ada level ketiga;
- tidak ada row subtotal/heading di dalam `tbl_RAB`; item tidak boleh dihitung ganda;
- `volume_source_type=BV` tidak boleh memakai `direct_volume` sebagai fallback diam-diam;
- direct volume yang memenuhi D-011 menghasilkan WARNING dan membawa basis/source/note/reviewer;
- setiap row `tbl_RAB` merepresentasikan **item RAB aktif**; item yang tidak digunakan tidak dipertahankan sebagai item aktif bervolume nol;
- pada `DRAFT`, `volume = 0` boleh disimpan sebagai kondisi incomplete tetapi menghasilkan **ERROR**;
- untuk masuk `REVIEW` dan pada `FINAL`, setiap item RAB aktif wajib memiliki `volume > 0`; `volume = 0` memblokir REVIEW dan tidak memiliki override pada Phase 1.

---

## 4.4 `BV`

**Tujuan:** menyimpan perhitungan kuantitas sebagai formula aktif yang deterministik, auditable, dan **hanya memakai template formula ter-whitelist**.

Table: `tbl_BV`.

`CUSTOM` free-form dihapus dari kontrak Phase 1. User tidak boleh memasukkan arbitrary Excel formula. Formula Excel aktual dibentuk dari `formula_template_key` + `formula_template_version` dan stable IDs; `formula_display` hanya representasi audit yang dihasilkan, bukan expression yang dieksekusi.

| Field | Tipe | Sumber | Input / formula | Validasi / aturan | Relasi |
|---|---|---|---|---|---|
| `bv_id` | text/ID | snapshot | source | wajib; satu BV dapat punya banyak line | `RAB_DETAIL.bv_id` |
| `bv_line_id` | text/ID | snapshot | source | wajib, unik | stable formula reference |
| `rab_item_id` | text/ID | snapshot | source | harus menunjuk 1 item | `RAB_DETAIL.item_id` |
| `line_order` | integer | BV | source | ≥1; display only | display |
| `line_role` | enum | BV | source | `DETAIL`, `RESULT`, `REFERENCE` | roll-up |
| `description` | text | BV | input/source | wajib untuk DETAIL/RESULT | audit |
| `parent_bv_line_id` | text/ID/null | BV | source | child set memakai parent ID; tidak memakai row range | multi-input templates |
| `ref_bv_line_id` | text/ID/null | BV | source | stable single reference bila template memerlukannya | reference template |
| `length` | decimal/null | BV | input/source | sesuai template | operand |
| `width` | decimal/null | BV | input/source | sesuai template | operand |
| `height` | decimal/null | BV | input/source | sesuai template | operand |
| `point_count` | decimal/null | BV | input/source | sesuai template | operand |
| `quantity` | decimal/null | BV | input/source | sesuai template | operand |
| `coefficient` | decimal/null | BV | input/source | sesuai template | operand |
| `aux_1` | decimal/null | BV | input/source | hanya jika didefinisikan oleh versioned template | operand |
| `aux_2` | decimal/null | BV | input/source | hanya jika didefinisikan oleh versioned template | operand |
| `formula_template_key` | enum | kontrak/snapshot | source | wajib untuk line terhitung; whitelist §4.4.1 | formula contract |
| `formula_template_version` | text/int | kontrak/snapshot | source | wajib; mengunci semantics template | audit/reproducibility |
| `formula_display` | text | generated | formula/generated | human-readable; **tidak dieksekusi dan tidak menjadi arbitrary formula input** | audit |
| `unit_raw` | text | BV/source | source/input | raw notation dipertahankan | audit |
| `unit_canonical` | text | normalisasi | source/generated | SAFE_ALIAS canonical unit | RAB unit |
| `volume_calc` | decimal | template formula | **formula aktif, locked** | tidak boleh diedit manual; tidak boleh error | RAB volume |
| `is_result` | boolean | BV | source | tepat satu TRUE per `bv_id` | volume RAB |
| `dimension_source` | text | gambar/dokumen | input/source | wajib untuk pekerjaan geometris | traceability |
| `note` | text/null | BV | input/source | optional | audit |

### 4.4.1 Whitelist formula template Phase 1

| Template key | Semantik terkontrol | Stable dependency | Bukti kebutuhan |
|---|---|---|---|
| `SCALAR_VALUE` | nilai detail langsung yang sah sebagai operand BV; bukan volume direct RAB | same-row input | building block |
| `GEOMETRY_PRODUCT` | produk operand geometri yang **ditetapkan oleh versi template**; operand yang tidak dipakai tidak diisi nilai palsu | same-row structured refs | GT-01, GT-02 |
| `SUM_CHILDREN` | jumlah `volume_calc` child yang menunjuk `parent_bv_line_id` | parent/child stable IDs | total BV |
| `REFERENCE_FACTOR` | hasil line yang direferensikan × faktor terkontrol | `ref_bv_line_id` | pola 1/3 × hasil lain |
| `RATIO_VALUE` | numerator ÷ denominator dengan validasi denominator | same-row operands | mendukung segmen rasional seperti `8/3` |
| `WEIGHTED_COUNT` | Σ(`quantity × coefficient`) dari child set | parent/child stable IDs | GT-03 |
| `SEGMENT_SUM_FACTOR` | Σ child segment/result × faktor | parent/child stable IDs | GT-05 |
| `REBAR_ROUNDUP` | perhitungan pembesian dengan slot parameter terdefinisi dan operasi `ROUNDUP` hanya pada **bar-count step** yang ditentukan template version | same-row + child/ref IDs | GT-04 |

**Kontrak `REBAR_ROUNDUP`:** version template harus mendefinisikan slot seperti basis panjang/jarak, spacing, count offset/layer/quantity, panjang batang, dan unit-weight/faktor yang relevan. `ROUNDUP` boleh muncul karena ia bagian logika teknis BV yang dibuktikan GT-04; pengguna tidak dapat mengubah operator atau menulis formula Excel sendiri.

**Representasi GT:**

- GT-03 direpresentasikan sebagai child weighted counts → `WEIGHTED_COUNT`, lalu panjang minipile × hasil count melalui template terkontrol;
- GT-04 memakai `REBAR_ROUNDUP` per detail pembesian dan `SUM_CHILDREN` untuk result kg;
- GT-05 memakai child `SCALAR_VALUE`/`RATIO_VALUE`, lalu `SEGMENT_SUM_FACTOR` dengan faktor `1.25`.

Jika kebutuhan pekerjaan **tidak dapat direpresentasikan** oleh whitelist:

- `DRAFT`: record boleh belum lengkap dan ditandai `UNSUPPORTED_BV_TEMPLATE`;
- perpindahan ke `REVIEW`: **ERROR** sampai template yang disetujui tersedia atau data proyek diperbaiki;
- tidak ada fallback ke arbitrary formula text, fixed row reference, atau general formula engine.

---

## 4.5 `HSP_USED`

**Tujuan:** satu row per HSP yang digunakan oleh item RAB, dengan AHSP official dan jalur `MANUAL / NON-AHSP` dibedakan tegas.

Table: `tbl_HSP`.

| Field | Tipe | Sumber | Input / formula | Validasi / aturan | Relasi |
|---|---|---|---|---|---|
| `hsp_id` | text/ID | project snapshot | source | wajib, unik; identity project/snapshot layer | `RAB_DETAIL` |
| `hsp_type` | enum | snapshot | source | `AHSP` atau `MANUAL` | formula |
| `ahsp_id` | text/ID/null | canonical Jalur A | source | wajib untuk AHSP; null untuk MANUAL | components |
| `source_edition` | text/null | canonical AHSP | source | wajib untuk AHSP | audit/business identity |
| `official_code` | text/null | canonical AHSP | source | wajib untuk AHSP | audit/business identity |
| `official_description` | text/null | canonical AHSP | source | wajib untuk AHSP | display/audit |
| `source_locator` | text/null | canonical AHSP | source | wajib untuk AHSP | traceability |
| `normative_reference` | text/null | canonical AHSP | source | optional bila source menyediakan | audit |
| `work_unit_raw` | text | official/manual source | source/input | raw notation dipertahankan | audit |
| `work_unit_canonical` | text | normalisasi | source/generated | SAFE_ALIAS canonical unit; wajib sebelum REVIEW | RAB unit |
| `manual_description` | text/null | user/snapshot | source/input | wajib jika MANUAL | audit |
| `manual_hsp` | currency decimal/null | user/snapshot | source/input | wajib jika MANUAL; DRAFT boleh `0` sebagai incomplete + ERROR; REVIEW/FINAL wajib `>0` | HSP |
| `manual_note` | text/null | user/snapshot | source/input | **wajib jika MANUAL; tidak dapat diganti oleh `source_locator`/source reference** | audit/review |
| `labor_subtotal` | currency decimal | components | formula | 0/blank untuk manual | direct cost |
| `material_subtotal` | currency decimal | components | formula | 0/blank untuk manual | direct cost |
| `equipment_subtotal` | currency decimal | components | formula | 0/blank untuk manual | direct cost |
| `direct_cost` | currency decimal | A+B+C | formula | official only | OH |
| `oh_rate` | percentage | project | formula | `P_OH_RATE` jika AHSP; 0/blank jika MANUAL | OH |
| `oh_value` | currency decimal | direct × rate | formula | official only | HSP |
| `hsp_value` | currency decimal | formula | formula | AHSP: D+E; MANUAL: `manual_hsp` | RAB |
| `warning_code` | text/null | validation | formula | `MANUAL_HSP` hanya jika MANUAL valid (`manual_hsp>0`, note/unit/uraian lengkap); invalid MANUAL menjadi ERROR | CHECKS |

**Manual HSP contract:**

```text
hsp_type = MANUAL
→ ahsp_id = null
→ manual_description wajib
→ work_unit_raw + work_unit_canonical wajib
→ manual_hsp wajib dan harus > 0 untuk REVIEW/FINAL
→ manual_hsp = 0 pada DRAFT boleh disimpan tetapi berstatus ERROR/incomplete
→ manual_note wajib
→ WARNING: MANUAL_HSP hanya bila manual HSP valid (>0) dan field wajib lengkap
→ tidak membutuhkan AHSP component breakdown
→ tidak mendapat OH/profit tambahan
→ tidak membuat fake AHSP hanya untuk memenuhi struktur sheet
```

`source_reference` generik tidak digunakan sebagai pengganti `manual_note`. `manual_hsp = 0` adalah **ERROR**: boleh tersimpan pada DRAFT sebagai incomplete, tetapi memblokir REVIEW dan tidak diperbolehkan pada FINAL. Tidak ada override zero-manual-HSP pada Phase 1.

---

## 4.6 `AHSP_COMPONENTS`

**Tujuan:** komponen canonical tenaga, bahan, dan alat dari AHSP **yang digunakan saja**, mengikuti semantic Jalur A.

Table: `tbl_AHSP_COMP`.

| Field | Tipe | Sumber | Input / formula | Validasi / aturan | Relasi |
|---|---|---|---|---|---|
| `ahsp_component_id` | text/ID | canonical Jalur A | source | wajib, unik | key |
| `ahsp_id` | text/ID | canonical Jalur A | source | wajib | HSP official |
| `hsp_id` | text/ID | used HSP snapshot | source | wajib; menunjuk `hsp_type=AHSP` | `HSP_USED` |
| `source_order` | integer | canonical AHSP | source | ≥1; bukan row Excel | display |
| `component_group` | enum | canonical AHSP | source | `TENAGA`, `BAHAN`, `ALAT` | subtotal |
| `source_resource_name` | text | official AHSP | source | raw/official component wording | traceability |
| `source_resource_code` | text/null | official AHSP | source | nullable | traceability |
| `source_unit_raw` | text | official AHSP | source | raw notation | traceability |
| `source_unit_canonical` | text | Jalur A normalization | source/generated | SAFE_ALIAS canonical unit | unit check |
| `resource_id` | text/ID | canonical resource | source | wajib | resource snapshot |
| `normative_code` | text/null | resource snapshot | formula lookup | nullable | audit |
| `resource_name` | text | resource snapshot | formula lookup | wajib | display/audit |
| `unit_canonical` | text | resource snapshot | formula lookup | wajib | unit cross-check |
| `coefficient` | decimal | official AHSP | source snapshot | wajib; tidak editable sebagai custom analysis | cost |
| `price_unit` | text | resource snapshot | formula lookup | canonical unit | unit cross-check |
| `price_value` | currency decimal/null | resource snapshot | formula lookup | state-dependent | cost |
| `price_state` | enum | resource snapshot | formula lookup | `MISSING`, `SET`, `ZERO_CONFIRMED` | validation |
| `component_cost` | currency decimal | coefficient × price | formula | tidak dibulatkan | `HSP_USED` |
| `source_locator` | text | official AHSP | source | wajib | audit |

**Aturan:**

- `component_group` adalah semantic component A/B/C; `Resource.resource_type` hanya cross-check, bukan synonym kedua pada component;
- `source_unit_canonical`, `unit_canonical`, dan `price_unit` harus sama setelah SAFE_ALIAS normalization; tidak ada conversion implisit;
- `price_state=MISSING` → ERROR bila resource dipakai;
- `price_state=SET` → `price_value` harus non-zero terisi;
- `price_state=ZERO_CONFIRMED` → `price_value=0`, menghasilkan WARNING sesuai D-012;
- literal zero tanpa bukti intent **tidak** boleh dipromosikan menjadi `ZERO_CONFIRMED`;
- HSP manual tidak membuat component palsu.

---

## 4.7 `RESOURCE_SNAPSHOT`

**Tujuan:** menyimpan resource canonical dan base price minimum yang benar-benar dipakai oleh `AHSP_COMPONENTS`, menggunakan semantic Jalur A tanpa synonym legacy.

Table: `tbl_RESOURCE`.

| Field | Tipe | Sumber | Input / formula | Validasi / aturan | Relasi |
|---|---|---|---|---|---|
| `resource_id` | text/ID | canonical Jalur A | source | wajib, unik | components |
| `resource_type` | enum | canonical resource | source | `TENAGA`, `BAHAN`, `ALAT` | cross-check components |
| `normative_code` | text/null | canonical resource | source | nullable | audit |
| `resource_name` | text | canonical resource | source | wajib | audit |
| `unit_raw_reference` | text | canonical/reference source | source | raw unit dipertahankan | traceability |
| `unit_canonical` | text | Jalur A normalization | source | wajib | component/base price join |
| `price_unit` | text | canonical base price | source | canonical unit; harus match `unit_canonical` | component cost |
| `price_value` | currency decimal/null | price snapshot | source/input | null bila `MISSING` | component cost |
| `price_state` | enum | canonical base price | source | `MISSING`, `SET`, `ZERO_CONFIRMED` | validation |
| `snapshot_id` | text/ID | project snapshot | source/formula | harus = `P_SNAPSHOT_ID` | reconciliation |

**Traceability boundary:** detail vendor, zonasi, histori, lokasi/tanggal berlaku tetap deferred D-012. Kontrak tidak membuang raw source unit: `unit_raw_reference` dipertahankan berdampingan dengan `unit_canonical`. Trace normatif AHSP berada pada `HSP_USED.source_edition/official_code/source_locator` dan `AHSP_COMPONENTS.source_locator/source_*`; base-price semantics dibawa lewat `price_unit/price_value/price_state`.

---

## 4.8 `HSP_MAPPING`

**Tujuan:** derived audit view eksplisit "item memakai HSP apa dan berada di kelompok/subkelompok mana". Tidak boleh menjadi input mapping kedua.

Table/view: `tbl_HSP_MAP` bila physical sheet dipertahankan.

| Field | Tipe | Sumber | Input / formula | Aturan |
|---|---|---|---|---|
| `item_id` | text/ID | `RAB_DETAIL` | formula/generated | 1:1 dengan item |
| `item_name` | text | `RAB_DETAIL` | formula | derived |
| `group_id` | text/ID | `RAB_DETAIL` | formula | derived |
| `group_name` | text | `RAB_DETAIL` | formula | derived |
| `subgroup_id` | text/null | `RAB_DETAIL` | formula | derived |
| `subgroup_name` | text/null | `RAB_DETAIL` | formula | derived |
| `hsp_id` | text/ID | `RAB_DETAIL` | formula | derived |
| `hsp_type` | enum | `HSP_USED` | formula | derived |
| `official_code` | text/null | `HSP_USED` | formula | null untuk MANUAL |
| `hsp_description` | text | `HSP_USED` | formula | official/manual description derived |
| `volume` | decimal | `RAB_DETAIL` | formula | derived |
| `item_amount` | currency decimal | `RAB_DETAIL` | formula | derived |
| `subgroup_subtotal` | currency decimal/null | `RAB_DETAIL` | formula | `SUMIFS` jika subgroup ada |
| `group_subtotal` | currency decimal | `RAB_DETAIL` | formula | `SUMIFS` |

**Larangan:** tidak ada mapping editable terpisah. Bila physical sheet dihilangkan, capability yang sama harus tetap tersedia secara eksplisit dan lolos rekonsiliasi.

---

## 4.9 `CHECKS`

**Tujuan:** menyatukan rekonsiliasi numerik, validation severity, dan reviewer confirmation state secara auditable.

Table: `tbl_CHECKS`.

| Field | Tipe | Sumber | Input / formula | Aturan |
|---|---|---|---|---|
| `check_id` | text | kontrak | source | unik |
| `severity` | enum | kontrak | source | `ERROR`, `WARNING`, `INFO` |
| `scope` | enum/text | kontrak | source | PROJECT/RAB/BV/HSP/RESOURCE/REKAP/WORKBOOK |
| `check_origin` | enum | kontrak | source | `FORMULA` atau `EXPORTER` |
| `result` | enum | formula/generator | formula/source | `PASS`, `FAIL`, `N/A` |
| `difference` | decimal/null | reconciliation | formula | 0 pada PASS numerik |
| `message` | text | formula/generator | formula/source | readable; kode selalu tersedia |
| `blocking_review` | boolean | severity | formula | TRUE **hanya** untuk ERROR |
| `warning_confirmation_required` | boolean | severity | formula | TRUE untuk WARNING |
| `warning_confirmation_status` | enum | reviewer workflow | source/input | `NOT_REQUIRED`, `PENDING`, `CONFIRMED` |
| `confirmed_by` | text/ID/null | reviewer workflow | source/input | wajib ketika WARNING dikonfirmasi; encoding final ditunda |
| `confirmed_at` | datetime/null | reviewer workflow | source/input | audit confirmation |

`WARNING` tetap non-blocking sebagai severity; ia harus ditampilkan dan dikonfirmasi reviewer sesuai D-019. `ERROR` memblokir perpindahan ke REVIEW. Workbook tidak mengandalkan warna saja untuk membawa severity/confirmation state.

---

# 5. Formula dan dependency matrix

## 5.1 Nama Table yang stabil

| Dataset | Excel Table |
|---|---|
| project | `tbl_PROJECT` |
| rekap kelompok | `tbl_REKAP` |
| item RAB | `tbl_RAB` |
| backup volume | `tbl_BV` |
| HSP digunakan | `tbl_HSP` |
| komponen AHSP | `tbl_AHSP_COMP` |
| resource snapshot | `tbl_RESOURCE` |
| mapping audit | `tbl_HSP_MAP` |
| checks | `tbl_CHECKS` |

Semua formula lintas dataset memakai **structured references**, `SUMIFS`, `COUNTIFS`, dan lookup berdasarkan stable ID. Formula tidak merujuk ke "row 167" sebagai makna bisnis.

## 5.2 Formula matrix inti

| Tahap | Output | Dependency | Formula Excel konseptual | Catatan |
|---|---|---|---|---|
| Harga komponen | `component_cost` | coefficient + `price_value` | `=[@coefficient]*[@price_value]` | hanya jika `price_state` valid; tanpa rounding |
| Subtotal tenaga | `labor_subtotal` | components | `=SUMIFS(tbl_AHSP_COMP[component_cost],tbl_AHSP_COMP[hsp_id],[@hsp_id],tbl_AHSP_COMP[component_group],"TENAGA")` | AHSP only |
| Subtotal bahan | `material_subtotal` | components | filter `component_group="BAHAN"` | AHSP only |
| Subtotal alat | `equipment_subtotal` | components | filter `component_group="ALAT"` | AHSP only |
| Biaya langsung | `direct_cost` | A+B+C | `=[@labor_subtotal]+[@material_subtotal]+[@equipment_subtotal]` | AHSP only |
| OH rate | `oh_rate` | project | `=IF([@hsp_type]="AHSP",P_OH_RATE,0)` | MANUAL tidak ditambah OH |
| OH value | `oh_value` | direct × rate | `=[@direct_cost]*[@oh_rate]` | tanpa rounding |
| HSP | `hsp_value` | official/manual | `=IF([@hsp_type]="MANUAL",[@manual_hsp],[@direct_cost]+[@oh_value])` | tanpa rounding; MANUAL harus `manual_hsp>0` sebelum REVIEW/FINAL |
| BV result | `volume_calc` | versioned template + stable IDs | formula generated dari `formula_template_key/version` | **tidak ada CUSTOM/free-form** |
| Volume RAB | `volume` | BV/direct | `=IF([@volume_source_type]="BV",SUMIFS(tbl_BV[volume_calc],tbl_BV[bv_id],[@bv_id],tbl_BV[is_result],TRUE),[@direct_volume])` | item aktif harus `volume>0` sebelum REVIEW/FINAL; zero = ERROR |
| HSP ke RAB | `hsp_value` | HSP id | `=INDEX(tbl_HSP[hsp_value],MATCH([@hsp_id],tbl_HSP[hsp_id],0))` | no external link |
| Nilai item | `item_amount` | volume × HSP | `=[@volume]*[@hsp_value]` | tanpa rounding |
| Subtotal subkelompok | audit | item amounts | `=SUMIFS(tbl_RAB[item_amount],tbl_RAB[subgroup_id],[@subgroup_id])` | jika subgroup |
| Subtotal kelompok | `group_subtotal` | item amounts | `=SUMIFS(tbl_RAB[item_amount],tbl_RAB[group_id],[@group_id])` | direct item + subgroup children otomatis |
| Subtotal RAB | summary | groups | `=SUM(tbl_REKAP[group_subtotal])` | harus = sum semua item |
| PPN | summary | subtotal × PPN rate | `=SubtotalRAB*P_PPN_RATE` | satu kali di proyek |
| Total pre-round | summary | subtotal + PPN | `=SubtotalRAB+PPNValue` | full precision |
| Total final | summary | pre-round | `=INT((TotalBeforeRounding+500)/1000)*1000` | half-up untuk nilai non-negatif |
| Selisih pembulatan | summary | final − pre-round | `=TotalFinal-TotalBeforeRounding` | disimpan/ditampilkan |

### 5.3 Lookup resource/base price

Baseline kompatibilitas formula menggunakan fungsi luas tersedia seperti `INDEX/MATCH`, `SUMIFS`, dan structured references:

```excel
=INDEX(tbl_RESOURCE[price_value],MATCH([@resource_id],tbl_RESOURCE[resource_id],0))
```

`price_unit` dan `price_state` harus di-lookup dari row `resource_id` yang sama. `XLOOKUP`, `LET`, dynamic arrays, atau fitur Excel baru **tidak menjadi mandatory dependency** pada business contract ini. Target versi minimum Excel diteruskan ke technical blueprint.

### 5.4 Unit compatibility — canonical Jalur A

Phase 1 **tidak membuat generic unit conversion engine**. Aturan kontrak:

1. raw unit dipertahankan untuk audit;
2. SAFE_ALIAS dinormalisasi menjadi canonical unit;
3. `RAB.volume_unit_canonical == HSP.work_unit_canonical` → `OK`;
4. `AHSP_COMPONENT.source_unit_canonical == Resource.unit_canonical == BasePrice.price_unit` → compatible;
5. pasangan `CONVERTIBLE` yang canonical-nya tidak sama **tidak otomatis compatible** tanpa conversion rule eksplisit;
6. token `REVIEW_REQUIRED`/ambiguous atau canonical unit yang belum terselesaikan menjadi **ERROR sebelum REVIEW**;
7. tidak ada implicit conversion `OH ↔ OJ`, `liter ↔ m3`, `kg ↔ m3`, atau conversion berbasis asumsi density.

Formula check sederhana setelah canonicalization dapat berupa:

```excel
=IF([@volume_unit_canonical]=[@hsp_unit_canonical],"OK","ERROR")
```

Jika canonicalization belum menghasilkan unit yang resolved, check tidak boleh dipaksa `OK` melalui tebakan.

---

# 6. Aturan input, formula, warning, dan error

Workbook wajib membedakan tipe sel **bukan hanya dengan warna**, tetapi dengan kombinasi fill, protection, data validation, dan indikator teks/kode.

## 6.1 Konvensi visual minimum

| Kategori | Visual | Protection | Perilaku |
|---|---|---|---|
| Source/Input | fill ringan + label legend `INPUT/SNAPSHOT` | input sah unlocked pada DRAFT | data validation aktif |
| Formula | fill berbeda + label `FORMULA` | locked; formula **tidak disembunyikan** | formula bar dapat diaudit |
| Warning | amber/oranye + teks `WARNING` + kode | non-blocking severity | wajib terlihat; reviewer confirmation dicatat |
| Error | merah + teks `ERROR` + kode | blocking | memblokir DRAFT → REVIEW |
| Metadata locked | netral | locked pada REVIEW/FINAL | snapshot identity |

Warna spesifik boleh berubah saat visual design. Kontrak fungsionalnya: kategori tetap dapat dibedakan tanpa bergantung pada warna semata.

## 6.2 Proteksi berdasarkan status

### `DRAFT`

- seluruh cell yang **diklasifikasikan sebagai input sah workbook** dapat diedit;
- formula/calculated cells selalu locked, termasuk `BV.volume_calc`;
- formula template key/version bukan tempat memasukkan expression bebas;
- perubahan input yang sah menghitung ulang dependency terkait;
- WARNING dan ERROR ditampilkan real-time;
- perubahan struktur bisnis yang tidak direpresentasikan oleh input contract dilakukan pada sistem lalu workbook diregenerasi, bukan dengan mengubah formula bebas.

### `REVIEW`

- snapshot sudah dibentuk;
- seluruh data/input/formula yang diperiksa locked;
- formula tetap terlihat untuk audit;
- koreksi harus kembali ke DRAFT, bukan edit langsung.

### `FINAL`

- snapshot final immutable;
- seluruh workbook data/input/formula locked dari edit langsung;
- perubahan menghasilkan revisi baru berstatus DRAFT.

Sheet protection bukan security boundary dan tidak menggantikan kontrol akses sistem.

## 6.3 ERROR minimum

Harus muncul sebagai `FAIL` pada `CHECKS` dan memblokir REVIEW:

- identitas wajib proyek kosong;
- tidak ada kelompok atau item;
- item tidak mempunyai tepat satu kelompok/subkelompok sesuai aturan;
- uraian/satuan/volume/HSP tidak valid menurut policy yang sudah diputuskan;
- canonical unit RAB vs HSP mismatch/unresolved;
- component/resource/base-price unit mismatch/unresolved;
- item geometris tidak memiliki BV result;
- `bv_id` tidak memiliki tepat satu `is_result=TRUE`;
- BV memakai unsupported template saat akan REVIEW;
- formula/referensi BV gagal atau mencoba arbitrary/external/fixed-row dependency;
- `price_state=MISSING` untuk resource yang dipakai;
- literal Rp0 belum memiliki state `ZERO_CONFIRMED`;
- unresolved/ambiguous canonical AHSP/resource record dipakai proyek;
- resource/HSP lookup gagal;
- HSP MANUAL tidak memiliki `manual_note` atau field wajib lain;
- OH/profit <10% atau >15%;
- tarif PPN invalid;
- formula menghasilkan `#REF!`, `#VALUE!`, `#DIV/0!`, `#NAME?`, `#N/A`, atau error lain;
- subtotal, PPN, total pre-round, atau total final gagal dihitung;
- external link ditemukan;
- snapshot ID antar sheet tidak konsisten.

**Zero-policy final:**

- `volume = 0` pada item RAB aktif → **ERROR**. Boleh tersimpan pada DRAFT sebagai incomplete; memblokir REVIEW; tidak valid pada FINAL; tidak ada override.
- `manual_hsp = 0` untuk HSP MANUAL/NON-AHSP → **ERROR**. Boleh tersimpan pada DRAFT sebagai incomplete; memblokir REVIEW; tidak valid pada FINAL; tidak ada override.
- kedua rule tersebut **tidak** mengubah `price_state=ZERO_CONFIRMED` pada resource, yang tetap merupakan WARNING bila intent zero eksplisit.

## 6.4 WARNING minimum

WARNING **tidak menjadi blocking severity**, tetapi wajib tampil dan dicatat confirmation state reviewer:

- `MANUAL / NON-AHSP` yang valid → `MANUAL_HSP`;
- `price_state=ZERO_CONFIRMED` → intentional zero base price;
- volume langsung yang sah untuk quantity sederhana/LS → `DIRECT_VOLUME`.

Harga literal Rp0 tanpa bukti intent bukan WARNING valid; state-nya belum `ZERO_CONFIRMED` dan record yang dipakai memblokir REVIEW.

---

# 7. Aturan self-contained dan subset data

## 7.1 Closure data yang wajib dibawa

Exporter membentuk subset sebagai berikut:

```text
RAB items
→ distinct hsp_id yang direferensikan
→ HSP_USED
   ├─ manual HSP: selesai di sini
   └─ official AHSP → seluruh component yang diperlukan
                      → distinct resource_id
                      → RESOURCE_SNAPSHOT
```

Dengan demikian:

- `HSP_USED` tidak membawa HSP yang tidak dipakai;
- `AHSP_COMPONENTS` tidak membawa komponen analisa yang tidak dipakai;
- `RESOURCE_SNAPSHOT` tidak membawa resource yang tidak dipakai;
- `BV` hanya membawa BV yang direferensikan item proyek;
- `REKAP` hanya membawa kelompok yang ada pada proyek.

## 7.2 Larangan external dependency

Workbook ditolak jika ditemukan:

- formula dengan token external workbook (`[` ... `]` pada referensi workbook);
- external defined name;
- workbook link collection non-empty;
- data connection/Power Query yang diperlukan untuk nilai final;
- formula harga/HSP yang merujuk master file di luar workbook;
- formula metadata yang merujuk file `NOTE`/template lain;
- linked object yang menjadi dependency perhitungan.

Hyperlink biasa untuk dokumentasi, jika kelak diperlukan, bukan dependency perhitungan; core Phase 1 tidak memerlukannya.

---

# 8. Aturan ekspansi baris dan stabilitas formula

## 8.1 Excel Tables adalah unit ekspansi

Semua dataset tabular dibuat sebagai Excel Table. Saat exporter menghasilkan 10, 100, atau 1.000 item:

- formula columns diisi sebagai calculated columns;
- `SUMIFS`/lookup menggunakan Table columns, bukan range statis;
- penambahan/pengurangan row tidak mengubah makna formula;
- urutan visual ditentukan `*_order`, bukan nomor row sebagai key.

## 8.2 Tidak boleh ada subtotal interleaved sebagai dependency

Golden Reference menggunakan pola seperti:

```excel
K36 = SUM(K13:K35)
```

Kontrak menggantinya dengan:

```excel
=SUMIFS(tbl_RAB[item_amount],tbl_RAB[group_id],[@group_id])
```

Sehingga jumlah item dalam kelompok boleh berubah tanpa mengedit range formula manual.

## 8.3 Stable ID, bukan row address

Contoh yang dilarang sebagai dependency bisnis:

```excel
=BV!O75
=[2]AHSP!D340
=SUM(K46:K50)
```

Contoh pola kontrak:

```excel
SUMIFS(..., bv_id, <stable bv_id>, is_result, TRUE)
INDEX(..., MATCH(hsp_id, ... ,0))
SUMIFS(item_amount, group_id, <stable group_id>)
```

## 8.4 Stabilitas formula BV ter-whitelist

Formula BV tidak boleh berbeda secara arbitrary per row. Variasi yang sah hanya berasal dari `formula_template_key` + `formula_template_version` yang terdaftar.

Stabilitas dicapai dengan:

- structured same-row references untuk operand;
- `bv_line_id`, `parent_bv_line_id`, `ref_bv_line_id`, dan `bv_id` untuk dependency lintas line;
- child-set aggregation berdasarkan stable ID, bukan contiguous row range;
- `formula_display` generated untuk audit, bukan expression source;
- calculated `volume_calc` locked;
- tidak menggunakan "baris sebelumnya", `INDIRECT` berbasis address, external link, atau fixed row number sebagai makna bisnis.

## 8.5 Batas perubahan langsung di workbook

Kontrak menjamin perubahan **input yang sah pada DRAFT** memperbarui nilai turunan otomatis. Perubahan struktur bisnis besar—misalnya menambah item/AHSP/kelompok baru yang tidak ada pada snapshot atau membutuhkan formula BV yang belum ada di whitelist—merupakan perubahan data proyek dan dilakukan melalui sistem lalu diekspor ulang.

Pada REVIEW dan FINAL tidak ada edit langsung. Hal ini menjaga workbook sebagai keluaran kerja/audit dari source of truth sistem, bukan source of truth terpisah.

---

# 9. Identitas proyek, versi/revisi, status, dan snapshot

Setiap sheet menampilkan header audit minimum melalui formula ke `PROJECT`:

```text
Project       : <project_name>
Project ID    : <project_id>
Version/Rev   : <document_version> / <revision_no>
Status        : DRAFT | REVIEW | FINAL
Snapshot ID   : <snapshot_id>
Generated At  : <generated_at>
```

Parameter penting yang juga terlihat pada `PROJECT`:

```text
OH/Profit Rate : xx%
PPN Rate       : xx%
Rounding       : HALF_UP to Rp1,000
AHSP Reference : <official_ahsp_reference>
Contract Ver.  : <excel_contract_version>
```

**Aturan snapshot:**

- `REVIEW` dan `FINAL` wajib mempunyai `snapshot_id`;
- semua sheet berasal dari snapshot yang sama;
- harga dasar, koefisien, OH/profit, PPN, volume, dan mapping yang dipakai dalam output harus konsisten dengan snapshot tersebut;
- perubahan master setelah snapshot tidak boleh mengubah workbook lama.

---

# 10. Presisi dan format angka

Aturan matematis berasal dari baseline; aturan format di bawah hanya presentation:

| Data | Nilai tersimpan | Format tampilan default yang disarankan |
|---|---|---|
| koefisien AHSP | full precision | hingga 6–8 desimal |
| dimensi/volume | full precision | hingga 6 desimal |
| harga dasar | full precision | `#,##0.00` |
| component cost | full precision | `#,##0.00` |
| HSP | full precision, **tanpa rounding** | `#,##0.00` |
| item amount | full precision | `#,##0.00` |
| PPN | full precision | `#,##0.00` |
| total before rounding | full precision | `#,##0.00` |
| total final | kelipatan Rp1.000 | `#,##0` |

Jika Jalur B membutuhkan lebih banyak digit untuk membuktikan expected result, tampilan audit dapat diperluas tanpa mengubah formula.

---

# 11. Kontrol rekonsiliasi antarsheet

Kontrol berikut wajib tersedia pada `CHECKS`.

## 11.1 Struktur dan referensi

| Check ID | Severity | Kondisi PASS |
|---|---|---|
| `C-PROJ-001` | ERROR | identitas wajib proyek lengkap |
| `C-SNAP-001` | ERROR | seluruh dataset memakai snapshot yang sama |
| `C-RAB-001` | ERROR | `item_id` unik |
| `C-RAB-002` | ERROR | setiap item memiliki `group_id` |
| `C-RAB-003` | ERROR | subgroup maksimal satu level dan konsisten |
| `C-BV-001` | ERROR | setiap item `BV` memiliki `bv_id` valid |
| `C-BV-002` | ERROR | tepat satu result row per `bv_id` |
| `C-BV-003` | ERROR | seluruh line terhitung memakai supported template key/version |
| `C-BV-004` | ERROR | tidak ada arbitrary formula text/fixed-row/external dependency |
| `C-HSP-001` | ERROR | semua `hsp_id` RAB ditemukan di `HSP_USED` |
| `C-AHSP-001` | ERROR | AHSP official membawa `source_edition + official_code + source_locator` |
| `C-RES-001` | ERROR | semua resource component ditemukan di `RESOURCE_SNAPSHOT` |
| `C-PRICE-001` | ERROR | tidak ada resource dipakai dengan `price_state=MISSING` |
| `C-EXT-001` | ERROR | external workbook link count = 0 |
| `C-FORM-001` | ERROR | formula error count = 0 |

## 11.2 Rekonsiliasi volume dan unit

Untuk setiap item:

```text
Jika source = BV:
RAB.volume == BV result untuk bv_id

Jika source = DIRECT:
RAB.volume == direct_volume
+ direct_basis/source/note/reviewer lengkap

unit_check:
SAFE_ALIAS(raw) → canonical
canonical volume unit == canonical HSP work unit
```

Kontrol:

- `C-VOL-001`: semua volume BV match result;
- `C-VOL-002`: semua direct volume memiliki audit fields;
- `C-UNIT-001`: canonical volume unit = canonical HSP unit;
- `C-UNIT-002`: component canonical unit = resource canonical unit = price unit;
- unresolved/REVIEW_REQUIRED unit → ERROR, tanpa implicit conversion.

Tambahan check final: `C-VOL-003` memastikan setiap item RAB aktif mempunyai `volume > 0` sebelum REVIEW/FINAL. Pada DRAFT, `volume = 0` boleh tersimpan tetapi check berstatus ERROR/incomplete.

## 11.3 Rekonsiliasi HSP

Untuk setiap HSP official:

```text
labor_subtotal     = Σ component_cost where component_group = TENAGA
material_subtotal  = Σ component_cost where component_group = BAHAN
equipment_subtotal = Σ component_cost where component_group = ALAT
direct_cost        = labor + material + equipment
oh_value           = direct_cost × P_OH_RATE
hsp_value          = direct_cost + oh_value
```

Kontrol:

- `C-HSP-002`: direct cost delta = 0;
- `C-HSP-003`: OH delta = 0;
- `C-HSP-004`: HSP delta = 0;
- `C-HSP-005`: manual HSP tidak menerima OH tambahan dan tidak memiliki fake component breakdown;
- `C-HSP-006`: tidak ada mathematical rounding di HSP;
- `C-HSP-007`: MANUAL memiliki `manual_description`, unit, `manual_hsp`, `manual_note`, dan WARNING;
- `C-PRICE-002`: `ZERO_CONFIRMED` selalu mempunyai `price_value=0` dan WARNING;
- `C-PRICE-003`: `SET` mempunyai nilai non-zero; `MISSING` memblokir bila dipakai;
- `C-PRICE-004`: `price_value=0` hanya valid jika `price_state=ZERO_CONFIRMED`; literal zero tanpa state tersebut → ERROR/unresolved.

Tambahan check final: `C-HSP-008` memastikan setiap HSP MANUAL/NON-AHSP mempunyai `manual_hsp > 0` sebelum REVIEW/FINAL. Pada DRAFT, `manual_hsp = 0` boleh tersimpan tetapi check berstatus ERROR/incomplete.

## 11.4 Rekonsiliasi RAB dan Rekap

```text
item_amount = volume × HSP
subtotal group = Σ item_amount by group_id
subtotal RAB = Σ group_subtotal
             = Σ seluruh item_amount
```

Kontrol:

- `C-RAB-004`: item amount delta = 0;
- `C-REKAP-001`: `SUM(group_subtotal) - SUM(item_amount) = 0`;
- `C-MAP-001`: mapping item count = RAB item count;
- `C-MAP-002`: mapping amount total = RAB amount total.

## 11.5 PPN dan pembulatan

```text
PPN = subtotal RAB × P_PPN_RATE
TotalBeforeRounding = subtotal RAB + PPN
TotalFinal = floor((TotalBeforeRounding + 500) / 1000) × 1000
RoundingDifference = TotalFinal - TotalBeforeRounding
```

Kontrol:

- `C-TAX-001`: PPN delta = 0;
- `C-ROUND-001`: total pre-round delta = 0;
- `C-ROUND-002`: total final sesuai half-up = PASS;
- `C-ROUND-003`: tidak ada rounding lain pada HSP/item/subtotal/PPN.

## 11.6 Subset closure

- `C-SUBSET-001`: setiap HSP di `HSP_USED` direferensikan minimal satu item RAB;
- `C-SUBSET-002`: setiap AHSP component termasuk HSP official yang direferensikan;
- `C-SUBSET-003`: setiap resource snapshot direferensikan minimal satu component;
- `C-SUBSET-004`: tidak ada master AHSP/resource penuh yang ikut tanpa kebutuhan proyek.

---

# 12. Formula/error scan yang wajib pada acceptance exporter

Walaupun Jalur C tidak menulis exporter, kontrak keluaran menetapkan pemeriksaan yang kelak harus dilakukan terhadap file `.xlsx` hasil ekspor:

1. scan semua formula untuk external workbook references;
2. scan workbook links / external defined names;
3. scan formula errors `#REF!`, `#DIV/0!`, `#VALUE!`, `#NAME?`, `#N/A`;
4. hitung ulang workbook dengan engine Excel-compatible;
5. validasi Table ranges dan calculated columns;
6. pastikan formula menggunakan reference lokal/table/named parameter;
7. pastikan tidak ada nilai rekap yang diinput manual;
8. pastikan HSP official tidak mengandung `ROUND`, `ROUNDDOWN`, atau `ROUNDUP` sebagai pembentukan HSP, kecuali formula teknis tersebut merupakan bagian BV dan didukung Golden Test;
9. pastikan pembulatan final hanya satu kali dan memakai aturan half-up;
10. cocokkan expected result dan toleransi Jalur B untuk GT-01 s.d. GT-11; tiga positive scenario tanpa source-backed fixture harus dicatat sebagai `NO VALID GOLDEN FIXTURE AVAILABLE` + `CONTRACT-DERIVED ACCEPTANCE TEST REQUIRED`.

---

# 13. Alignment canonical Jalur A → Jalur C

Semantic dependency Jalur A **RESOLVED**. Jalur C memakai canonical master-data contract berikut dan tidak membuat synonym legacy baru.

| Semantic lama Jalur C | Canonical Jalur A yang dipakai | Status |
|---|---|---|
| `component_id` | `ahsp_component_id` | RESOLVED |
| `component_order` | `source_order` | RESOLVED |
| `resource_type` pada component | `component_group` | RESOLVED |
| `ahsp_code` | `official_code` | RESOLVED |
| `description` AHSP official | `official_description` | RESOLVED |
| `unit` AHSP official | `work_unit_raw` + `work_unit_canonical` | RESOLVED |
| `resource_code` | `normative_code` | RESOLVED; nullable |
| `resource_unit` | `unit_raw_reference` + `unit_canonical` | RESOLVED |
| `base_price` | `price_value` | RESOLVED |
| `zero_intentional` | `price_state=ZERO_CONFIRMED` | RESOLVED; boolean terpisah dihapus |
| `price_status` | `price_state` | RESOLVED: `MISSING/SET/ZERO_CONFIRMED` |
| `source_reference` generic | `source_locator` dan/atau `normative_reference` sesuai makna | RESOLVED |

Canonical integration rules:

- IDs: `ahsp_id`, `ahsp_component_id`, `resource_id` opaque, immutable, generated; encoding aktual menunggu blueprint;
- official business identity AHSP: `(source_edition, official_code)`;
- source traceability mempertahankan raw + canonical unit dan locator source; normalized value tidak menggantikan jejak source;
- component class: `component_group ∈ {TENAGA, BAHAN, ALAT}`;
- resource native code: `normative_code` nullable;
- base price: `price_unit`, `price_value`, `price_state`;
- unit compatibility: equality setelah SAFE_ALIAS canonicalization; tidak ada best-guess conversion;
- duplicate/ambiguous/unresolved record tidak di-auto-resolve; bila record tersebut dipakai proyek, REVIEW/FINAL diblokir.

`hsp_id` tetap identity project snapshot Jalur C dan bukan pengganti `ahsp_id`; MANUAL mempunyai `ahsp_id=null`.

---

# 14. Acceptance coverage terhadap Jalur B

Jalur B sekarang menjadi oracle acceptance, bukan placeholder dependency. Contract Jalur C harus dapat merepresentasikan dan merekonsiliasi kasus berikut.

| Golden Test | Coverage kontrak Jalur C | Status Jalur B | Status alignment C |
|---|---|---|---|
| GT-01 | `GEOMETRY_PRODUCT` → BV → RAB volume | PASS | COVERED |
| GT-02 | geometry product + coefficient | PASS | COVERED |
| GT-03 | `WEIGHTED_COUNT` + controlled product/result | PASS | COVERED |
| GT-04 | `REBAR_ROUNDUP` + `SUM_CHILDREN` | PASS | COVERED |
| GT-05 | segment/scalar/ratio + `SEGMENT_SUM_FACTOR` | PASS | COVERED |
| GT-06 | `component_group` + `price_value` → AHSP/HSP + OH | PASS | COVERED |
| GT-07 | precise HSP, no intermediate rounding | EXPLAINED DIFFERENCE | COVERED; legacy ROUNDDOWN rejected |
| GT-08 | item → subgroup subtotal | EXPLAINED DIFFERENCE | COVERED |
| GT-09 | BV → HSP → item → subtotal → PPN → half-up | EXPLAINED DIFFERENCE | COVERED |
| GT-10 | item → group → project rekap → PPN/final | EXPLAINED DIFFERENCE | COVERED; legacy ROUNDUP rejected |
| GT-11 | `<500`, `=500`, `>500` half-up boundary | PASS | COVERED |
| GT-12 | direct volume tanpa traceability | **EXPECTED ERROR — REVIEW BLOCKED** | COVERED sebagai source-backed negative fixture |

Toleransi acceptance Jalur B dipertahankan sebagai **test tolerance, bukan business rounding**: integer/boundary exact; finite volume `1e-9`; repeating volume `1e-12`; HSP/item/subtotal/PPN `Rp0.000001`; total final exact.

### Positive scenario tanpa source-backed Golden fixture

| Scenario | Golden fixture status | Acceptance treatment | Expected contract behavior |
|---|---|---|---|
| Valid direct volume + basis/source/note/reviewer | `NO VALID GOLDEN FIXTURE AVAILABLE` | `CONTRACT-DERIVED ACCEPTANCE TEST REQUIRED` | WARNING `DIRECT_VOLUME`; REVIEW dapat lanjut setelah confirmation |
| Valid MANUAL/NON-AHSP HSP (`manual_hsp>0` + `manual_note`) | `NO VALID GOLDEN FIXTURE AVAILABLE` | `CONTRACT-DERIVED ACCEPTANCE TEST REQUIRED` | WARNING `MANUAL_HSP`; tanpa OH/profit tambahan |
| Resource `price_state=ZERO_CONFIRMED` | `NO VALID GOLDEN FIXTURE AVAILABLE` | `CONTRACT-DERIVED ACCEPTANCE TEST REQUIRED` | WARNING intentional-zero; REVIEW dapat lanjut setelah confirmation |

Tidak ada synthetic fixture yang boleh disebut Golden Reference. Ketiadaan tiga positive source-backed fixture ini **bukan blocker kontrak** karena Jalur B final secara eksplisit mengklasifikasikannya sebagai contract-derived implementation acceptance tests.

---

# 15. Final validation dan remaining non-blocker issues

## 15.1 Manager policy closure — final

Dua blocker business-contract terakhir telah ditutup:

1. **ZERO VOLUME.** Pada DRAFT, `volume = 0` boleh disimpan sebagai kondisi incomplete tetapi tetap berstatus **ERROR**. Untuk masuk REVIEW dan pada FINAL, setiap item RAB aktif wajib `volume > 0`. Tidak ada override zero-volume pada Phase 1. Item yang tidak digunakan tidak direpresentasikan sebagai item aktif bervolume nol.
2. **ZERO MANUAL HSP.** Pada DRAFT, `manual_hsp = 0` boleh disimpan sebagai kondisi incomplete tetapi tetap berstatus **ERROR**. Untuk masuk REVIEW dan pada FINAL, HSP MANUAL/NON-AHSP wajib `manual_hsp > 0`. Tidak ada override zero-manual-HSP pada Phase 1.

Kedua rule di atas **tidak** mengubah intentional-zero base price resource. `price_state=ZERO_CONFIRMED` tetap berarti Rp0 yang intent-nya eksplisit, menghasilkan WARNING dan dapat dilanjutkan setelah reviewer confirmation. Literal Rp0 tanpa intent eksplisit tetap unresolved/ERROR.

## 15.2 Final Validation Matrix

| Scenario | Validation state | REVIEW behavior | Contract rule |
|---|---|---|---|
| Valid DIRECT volume + `direct_basis/source/note/reviewer` lengkap | WARNING `DIRECT_VOLUME` | dapat lanjut setelah reviewer confirmation | D-011 traceable direct input |
| DIRECT volume tanpa traceability lengkap | ERROR | blocked | GT-12 negative fixture |
| MANUAL/NON-AHSP, `manual_hsp>0`, `manual_note` lengkap | WARNING `MANUAL_HSP` | dapat lanjut setelah reviewer confirmation | tidak ada AHSP breakdown palsu; tidak ada OH/profit tambahan |
| MANUAL/NON-AHSP dengan `manual_hsp=0` | ERROR/incomplete | blocked | DRAFT boleh simpan; REVIEW/FINAL wajib `>0` |
| Resource `price_state=ZERO_CONFIRMED`, `price_value=0` | WARNING | dapat lanjut setelah reviewer confirmation | intentional zero resource |
| Resource literal Rp0 tanpa intent / belum `ZERO_CONFIRMED` | ERROR/unresolved | blocked | tidak boleh auto-promote ke intentional zero |
| Item RAB aktif dengan `volume>0` | valid, subject to checks lain | dapat lanjut | minimum valid volume state |
| Item RAB aktif dengan `volume=0` | ERROR/incomplete | blocked | DRAFT boleh simpan; REVIEW/FINAL wajib `>0` |
| Any ERROR | ERROR | blocked | ERROR selalu blocking |
| Any WARNING yang valid | WARNING | dapat lanjut hanya setelah confirmation | WARNING non-blocking severity dengan reviewer confirmation |

## 15.3 Source-backed Golden fixture limitation — bukan blocker

Tiga positive warning scenario tidak memiliki source-backed Golden fixture yang cukup:

- valid direct volume;
- valid MANUAL/NON-AHSP HSP;
- valid `ZERO_CONFIRMED` resource.

Status finalnya adalah `NO VALID GOLDEN FIXTURE AVAILABLE` dan treatment-nya `CONTRACT-DERIVED ACCEPTANCE TEST REQUIRED`. Tidak boleh dibuat synthetic fixture lalu disebut Golden Reference. GT-12 tetap source-backed negative fixture untuk direct volume tanpa traceability → ERROR → REVIEW blocked.

## 15.4 NON-BLOCKER / diteruskan ke blueprint atau visual design

- target versi minimum Microsoft Excel; core contract sengaja hanya membutuhkan fungsi luas tersedia (`INDEX/MATCH`, `SUMIFS`, structured references);
- physical placement `HSP_MAPPING`; semantic audit capability sudah wajib dan jelas;
- encoding/display identitas reviewer (`user_id`, nama display, atau keduanya), selama traceability dipertahankan;
- display precision default; stored/calculated value tetap full precision dan Golden tolerance tetap test-only;
- presentasi visual subtotal subgroup di `RAB_DETAIL`;
- batas detail corporate branding/print layout.

Tidak ada item pada daftar ini yang menjadi blocker business-contract Jalur C.

## 15.5 OUT OF SCOPE

- arbitrary/custom formula engine;
- editor analisa custom lengkap;
- VBA/macro sebagai core dependency;
- database/API/exporter implementation;
- PDF/print layout final;
- zonasi/vendor/histori/log perubahan harga.

---

# 16. Checklist penerimaan Jalur C

Checklist ini memisahkan **contract closure** dari **implementation verification**. Item yang hanya dapat dibuktikan setelah workbook production dibuat tetap dibiarkan unchecked dan **tidak menjadi blocker** terhadap status `FINAL FOR IMPLEMENTATION` dokumen kontrak ini.

## A. Struktur workbook

- [x] Kontrak mensyaratkan `PROJECT`, Rekap, RAB detail, BV, HSP used, AHSP components, resource/base-price snapshot, dan CHECKS.
- [x] Mapping item → kelompok/subkelompok → HSP tersedia sebagai required audit capability; physical `HSP_MAPPING` boleh terpisah atau digabung tanpa ambiguity.
- [x] RAB detail dikontrak normalized satu row per item berharga/aktif.

## B. Canonical A → C

- [x] `ahsp_component_id`, `source_order`, `component_group`, `official_code`, `normative_code` diadopsi.
- [x] Raw dan canonical unit dipertahankan untuk audit.
- [x] Base price memakai `price_unit`, `price_value`, `price_state`.
- [x] `price_state ∈ {MISSING, SET, ZERO_CONFIRMED}`.
- [x] Source identity/trace memakai `source_edition`, `official_code`, `source_locator` sesuai layer.
- [x] Tidak ada automatic best-guess untuk ambiguous record/unit.

## C. BV formula contract

- [x] Free-form `CUSTOM` dihapus.
- [x] Formula memakai whitelisted `formula_template_key` + version.
- [x] `formula_display` hanya audit display, bukan executable input.
- [x] Stable refs memakai IDs, bukan fixed row.
- [x] `volume_calc` locked calculated field.
- [x] GT-03, GT-04, GT-05 dapat direpresentasikan oleh template set Phase 1.
- [ ] Workbook production kelak membuktikan seluruh template menghasilkan oracle Jalur B.

## D. HSP/manual/base price

- [x] `component_cost = coefficient × price_value` tanpa rounding.
- [x] HSP official = A+B+C+OH sekali, tanpa rounding.
- [x] MANUAL wajib `manual_hsp` + `manual_note`, WARNING, tanpa fake breakdown, tanpa OH tambahan.
- [x] Intentional zero resource hanya melalui `price_state=ZERO_CONFIRMED` dan WARNING.
- [x] `manual_hsp=0` diputuskan sebagai ERROR/incomplete pada DRAFT dan memblokir REVIEW; REVIEW/FINAL wajib `manual_hsp>0`.

## E. Volume/unit

- [x] BV terhubung ke volume RAB dengan stable ID.
- [x] Direct volume contract memerlukan basis/source/note/reviewer dan WARNING bila sah.
- [x] SAFE_ALIAS → canonical equality adalah compatibility rule.
- [x] Tidak ada implicit generic unit conversion.
- [x] `volume item=0` diputuskan sebagai ERROR/incomplete pada DRAFT dan memblokir REVIEW; REVIEW/FINAL wajib `volume>0` untuk item aktif.

## F. RAB → Rekap → PPN → rounding

- [x] `item_amount = volume × HSP` tanpa rounding.
- [x] subtotal subgroup/group menggunakan key/`SUMIFS`, bukan fixed range.
- [x] subtotal RAB = sum group = sum item.
- [x] PPN diterapkan satu kali di tingkat proyek.
- [x] final rounding hanya sekali, half-up Rp1.000.
- [x] GT-11 `<500/=500/>500` menjadi regression acceptance.

## G. Validation, status, dan audit

- [x] ERROR blocking; WARNING non-blocking severity + reviewer confirmation state.
- [x] DRAFT input sah editable; REVIEW snapshot+locked; FINAL immutable.
- [x] State core hanya `DRAFT → REVIEW → FINAL`; APPROVED legacy diabaikan.
- [x] Input/formula/warning/error dapat dibedakan tanpa bergantung warna saja.
- [x] Formula visible untuk audit dan formula cells locked.

## H. Self-contained dan stability

- [ ] External link count = 0 pada workbook production.
- [ ] External defined name/data connection dependency = 0.
- [ ] Hanya HSP/AHSP/resources yang digunakan dibawa.
- [ ] Seluruh sheet memakai snapshot yang sama.
- [ ] Penambahan/pengurangan jumlah row saat generasi tidak memerlukan edit formula manual.
- [ ] Tidak ada VBA/macro core dependency.

## I. Golden acceptance

- [x] Contract coverage GT-01 s.d. GT-11 dipetakan.
- [x] Legacy HSP `ROUNDDOWN` tidak diadopsi.
- [x] Legacy final `ROUNDUP` tidak diadopsi.
- [x] GT-12 dipertahankan sebagai source-backed negative fixture: direct volume tanpa traceability → ERROR → REVIEW blocked.
- [x] Valid direct volume diklasifikasikan `NO VALID GOLDEN FIXTURE AVAILABLE` + `CONTRACT-DERIVED ACCEPTANCE TEST REQUIRED`.
- [x] Valid manual HSP diklasifikasikan `NO VALID GOLDEN FIXTURE AVAILABLE` + `CONTRACT-DERIVED ACCEPTANCE TEST REQUIRED`.
- [x] `ZERO_CONFIRMED` resource diklasifikasikan `NO VALID GOLDEN FIXTURE AVAILABLE` + `CONTRACT-DERIVED ACCEPTANCE TEST REQUIRED`.

---

# 17. Kesimpulan kontrak dan final verdict

Patch rekonsiliasi A–B–C telah menutup blocker semantic utama Jalur C:

- master-data fields sudah mengikuti canonical Jalur A;
- source traceability raw/canonical dipertahankan;
- unit compatibility sudah konservatif dan tanpa implicit conversion;
- BV `CUSTOM` free-form telah diganti versioned whitelist template yang dapat mewakili GT-03/04/05;
- manual HSP mempunyai `manual_note` eksplisit dan tidak membuat fake AHSP;
- WARNING/ERROR mengikuti D-019;
- status/editability mengikuti D-018;
- `HSP_MAPPING` diposisikan sebagai required audit capability, bukan blocker physical sheet;
- target Excel version dipindahkan ke technical blueprint;
- coverage GT-01 s.d. GT-11 sudah terhubung ke contract acceptance.

Rantai final yang tetap menjadi inti:

```text
PROJECT parameters
        ↓
RESOURCE_SNAPSHOT (price_unit/value/state)
        ↓
AHSP_COMPONENTS (canonical A)
        ↓
HSP_USED
        ↓
RAB_DETAIL ← BV whitelisted templates
        ↓
subgroup/group
        ↓
REKAP
        ↓
PPN
        ↓
HALF-UP Rp1.000
        ↓
TOTAL FINAL

+ explicit HSP mapping capability + CHECKS
```

**Final verdict Jalur C setelah patch:**

```text
FINAL FOR IMPLEMENTATION
```

Dua blocker bisnis terakhir telah ditutup oleh keputusan Manager: item RAB aktif wajib `volume>0` pada REVIEW/FINAL dan HSP MANUAL/NON-AHSP wajib `manual_hsp>0` pada REVIEW/FINAL; nilai zero pada DRAFT boleh tersimpan hanya sebagai kondisi incomplete berstatus ERROR. `ZERO_CONFIRMED` resource tetap jalur berbeda: intentional Rp0 → WARNING + reviewer confirmation.

Tidak ada blocker business-contract Jalur C yang tersisa. Tiga positive scenario tanpa source-backed Golden fixture tetap harus diuji saat implementation acceptance sebagai `CONTRACT-DERIVED ACCEPTANCE TEST REQUIRED` dan tidak boleh diubah menjadi synthetic Golden Reference.

Dokumen ini tetap bukan blueprint, coding, exporter implementation, database/API design, atau PDF design.
