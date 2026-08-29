import Decimal from "decimal.js";

import { RabCalculationError, type DecimalInput } from "./types";

Decimal.set({
  precision: 40,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -40,
  toExpPos: 40,
});

declare const exactDecimalBrand: unique symbol;

export type ExactDecimal = Decimal & {
  readonly [exactDecimalBrand]: true;
};

function asExact(value: Decimal): ExactDecimal {
  return value as ExactDecimal;
}

export function createExactDecimal(value: DecimalInput): ExactDecimal {
  if (typeof value !== "string" && typeof value !== "bigint") {
    throw new TypeError("Critical decimals must enter as strings or bigint values");
  }

  if (typeof value === "string" && value.trim().length === 0) {
    throw new RabCalculationError("INVALID_DECIMAL", "Decimal text cannot be empty");
  }

  let decimal: Decimal;
  try {
    decimal = new Decimal(value.toString());
  } catch {
    throw new RabCalculationError("INVALID_DECIMAL", `Invalid decimal value: ${String(value)}`);
  }

  if (!decimal.isFinite()) {
    throw new RabCalculationError("INVALID_DECIMAL", "Decimal value must be finite");
  }

  return asExact(decimal);
}

export function addExact(left: ExactDecimal, right: ExactDecimal): ExactDecimal {
  return asExact(left.plus(right));
}

export function subtractExact(
  left: ExactDecimal,
  right: ExactDecimal,
): ExactDecimal {
  return asExact(left.minus(right));
}

export function multiplyExact(
  left: ExactDecimal,
  right: ExactDecimal,
): ExactDecimal {
  return asExact(left.times(right));
}

export function divideExact(left: ExactDecimal, right: ExactDecimal): ExactDecimal {
  if (right.isZero()) {
    throw new RabCalculationError("DIVISION_BY_ZERO", "Cannot divide by zero");
  }
  return asExact(left.dividedBy(right));
}

export function ceilExact(value: ExactDecimal): ExactDecimal {
  return asExact(value.ceil());
}

export function floorExact(value: ExactDecimal): ExactDecimal {
  return asExact(value.floor());
}

export function sumExact(values: readonly ExactDecimal[]): ExactDecimal {
  return values.reduce(addExact, createExactDecimal("0"));
}

export function toCanonicalDecimal(value: ExactDecimal): string {
  return value.isZero() ? "0" : value.toFixed();
}

export function decimalEqualsWithinTolerance(
  actual: DecimalInput,
  expected: DecimalInput,
  tolerance: DecimalInput,
): boolean {
  const allowedDifference = createExactDecimal(tolerance);
  if (allowedDifference.isNegative()) {
    throw new RabCalculationError("INVALID_TOLERANCE", "Tolerance cannot be negative");
  }

  return createExactDecimal(actual)
    .minus(createExactDecimal(expected))
    .abs()
    .lessThanOrEqualTo(allowedDifference);
}

export function requireNonNegative(value: DecimalInput, code: string): ExactDecimal {
  const decimal = createExactDecimal(value);
  if (decimal.isNegative()) {
    throw new RabCalculationError(code, "Value cannot be negative");
  }
  return decimal;
}
