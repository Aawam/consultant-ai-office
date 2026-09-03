import { OfficeWorkspace } from "../../office-workspace";

export default async function ProjectDetailPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <OfficeWorkspace preview={null} code="" name="" routeView="project" initialProjectId={projectId} />;
}
