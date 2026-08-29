import { ApplicationError, previewProjectCreation } from "@consultant-ai-office/application";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function projectPreview(name: string, code: string) {
  if (!name && !code) return null;
  try {
    return {
      ok: true as const,
      data: previewProjectCreation(
        {
          requestId: "browser-project-preview",
          projectId: null,
          actor: {
            actorId: "local-technical-operator",
            actorType: "HUMAN",
            actorRole: "TECHNICAL",
          },
        },
        { name, code },
      ),
    };
  } catch (error) {
    return {
      ok: false as const,
      message:
        error instanceof ApplicationError
          ? error.message
          : "Preview project tidak dapat dibuat.",
    };
  }
}

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const name = first(params.name);
  const code = first(params.code);
  const preview = projectPreview(name, code);

  return (
    <main className="workspace">
      <aside className="rail" aria-label="Project workspace controls">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">CA</span>
          <div>
            <strong>Consultant AI Office</strong>
            <span>Phase 0 Foundation</span>
          </div>
        </div>

        <section className="rail-section" aria-labelledby="actor-title">
          <p className="section-label" id="actor-title">Actor aktif</p>
          <div className="actor-row">
            <span className="avatar" aria-hidden="true">T</span>
            <div>
              <strong>Operator Lokal</strong>
              <span>TECHNICAL</span>
            </div>
          </div>
        </section>

        <section className="rail-section" aria-labelledby="project-title">
          <label className="section-label" id="project-title" htmlFor="project-selector">
            Project Context
          </label>
          <select id="project-selector" disabled aria-describedby="project-help">
            <option>Belum ada project aktif</option>
          </select>
          <p className="field-help" id="project-help">
            Selector memakai membership-scoped use case saat runtime terpasang.
          </p>
        </section>

        <form className="project-form" method="get" aria-labelledby="create-title">
          <p className="section-label" id="create-title">Preview project baru</p>
          <label htmlFor="project-code">Kode project</label>
          <input
            id="project-code"
            name="code"
            defaultValue={code}
            placeholder="Contoh: BRU-01"
            maxLength={20}
            required
          />
          <label htmlFor="project-name">Nama project</label>
          <input
            id="project-name"
            name="name"
            defaultValue={name}
            placeholder="Contoh: Kantor Camat"
            maxLength={120}
            required
          />
          <button type="submit">Validasi &amp; preview</button>
        </form>

        <div className="provider-state">
          <span className="status-dot" aria-hidden="true" />
          <div>
            <strong>AI provider nonaktif</strong>
            <span>Core deterministic tetap tersedia</span>
          </div>
        </div>
      </aside>

      <section className="content">
        <header className="content-header">
          <div>
            <p className="eyebrow">LOCAL-FIRST · BROWSER SHELL</p>
            <h1>Project workspace</h1>
            <p className="lede">
              Satu jalur use case untuk operasi manusia dan controlled AI tools.
            </p>
          </div>
          <div className="foundation-badge">FOUNDATION ACTIVE</div>
        </header>

        <section className="context-strip" aria-labelledby="active-context-title">
          <div>
            <span className="context-index">01</span>
            <div>
              <p id="active-context-title">Active Project Context</p>
              <strong>Belum dipilih</strong>
            </div>
          </div>
          <dl>
            <div><dt>Role</dt><dd>TECHNICAL</dd></div>
            <div><dt>Write mode</dt><dd>Human direct</dd></div>
            <div><dt>Audit</dt><dd>Transactional</dd></div>
          </dl>
        </section>

        <div className="main-grid">
          <section className="panel command-panel" aria-labelledby="command-title">
            <div className="panel-heading">
              <div>
                <p className="section-label">Controlled interface</p>
                <h2 id="command-title">Command desk</h2>
              </div>
              <span className="mode-chip">REQUEST / RESPONSE</span>
            </div>
            <label className="sr-only" htmlFor="command-input">Instruksi AI</label>
            <textarea
              id="command-input"
              placeholder="Aktifkan AI provider untuk memberi instruksi melalui controlled tools…"
              disabled
            />
            <div className="command-footer">
              <span>AI tidak memiliki akses DB, SQL, filesystem, atau terminal.</span>
              <button type="button" disabled>Jalankan</button>
            </div>
          </section>

          <section className="panel preview-panel" aria-labelledby="preview-title">
            <div className="panel-heading">
              <div>
                <p className="section-label">Mutation-safe</p>
                <h2 id="preview-title">Project preview</h2>
              </div>
              <span className="mode-chip neutral">NO WRITE</span>
            </div>
            {preview === null ? (
              <div className="empty-state" role="status">
                <span aria-hidden="true">＋</span>
                <p>Isi form di sebelah kiri untuk menjalankan validasi domain tanpa mutation.</p>
              </div>
            ) : preview.ok ? (
              <div className="preview-result" role="status">
                <span className="result-label">VALID PREVIEW</span>
                <h3>{preview.data.project.name}</h3>
                <dl>
                  <div><dt>Kode</dt><dd>{preview.data.project.code}</dd></div>
                  <div><dt>State</dt><dd>{preview.data.state}</dd></div>
                </dl>
                <code>{preview.data.previewFingerprint}</code>
                <p>Preview tidak membuat project, context, execution, atau audit row.</p>
              </div>
            ) : (
              <div className="error-state" role="alert">
                <strong>VALIDATION ERROR</strong>
                <p>{preview.message}</p>
              </div>
            )}
          </section>
        </div>

        <section className="panel flow-panel" aria-labelledby="flow-title">
          <div className="panel-heading">
            <div>
              <p className="section-label">Write semantics</p>
              <h2 id="flow-title">AI-initiated DRAFT write</h2>
            </div>
          </div>
          <ol className="flow-list">
            <li><span>01</span><div><strong>Preview</strong><p>Validation only; zero mutation.</p></div></li>
            <li><span>02</span><div><strong>Human confirmation</strong><p>Fingerprint harus cocok dengan preview.</p></div></li>
            <li><span>03</span><div><strong>Authorized write</strong><p>Mutation, context, execution, dan audit dalam satu transaksi.</p></div></li>
          </ol>
        </section>

        <section className="panel history-panel" aria-labelledby="history-title">
          <div className="panel-heading">
            <div>
              <p className="section-label">Traceability</p>
              <h2 id="history-title">Execution history</h2>
            </div>
            <span className="count-chip">0 EVENTS</span>
          </div>
          <div className="history-empty">
            <span aria-hidden="true">—</span>
            <p>Belum ada execution pada Project Context aktif.</p>
          </div>
        </section>
      </section>
    </main>
  );
}
