import Decimal from "decimal.js";

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

type ExactDecimalInput = string | bigint;

export function createExactDecimal(value: ExactDecimalInput): ExactDecimal {
  if (typeof value !== "string" && typeof value !== "bigint") {
    throw new TypeError(
      "Critical decimals must enter as strings or bigint values",
    );
  }

  return new Decimal(value.toString()) as ExactDecimal;
}

export function addExact(left: ExactDecimal, right: ExactDecimal): ExactDecimal {
  return left.plus(right) as ExactDecimal;
}

export function multiplyExact(
  left: ExactDecimal,
  right: ExactDecimal,
): ExactDecimal {
  return left.times(right) as ExactDecimal;
}

export function toCanonicalDecimal(value: ExactDecimal): string {
  return value.toFixed();
}
