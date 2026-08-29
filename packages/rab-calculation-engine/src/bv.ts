import {
  ceilExact,
  createExactDecimal,
  divideExact,
  multiplyExact,
  sumExact,
  toCanonicalDecimal,
} from "./decimal";
import {
  RabCalculationError,
  type BvOperation,
  type DecimalOperand,
} from "./types";

function exactOperand(operand: DecimalOperand) {
  return typeof operand === "object"
    ? divideExact(
        createExactDecimal(operand.numerator),
        createExactDecimal(operand.denominator),
      )
    : createExactDecimal(operand);
}

function nonNegativeOperand(operand: DecimalOperand) {
  const value = exactOperand(operand);
  if (value.isNegative()) {
    throw new RabCalculationError("NEGATIVE_BV_INPUT", "BV operand cannot be negative");
  }
  return value;
}

function requireValues(values: readonly unknown[], operation: string): void {
  if (values.length === 0) {
    throw new RabCalculationError(
      "EMPTY_BV_OPERANDS",
      `${operation} requires at least one operand`,
    );
  }
}

export function calculateBvOperation(operation: BvOperation): string {
  switch (operation.kind) {
    case "GEOMETRY_PRODUCT": {
      requireValues(operation.factors, operation.kind);
      const result = operation.factors
        .map(nonNegativeOperand)
        .reduce(multiplyExact);
      return toCanonicalDecimal(result);
    }
    case "WEIGHTED_COUNT": {
      requireValues(operation.terms, operation.kind);
      const terms = operation.terms.map(({ count, weight }) =>
        multiplyExact(
          nonNegativeOperand(count),
          nonNegativeOperand(weight),
        ),
      );
      return toCanonicalDecimal(sumExact(terms));
    }
    case "REFERENCE_FACTOR":
      return toCanonicalDecimal(
        multiplyExact(
          nonNegativeOperand(operation.reference),
          nonNegativeOperand(operation.factor),
        ),
      );
    case "REBAR_ROUNDUP": {
      const span = nonNegativeOperand(operation.span);
      const spacing = exactOperand(operation.spacing);
      if (spacing.lessThanOrEqualTo(0)) {
        throw new RabCalculationError(
          "INVALID_REBAR_SPACING",
          "Rebar spacing must be greater than zero",
        );
      }
      return toCanonicalDecimal(ceilExact(divideExact(span, spacing)));
    }
    case "SEGMENT_SUM_FACTOR": {
      requireValues(operation.segments, operation.kind);
      const segmentTotal = sumExact(
        operation.segments.map((segment) =>
          nonNegativeOperand(segment),
        ),
      );
      return toCanonicalDecimal(
        multiplyExact(
          segmentTotal,
          nonNegativeOperand(operation.factor),
        ),
      );
    }
    case "SUM_CHILDREN":
      requireValues(operation.children, operation.kind);
      return toCanonicalDecimal(
        sumExact(
          operation.children.map((child) =>
            nonNegativeOperand(child),
          ),
        ),
      );
  }
}
