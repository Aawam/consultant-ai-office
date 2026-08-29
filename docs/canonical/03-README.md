# Consultant AI Office — Canonical Document Index

**Status:** ACTIVE
**Last updated:** 2026-08-29

README ini adalah pintu masuk untuk menentukan dokumen mana yang berlaku. Jumlah dokumen bukan penentu authority; status dan urutan di bawah yang berlaku.

## 1. Aturan Source of Truth

1. Satu topik hanya memiliki satu dokumen kanonik aktif.
2. Revisi dilakukan pada file kanonik yang sama melalui version history.
3. File bernama `revised`, `final-v2`, `(1)`, atau working copy tidak menjadi authority kecuali README ini menyatakannya.
4. File di folder `archive/` hanya untuk jejak historis dan tidak boleh dipakai sebagai implementation input.
5. Jika dokumen saling bertentangan, gunakan precedence dan reading order di bawah. Jangan memilih asumsi sendiri.

## 2. Precedence

```text
Decision Log D-001 s.d. D-025
        ↓
Kontrak final Jalur A / B / C
        ↓
Baseline RAB/EE yang masih relevan
        ↓
Architecture Foundation ACCEPTED
        ↓
Technical Blueprint
        ↓
Implementation
```

D-023 dan D-024 mengalahkan baseline lama yang masih berhenti pada D-022. D-025 mencatat acceptance Architecture Foundation.

## 3. Dokumen Kanonik Aktif

| Dokumen | Kedudukan |
|---|---|
| `Project Context.md` | Konteks proyek dan stop condition lintas phase |
| `01-vision-and-scope.md` | Visi, scope, dan non-goals |
| `02-roadmap.md` | Urutan Phase 0–5 |
| `03-prd-phase-0-ai-office.md` | Requirement Phase 0 |
| `05-data-tool-output-model.md` | Referensi konseptual Data → Tool → Output → Dependency |
| `06-decision-log.md` | **Decision Log kanonik D-001 s.d. D-025** |
| `08-rab-ee-baseline-v1.md` | Baseline bisnis RAB/EE; tunduk pada Decision Log terbaru |
| `08-architecture-foundation-proposal.md` | **Architecture Foundation ACCEPTED** |
| `10-ahsp-normalization-spec.md` | **FINAL AS MASTER-DATA CONTRACT** |
| `11-golden-test-spec.md` | **FINAL AS GOLDEN TEST CONTRACT** |
| `12-excel-output-contract.md` | **FINAL FOR IMPLEMENTATION** |
| `13-manager-integration-closeout.md` | Bukti A–B–C Integration Gate CLOSED |

## 3a. UX Canonical Source

| Dokumen | Kedudukan |
|---|---|
| `../ux/UX-STRUCTURE-P0-P1.md` | **UX STRUCTURE READY FOR IMPLEMENTATION**; authority untuk information architecture, interaction model, dan state presentation |

UX tidak mengalahkan canonical business, architecture, lifecycle, authorization,
validation, persistence, calculation, atau export contract.

Nomor file adalah identifier historis, bukan tingkat authority. Karena itu dua dokumen bernomor `08` tetap dapat hidup berdampingan selama nama dan kedudukannya berbeda jelas.

## 4. Reference Data Aktif

- `Lampiran VI Surat Edaran Direktur Jenderal Bina Konstruksi Nomor 47-SE-Dk-2026 AHSP Bidang Cipta Karya.pdf`
- `Masterfile AHSP CK.xlsx`
- `Contoh Rekap RAB dan BV.xlsx`
- `EE Kantor Lurah Sambaliung 2024 (Tender) Alternatif 2 (version 1).xlsx`

Reference data bukan Decision Log dan tidak otomatis mengubah business rule. Artefak legacy, external link, atau inkonsistensi workbook harus direkonsiliasi melalui kontrak yang berlaku.

## 5. Reading Order Phase 0

1. `Project Context.md`
2. `01-vision-and-scope.md`
3. `02-roadmap.md`
4. `03-prd-phase-0-ai-office.md`
5. `06-decision-log.md`
6. `13-manager-integration-closeout.md`
7. `08-architecture-foundation-proposal.md`

Phase 0 tidak mengerjakan substansi RAB/EE kecuali interface minimum yang diperlukan Phase 1.

## 6. Reading Order Phase 1

1. `Project Context.md`
2. `01-vision-and-scope.md`
3. `02-roadmap.md`
4. `06-decision-log.md`
5. `08-rab-ee-baseline-v1.md`
6. `10-ahsp-normalization-spec.md`
7. `11-golden-test-spec.md`
8. `12-excel-output-contract.md`
9. `13-manager-integration-closeout.md`
10. `08-architecture-foundation-proposal.md`
11. reference data yang relevan

## 7. Dokumen yang Diarsipkan

Folder `archive/duplicates/` berisi salinan byte-identik atau upload ganda. Folder `archive/superseded/` berisi working document, addendum yang sudah digabung, prompt proses, dan spesifikasi lama yang telah digantikan.

Dokumen arsip tidak boleh digunakan sebagai authority. Jika isi historis diperlukan, selalu rekonsiliasi terhadap indeks ini dan dokumen kanonik terbaru.

Audit 2026-08-29 tidak menemukan dokumen superseded tambahan yang aman untuk
dipindahkan. Folder `docs/archive/superseded/` disediakan untuk perpindahan
berikutnya; file pengguna yang masih untracked tidak dipindahkan atau dihapus.

## 8. Current Gate

**NOT READY — UX IMPLEMENTATION BLOCKERS REMAIN.**

P0–P1 integration evidence tersedia dan berstatus siap untuk UX, tetapi
`docs/implementation/handoffs/UX-IMPLEMENTATION.md` secara eksplisit mencatat
bahwa workflow browser belum terbukti end-to-end untuk semua jalur persistence
dan masih memiliki blocker. Karena itu repository belum boleh menyatakan UX
implementation atau Phase 0/1 final/accepted.

Handoff, bukan index, menjadi sumber status eksekusi; index ini hanya merangkum
status tersebut agar tidak ada klaim readiness yang lebih tinggi dari bukti.

## 9. North Star

> Satu data proyek digunakan kembali secara konsisten oleh proses teknis dan administratif tanpa input berulang yang tidak perlu, dengan human review pada keputusan dan output penting.
