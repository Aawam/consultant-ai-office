import { notFound } from "next/navigation";
import { OfficeWorkspace } from "../../../../office-workspace";

const views = new Map<string | undefined, "rab" | "edit" | "export">([
  [undefined, "rab"],
  ["edit", "edit"],
  ["export", "export"],
]);

export default async function RabRoutePage({ params }: { params: Promise<{ projectId: string; view?: string[] }> }) {
  const { projectId, view } = await params;
  const routeView = views.get(view?.[0]);
  if (!routeView || (view && view.length > 1)) notFound();
  return <OfficeWorkspace preview={null} code="" name="" routeView={routeView} initialProjectId={projectId} />;
}
