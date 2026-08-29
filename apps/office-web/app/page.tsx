import { ApplicationError, previewProjectCreation } from "@consultant-ai-office/application";
import { OfficeWorkspace, type ProjectPreview } from "./office-workspace";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function projectPreview(name: string, code: string): ProjectPreview {
  if (!name && !code) return null;
  try {
    return {
      ok: true,
      data: previewProjectCreation(
        {
          requestId: "browser-project-preview",
          projectId: null,
          actor: { actorId: "local-technical-operator", actorType: "HUMAN", actorRole: "TECHNICAL" },
        },
        { name, code },
      ),
    };
  } catch (error) {
    return { ok: false, message: error instanceof ApplicationError ? error.message : "Preview project tidak dapat dibuat." };
  }
}

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const name = first(params.name);
  const code = first(params.code);
  return <OfficeWorkspace preview={projectPreview(name, code)} code={code} name={name} />;
}
