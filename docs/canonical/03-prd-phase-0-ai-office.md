# 03 — PRD: Phase 0 AI Office Foundation

## 1. Product

**Consultant AI Office**

## 2. Objective

Membuat interface utama yang dapat:

- memahami project context,
- menerima instruksi user,
- memanggil tool,
- menampilkan hasil tool,
- meminta approval ketika diperlukan,
- menjadi fondasi untuk RAB/EE dan modul berikutnya.

## 3. Core Principle

AI Office adalah **orchestrator**, bukan calculator dan bukan source of truth.

```text
User
 ↓
AI Office
 ↓
Tool
 ↓
Database / Calculation Engine
 ↓
Result
 ↓
Human Review
```

## 4. Primary Users

### Technical
- memilih project
- memberi input teknis
- menggunakan RAB/EE Tool
- memeriksa hasil teknis

### Admin
- memeriksa kelengkapan
- review hasil
- mengelola data administratif
- mengesahkan tahapan yang menjadi kewenangannya

## 5. Core User Flows

### Flow A — Select Project

```text
Login
→ Select Project
→ AI Office memperoleh project context
```

### Flow B — Ask AI

```text
User instruction
→ AI memahami intent
→ memilih tool
→ tool menghasilkan preview/result
→ user review
→ confirm/save
```

### Flow C — Tool Execution

Contoh:

```text
"Tampilkan AHSP pasangan batu"

AI Office
→ searchAHSP()
→ hasil database
→ tampilkan ke user
```

### Flow D — Controlled Change

```text
"Tambahkan pasangan batu 125 m3 ke EE"

AI Office
→ cari AHSP
→ preview item
→ hitung dengan engine
→ tampilkan hasil
→ human approval
→ save draft
```

## 6. Functional Requirements

### Must Have

- project selection
- project context
- chat / command input
- tool registry
- tool call execution
- result rendering
- approval action
- cancellation action
- error message
- execution history
- user role awareness
- audit metadata minimum:
  - who
  - when
  - tool
  - action
  - result state

### Nice to Have

- command suggestions
- recent projects
- recent actions
- saved prompts
- quick actions

## 7. Tool Contract

Setiap tool harus memiliki minimal:

```text
name
description
input schema
permission
execution mode
output schema
requires approval?
```

Contoh:

```text
searchAHSP
- read only
- automatic

calculateRABItem
- deterministic
- automatic

addRABItem
- write
- requires approval
```

## 8. Human Approval Policy

### Automatic
- read
- search
- filter
- analyze
- preview
- deterministic calculation

### Requires Review / Confirmation
- modify project data
- add/update RAB item
- finalize document
- mark approved/final
- export official output

### Always Restricted
- delete master data
- modify approved final data without revision flow
- send official document automatically

## 9. Non-Functional Requirements

- tool result must be reproducible
- calculation must not depend on LLM arithmetic
- AI response must reference underlying data
- failed tool call must not silently modify data
- write operations must be explicit
- user must know whether result is draft/review/final

## 10. Phase 0 Success Criteria

Phase 0 dianggap selesai jika:

1. user bisa memilih project,
2. AI menerima project context,
3. AI dapat memanggil satu mock/tool nyata,
4. hasil tool dapat ditampilkan,
5. write action membutuhkan approval,
6. action tercatat,
7. arsitektur siap dipakai oleh RAB/EE Engine.
