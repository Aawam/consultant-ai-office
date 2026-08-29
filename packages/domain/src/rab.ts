import type { DocumentStatus } from "@consultant-ai-office/shared-contracts";

export type RabItemInput = Readonly<Record<string, unknown>>;
export interface RabValidationIssue { readonly code: string; readonly severity: "ERROR" | "WARNING" | "INFO"; readonly path: string; readonly message: string; }
export interface RabValidationResult { readonly issues: readonly RabValidationIssue[]; readonly reviewBlocked: boolean; }

export interface RabCalculationSnapshot {
  readonly calculatedAt: Date;
  readonly itemValues: Readonly<Record<string, string>>;
  readonly totals: { readonly subtotalRab: string; readonly ppnValue: string; readonly totalBeforeRounding: string; readonly totalFinal: string; readonly roundingDifference: string };
}

export interface RabVersion {
  readonly rabVersionId: string;
  readonly projectId: string;
  readonly revisionOfRabVersionId: string | null;
  readonly revisionNumber: number;
  readonly title: string;
  readonly status: DocumentStatus;
  readonly ohProfitRate: string;
  readonly ppnRate: string;
  readonly items: readonly RabItemInput[];
  readonly validation: RabValidationResult | null;
  readonly calculationSnapshot: RabCalculationSnapshot | null;
  readonly confirmedWarningCodes: readonly string[];
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
