import { previewProjectForDelivery } from "@consultant-ai-office/office-runtime";
import { OfficeWorkspace } from "./office-workspace";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const name = first(params.name);
  const code = first(params.code);
  return <OfficeWorkspace preview={previewProjectForDelivery(name, code)} code={code} name={name} />;
}
