# Reference Data Manifest

**Generated:** 2026-08-29
**Authority:** reference/provenance only — never business-rule authority

The active reference set is listed by `docs/canonical/03-README.md`. SHA-256 identifies the exact local binary reviewed at kickoff.

| File | SHA-256 | Role/provenance |
|---|---|---|
| `Contoh Rekap RAB dan BV.xlsx` | `d6a3178d862e92d88ddb62e5b3b904cbf3038b183042c76d7da51095a752cb36` | Golden/reference evidence for BV, RAB, rekap, PPN, rounding, and output; contains legacy/external-link anomalies documented canonically. |
| `EE Kantor Lurah Sambaliung 2024 (Tender) Alternatif 2 (version 1).xlsx` | `41cf4028bf336c3f6959b78fd9490132786f09bae4bfb5ec74ee4e40c59179f4` | Supporting legacy workbook referenced by external links; not a standalone rule source. |
| `Lampiran VI Surat Edaran Direktur Jenderal Bina Konstruksi Nomor 47-SE-Dk-2026 AHSP Bidang Cipta Karya.pdf` | `64dfd7d14751dcd5032c9f2c35c4971fa121afcbbf49180abf7a4bf66c3e9202` | Active normative reference data named by the canonical index; interpretation remains governed by canonical contracts. |
| `Masterfile AHSP CK.xlsx` | `e51e49612dca67b5796392403be707b8e62d54505a1a6447c1c91f16fbd72f92` | Golden/reference evidence for prices, AHSP/HSP, and known legacy anomalies; not safe for direct import. |

Rules:

- Do not edit these binaries during implementation.
- A changed hash requires provenance review and an explicit manifest update.
- Do not create synthetic Golden Reference fixtures.
- Contract-derived fixtures must live under `fixtures/contract-derived/`, never `fixtures/golden-reference/`.
