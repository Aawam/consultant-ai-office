const boundaries = [
  "Application use case menjadi jalur bersama manusia dan AI.",
  "Perhitungan kritis berjalan deterministik tanpa LLM.",
  "Write, review, finalisasi, dan audit ditegakkan terpusat.",
];

export default function HomePage() {
  return (
    <main className="shell">
      <section className="intro" aria-labelledby="page-title">
        <p className="eyebrow">PHASE 0 + PHASE 1</p>
        <h1 id="page-title">Consultant AI Office</h1>
        <p className="lede">
          Fondasi local-first untuk data proyek, controlled tools, human review,
          dan RAB/EE deterministik.
        </p>
        <div className="status" role="status">
          <span className="status-mark" aria-hidden="true" />
          Foundation bootstrap aktif
        </div>
      </section>

      <section className="boundary" aria-labelledby="boundary-title">
        <h2 id="boundary-title">Boundary yang dikunci</h2>
        <ol>
          {boundaries.map((boundary) => (
            <li key={boundary}>{boundary}</li>
          ))}
        </ol>
      </section>

      <footer>
        Business UI belum dibangun pada kickoff ini. Source of truth tetap data
        dan snapshot sistem.
      </footer>
    </main>
  );
}
