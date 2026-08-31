"use client";

import { useEffect, useState } from "react";
import type {
  OfficeRabView,
  OfficeWorkflowResponseEnvelope,
  OfficeWorkflowReadModel,
  ProjectPreviewForDelivery,
} from "@consultant-ai-office/office-runtime";

export type ProjectPreview = ProjectPreviewForDelivery;

type Workspace = "overview" | "rab" | "review";
type Role = "TECHNICAL" | "ADMIN";
type Notice = { readonly tone: "success" | "error" | "blocked"; readonly message: string } | null;
const workflowContractVersion = "office-workflow-v1" as const;

const workspaces: readonly [Workspace, string, string][] = [
  ["overview", "Overview", "Project context"],
  ["rab", "RAB / EE", "One validation workspace"],
  ["review", "Review & Export", "Snapshot and working output"],
];

type MutationData = {
  readonly project?: { readonly projectId: string };
  readonly activeContext?: { readonly projectId: string };
  readonly projectId?: string;
  readonly rabVersionId?: string;
};

export function OfficeWorkspace({ preview, code, name }: { preview: ProjectPreview; code: string; name: string }) {
  const [workspace, setWorkspace] = useState<Workspace>("overview");
  const [role, setRole] = useState<Role>("TECHNICAL");
  const [workflow, setWorkflow] = useState<OfficeWorkflowReadModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice>(null);
  const activeWorkspace = workspaces.find(([key]) => key === workspace)?.[1] ?? "Overview";
  const activeProjectId = workflow?.activeProject?.transport.projectId ?? null;
  const activeRabId = workflow?.rab?.transport.rabVersionId ?? null;
  const lifecycle = workflow?.rab?.display.lifecycle ?? null;

  const reload = async (ids: { projectId?: string | null; rabVersionId?: string | null } = {}) => {
    const query = new URLSearchParams();
    const projectId = ids.projectId ?? activeProjectId ?? new URLSearchParams(window.location.search).get("projectId");
    const rabVersionId = ids.rabVersionId ?? activeRabId ?? new URLSearchParams(window.location.search).get("rabVersionId");
    query.set("contractVersion", workflowContractVersion);
    query.set("operation", "workflow.read");
    if (projectId) query.set("projectId", projectId);
    if (rabVersionId) query.set("rabVersionId", rabVersionId);

    setLoading(true);
    try {
      const response = await fetch(`/api/workflow?${query.toString()}`, { headers: { "x-office-role": role } });
      const result = parseWorkflowEnvelope<OfficeWorkflowReadModel>(await response.json());
      if (!response.ok || !result.ok) throw new Error(result.ok ? "Workflow reload failed" : result.error.message);
      setWorkflow(result.data);
      const url = new URL(window.location.href);
      if (result.data.activeProject) url.searchParams.set("projectId", result.data.activeProject.transport.projectId);
      if (result.data.rab) url.searchParams.set("rabVersionId", result.data.rab.transport.rabVersionId);
      window.history.replaceState({}, "", url);
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Workflow reload failed" });
    } finally {
      setLoading(false);
    }
  };

  const mutate = async (action: "create_project" | "select_project" | "create_draft" | "submit_review", extra: Record<string, string> = {}) => {
    setLoading(true);
    try {
      const response = await fetch("/api/workflow", {
        method: "POST",
        headers: { "content-type": "application/json", "x-office-role": role },
        body: JSON.stringify({ contractVersion: workflowContractVersion, action, projectId: extra.projectId ?? activeProjectId, rabVersionId: extra.rabVersionId ?? activeRabId, ...extra }),
      });
      const result = parseWorkflowEnvelope<MutationData>(await response.json());
      if (!response.ok || !result.ok) throw new Error(result.ok ? "Workflow mutation failed" : result.error.message);
      const nextProjectId = result.data?.project?.projectId ?? result.data?.activeContext?.projectId ?? result.data?.projectId ?? activeProjectId;
      const nextRabVersionId = result.data?.rabVersionId ?? activeRabId;
      await reload({ projectId: nextProjectId, rabVersionId: nextRabVersionId });
      setNotice({ tone: "success", message: "Saved by Application. The persisted state was loaded again." });
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Workflow mutation failed" });
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void reload(); }, 0);
    return () => window.clearTimeout(timer);
    // Persisted data is always re-read after a mutation; role is the only reload trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  return <main className="app-shell">
    <aside className="sidebar" aria-label="Global navigation">
      <div className="brand"><span className="brand-mark" aria-hidden="true">CA</span><div><strong>Consultant AI Office</strong><span>PHASE 1A · VALIDATION WORKSPACE</span></div></div>
      <section className="sidebar-block" aria-labelledby="context-label">
        <p className="section-label" id="context-label">Application context</p>
        <div className="actor-row"><span className="avatar" aria-hidden="true">{role[0]}</span><div><strong>Local operator</strong><span>{role}</span></div></div>
        <label className="field-label" htmlFor="role">Local role context</label>
        <select id="role" value={role} onChange={(event) => setRole(event.target.value as Role)}><option>TECHNICAL</option><option>ADMIN</option></select>
      </section>
      <section className="sidebar-block">
        <label className="section-label" htmlFor="project-selector">Active project</label>
        <select
          id="project-selector"
          value={activeProjectId ?? ""}
          disabled={loading || !workflow || workflow.projects.length === 0}
          onChange={(event) => void mutate("select_project", { projectId: event.target.value })}
          aria-describedby="project-help"
        >
          <option value="">No active saved project</option>
          {workflow?.projects.map((project) => <option key={project.transport.projectId} value={project.transport.projectId}>{project.display.code} · {project.display.name}</option>)}
        </select>
        <p className="field-help" id="project-help">Selection is persisted through the runtime and Application path.</p>
      </section>
      <nav className="primary-nav" aria-label="Project navigation">
        <p className="section-label">Project workspace</p>
        {workspaces.map(([key, label, description]) => <button type="button" className={workspace === key ? "nav-item active" : "nav-item"} key={key} onClick={() => setWorkspace(key)}><span>{label}</span><small>{description}</small></button>)}
      </nav>
      <div className="provider-state"><span className="status-dot" aria-hidden="true" /><div><strong>AI provider disabled</strong><span>Deterministic workflow remains available</span></div></div>
    </aside>

    <section className="content">
      <header className="topbar"><div><p className="eyebrow">CONSULTANT AI OFFICE</p><p className="breadcrumb">Project workspace / {activeWorkspace}</p></div><div className="topbar-meta"><span className="role-badge">{role}</span><span className="state-badge">{lifecycle ?? "NO RAB"}</span></div></header>
      <ContextHeader workflow={workflow} />
      {notice && <div className={`notice ${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}><strong>{notice.tone === "success" ? "Success" : notice.tone === "blocked" ? "Blocked" : "Error"}</strong><span>{notice.message}</span><button type="button" aria-label="Dismiss notice" onClick={() => setNotice(null)}>×</button></div>}
      {loading && <div className="notice" role="status" aria-live="polite">Loading saved workflow state…</div>}
      {workspace === "overview" && <Overview preview={preview} code={code} name={name} workflow={workflow} onCreateProject={(project) => mutate("create_project", project)} />}
      {workspace === "rab" && <RabWorkspace rab={workflow?.rab ?? null} activeProject={workflow?.activeProject ?? null} loading={loading} onCreateDraft={() => void mutate("create_draft", { title: "Browser RAB DRAFT" })} onSubmitReview={() => void mutate("submit_review")} />}
      {workspace === "review" && <ReviewWorkspace rab={workflow?.rab ?? null} role={role} projectId={activeProjectId} onNotice={setNotice} />}
    </section>
  </main>;
}

function ContextHeader({ workflow }: { workflow: OfficeWorkflowReadModel | null }) {
  const project = workflow?.activeProject ?? null;
  const rab = workflow?.rab ?? null;
  return <section className="context-strip" aria-labelledby="active-context-title"><div className="context-main"><span className="context-index">01</span><div><p id="active-context-title">Active Project Context</p><strong>{project?.display.name ?? "No saved project selected"}</strong><span>{project ? project.display.code : "Select or create a saved project to start a RAB workspace."}</span></div></div><dl><div><dt>RAB revision</dt><dd>{rab ? `Revision ${rab.display.revisionNumber}` : "—"}</dd></div><div><dt>Lifecycle</dt><dd>{rab?.display.lifecycle ?? "—"}</dd></div><div><dt>Snapshot</dt><dd>{rab?.snapshot.available ? "AVAILABLE" : "—"}</dd></div></dl></section>;
}

function Overview({ preview, code, name, workflow, onCreateProject }: { preview: ProjectPreview; code: string; name: string; workflow: OfficeWorkflowReadModel | null; onCreateProject: (project: { code: string; name: string }) => void }) {
  return <><PageHeading eyebrow="DELIVERY / PRESENTATION LAYER" title="Thin validation workspace" detail="Project context, one RAB workspace, runtime snapshots, validation, lifecycle, and working output." /><div className="overview-grid"><section className="panel" aria-labelledby="project-selection-title"><PanelHeading eyebrow="SAVED PROJECT DATA" title="Project selection" chip="RUNTIME" /><form className="project-form" method="get"><label htmlFor="project-code">Project code</label><input id="project-code" name="code" defaultValue={code} placeholder="Example: BRU-01" maxLength={20} required /><label htmlFor="project-name">Project name</label><input id="project-name" name="name" defaultValue={name} placeholder="Example: Kantor Camat" maxLength={120} required /><button type="submit">Validate preview</button></form>{preview === null && <EmptyState title="No preview yet" detail="Enter a project code and name to request an Application preview." />}{preview && preview.ok && <div className="success-state" role="status"><span className="severity-tag success">SUCCESS</span><h3>{preview.data.project.name}</h3><dl className="data-list"><div><dt>Code</dt><dd>{preview.data.project.code}</dd></div><div><dt>State</dt><dd>{preview.data.state}</dd></div></dl><p>Preview does not persist a project, context, execution, or audit record.</p><button type="button" onClick={() => onCreateProject(preview.data.project)}>Create saved project</button></div>}{preview && !preview.ok && <div className="error-state" role="alert"><span className="severity-tag error">ERROR</span><h3>Preview rejected</h3><p>{preview.message}</p></div>}</section><section className="panel"><PanelHeading eyebrow="ACTIVE CONTEXT" title="Saved projects" chip={workflow ? "LOADED" : "LOADING"} />{workflow && workflow.projects.length > 0 ? <ul className="data-list">{workflow.projects.map((project) => <li key={project.transport.projectId}><strong>{project.display.code}</strong><span>{project.display.name}{workflow.activeProject?.transport.projectId === project.transport.projectId ? " · active" : ""}</span></li>)}</ul> : <EmptyState title="No accessible saved project" detail="The selector becomes available when the runtime returns an accessible project." />}</section></div></>;
}

function RabWorkspace({ rab, activeProject, loading, onCreateDraft, onSubmitReview }: { rab: OfficeRabView | null; activeProject: OfficeWorkflowReadModel["activeProject"]; loading: boolean; onCreateDraft: () => void; onSubmitReview: () => void }) {
  if (!activeProject) return <><PageHeading eyebrow="RAB / EE" title="One RAB workspace" detail="Select a saved project before creating a RAB draft." /><section className="panel"><EmptyState title="Project context required" detail="No RAB command is offered until the runtime returns an active saved project." /></section></>;
  if (!rab) return <><PageHeading eyebrow="RAB / EE" title="One RAB workspace" detail="The active project has no loaded RAB version." /><section className="panel"><PanelHeading eyebrow="SAVED PROJECT DATA" title="No RAB draft" chip="EMPTY" /><EmptyState title="No RAB selected" detail="Create one DRAFT through the Application workflow to load its saved state." /><button type="button" disabled={loading} onClick={onCreateDraft}>Create RAB DRAFT</button></section></>;

  const canSubmitReview = rab.display.lifecycle === "DRAFT";
  return <><PageHeading eyebrow="RAB / EE" title={rab.display.title} detail="Values below are read from the runtime response; the UI does not calculate RAB values." /><section className="panel"><div className="workspace-toolbar"><div><PanelHeading eyebrow="RAB SNAPSHOT" title={`Revision ${rab.display.revisionNumber}`} chip={rab.display.lifecycle} /><p className="muted">{rab.snapshot.available ? `Calculation snapshot returned at ${new Date(rab.snapshot.calculatedAt ?? "").toLocaleString()}.` : "No calculation snapshot has been returned for this saved DRAFT."}</p></div><div className="action-row"><button type="button" disabled={loading || !canSubmitReview} onClick={onSubmitReview}>Submit REVIEW</button></div></div><CalculationPreview rab={rab} /><ValidationPanel rab={rab} /></section></>;
}

function CalculationPreview({ rab }: { rab: OfficeRabView }) {
  if (!rab.calculation) return <EmptyState title="No deterministic result returned" detail="Calculation values appear only after the Application workflow returns a saved calculation snapshot." />;
  const { totals } = rab.calculation;
  return <section className="result-strip" aria-labelledby="calculation-preview-title"><div><span className="eyebrow">DETERMINISTIC RESULT</span><strong id="calculation-preview-title">Calculation preview from saved snapshot</strong><span>No subtotal, tax, or rounding is calculated in this browser.</span></div><dl className="data-list"><div><dt>RAB subtotal</dt><dd>{totals.subtotalRab}</dd></div><div><dt>PPN</dt><dd>{totals.ppnValue}</dd></div><div><dt>Before rounding</dt><dd>{totals.totalBeforeRounding}</dd></div><div><dt>Final result</dt><dd>{totals.totalFinal}</dd></div></dl></section>;
}

function ValidationPanel({ rab }: { rab: OfficeRabView }) {
  if (!rab.validation) return <section className="panel"><PanelHeading eyebrow="VALIDATION" title="No validation result returned" chip="NOT RUN" /><p className="muted">Validation evidence is shown only when returned by Application.</p></section>;
  const issues = rab.validation.issues;
  return <section className="panel"><PanelHeading eyebrow="VALIDATION" title="Application evidence" chip={rab.validation.reviewBlocked ? "REVIEW BLOCKED" : "REVIEW READY"} />{issues.length === 0 ? <div className="success-state" role="status"><span className="severity-tag success">SUCCESS</span><p>No validation issue was returned by Application.</p></div> : <div className="action-stack">{issues.map((issue, index) => <Finding key={`${issue.severity}-${index}`} severity={issue.severity} detail={issue.message} reviewBlocked={rab.validation?.reviewBlocked ?? false} />)}</div>}</section>;
}

function ReviewWorkspace({ rab, role, projectId, onNotice }: { rab: OfficeRabView | null; role: Role; projectId: string | null; onNotice: (notice: Notice) => void }) {
  if (!rab) return <><PageHeading eyebrow="REVIEW & EXPORT" title="Snapshot review" detail="A saved RAB version is required." /><section className="panel"><EmptyState title="No RAB snapshot loaded" detail="Create and submit a RAB to REVIEW to inspect Application validation and deterministic result evidence." /></section></>;
  const lifecycle = rab.display.lifecycle;
  return <><PageHeading eyebrow="REVIEW & EXPORT" title="Snapshot review" detail="Lifecycle, validation, and calculation values are supplied by the runtime read model." /><section className="status-timeline" aria-label="Persisted lifecycle status"><span className={lifecycle === "DRAFT" ? "current" : "complete"}>DRAFT</span><i aria-hidden="true">→</i><span className={lifecycle === "REVIEW" ? "current" : lifecycle === "FINAL" ? "complete" : "pending"}>REVIEW</span><i aria-hidden="true">→</i><span className={lifecycle === "FINAL" ? "current" : "pending"}>FINAL</span></section><div className="review-grid"><section className="panel"><PanelHeading eyebrow="SNAPSHOT" title={rab.snapshot.available ? "Persisted calculation snapshot" : "No persisted calculation snapshot"} chip={rab.snapshot.available ? "AVAILABLE" : "PENDING"} /><p>{rab.snapshot.available ? "The current runtime response contains a deterministic snapshot for this RAB state." : "No snapshot is presented as acceptance data before Application returns it."}</p></section><section className="panel"><PanelHeading eyebrow="BASIC APPROVAL" title="Application-controlled review" chip={role} /><p>{lifecycle === "REVIEW" ? `REVIEW is persisted. Confirmed warning records returned: ${rab.approval.confirmedWarningCount}.` : lifecycle === "FINAL" ? "FINAL is read-only. Official Export is outside Phase 1A." : "Submit REVIEW is available from the RAB workspace after Application validation succeeds."}</p><p className="field-help">No approval, authorization, lifecycle, or validation decision is made in the browser.</p></section></div><ValidationPanel rab={rab} /><WorkingExportPanel role={role} lifecycle={lifecycle} projectId={projectId} rabVersionId={rab.transport.rabVersionId} onNotice={onNotice} /></>;
}

function WorkingExportPanel({ role, lifecycle, projectId, rabVersionId, onNotice }: { role: Role; lifecycle: OfficeRabView["display"]["lifecycle"]; projectId: string | null; rabVersionId: string; onNotice: (notice: Notice) => void }) {
  const isBlocked = lifecycle === "FINAL" || projectId === null;
  const blockedReason = lifecycle === "FINAL" ? "Working Export is blocked because the runtime reports FINAL. This Phase 1A workspace supports DRAFT and REVIEW working output only." : "Working Export is blocked until an active saved project is returned by the runtime.";
  const requestWorkingExport = async () => {
    if (isBlocked) {
      onNotice({ tone: "blocked", message: blockedReason });
      return;
    }
    onNotice({ tone: "success", message: "Creating the Working Excel file from the persisted runtime snapshot…" });
    try {
      const response = await fetch("/api/workflow", { method: "POST", headers: { "content-type": "application/json", "x-office-role": role }, body: JSON.stringify({ contractVersion: workflowContractVersion, action: "export_excel", projectId, rabVersionId, exportType: "WORKING" }) });
      const result = parseWorkflowEnvelope<{ readonly artifact: { readonly filePath: string }; readonly bytesBase64: string }>(await response.json());
      if (!response.ok || !result.ok) throw new Error(result.ok ? "Working Excel export failed" : result.error.message);
      const bytes = Uint8Array.from(atob(result.data.bytesBase64), (character) => character.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.data.artifact.filePath.split("/").pop() ?? "working-rab.xlsx";
      anchor.click();
      URL.revokeObjectURL(url);
      onNotice({ tone: "success", message: "Working Excel downloaded from the persisted RAB snapshot. NOT OFFICIAL." });
    } catch (error) {
      onNotice({ tone: "error", message: error instanceof Error ? error.message : "Working Excel export failed" });
    }
  };

  return <section className="panel export-panel"><PanelHeading eyebrow="EXPORT WORKSPACE" title="Working output only" chip="PHASE 1A" /><div className="export-grid"><div><span className="severity-tag info">WORKING EXPORT · NOT OFFICIAL</span><p>Available only for DRAFT or REVIEW returned by Application.</p><button type="button" className="secondary-button" disabled={isBlocked} onClick={() => void requestWorkingExport()}>Export working Excel</button>{isBlocked && <p className="field-help" role="status">{blockedReason}</p>}</div><div><span className="severity-tag warning">OFFICIAL EXPORT</span><p>Official Export unavailable in Phase 1A. It is deliberately deferred and has no executable UI action.</p><button type="button" className="secondary-button" disabled aria-describedby="official-export-help">Official Export unavailable</button><p id="official-export-help" className="field-help">No official-output request is sent from this workspace.</p></div></div></section>;
}

function Finding({ severity, detail, reviewBlocked }: { severity: "ERROR" | "WARNING" | "INFO"; detail: string; reviewBlocked: boolean }) {
  const consequence = severity === "ERROR" && reviewBlocked ? "Consequence: Application blocks REVIEW." : severity === "WARNING" ? "Consequence: reviewer attention is required by Application." : "Consequence: informational evidence.";
  return <div className="finding"><span className={`severity-tag ${severity.toLowerCase()}`}>{severity}</span><div><strong>{consequence}</strong><p>{detail}</p></div></div>;
}

function parseWorkflowEnvelope<T>(value: unknown): OfficeWorkflowResponseEnvelope<T> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Invalid workflow response envelope");
  }
  const envelope = value as Record<string, unknown>;
  if (envelope.contractVersion !== workflowContractVersion) {
    throw new Error("Unsupported workflow response contract version");
  }
  if (envelope.ok === true && "data" in envelope) return value as OfficeWorkflowResponseEnvelope<T>;
  if (
    envelope.ok === false
    && typeof envelope.error === "object"
    && envelope.error !== null
    && typeof (envelope.error as Record<string, unknown>).code === "string"
    && typeof (envelope.error as Record<string, unknown>).message === "string"
  ) return value as OfficeWorkflowResponseEnvelope<T>;
  throw new Error("Invalid workflow response envelope");
}

function PageHeading({ eyebrow, title, detail }: { eyebrow: string; title: string; detail: string }) { return <header className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="lede">{detail}</p></div><span className="outline-badge">RUNTIME → APPLICATION</span></header>; }
function PanelHeading({ eyebrow, title, chip }: { eyebrow: string; title: string; chip?: string }) { return <div className="panel-heading"><div><p className="section-label">{eyebrow}</p><h2>{title}</h2></div>{chip && <span className="mode-chip">{chip}</span>}</div>; }
function EmptyState({ title, detail }: { title: string; detail: string }) { return <div className="empty-state" role="status"><span aria-hidden="true">—</span><div><h3>{title}</h3><p>{detail}</p></div></div>; }
