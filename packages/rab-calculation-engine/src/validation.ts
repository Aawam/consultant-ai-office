import { createExactDecimal, type ExactDecimal } from "./decimal";
import {
  type AhspComponentInput,
  type RabItemReviewInput,
  type RabReviewInput,
  type RabValidationIssue,
  type RabValidationResult,
} from "./types";
import { normalizeSafeUnit } from "./units";

function issue(
  code: string,
  severity: RabValidationIssue["severity"],
  path: string,
  message: string,
): RabValidationIssue {
  return { code, severity, path, message };
}

function isBlank(value: string | null): boolean {
  return value === null || value.trim().length === 0;
}

function readDecimal(
  value: string | bigint,
  path: string,
  issues: RabValidationIssue[],
): ExactDecimal | null {
  try {
    return createExactDecimal(value);
  } catch {
    issues.push(issue("INVALID_DECIMAL", "ERROR", path, "Value is not a valid decimal"));
    return null;
  }
}

function validateUnitPair(
  leftRaw: string,
  rightRaw: string,
  path: string,
  incompatibleCode: string,
  issues: RabValidationIssue[],
): void {
  const left = normalizeSafeUnit(leftRaw);
  const right = normalizeSafeUnit(rightRaw);
  if (left.kind === "REVIEW_REQUIRED" || right.kind === "REVIEW_REQUIRED") {
    issues.push(
      issue(
        "UNIT_REVIEW_REQUIRED",
        "ERROR",
        path,
        "Unit token cannot be normalized through a SAFE_ALIAS rule",
      ),
    );
    return;
  }
  if (left.value !== right.value) {
    issues.push(
      issue(incompatibleCode, "ERROR", path, "Canonical units are incompatible"),
    );
  }
}

function validateBasePrice(
  component: AhspComponentInput,
  path: string,
  issues: RabValidationIssue[],
): void {
  const { basePrice } = component;
  if (basePrice.priceState === "MISSING") {
    if (basePrice.priceValue === null) {
      issues.push(
        issue("MISSING_BASE_PRICE", "ERROR", path, "Required base price is missing"),
      );
    } else {
      const value = readDecimal(basePrice.priceValue, `${path}.priceValue`, issues);
      issues.push(
        issue(
          value?.isZero() === true
            ? "UNRESOLVED_ZERO_BASE_PRICE"
            : "MISSING_BASE_PRICE",
          "ERROR",
          path,
          "MISSING state cannot be used for calculation",
        ),
      );
    }
    return;
  }

  if (basePrice.priceValue === null) {
    issues.push(issue("MISSING_BASE_PRICE", "ERROR", path, "Base price value is missing"));
    return;
  }

  const price = readDecimal(basePrice.priceValue, `${path}.priceValue`, issues);
  if (price === null) return;
  if (price.isNegative()) {
    issues.push(issue("INVALID_BASE_PRICE", "ERROR", path, "Base price cannot be negative"));
  } else if (basePrice.priceState === "SET" && price.isZero()) {
    issues.push(
      issue(
        "UNRESOLVED_ZERO_BASE_PRICE",
        "ERROR",
        path,
        "Literal zero requires explicit ZERO_CONFIRMED intent",
      ),
    );
  } else if (basePrice.priceState === "ZERO_CONFIRMED") {
    if (!price.isZero() || isBlank(basePrice.zeroIntent)) {
      issues.push(
        issue(
          "INVALID_ZERO_CONFIRMED",
          "ERROR",
          path,
          "ZERO_CONFIRMED requires value zero and explicit intent",
        ),
      );
    } else {
      issues.push(
        issue(
          "ZERO_BASE_PRICE_CONFIRMED",
          "WARNING",
          path,
          "Intentional zero requires reviewer confirmation",
        ),
      );
    }
  }
}

function validateComponent(
  component: AhspComponentInput,
  path: string,
  issues: RabValidationIssue[],
): void {
  if (component.resolutionState !== "RESOLVED") {
    issues.push(
      issue(
        component.resolutionState === "AMBIGUOUS"
          ? "COMPONENT_AMBIGUOUS"
          : "COMPONENT_UNRESOLVED",
        "ERROR",
        path,
        "Component mapping must be resolved without a best guess",
      ),
    );
  }

  const coefficient = readDecimal(component.coefficient, `${path}.coefficient`, issues);
  if (coefficient?.isNegative()) {
    issues.push(
      issue("INVALID_COEFFICIENT", "ERROR", path, "Coefficient cannot be negative"),
    );
  }
  validateUnitPair(
    component.resourceUnitRaw,
    component.basePrice.priceUnitRaw,
    `${path}.unit`,
    "COMPONENT_PRICE_UNIT_INCOMPATIBLE",
    issues,
  );
  validateBasePrice(component, `${path}.basePrice`, issues);
}

function validateVolumeSource(
  item: RabItemReviewInput,
  path: string,
  issues: RabValidationIssue[],
): void {
  if (item.volumeSource.kind === "BACKUP_VOLUME") {
    if (isBlank(item.volumeSource.bvReferenceId)) {
      issues.push(
        issue("BV_REFERENCE_MISSING", "ERROR", path, "Backup Volume reference is required"),
      );
    }
    return;
  }

  if (item.volumeSource.quantityKind === "GEOMETRIC") {
    issues.push(
      issue(
        "GEOMETRIC_VOLUME_REQUIRES_BV",
        "ERROR",
        path,
        "Geometric work must use a controlled Backup Volume",
      ),
    );
    return;
  }

  const traceabilityComplete =
    !isBlank(item.volumeSource.basis) &&
    !isBlank(item.volumeSource.source) &&
    !isBlank(item.volumeSource.note) &&
    !isBlank(item.volumeSource.reviewerId);
  issues.push(
    traceabilityComplete
      ? issue(
          "DIRECT_VOLUME_REVIEW_REQUIRED",
          "WARNING",
          path,
          "Traceable direct volume requires reviewer confirmation",
        )
      : issue(
          "DIRECT_VOLUME_TRACEABILITY_MISSING",
          "ERROR",
          path,
          "Direct volume requires basis, source, note, and reviewer",
        ),
  );
}

function validateItem(
  item: RabItemReviewInput,
  index: number,
  issues: RabValidationIssue[],
): void {
  const path = `items[${index}]`;
  if (item.description.trim().length === 0) {
    issues.push(issue("ITEM_DESCRIPTION_MISSING", "ERROR", path, "Description is required"));
  }
  const volume = readDecimal(item.volume, `${path}.volume`, issues);
  if (volume?.isNegative()) {
    issues.push(issue("INVALID_VOLUME", "ERROR", path, "Volume cannot be negative"));
  } else if (volume?.isZero()) {
    issues.push(
      issue("ZERO_VOLUME", "ERROR", path, "D-023 requires active REVIEW items above zero"),
    );
  }

  validateVolumeSource(item, `${path}.volumeSource`, issues);
  validateUnitPair(
    item.volumeUnitRaw,
    item.hsp.unitRaw,
    `${path}.unit`,
    "ITEM_UNIT_INCOMPATIBLE",
    issues,
  );

  if (item.hsp.kind === "MANUAL_NON_AHSP") {
    const manualHsp = readDecimal(item.hsp.manualHsp, `${path}.hsp.manualHsp`, issues);
    if (manualHsp?.isNegative()) {
      issues.push(
        issue("INVALID_MANUAL_HSP", "ERROR", `${path}.hsp`, "Manual HSP cannot be negative"),
      );
    } else if (manualHsp?.isZero()) {
      issues.push(
        issue(
          "ZERO_MANUAL_HSP",
          "ERROR",
          `${path}.hsp`,
          "D-024 requires REVIEW manual HSP above zero",
        ),
      );
    }
    if (isBlank(item.hsp.note)) {
      issues.push(
        issue("MANUAL_HSP_NOTE_MISSING", "ERROR", `${path}.hsp`, "Manual HSP note is required"),
      );
    }
    issues.push(
      issue(
        "MANUAL_HSP_REVIEW_REQUIRED",
        "WARNING",
        `${path}.hsp`,
        "MANUAL/NON-AHSP value requires human review",
      ),
    );
  } else {
    const hspValue = readDecimal(item.hsp.hspValue, `${path}.hsp.hspValue`, issues);
    if (hspValue?.isNegative()) {
      issues.push(issue("INVALID_HSP", "ERROR", `${path}.hsp`, "HSP cannot be negative"));
    }
    if (item.hsp.components.length === 0) {
      issues.push(
        issue(
          "OFFICIAL_AHSP_COMPONENTS_MISSING",
          "ERROR",
          `${path}.hsp.components`,
          "Official AHSP requires its resolved component snapshot",
        ),
      );
    }
    item.hsp.components.forEach((component, componentIndex) =>
      validateComponent(component, `${path}.hsp.components[${componentIndex}]`, issues),
    );
  }
}

export function validateRabForReview(input: RabReviewInput): RabValidationResult {
  const issues: RabValidationIssue[] = [];
  const ohProfitRate = readDecimal(input.ohProfitRate, "ohProfitRate", issues);
  if (
    ohProfitRate !== null &&
    (ohProfitRate.lessThan("0.10") || ohProfitRate.greaterThan("0.15"))
  ) {
    issues.push(
      issue(
        "INVALID_OH_PROFIT_RATE",
        "ERROR",
        "ohProfitRate",
        "OH/profit rate must be between 10% and 15%",
      ),
    );
  }
  const ppnRate = readDecimal(input.ppnRate, "ppnRate", issues);
  if (ppnRate?.isNegative()) {
    issues.push(issue("INVALID_PPN_RATE", "ERROR", "ppnRate", "PPN rate cannot be negative"));
  }
  input.items.forEach((item, index) => validateItem(item, index, issues));

  return {
    issues,
    reviewBlocked: issues.some((validationIssue) => validationIssue.severity === "ERROR"),
  };
}
