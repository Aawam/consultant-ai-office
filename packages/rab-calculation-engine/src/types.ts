import type { ValidationSeverity } from "@consultant-ai-office/shared-contracts";

export type DecimalInput = string | bigint;
export type DecimalOperand =
  | DecimalInput
  | {
      readonly numerator: DecimalInput;
      readonly denominator: DecimalInput;
    };
export type ComponentGroup = "TENAGA" | "BAHAN" | "ALAT";
export type PriceState = "MISSING" | "SET" | "ZERO_CONFIRMED";
export type ResolutionState = "RESOLVED" | "AMBIGUOUS" | "UNRESOLVED";

export interface BasePriceInput {
  readonly priceValue: DecimalInput | null;
  readonly priceState: PriceState;
  readonly priceUnitRaw: string;
  readonly zeroIntent: string | null;
}

export interface AhspComponentInput {
  readonly componentId: string;
  readonly group: ComponentGroup;
  readonly coefficient: DecimalInput;
  readonly resourceUnitRaw: string;
  readonly resolutionState: ResolutionState;
  readonly basePrice: BasePriceInput;
  readonly ahspComponentId?: string;
  readonly resourceId?: string;
  readonly resourceName?: string;
  readonly resourceCode?: string | null;
  readonly resourceUnitCanonical?: string;
  readonly sourceLocator?: string | null;
}

export interface ComponentCostResult {
  readonly componentId: string;
  readonly group: ComponentGroup;
  readonly componentCost: string;
}

export interface OfficialHspInput {
  readonly components: readonly AhspComponentInput[];
  readonly ohProfitRate: DecimalInput;
}

export interface HspCalculationResult {
  readonly kind: "OFFICIAL_AHSP" | "MANUAL_NON_AHSP";
  readonly componentCosts: readonly ComponentCostResult[];
  readonly laborSubtotal: string;
  readonly materialSubtotal: string;
  readonly equipmentSubtotal: string;
  readonly directCost: string;
  readonly ohProfitValue: string;
  readonly hspValue: string;
}

export type HspCalculationInput =
  | ({ readonly kind: "OFFICIAL_AHSP" } & OfficialHspInput)
  | {
      readonly kind: "MANUAL_NON_AHSP";
      readonly manualHsp: DecimalInput;
      readonly projectOhProfitRate: DecimalInput;
    };

export type BvOperation =
  | {
      readonly kind: "GEOMETRY_PRODUCT";
      readonly factors: readonly DecimalOperand[];
    }
  | {
      readonly kind: "WEIGHTED_COUNT";
      readonly terms: readonly {
        readonly count: DecimalOperand;
        readonly weight: DecimalOperand;
      }[];
    }
  | {
      readonly kind: "REFERENCE_FACTOR";
      readonly reference: DecimalOperand;
      readonly factor: DecimalOperand;
    }
  | {
      readonly kind: "REBAR_ROUNDUP";
      readonly span: DecimalOperand;
      readonly spacing: DecimalOperand;
    }
  | {
      readonly kind: "SEGMENT_SUM_FACTOR";
      readonly segments: readonly DecimalOperand[];
      readonly factor: DecimalOperand;
    }
  | {
      readonly kind: "SUM_CHILDREN";
      readonly children: readonly DecimalOperand[];
    };

export interface RabItemCalculationInput {
  readonly itemId: string;
  readonly volume: DecimalInput;
  readonly hspValue: DecimalInput;
}

export interface CalculatedRabItem {
  readonly itemId: string;
  readonly volume: string;
  readonly hspValue: string;
  readonly itemValue: string;
}

export interface GroupSubtotalInput {
  readonly directItems: readonly CalculatedRabItem[];
  readonly subgroupSubtotals: readonly DecimalInput[];
}

export interface ProjectTotalsInput {
  readonly groupSubtotals: readonly DecimalInput[];
  readonly ppnRate: DecimalInput;
}

export interface ProjectTotalsResult {
  readonly subtotalRab: string;
  readonly ppnRate: string;
  readonly ppnValue: string;
  readonly totalBeforeRounding: string;
  readonly totalFinal: string;
  readonly roundingDifference: string;
}

export type VolumeSourceInput =
  | {
      readonly kind: "BACKUP_VOLUME";
      readonly bvReferenceId: string | null;
    }
  | {
      readonly kind: "DIRECT";
      readonly quantityKind: "SIMPLE" | "LUMP_SUM" | "GEOMETRIC";
      readonly basis: string | null;
      readonly source: string | null;
      readonly note: string | null;
      readonly reviewerId: string | null;
    };

export type HspReviewInput =
  | {
      readonly kind: "OFFICIAL_AHSP";
      readonly unitRaw: string;
      readonly hspValue: DecimalInput;
      readonly components: readonly AhspComponentInput[];
    }
  | {
      readonly kind: "MANUAL_NON_AHSP";
      readonly unitRaw: string;
      readonly manualHsp: DecimalInput;
      readonly note: string | null;
    };

export interface RabItemReviewInput {
  readonly itemId: string;
  readonly description: string;
  readonly volume: DecimalInput;
  readonly volumeUnitRaw: string;
  readonly volumeSource: VolumeSourceInput;
  readonly hsp: HspReviewInput;
}

export interface RabReviewInput {
  readonly ohProfitRate: DecimalInput;
  readonly ppnRate: DecimalInput;
  readonly items: readonly RabItemReviewInput[];
}

export interface RabValidationIssue {
  readonly code: string;
  readonly severity: ValidationSeverity;
  readonly path: string;
  readonly message: string;
}

export interface RabValidationResult {
  readonly issues: readonly RabValidationIssue[];
  readonly reviewBlocked: boolean;
}

export class RabCalculationError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "RabCalculationError";
  }
}
