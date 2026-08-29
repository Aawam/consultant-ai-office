"use client";

import { useEffect, useState } from "react";

export type ProjectPreview =
  | null
  | { readonly ok: true; readonly data: { readonly project: { readonly name: string; readonly code: string }; readonly state: string; readonly previewFingerprint: string } }
  | { readonly ok: false; readonly message: string };

type Workspace = "overview" | "rab" | "review" | "activity";
type Role = "TECHNICAL" | "ADMIN";
type Status = "DRAFT" | "REVIEW" | "FINAL";

const workspaces: readonly [Workspace, string, string][] = [
  ["overview", "Overview", "Project context & AI"],
  ["rab", "RAB / EE", "Estimate workspace"],
  ["review", "Review / Export", "Validation & approval"],
  ["activity", "Activity", "Audit & execution history"],
];

export function OfficeWorkspace({ preview, code, name }: { preview: ProjectPreview; code: string; name: string }) {
  const [workspace, setWorkspace] = useState<Workspace>("overview");
  const [role, setRole] = useState<Role>("TECHNICAL");
  const [status, setStatus] = useState<Status>("DRAFT");
  const [notice, setNotice] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [rabVersionId, setRabVersionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const activeWorkspace = workspaces.find(([key]) => key === workspace)?.[1] ?? "Overview";
  const notify = (message: string) => setNotice(message);
  const reload = async (ids: { projectId?: string | null; rabVersionId?: string | null } = {}) => {
    const nextProjectId = ids.projectId ?? projectId ?? new URLSearchParams(window.location.search).get("projectId");
    const nextRabVersionId = ids.rabVersionId ?? rabVersionId ?? new URLSearchParams(window.location.search).get("rabVersionId");
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (nextProjectId) query.set("projectId", nextProjectId);
      if (nextRabVersionId) query.set("rabVersionId", nextRabVersionId);
      const response = await fetch(`/api/workflow?${query.toString()}`, { headers: { "x-office-role": role } });
      const result = await response.json() as { ok: boolean; data?: { activeProject?: { projectId: string } | null; rab?: { rabVersionId: string; status: Status } | null }; error?: { message: string } };
      if (!response.ok || !result.ok) throw new Error(result.error?.message ?? "Workflow reload failed");
      const activeId = result.data?.activeProject?.projectId ?? nextProjectId ?? null;
      const loadedRab = result.data?.rab ?? null;
      setProjectId(activeId);
      setRabVersionId(loadedRab?.rabVersionId ?? nextRabVersionId ?? null);
      if (loadedRab) setStatus(loadedRab.status);
      const url = new URL(window.location.href);
      if (activeId) url.searchParams.set("projectId", activeId);
      if (loadedRab?.rabVersionId) url.searchParams.set("rabVersionId", loadedRab.rabVersionId);
      window.history.replaceState({}, "", url);
    } catch (error) { notify(error instanceof Error ? error.message : "Workflow reload failed"); }
    finally { setLoading(false); }
  };
  const mutate = async (action: string, extra: Record<string, string> = {}) => {
    setLoading(true);
    try {
      const response = await fetch("/api/workflow", { method: "POST", headers: { "content-type": "application/json", "x-office-role": role }, body: JSON.stringify({ action, projectId, rabVersionId, ...extra }) });
      const result = await response.json() as { ok: boolean; data?: { project?: { projectId: string }; activeContext?: { projectId: string }; rabVersionId?: string }; error?: { message: string } };
      if (!response.ok || !result.ok) throw new Error(result.error?.message ?? "Workflow mutation failed");
      const newProjectId = result.data?.project?.projectId ?? result.data?.activeContext?.projectId ?? projectId;
      const newRabVersionId = result.data?.rabVersionId ?? rabVersionId;
      await reload({ projectId: newProjectId, rabVersionId: newRabVersionId });
      setNotice("Mutation persisted. State loaded again from Application/Repository path.");
    } catch (error) { notify(error instanceof Error ? error.message : "Workflow mutation failed"); setLoading(false); }
  };
  useEffect(() => { const timer = window.setTimeout(() => { void reload(); }, 0); return () => window.clearTimeout(timer); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  return <main className="app-shell">
    <aside className="sidebar" aria-label="Global navigation">
      <div className="brand"><span className="brand-mark" aria-hidden="true">CA</span><div><strong>Consultant AI Office</strong><span>PHASE 0–1 · LOCAL-FIRST</span></div></div>
      <section className="sidebar-block" aria-labelledby="context-label"><p className="section-label" id="context-label">Application context</p><div className="actor-row"><span className="avatar" aria-hidden="true">{role[0]}</span><div><strong>Operator Lokal</strong><span>{role}</span></div></div><label className="field-label" htmlFor="role">Presentation role</label><select id="role" value={role} onChange={(event) => setRole(event.target.value as Role)}><option>TECHNICAL</option><option>ADMIN</option></select></section>
      <section className="sidebar-block"><label className="section-label" htmlFor="project-selector">Active project</label><select id="project-selector" disabled aria-describedby="project-help"><option>Belum ada project aktif</option></select><p className="field-help" id="project-help">Selection menunggu runtime composition Application + Infrastructure.</p></section>
      <nav className="primary-nav" aria-label="Project navigation"><p className="section-label">Project workspace</p>{workspaces.map(([key, label, description]) => <button type="button" className={workspace === key ? "nav-item active" : "nav-item"} key={key} onClick={() => setWorkspace(key)}><span>{label}</span><small>{description}</small></button>)}</nav>
      <div className="provider-state"><span className="status-dot" aria-hidden="true" /><div><strong>AI provider nonaktif</strong><span>RAB deterministic tetap tersedia</span></div></div>
    </aside>
    <section className="content">
      <header className="topbar"><div><p className="eyebrow">CONSULTANT AI OFFICE</p><p className="breadcrumb">Project workspace / {activeWorkspace}</p></div><div className="topbar-meta"><span className="role-badge">{role}</span><span className="state-badge">{status}</span></div></header>
      <section className="context-strip" aria-labelledby="active-context-title"><div className="context-main"><span className="context-index">01</span><div><p id="active-context-title">Active Project Context</p><strong>{preview && preview.ok ? preview.data.project.name : "Belum dipilih"}</strong><span>{preview && preview.ok ? preview.data.project.code : "Project · RAB version · price context belum tersedia"}</span></div></div><dl><div><dt>RAB version</dt><dd>—</dd></div><div><dt>Lifecycle</dt><dd>{status}</dd></div><div><dt>AI</dt><dd>DISABLED</dd></div></dl></section>
      {notice && <div className="notice" role="status"><strong>Interaction boundary</strong><span>{notice}</span><button type="button" aria-label="Tutup notifikasi" onClick={() => setNotice("")}>×</button></div>}
      {loading && <div className="notice" role="status">Loading persisted state…</div>}
      {workspace === "overview" && <Overview preview={preview} code={code} name={name} onAction={notify} onMutate={mutate} />}
      {workspace === "rab" && <RabWorkspace status={status} onStatus={setStatus} onAction={notify} />}
      {workspace === "review" && <ReviewWorkspace role={role} status={status} onAction={notify} />}
      {workspace === "activity" && <ActivityWorkspace />}
      <LiveWorkflowControls projectId={projectId} rabVersionId={rabVersionId} role={role} status={status} loading={loading} onMutate={mutate} />
    </section>
  </main>;
}

function LiveWorkflowControls({ projectId, rabVersionId, role, status, loading, onMutate }: { projectId: string | null; rabVersionId: string | null; role: Role; status: Status; loading: boolean; onMutate: (action: string, extra?: Record<string, string>) => Promise<void> }) {
  if (!projectId) return null;
  return <section className="panel live-controls" aria-labelledby="live-workflow-title"><PanelHeading eyebrow="LIVE APPLICATION WORKFLOW" title="Persisted browser actions" chip={loading ? "LOADING" : "READY"} /><p className="muted">Project ID: <code>{projectId}</code>{rabVersionId ? <> · RAB ID: <code>{rabVersionId}</code></> : null}</p><div className="action-row"><button type="button" disabled={loading || Boolean(rabVersionId)} onClick={() => void onMutate("create_draft", { title: "Browser RAB DRAFT" })}>Create RAB DRAFT</button><button type="button" className="secondary-button" disabled={loading || !rabVersionId || status !== "DRAFT"} onClick={() => void onMutate("submit_review")}>Submit REVIEW</button><button type="button" className="secondary-button" disabled={loading || role !== "ADMIN" || !rabVersionId || status !== "REVIEW"} onClick={() => void onMutate("finalize")}>ADMIN Finalize</button><button type="button" className="secondary-button" disabled={loading || !rabVersionId || status !== "FINAL"} onClick={() => void onMutate("create_revision")}>Create Revision</button></div><p className="field-help">Every action POSTs to server delivery, then reloads state with GET. Disabled controls are presentation only; Application authorization remains authoritative.</p></section>;
}

function Overview({ preview, code, name, onAction, onMutate }: { preview: ProjectPreview; code: string; name: string; onAction: (message: string) => void; onMutate: (action: string, extra?: Record<string, string>) => Promise<void> }) {
  return <><PageHeading eyebrow="DELIVERY / PRESENTATION LAYER" title="AI Office workspace" detail="Structured workspaces remain primary; AI is contextual and optional." /><div className="overview-grid"><section className="panel" aria-labelledby="ai-title"><PanelHeading eyebrow="AI ASSISTANT · AI SUGGESTION" title="Contextual assistant" chip="NOT SAVED" /><label htmlFor="ai-prompt">Ask for search, explanation, or missing-data detection</label><textarea id="ai-prompt" disabled placeholder="AI provider nonaktif — jalur structured workspace tetap tersedia." /><div className="panel-footer"><span>AI tidak menghitung, memfinalkan, atau menulis diam-diam.</span><button type="button" disabled>Ask AI</button></div></section><ProjectPanel preview={preview} code={code} name={name} onAction={onAction} onMutate={onMutate} /></div><section className="panel" aria-labelledby="boundary-title"><PanelHeading eyebrow="INTERACTION MODE CONTRACT" title="One controlled path" chip="APPLICATION LAYER" /><ol className="flow-list"><li><span>01</span><div><strong>Read / Preview</strong><p>UI menampilkan saved data atau deterministic result dari Application Layer.</p></div></li><li><span>02</span><div><strong>Confirm</strong><p>Warning dan consequential action meminta konfirmasi actor yang sesuai.</p></div></li><li><span>03</span><div><strong>Write / Audit</strong><p>Authorization, transaction, lifecycle, dan audit tidak diputuskan di UI.</p></div></li></ol></section></>;
}

function ProjectPanel({ preview, code, name, onAction, onMutate }: { preview: ProjectPreview; code: string; name: string; onAction: (message: string) => void; onMutate: (action: string, extra?: Record<string, string>) => Promise<void> }) {
  return <section className="panel" aria-labelledby="project-selection-title"><PanelHeading eyebrow="SAVED PROJECT DATA" title="Project selection" chip="PREVIEW" /><form className="project-form" method="get"><label htmlFor="project-code">Kode project</label><input id="project-code" name="code" defaultValue={code} placeholder="Contoh: BRU-01" maxLength={20} required /><label htmlFor="project-name">Nama project</label><input id="project-name" name="name" defaultValue={name} placeholder="Contoh: Kantor Camat" maxLength={120} required /><button type="submit">Validasi &amp; preview</button></form>{preview === null && <EmptyState title="Belum ada preview" detail="Isi kode dan nama untuk validasi domain tanpa mutation." />}{preview && preview.ok && <div className="success-state" role="status"><span className="severity-tag success">SUCCESS</span><h3>{preview.data.project.name}</h3><dl className="data-list"><div><dt>Kode</dt><dd>{preview.data.project.code}</dd></div><div><dt>State</dt><dd>{preview.data.state}</dd></div><div><dt>Fingerprint</dt><dd><code>{preview.data.previewFingerprint}</code></dd></div></dl><p>Preview tidak membuat project, context, execution, atau audit row.</p><div className="action-row"><button type="button" onClick={() => void onMutate("create_project", { code: preview.data.project.code, name: preview.data.project.name })}>Create saved project</button><button type="button" className="secondary-button" onClick={() => onAction("Active project hanya berganti melalui SelectActiveProjectUseCase.")}>Select active project</button></div></div>}{preview && !preview.ok && <div className="error-state" role="alert"><span className="severity-tag error">ERROR</span><h3>Preview ditolak</h3><p>{preview.message}</p></div>}</section>;
}

function RabWorkspace({ status, onStatus, onAction }: { status: Status; onStatus: (status: Status) => void; onAction: (message: string) => void }) {
  const locked = status !== "DRAFT";
  return <><PageHeading eyebrow="RAB / EE" title="Estimate workspace" detail="GROUP → optional SUBGROUP → ITEM. No arbitrary nested subgroup tree." /><div className="workspace-tabs" role="tablist" aria-label="RAB workspace sections"><span className="tab active">Estimate</span><span className="tab">Backup Volume</span><span className="tab">Price Context</span><span className="tab">Validation</span><span className="tab">Review &amp; Export</span><span className="tab">Revisions</span></div><section className="panel"><div className="workspace-toolbar"><div><PanelHeading eyebrow="RAB HIERARCHY" title={locked ? "Locked snapshot" : "Draft estimate"} chip={status} /><p className="muted">{locked ? "REVIEW/FINAL immutable; correction memakai RETURN TO DRAFT." : "Saved project data belum tersedia."}</p></div><div className="action-row"><button type="button" disabled={locked} onClick={() => onAction("CreateRabDraftUseCase memerlukan active project dan adapter runtime.")}>+ Group</button><button type="button" className="secondary-button" disabled={locked} onClick={() => onAction("Add item akan memakai Application Use Case setelah RAB DRAFT tersedia.")}>+ Item</button></div></div><div className="hierarchy-grid"><div className="empty-workspace"><span aria-hidden="true">＋</span><h3>{locked ? "RAB snapshot locked" : "Belum ada Group"}</h3><p>{locked ? "Source, calculation, dan validation evidence ditampilkan di REVIEW." : "Official AHSP, Backup Volume, Direct Volume, dan MANUAL/NON-AHSP tersedia sebagai structured paths."}</p></div><div className="source-card"><span className="severity-tag info">INFO</span><h3>Item source paths</h3><div className="source-option active"><strong>OFFICIAL AHSP</strong><span>AHSP search · HSP detail · base-price context</span></div><div className="source-option"><strong>BACKUP VOLUME</strong><span>Measurement rows → deterministic BV total</span></div><div className="source-option warning"><strong>DIRECT VOLUME</strong><span>Exception · volume, unit, basis, provenance, notes</span></div><div className="source-option warning"><strong>MANUAL / NON-AHSP</strong><span>manual_hsp + provenance · no fake breakdown</span></div></div></div><div className="result-strip"><div><span className="eyebrow">DETERMINISTIC RESULT</span><strong>Calculation snapshot unavailable</strong><span>UI tidak menghitung HSP, subtotal, PPN, atau final rounding.</span></div><button type="button" className="secondary-button" onClick={() => onStatus(status === "DRAFT" ? "REVIEW" : status === "REVIEW" ? "FINAL" : "DRAFT")}>Preview {status === "FINAL" ? "DRAFT" : status === "DRAFT" ? "REVIEW" : "FINAL"} presentation</button></div></section></>;
}

function ReviewWorkspace({ role, status, onAction }: { role: Role; status: Status; onAction: (message: string) => void }) {
  const final = status === "FINAL";
  return <><PageHeading eyebrow="REVIEW / EXPORT" title="Lifecycle &amp; approval" detail="DRAFT → REVIEW → FINAL. Approval is a control event, not a persisted state." /><section className="status-timeline" aria-label="Lifecycle status"><span className={status === "DRAFT" ? "current" : "complete"}>DRAFT</span><i aria-hidden="true">→</i><span className={status === "REVIEW" ? "current" : final ? "complete" : "pending"}>REVIEW</span><i aria-hidden="true">→</i><span className={final ? "current" : "pending"}>FINAL</span></section><div className="review-grid"><section className="panel"><PanelHeading eyebrow="VALIDATION" title="Backend evidence" chip="0 ERROR · 2 WARNING" /><Finding severity="ERROR" title="No active RAB" detail="Create a DRAFT before submit. Consequence: REVIEW blocked." /><Finding severity="WARNING" title="Direct Volume / Manual path" detail="Traceability and reviewer confirmation are required before FINAL." /><Finding severity="INFO" title="Snapshot protection" detail="REVIEW and FINAL show locked source and calculation snapshots." /></section><section className="panel"><PanelHeading eyebrow="ROLE-AWARE ACTIONS" title="Available controls" chip={role} /><div className="action-stack"><button type="button" disabled={role !== "ADMIN" || status !== "REVIEW"} onClick={() => onAction("FinalizeRabUseCase: ADMIN confirmation of every required WARNING is required.")}>Confirm warnings &amp; FINAL</button><button type="button" className="secondary-button" disabled={role !== "ADMIN" || status !== "REVIEW"} onClick={() => onAction("ReturnRabToDraftUseCase dipanggil untuk version yang sama.")}>Return to DRAFT</button><button type="button" className="secondary-button" disabled={!final || (role !== "ADMIN" && role !== "TECHNICAL")} onClick={() => onAction("CreateRabRevisionUseCase membuat DRAFT version baru; FINAL tetap immutable.")}>Create revision</button></div><p className="field-help">UI visibility bukan authorization. Application Layer tetap security boundary.</p></section></div><ExportPanel role={role} status={status} onAction={onAction} /></>;
}

function ExportPanel({ role, status, onAction }: { role: Role; status: Status; onAction: (message: string) => void }) { const requestExport = async (exportType: "WORKING" | "OFFICIAL") => { onAction("Membuat workbook Excel…"); const response = await fetch("/api/workflow", { method: "POST", headers: { "content-type": "application/json", "x-office-role": role }, body: JSON.stringify({ action: "export_excel", exportType }) }); const result = await response.json() as { ok: boolean; data?: { artifact: { filePath: string; artifactId: string }; bytesBase64: string }; error?: { message: string } }; if (!response.ok || !result.ok || !result.data) { onAction(result.error?.message ?? "Excel export failed"); return; } const bytes = Uint8Array.from(atob(result.data.bytesBase64), (character) => character.charCodeAt(0)); const url = URL.createObjectURL(new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = result.data.artifact.filePath.split("/").pop() ?? `${exportType.toLowerCase()}-rab.xlsx`; anchor.click(); URL.revokeObjectURL(url); onAction(`Excel ${exportType.toLowerCase()} berhasil dibuat · ${result.data.artifact.artifactId}`); }; return <section className="panel export-panel"><PanelHeading eyebrow="EXPORT WORKSPACE" title="Separate output contracts" chip="LIVE XLSX" /><div className="export-grid"><div><span className="severity-tag info">WORKING EXPORT · NOT OFFICIAL</span><p>Allowed for DRAFT/REVIEW and TECHNICAL/ADMIN.</p><button type="button" className="secondary-button" disabled={status === "FINAL"} onClick={() => void requestExport("WORKING")}>Export working Excel</button></div><div><span className="severity-tag warning">OFFICIAL EXPORT</span><p>ADMIN + FINAL only. Bound to the FINAL snapshot.</p><button type="button" className="secondary-button" disabled={role !== "ADMIN" || status !== "FINAL"} onClick={() => void requestExport("OFFICIAL")}>Export official Excel</button></div></div></section>; }

function ActivityWorkspace() { return <><PageHeading eyebrow="ACTIVITY" title="Audit &amp; execution history" detail="Project activity ditampilkan dari GetActiveProjectHistoryUseCase." /><section className="panel"><PanelHeading eyebrow="SAVED PROJECT DATA" title="No active project" chip="EMPTY" /><EmptyState title="Belum ada activity" detail="Pilih project aktif untuk memuat who, when, target, action, dan result tanpa mengarang records." /></section></>; }
function Finding({ severity, title, detail }: { severity: "ERROR" | "WARNING" | "INFO"; title: string; detail: string }) { return <div className="finding"><span className={`severity-tag ${severity.toLowerCase()}`}>{severity}</span><div><strong>{title}</strong><p>{detail}</p><small>Required action: follow Application workflow</small></div></div>; }
function PageHeading({ eyebrow, title, detail }: { eyebrow: string; title: string; detail: string }) { return <header className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="lede">{detail}</p></div><span className="outline-badge">NO DIRECT DB ACCESS</span></header>; }
function PanelHeading({ eyebrow, title, chip }: { eyebrow: string; title: string; chip?: string }) { return <div className="panel-heading"><div><p className="section-label">{eyebrow}</p><h2>{title}</h2></div>{chip && <span className="mode-chip">{chip}</span>}</div>; }
function EmptyState({ title, detail }: { title: string; detail: string }) { return <div className="empty-state" role="status"><span aria-hidden="true">—</span><div><h3>{title}</h3><p>{detail}</p></div></div>; }
