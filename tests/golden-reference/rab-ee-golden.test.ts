import { describe, expect, it } from "vitest";

import {
  calculateBvOperation,
  calculateOfficialHsp,
  calculateProjectTotals,
  calculateRabItem,
  calculateSubgroupSubtotal,
  decimalEqualsWithinTolerance,
  roundHalfUpToThousands,
  validateRabForReview,
} from "@consultant-ai-office/rab-calculation-engine";
import {
  GOLDEN_REFERENCE_LABEL,
  goldenAhspCases,
  goldenBvCases,
  goldenRabCases,
} from "../../fixtures/golden-reference/rab-ee-golden";

function referenceFactor(reference: string, factor: string): string {
  return calculateBvOperation({ kind: "REFERENCE_FACTOR", reference, factor });
}

describe(GOLDEN_REFERENCE_LABEL, () => {
  it("GT-01 calculates simple geometry exactly", () => {
    expect(calculateBvOperation(goldenBvCases.gt01.operation)).toBe(
      goldenBvCases.gt01.expected,
    );
  });

  it("GT-02 calculates geometry with a thickness coefficient exactly", () => {
    expect(calculateBvOperation(goldenBvCases.gt02.operation)).toBe(
      goldenBvCases.gt02.expected,
    );
  });

  it("GT-03 calculates weighted count then applies the reference factor", () => {
    const count = calculateBvOperation(goldenBvCases.gt03.weightedCount);
    const length = referenceFactor(count, goldenBvCases.gt03.lengthFactor);

    expect(count).toBe(goldenBvCases.gt03.expectedCount);
    expect(length).toBe(goldenBvCases.gt03.expectedLength);
  });

  it("GT-04 calculates controlled rebar children and their sum", () => {
    const fixture = goldenBvCases.gt04;
    const barWeight = referenceFactor(
      referenceFactor(fixture.barWeightConstant, fixture.barDiameter),
      fixture.barDiameter,
    );
    const rebarCount = (span: string, spacing: string) =>
      calculateBvOperation({ kind: "REBAR_ROUNDUP", span, spacing });
    const childMass = (
      length: string,
      count: string,
      repeat: string = "1",
    ) => referenceFactor(referenceFactor(referenceFactor(length, count), barWeight), repeat);

    const standardLength = referenceFactor(fixture.dimensions.length, "1.1");
    const stirrupLength = calculateBvOperation({
      kind: "SEGMENT_SUM_FACTOR",
      segments: ["0.56", "0.56", "0.05"],
      factor: "2",
    });
    const perimeter = calculateBvOperation({
      kind: "SEGMENT_SUM_FACTOR",
      segments: [fixture.dimensions.length, fixture.dimensions.width],
      factor: "2",
    });
    const children = [
      childMass(
        referenceFactor(fixture.dimensions.length, "1.05"),
        rebarCount(fixture.dimensions.width, "0.4"),
        fixture.repeat,
      ),
      childMass(
        standardLength,
        rebarCount(fixture.dimensions.length, "0.4"),
        fixture.repeat,
      ),
      childMass(
        standardLength,
        rebarCount(fixture.dimensions.width, "0.25"),
        fixture.repeat,
      ),
      childMass(
        standardLength,
        rebarCount(fixture.dimensions.length, "0.25"),
        fixture.repeat,
      ),
      childMass(
        stirrupLength,
        rebarCount(fixture.dimensions.height, "0.15"),
        fixture.repeat,
      ),
      childMass(stirrupLength, rebarCount(perimeter, fixture.dimensions.height)),
    ];
    const total = calculateBvOperation({ kind: "SUM_CHILDREN", children });
    const concrete = calculateBvOperation({
      kind: "GEOMETRY_PRODUCT",
      factors: [
        fixture.dimensions.length,
        fixture.dimensions.width,
        fixture.dimensions.height,
        fixture.repeat,
      ],
    });
    const formwork = calculateBvOperation({
      kind: "GEOMETRY_PRODUCT",
      factors: ["2.4", fixture.dimensions.height, fixture.repeat],
    });

    expect(children).toEqual([...fixture.expectedChildren]);
    expect(total).toBe(fixture.expectedRebarMass);
    expect(concrete).toBe(fixture.expectedConcreteVolume);
    expect(formwork).toBe(fixture.expectedFormworkArea);
  });

  it("GT-05 retains the periodic PVC length within the canonical tolerance", () => {
    const actual = calculateBvOperation(goldenBvCases.gt05.operation);

    expect(
      decimalEqualsWithinTolerance(
        actual,
        goldenBvCases.gt05.expectedDecimal,
        goldenBvCases.gt05.tolerance,
      ),
    ).toBe(true);
  });

  it("GT-06 calculates labor, material, equipment, OH/profit, and official HSP", () => {
    const fixture = goldenAhspCases.gt06;
    const result = calculateOfficialHsp({
      ohProfitRate: fixture.ohProfitRate,
      components: fixture.components.map(([group, coefficient, priceValue, unit], index) => ({
        componentId: `${fixture.caseId}-${index + 1}`,
        group,
        coefficient,
        resourceUnitRaw: unit,
        resolutionState: "RESOLVED",
        basePrice: {
          priceValue,
          priceState: "SET",
          priceUnitRaw: unit,
          zeroIntent: null,
        },
      })),
    });

    expect(result.componentCosts[0]?.componentCost).toBe("176000");
    expect(result.laborSubtotal).toBe(fixture.expectedLabor);
    expect(
      decimalEqualsWithinTolerance(
        result.materialSubtotal,
        fixture.expectedMaterial,
        fixture.tolerance,
      ),
    ).toBe(true);
    expect(result.equipmentSubtotal).toBe(fixture.expectedEquipment);
    expect(
      decimalEqualsWithinTolerance(
        result.directCost,
        fixture.expectedDirectCost,
        fixture.tolerance,
      ),
    ).toBe(true);
    expect(
      decimalEqualsWithinTolerance(
        result.ohProfitValue,
        fixture.expectedOhProfit,
        fixture.tolerance,
      ),
    ).toBe(true);
    expect(
      decimalEqualsWithinTolerance(result.hspValue, fixture.expectedHsp, fixture.tolerance),
    ).toBe(true);
  });

  it("GT-07 preserves precise HSP instead of the legacy rounded header", () => {
    const fixture = goldenAhspCases.gt07;
    const result = calculateOfficialHsp({
      ohProfitRate: fixture.ohProfitRate,
      components: fixture.components.map(([group, coefficient, priceValue, unit], index) => ({
        componentId: `${fixture.caseId}-${index + 1}`,
        group,
        coefficient,
        resourceUnitRaw: unit,
        resolutionState: "RESOLVED",
        basePrice: {
          priceValue,
          priceState: "SET",
          priceUnitRaw: unit,
          zeroIntent: null,
        },
      })),
    });

    expect(result.hspValue).toBe(fixture.expectedHsp);
    expect(result.hspValue).not.toBe(fixture.legacyRoundedHeader);
  });

  it("GT-08 calculates the explicit Pile Cap P1 subgroup subtotal", () => {
    const fixture = goldenRabCases.gt08;
    const items = fixture.items.map((item) =>
      calculateRabItem({
        itemId: item.itemId,
        volume: item.volume,
        hspValue: item.hsp,
      }),
    );

    expect(
      decimalEqualsWithinTolerance(
        calculateSubgroupSubtotal(items),
        fixture.expected,
        fixture.tolerance,
      ),
    ).toBe(true);
  });

  it("GT-09 calculates the mini-project through one final half-up rounding", () => {
    const fixture = goldenRabCases.gt09;
    const volume = calculateBvOperation({
      kind: "SUM_CHILDREN",
      children: [...fixture.childVolumes],
    });
    const item = calculateRabItem({
      itemId: fixture.caseId,
      volume,
      hspValue: fixture.hsp,
    });
    const totals = calculateProjectTotals({
      groupSubtotals: [item.itemValue],
      ppnRate: fixture.ppnRate,
    });

    expect(volume).toBe(fixture.expectedVolume);
    expect(item.itemValue).toBe(fixture.expectedItemValue);
    expect(totals.ppnValue).toBe(fixture.expectedPpn);
    expect(totals.totalBeforeRounding).toBe(fixture.expectedBeforeRounding);
    expect(totals.totalFinal).toBe(fixture.expectedFinal);
    expect(totals.roundingDifference).toBe(fixture.expectedRoundingDifference);
  });

  it("GT-10 aggregates the source-backed group subtotals, PPN, and final total", () => {
    const fixture = goldenRabCases.gt10;
    const result = calculateProjectTotals({
      groupSubtotals: [...fixture.groupSubtotals],
      ppnRate: fixture.ppnRate,
    });

    expect(
      decimalEqualsWithinTolerance(
        result.subtotalRab,
        fixture.expectedSubtotal,
        fixture.tolerance,
      ),
    ).toBe(true);
    expect(
      decimalEqualsWithinTolerance(
        result.ppnValue,
        fixture.expectedPpn,
        fixture.tolerance,
      ),
    ).toBe(true);
    expect(
      decimalEqualsWithinTolerance(
        result.totalBeforeRounding,
        fixture.expectedBeforeRounding,
        fixture.tolerance,
      ),
    ).toBe(true);
    expect(result.totalFinal).toBe(fixture.expectedFinal);
  });

  it("GT-11 implements less-than, equal-to, and greater-than Rp500 half-up boundaries", () => {
    for (const [input, expected] of goldenRabCases.gt11.boundaries) {
      expect(roundHalfUpToThousands(input)).toBe(expected);
    }
  });

  it("GT-12 blocks direct volume without traceability while preserving its numeric check", () => {
    const fixture = goldenRabCases.gt12;
    const item = calculateRabItem({
      itemId: fixture.itemId,
      volume: fixture.volume,
      hspValue: fixture.hsp,
    });
    const validation = validateRabForReview({
      ohProfitRate: "0.10",
      ppnRate: "0.11",
      items: [
        {
          itemId: fixture.itemId,
          description: fixture.description,
          volume: fixture.volume,
          volumeUnitRaw: fixture.unit,
          volumeSource: {
            kind: "DIRECT",
            quantityKind: "SIMPLE",
            basis: null,
            source: null,
            note: null,
            reviewerId: null,
          },
          hsp: {
            kind: "OFFICIAL_AHSP",
            unitRaw: fixture.unit,
            hspValue: fixture.hsp,
            components: [],
          },
        },
      ],
    });

    expect(item.itemValue).toBe(fixture.expectedNumeric);
    expect(validation.reviewBlocked).toBe(true);
    expect(validation.issues.map((issue) => issue.code)).toContain(
      fixture.expectedValidationCode,
    );
  });
});
