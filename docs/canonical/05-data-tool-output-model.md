# 05 — Data → Tool → Output → Dependency Model

## Model Dasar

Setiap capability harus dianalisis menggunakan empat lapisan:

```text
DATA
 ↓
TOOL / PROCESS
 ↓
OUTPUT
 ↓
DEPENDENCY
```

## Contoh: Gambar Rencana

### Data
- survey
- koordinat
- dimensi
- parameter desain

### Tool
- AutoCAD
- Civil 3D
- QGIS
- manual engineering process

### Output
- DWG
- PDF drawing set

### Policy Awal
Gambar tetap dibuat manusia.

AI drawing / CAD generation bukan scope awal.

---

## Contoh: RAB / EE

### Data
- item pekerjaan
- volume
- AHSP
- koefisien
- harga dasar
- OH/profit
- pajak

### Tool
- RAB/EE Engine
- Calculation Engine
- AHSP Search

### Output
- detail analisa
- engineer's estimate
- rekap
- Excel/PDF

### Dependency
Dapat menjadi sumber data untuk:

- RKS
- laporan
- project control

---

## Contoh: RKS

### Data
- item pekerjaan
- jenis pekerjaan
- master specification
- project metadata

### Tool
- RKS Generator
- template engine
- AI-assisted drafting

### Output
- RKS draft
- RKS final

### Dependency
Bergantung pada:

- project data
- item pekerjaan dari RAB/EE

---

## Source of Truth Principles

### Project Metadata
Source: Project Database

### Contract Information
Source: Contract Record

### AHSP
Source: Master AHSP Database

### Base Prices
Source: Price Database

### RAB Item
Source: Project RAB Data

### Generated Documents
Output/representation, bukan sumber utama data.

## Key Rule

Jangan simpan fakta yang sama sebagai source of truth di banyak tempat.

Contoh buruk:

```text
Volume = 125 m3 di Excel
Volume = 125 m3 di Word
Volume = 125 m3 di database
```

Contoh yang diinginkan:

```text
Project RAB Data
Volume = 125 m3
     │
     ├─ EE
     ├─ RKS
     └─ Report
```

## Dependency Example

```text
Project Item
   ↓
RAB / EE
   ↓
RKS
   ↓
Report
```

Jika satu data berubah, sistem setidaknya harus dapat menandai output yang mungkin terdampak.
