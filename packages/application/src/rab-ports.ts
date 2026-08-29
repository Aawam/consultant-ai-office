import type { RabVersion } from "@consultant-ai-office/domain";
import type { AhspComponentInput } from "@consultant-ai-office/rab-calculation-engine";
import type { AuditPort, ExecutionHistoryPort } from "./project-ports";

export interface RabWorkflowRepository {
  get(rabVersionId: string): Promise<RabVersion | null>;
}

export interface RabPersistencePort {
  create(rab: RabVersion): Promise<void>;
  replace(rab: RabVersion): Promise<void>;
}

export interface RabUnitOfWork {
  readonly rabs: RabPersistencePort;
  readonly executions: ExecutionHistoryPort;
  readonly audit: AuditPort;
}

export interface RabTransactionPort {
  execute<T>(operation: (unitOfWork: RabUnitOfWork) => Promise<T>): Promise<T>;
}

export interface OfficialHspSnapshot {
  readonly hspId: string;
  readonly ahspId: string;
  readonly workUnitRaw: string;
  readonly components: readonly AhspComponentInput[];
}

export interface OfficialHspSnapshotPort {
  resolve(hspId: string): Promise<OfficialHspSnapshot | null>;
}
