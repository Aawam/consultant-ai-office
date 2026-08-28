# PROJECT_CONTEXT — Consultant AI Office Phase 0–1

## Current Objective

Project ini hanya mengerjakan:

1. **Phase 0 — AI Office Foundation**
2. **Phase 1 — RAB / Engineer's Estimate Engine**

Phase 2–5 belum dikerjakan sampai Phase 1 tervalidasi.

---

## Product Direction

Consultant AI Office adalah sistem kerja konsultan konstruksi yang mengintegrasikan data, tool, output, dan workflow.

Prinsip utama:

> **Data adalah fondasi. Tool melakukan proses. AI memahami dan mengarahkan. Human melakukan review.**

AI bukan source of truth dan tidak melakukan perhitungan angka kritis secara bebas.

---

## Phase 0 — AI Office Foundation

Tujuan Phase 0 adalah membuat shell minimal yang menyediakan:

- project context,
- chat / command interface,
- tool calling,
- result preview,
- human approval,
- execution history,
- basic data model.

AI Office belum menjadi multi-agent system penuh.

---

## Phase 1 — RAB / EE Engine

Kemampuan nyata pertama AI Office adalah RAB / Engineer's Estimate.

Core flow:

```text
USER
 ↓
AI OFFICE
 ↓
RAB / EE TOOL
 ↓
AHSP + HARGA DASAR + VOLUME
 ↓
CALCULATION ENGINE
 ↓
PREVIEW
 ↓
HUMAN REVIEW
 ↓
PROJECT DATA
 ↓
OUTPUT RAB / EE
```

### AI boleh:
- mencari AHSP,
- merekomendasikan kandidat analisa,
- menjelaskan hasil,
- mendeteksi data yang hilang,
- membantu user mengoperasikan tool.

### AI tidak boleh:
- membuat harga sendiri,
- mengubah volume berdasarkan asumsi,
- mengubah koefisien tanpa review,
- menghitung grand total sebagai LLM,
- menetapkan output final tanpa human approval.

---

## Human Review

Semua output penting mengikuti:

```text
DRAFT
→ REVIEW
→ APPROVED
→ FINAL
```

---

## Gambar Rencana

Gambar Rencana tetap dibuat manual oleh manusia menggunakan tool seperti AutoCAD/QGIS/Civil 3D.

AI drawing dan CAD generation **out of scope** untuk Phase 0–1.

---

## Golden Reference

Golden reference awal bukan kumpulan file markdown.

Golden reference untuk Phase 1 adalah:

> **1 file RAB/EE manual nyata yang paling benar dan representatif.**

Jika AHSP dan daftar harga terpisah dari workbook, file tersebut ikut dijadikan reference pendukung.

Target validasi:

> Untuk input yang sama, hasil RAB/EE Engine harus sama dengan hasil manual atau setiap perbedaannya harus dapat dijelaskan secara eksplisit.

---

## Stop Condition

Jangan lanjut ke:

- RKS,
- Document Engine,
- Project Control,
- multi-agent,
- AI Office matang,

sebelum RAB/EE Engine lolos validasi Golden Reference.

---

## Reference Reading Order

1. `PROJECT_CONTEXT.md`
2. `01-vision-and-scope.md`
3. `03-prd-phase-0-ai-office.md`
4. `04-rab-ee-v1-spec.md`
5. `05-data-tool-output-model.md`
6. `06-decision-log.md`
7. `07-next-discussion.md`

---

## Next Discussion

Langkah selanjutnya adalah membedah RAB/EE manual yang sekarang digunakan:

- struktur workbook,
- AHSP,
- harga dasar,
- formula,
- OH/profit,
- pajak,
- pembulatan,
- review,
- output,
- dan integrasi data.

Jangan merancang fitur baru sebelum workflow manual tersebut dipahami.
