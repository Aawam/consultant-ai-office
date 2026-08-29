import type { DocumentStatus } from "@consultant-ai-office/shared-contracts";

export type RabItemInput = Readonly<Record<string, unknown>>;
export interface RabValidationIssue { readonly code: string; readonly severity: "ERROR" | "WARNING" | "INFO"; readonly path: string; readonly message: string; }
export interface RabValidationResult { readonly issues: readonly RabValidationIssue[]; readonly reviewBlocked: boolean; }

export interface RabBvSnapshotLine {
  readonly bvId: string;
  readonly bvLineId: string;
  readonly rabItemId: string;
  readonly lineOrder: number;
  readonly lineRole: "DETAIL" | "RESULT" | "REFERENCE";
  readonly description: string;
  readonly parentBvLineId: string | null;
  readonly refBvLineId: string | null;
  readonly formulaTemplateKey: string;
  readonly formulaTemplateVersion: string;
  readonly formulaDisplay: string;
  readonly unitRaw: string;
  readonly unitCanonical: string;
  readonly volumeCalc: string;
  readonly isResult: boolean;
  readonly dimensionSource: string;
  readonly note: string | null;
  readonly operands: Readonly<Record<string, string>>;
}

export interface RabHspSnapshot {
  readonly hspId: string;
  readonly hspType: "AHSP" | "MANUAL";
  readonly ahspId: string | null;
  readonly sourceEdition: string | null;
  readonly officialCode: string | null;
  readonly officialDescription: string | null;
  readonly sourceLocator: string | null;
  readonly workUnitRaw: string;
  readonly workUnitCanonical: string;
  readonly manualDescription: string | null;
  readonly manualHsp: string | null;
  readonly manualNote: string | null;
}

export interface RabComponentSnapshot {
  readonly ahspComponentId: string;
  readonly ahspId: string;
  readonly hspId: string;
  readonly sourceOrder: number;
  readonly componentGroup: "TENAGA" | "BAHAN" | "ALAT";
  readonly sourceResourceName: string;
  readonly sourceResourceCode: string | null;
  readonly sourceUnitRaw: string;
  readonly sourceUnitCanonical: string;
  readonly resourceId: string;
  readonly coefficient: string;
  readonly priceUnit: string;
  readonly priceValue: string | null;
  readonly priceState: "MISSING" | "SET" | "ZERO_CONFIRMED";
  readonly sourceLocator: string | null;
}

export interface RabResourceSnapshot {
  readonly resourceId: string;
  readonly resourceType: "TENAGA" | "BAHAN" | "ALAT";
  readonly normativeCode: string | null;
  readonly resourceName: string;
  readonly unitRawReference: string;
  readonly unitCanonical: string;
  readonly priceUnit: string;
  readonly priceValue: string | null;
  readonly priceState: "MISSING" | "SET" | "ZERO_CONFIRMED";
}

export interface RabExportSnapshot {
  readonly snapshotId: string;
  readonly bvLines: readonly RabBvSnapshotLine[];
  readonly hspSnapshots: readonly RabHspSnapshot[];
  readonly componentSnapshots: readonly RabComponentSnapshot[];
  readonly resourceSnapshots: readonly RabResourceSnapshot[];
  readonly sourceProvenance: Readonly<Record<string, string>>;
}

export interface RabCalculationSnapshot {
  readonly calculatedAt: Date;
  readonly itemValues: Readonly<Record<string, string>>;
  readonly totals: { readonly subtotalRab: string; readonly ppnValue: string; readonly totalBeforeRounding: string; readonly totalFinal: string; readonly roundingDifference: string };
  readonly exportSnapshot?: RabExportSnapshot;
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
