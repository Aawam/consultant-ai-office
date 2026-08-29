import { describe, expect, it } from "vitest";

import {
  calculateGroupSubtotal,
  calculateHsp,
  calculateOfficialHsp,
  calculateProjectTotals,
  calculateRabItem,
  calculateSubgroupSubtotal,
  validateRabForReview,
  type AhspComponentInput,
  type RabItemReviewInput,
} from "@consultant-ai-office/rab-calculation-engine";
import {
  CONTRACT_DERIVED_LABEL,
  contractDerivedFixtures,
} from "../../fixtures/contract-derived/rab-ee-contract";

function validateItem(item: RabItemReviewInput) {
  return validateRabForReview({
    ohProfitRate: "0.10",
    ppnRate: "0.11",
    items: [item],
  });
}

function officialItemWithComponent(
  component: AhspComponentInput,
): RabItemReviewInput {
  return {
    itemId: `item-${component.componentId}`,
    description: "Contract-derived official item",
    volume: "1",
    volumeUnitRaw: "unit",
    volumeSource: {
      kind: "BACKUP_VOLUME",
      bvReferenceId: `bv-${component.componentId}`,
    },
    hsp: {
      kind: "OFFICIAL_AHSP",
      unitRaw: "unit",
      hspValue: "1",
      components: [component],
    },
  };
}

describe(CONTRACT_DERIVED_LABEL, () => {
  it("accepts traceable direct volume with a non-blocking warning", () => {
    const result = validateItem(contractDerivedFixtures.validDirectVolume);

    expect(result.reviewBlocked).toBe(false);
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: "DIRECT_VOLUME_REVIEW_REQUIRED",
        severity: "WARNING",
      }),
    ]);
  });

  it("uses MANUAL/NON-AHSP HSP as final without adding project OH/profit", () => {
    const fixture = contractDerivedFixtures.validManualHsp;
    const hsp = calculateHsp({
      kind: "MANUAL_NON_AHSP",
      manualHsp: fixture.hsp.manualHsp,
      projectOhProfitRate: "0.15",
    });
    const item = calculateRabItem({
      itemId: fixture.itemId,
      volume: fixture.volume,
      hspValue: hsp.hspValue,
    });
    const validation = validateItem(fixture);

    expect(hsp).toMatchObject({
      directCost: "0",
      ohProfitValue: "0",
      hspValue: "800000",
    });
    expect(item.itemValue).toBe("2000000");
    expect(validation.reviewBlocked).toBe(false);
    expect(validation.issues).toEqual([
      expect.objectContaining({ code: "MANUAL_HSP_REVIEW_REQUIRED", severity: "WARNING" }),
    ]);
  });

  it("accepts explicit ZERO_CONFIRMED as zero cost with a warning", () => {
    const component = contractDerivedFixtures.zeroConfirmed;
    const hsp = calculateOfficialHsp({
      ohProfitRate: "0.10",
      components: [component],
    });
    const validation = validateItem(officialItemWithComponent(component));

    expect(hsp.materialSubtotal).toBe("0");
    expect(hsp.hspValue).toBe("0");
    expect(validation.reviewBlocked).toBe(false);
    expect(validation.issues).toEqual([
      expect.objectContaining({ code: "ZERO_BASE_PRICE_CONFIRMED", severity: "WARNING" }),
    ]);
  });

  it("enforces D-023 zero volume as an ERROR before REVIEW", () => {
    const result = validateItem(contractDerivedFixtures.zeroVolume);

    expect(result.reviewBlocked).toBe(true);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "ZERO_VOLUME", severity: "ERROR" }),
    );
  });

  it("enforces D-024 zero manual HSP as an ERROR before REVIEW", () => {
    const result = validateItem(contractDerivedFixtures.zeroManualHsp);

    expect(result.reviewBlocked).toBe(true);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "ZERO_MANUAL_HSP", severity: "ERROR" }),
    );
  });

  it("blocks a required component with a missing base price", () => {
    const component = contractDerivedFixtures.missingBasePrice;
    const result = validateItem(officialItemWithComponent(component));

    expect(result.reviewBlocked).toBe(true);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "MISSING_BASE_PRICE", severity: "ERROR" }),
    );
  });

  it("does not silently promote a literal unresolved zero", () => {
    const component = contractDerivedFixtures.unresolvedZero;
    const result = validateItem(officialItemWithComponent(component));

    expect(result.reviewBlocked).toBe(true);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "UNRESOLVED_ZERO_BASE_PRICE",
        severity: "ERROR",
      }),
    );
  });

  it("blocks incompatible component and base-price units", () => {
    const component = contractDerivedFixtures.incompatibleUnit;
    const result = validateItem(officialItemWithComponent(component));

    expect(result.reviewBlocked).toBe(true);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "COMPONENT_PRICE_UNIT_INCOMPATIBLE",
        severity: "ERROR",
      }),
    );
  });

  it("blocks incompatible RAB volume and HSP units", () => {
    const result = validateItem({
      ...contractDerivedFixtures.validDirectVolume,
      volumeUnitRaw: "m2",
      hsp: {
        ...contractDerivedFixtures.validDirectVolume.hsp,
        unitRaw: "m3",
      },
    });

    expect(result.reviewBlocked).toBe(true);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "ITEM_UNIT_INCOMPATIBLE", severity: "ERROR" }),
    );
  });

  it("blocks REVIEW_REQUIRED unit tokens instead of coercing them", () => {
    const result = validateItem({
      ...contractDerivedFixtures.validDirectVolume,
      volumeUnitRaw: "M1",
      hsp: {
        ...contractDerivedFixtures.validDirectVolume.hsp,
        unitRaw: "m",
      },
    });

    expect(result.reviewBlocked).toBe(true);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "UNIT_REVIEW_REQUIRED", severity: "ERROR" }),
    );
  });

  it("blocks ambiguous component resolution without best-guess selection", () => {
    const component = contractDerivedFixtures.ambiguousComponent;
    const result = validateItem(officialItemWithComponent(component));

    expect(result.reviewBlocked).toBe(true);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "COMPONENT_AMBIGUOUS", severity: "ERROR" }),
    );
  });

  it("adds direct items and subgroup subtotals exactly once in a group", () => {
    const direct = calculateRabItem({ itemId: "direct", volume: "2", hspValue: "100" });
    const subgroupItems = [
      calculateRabItem({ itemId: "child-1", volume: "3", hspValue: "50" }),
      calculateRabItem({ itemId: "child-2", volume: "1.5", hspValue: "200" }),
    ];
    const subgroup = calculateSubgroupSubtotal(subgroupItems);

    expect(subgroup).toBe("450");
    expect(
      calculateGroupSubtotal({
        directItems: [direct],
        subgroupSubtotals: [subgroup],
      }),
    ).toBe("650");
  });

  it("produces byte-identical output across repeated valid executions", () => {
    const calculate = () => {
      const hsp = calculateHsp({
        kind: "MANUAL_NON_AHSP",
        manualHsp: contractDerivedFixtures.validManualHsp.hsp.manualHsp,
        projectOhProfitRate: "0.15",
      });
      const item = calculateRabItem({
        itemId: contractDerivedFixtures.validManualHsp.itemId,
        volume: contractDerivedFixtures.validManualHsp.volume,
        hspValue: hsp.hspValue,
      });

      return JSON.stringify({
        hsp,
        item,
        totals: calculateProjectTotals({
          groupSubtotals: [item.itemValue],
          ppnRate: "0.11",
        }),
      });
    };
    const expected = calculate();

    for (let execution = 0; execution < 100; execution += 1) {
      expect(calculate()).toBe(expected);
    }
  });
});
