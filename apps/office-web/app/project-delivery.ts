import { createProjectDelivery } from "@consultant-ai-office/office-runtime";
import type { OfficeRuntime } from "@consultant-ai-office/office-runtime";

export { createProjectDelivery };
export type { DeliveryResult } from "@consultant-ai-office/office-runtime";

export function createProjectDeliveryFromRuntime(runtime: Pick<OfficeRuntime, "projects">) {
  return createProjectDelivery({ createProject: runtime.projects.create });
}
