import {
  CreateProjectUseCase,
  CreateRabDraftUseCase,
  CreateRabRevisionUseCase,
  FinalizeRabUseCase,
  GetActiveProjectContextUseCase,
  GetActiveProjectHistoryUseCase,
  ListAccessibleProjectsUseCase,
  ReturnRabToDraftUseCase,
  SelectActiveProjectUseCase,
  SubmitRabForReviewUseCase,
} from "@consultant-ai-office/application";
import type { ClockPort, RequestContext } from "@consultant-ai-office/domain";
import {
  createPostgresOfficialHspSnapshots,
  createPostgresProjectFoundation,
  createPostgresRabWorkflow,
} from "@consultant-ai-office/infrastructure";
import { Pool } from "pg";

export interface OfficeRuntimeOptions {
  readonly connectionString: string;
  readonly clock?: ClockPort;
  readonly ids?: { readonly next: () => string };
  readonly maxConnections?: number;
}

export interface OfficeRuntime {
  readonly pool: Pool;
  readonly projects: {
    readonly create: CreateProjectUseCase;
    readonly list: ListAccessibleProjectsUseCase;
    readonly getActive: GetActiveProjectContextUseCase;
    readonly select: SelectActiveProjectUseCase;
    readonly history: GetActiveProjectHistoryUseCase;
  };
  readonly rab: {
    readonly get: (rabVersionId: string) => Promise<import("@consultant-ai-office/domain").RabVersion | null>;
    readonly createDraft: CreateRabDraftUseCase;
    readonly submitReview: SubmitRabForReviewUseCase;
    readonly returnToDraft: ReturnRabToDraftUseCase;
    readonly finalize: FinalizeRabUseCase;
    readonly createRevision: CreateRabRevisionUseCase;
  };
  readonly close: () => Promise<void>;
}

const defaultClock: ClockPort = { now: () => new Date() };
const defaultIds = { next: () => crypto.randomUUID() };

export function createOfficeRuntime(options: OfficeRuntimeOptions): OfficeRuntime {
  const pool = new Pool({ connectionString: options.connectionString, max: options.maxConnections ?? 5 });
  const clock = options.clock ?? defaultClock;
  const ids = options.ids ?? defaultIds;
  const projectAdapters = createPostgresProjectFoundation({ pool });
  const rabAdapters = createPostgresRabWorkflow({ pool });
  const snapshots = createPostgresOfficialHspSnapshots({ pool });

  const create = new CreateProjectUseCase({ transaction: projectAdapters.transaction, clock, ids });
  const queries = new ListAccessibleProjectsUseCase(projectAdapters.queries);
  const getActive = new GetActiveProjectContextUseCase(projectAdapters.queries);
  const select = new SelectActiveProjectUseCase({ ...projectAdapters, clock, ids });
  const history = new GetActiveProjectHistoryUseCase({ projects: projectAdapters.queries, history: projectAdapters.history });

  return Object.freeze({
    pool,
    projects: { create, list: queries, getActive, select, history },
    rab: {
      get: rabAdapters.rabs.get,
      createDraft: new CreateRabDraftUseCase(rabAdapters.rabs, rabAdapters.transaction, clock, ids, snapshots),
      submitReview: new SubmitRabForReviewUseCase(rabAdapters.rabs, rabAdapters.transaction, clock),
      returnToDraft: new ReturnRabToDraftUseCase(rabAdapters.rabs, rabAdapters.transaction, clock),
      finalize: new FinalizeRabUseCase(rabAdapters.rabs, rabAdapters.transaction, clock),
      createRevision: new CreateRabRevisionUseCase(rabAdapters.rabs, rabAdapters.transaction, clock, ids),
    },
    close: () => pool.end(),
  });
}

export function createOfficeRuntimeFromEnv(env: NodeJS.ProcessEnv = process.env): OfficeRuntime {
  const connectionString = env.DATABASE_URL ?? env.TEST_DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL or TEST_DATABASE_URL is required to create OfficeRuntime");
  return createOfficeRuntime({ connectionString });
}

export type { RequestContext };
