# 01 — Vision and Scope

## Vision

Membangun **Consultant AI Office** untuk perusahaan konsultan konstruksi yang mengintegrasikan:

- data proyek,
- RAB / Engineer's Estimate,
- RKS,
- dokumen proyek,
- project control,
- dan AI assistant.

AI Office bukan sumber kebenaran utama. Sistem harus mengikuti hierarki:

```text
AI / AUTOMATION
      ↑
   WORKFLOW
      ↑
    TOOLS
      ↑
     DATA
```

## Business Context

Perusahaan saat ini berfokus pada dua jenis pekerjaan pemerintahan:

### 1. Perencanaan
Produk utama:

- Gambar Rencana
- Engineer's Estimate / RAB
- RKS
- Dokumentasi
- Laporan Awal, jika disyaratkan
- Laporan Akhir, jika disyaratkan
- BAP
- Invoice
- Pencairan

### 2. Pengawasan
Produk utama:

- Laporan Mingguan
- Laporan Bulanan
- Laporan Pengawasan, jika disyaratkan
- BAP
- Invoice
- Pencairan

Perencanaan dan pengawasan diperlakukan sebagai **dua workflow berbeda**.

## User Awal

### Technical
Tanggung jawab awal:

- membuat Gambar Rencana,
- membuat / menyusun input teknis untuk EE/RAB,
- mengelola data teknis.

### Admin
Tanggung jawab awal:

- memeriksa hasil teknis,
- mengelola data administratif,
- memastikan kelengkapan output,
- menyiapkan proses BAP / invoice / pencairan.

Role dapat berkembang nanti, tetapi V1 tidak boleh didesain seolah perusahaan sudah memiliki struktur enterprise besar.

## Core Problem

Masalah utama bukan sekadar kurangnya dashboard atau document generator.

Masalah utamanya adalah:

- data proyek tersebar,
- data yang sama dapat diketik ulang di banyak tempat,
- output berdiri sendiri,
- hubungan antar-output belum dimodelkan,
- proses teknis dan administratif belum terintegrasi,
- AI berisiko menjadi gimmick jika tidak memiliki tool dan data yang benar.

## Product Goal

Membuat satu sistem yang:

1. menyimpan data proyek sebagai source of truth,
2. menyediakan tool yang menggunakan data tersebut,
3. menghasilkan output yang konsisten,
4. memahami dependency antar-output,
5. menggunakan AI untuk membantu mencari, memahami, menyusun, dan menjalankan tool,
6. tetap mempertahankan human review.

## Scope Awal

### In Scope

- AI Office shell
- project context
- tool calling architecture
- human approval
- RAB / EE Engine
- master AHSP
- database harga dasar
- item pekerjaan
- volume
- deterministic calculation
- review
- export
- persiapan integrasi ke RKS

### Out of Scope Awal

- AI membuat Gambar Rencana
- CAD generation otomatis
- pengambilan keputusan teknis final oleh AI
- project control kompleks
- multi-agent penuh seperti Munder Difflin
- finance/accounting system penuh
- GIS automation penuh
- autonomous sending tanpa approval

## Non-Goal

Project ini **bukan**:

- pengganti engineer,
- chatbot umum,
- Excel versi web tanpa keuntungan workflow,
- autonomous company manager,
- full enterprise agent platform pada tahap awal.
