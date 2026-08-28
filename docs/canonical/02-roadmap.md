# 02 — Roadmap

## Phase 0 — AI Office Foundation

### Tujuan
Membuat shell yang nantinya menjadi antarmuka utama untuk seluruh tool.

### Deliverables

- halaman / workspace AI Office
- project selector / project context
- chat / command interface
- tool registry
- tool execution interface
- approval state
- basic project data model
- activity / execution history sederhana
- error handling dasar

### Belum Perlu

- multi-agent
- autonomous routing kompleks
- memory semantic kompleks
- orchestration antar banyak provider
- avatar / office visualization

---

## Phase 1 — RAB / Engineer's Estimate Engine

### Tujuan
Membuat RAB/EE yang hasilnya dapat dibandingkan langsung dengan proses manual.

### Deliverables

- master AHSP
- harga upah
- harga material
- harga alat
- kode analisa
- koefisien
- item pekerjaan proyek
- volume
- harga satuan
- subtotal
- OH / profit
- pajak
- rekap
- human review
- export Excel/PDF
- versioning draft/review/final

### Kriteria selesai

Untuk input yang sama:

> hasil sistem harus identik dengan RAB manual atau setiap perbedaannya dapat dijelaskan secara eksplisit.

---

## Phase 2 — RKS

### Tujuan
Menggunakan data item pekerjaan dari RAB/EE untuk membantu menghasilkan RKS.

### Deliverables

- mapping item pekerjaan → spesifikasi
- master clause / template RKS
- project-specific RKS
- dependency terhadap item RAB
- human review
- export document

---

## Phase 3 — Document Engine

### Tujuan
Menghasilkan dokumen proyek menggunakan data yang sudah tersedia.

### Kandidat output

- Dokumentasi
- Laporan Awal
- Laporan Akhir
- Laporan Mingguan
- Laporan Bulanan
- Laporan Pengawasan
- BAP
- Invoice
- surat pendukung

### Prinsip

Dokumen tidak dibuat dari prompt kosong.

```text
Template
+ Project Data
+ Tool Output
+ User Instruction
→ Draft
→ Human Review
→ Final
```

---

## Phase 4 — Project Control

### Tujuan
Memahami kondisi proyek berdasarkan output dan data yang sudah terhubung.

### Fitur

- status deliverable
- deadline
- readiness
- dependency warning
- version status
- missing output
- payment status
- project health summary

---

## Phase 5 — Mature AI Office

### Tujuan
AI menjadi interface pintar di atas seluruh sistem.

### Kemampuan

- cross-module reasoning
- project Q&A
- proactive recommendations
- automatic tool selection
- workflow suggestions
- exception detection
- specialist agents jika benar-benar dibutuhkan

### Multi-Agent

Hanya dibuat jika:

- ada kebutuhan parallel work,
- specialization memberi keuntungan nyata,
- coordination cost lebih kecil daripada manfaatnya.
