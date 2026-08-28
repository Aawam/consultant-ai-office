import { describe, expect, it } from "vitest";

import {
  addExact,
  createExactDecimal,
  multiplyExact,
  toCanonicalDecimal,
} from "@consultant-ai-office/rab-calculation-engine";

describe("deterministic decimal boundary", () => {
  it("adds decimal text without IEEE-754 drift", () => {
    const result = addExact(createExactDecimal("0.1"), createExactDecimal("0.2"));

    expect(toCanonicalDecimal(result)).toBe("0.3");
  });

  it("multiplies critical values without converting through number", () => {
    const result = multiplyExact(
      createExactDecimal("74.3535"),
      createExactDecimal("153810.8"),
    );

    expect(toCanonicalDecimal(result)).toBe("11436371.3178");
  });

  it("rejects native numbers at the critical arithmetic boundary", () => {
    expect(() => createExactDecimal(0.1 as unknown as string)).toThrow(
      "Critical decimals must enter as strings or bigint values",
    );
  });
});
