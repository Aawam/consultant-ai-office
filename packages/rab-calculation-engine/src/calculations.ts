import {
  addExact,
  createExactDecimal,
  divideExact,
  floorExact,
  multiplyExact,
  requireNonNegative,
  subtractExact,
  sumExact,
  toCanonicalDecimal,
} from "./decimal";
import {
  RabCalculationError,
  type AhspComponentInput,
  type CalculatedRabItem,
  type ComponentCostResult,
  type GroupSubtotalInput,
  type HspCalculationInput,
  type HspCalculationResult,
  type OfficialHspInput,
  type ProjectTotalsInput,
  type ProjectTotalsResult,
  type RabItemCalculationInput,
} from "./types";
import { normalizeSafeUnit, unitsAreCompatible } from "./units";

function requireOfficialRate(rateInput: OfficialHspInput["ohProfitRate"]) {
  const rate = requireNonNegative(rateInput, "INVALID_OH_PROFIT_RATE");
  if (rate.lessThan("0.10") || rate.greaterThan("0.15")) {
    throw new RabCalculationError(
      "INVALID_OH_PROFIT_RATE",
      "Project OH/profit rate must be between 10% and 15%",
    );
  }
  return rate;
}

function requireResolvedComponent(component: AhspComponentInput): void {
  if (component.resolutionState !== "RESOLVED") {
    throw new RabCalculationError(
      component.resolutionState === "AMBIGUOUS"
        ? "COMPONENT_AMBIGUOUS"
        : "COMPONENT_UNRESOLVED",
      `Component ${component.componentId} is not resolved`,
    );
  }
}

function requireUsableBasePrice(component: AhspComponentInput) {
  const { basePrice } = component;
  if (basePrice.priceState === "MISSING") {
    const code =
      basePrice.priceValue !== null && createExactDecimal(basePrice.priceValue).isZero()
        ? "UNRESOLVED_ZERO_BASE_PRICE"
        : "MISSING_BASE_PRICE";
    throw new RabCalculationError(code, `Component ${component.componentId} has no usable price`);
  }

  if (basePrice.priceValue === null) {
    throw new RabCalculationError(
      "MISSING_BASE_PRICE",
      `Component ${component.componentId} has no price value`,
    );
  }

  const price = requireNonNegative(basePrice.priceValue, "INVALID_BASE_PRICE");
  if (basePrice.priceState === "SET" && price.isZero()) {
    throw new RabCalculationError(
      "UNRESOLVED_ZERO_BASE_PRICE",
      `Component ${component.componentId} has an unconfirmed zero price`,
    );
  }
  if (
    basePrice.priceState === "ZERO_CONFIRMED" &&
    (!price.isZero() || basePrice.zeroIntent?.trim().length === 0 || basePrice.zeroIntent === null)
  ) {
    throw new RabCalculationError(
      "INVALID_ZERO_CONFIRMED",
      `Component ${component.componentId} has invalid ZERO_CONFIRMED state`,
    );
  }
  return price;
}

export function calculateComponentCost(
  component: AhspComponentInput,
): ComponentCostResult {
  requireResolvedComponent(component);
  const resourceUnit = normalizeSafeUnit(component.resourceUnitRaw);
  const priceUnit = normalizeSafeUnit(component.basePrice.priceUnitRaw);
  if (resourceUnit.kind !== "CANONICAL" || priceUnit.kind !== "CANONICAL") {
    throw new RabCalculationError(
      "UNIT_REVIEW_REQUIRED",
      `Component ${component.componentId} contains a unit requiring review`,
    );
  }
  if (!unitsAreCompatible(component.resourceUnitRaw, component.basePrice.priceUnitRaw)) {
    throw new RabCalculationError(
      "COMPONENT_PRICE_UNIT_INCOMPATIBLE",
      `Component ${component.componentId} unit is incompatible with its price unit`,
    );
  }

  const coefficient = requireNonNegative(component.coefficient, "INVALID_COEFFICIENT");
  const price = requireUsableBasePrice(component);
  return {
    componentId: component.componentId,
    group: component.group,
    componentCost: toCanonicalDecimal(multiplyExact(coefficient, price)),
  };
}

export function calculateOfficialHsp(input: OfficialHspInput): HspCalculationResult {
  if (input.components.length === 0) {
    throw new RabCalculationError(
      "EMPTY_AHSP_COMPONENTS",
      "Official AHSP requires at least one component",
    );
  }

  const ohProfitRate = requireOfficialRate(input.ohProfitRate);
  const componentCosts = input.components.map(calculateComponentCost);
  const subtotalFor = (group: AhspComponentInput["group"]) =>
    sumExact(
      componentCosts
        .filter((component) => component.group === group)
        .map((component) => createExactDecimal(component.componentCost)),
    );
  const labor = subtotalFor("TENAGA");
  const material = subtotalFor("BAHAN");
  const equipment = subtotalFor("ALAT");
  const directCost = sumExact([labor, material, equipment]);
  const ohProfitValue = multiplyExact(directCost, ohProfitRate);
  const hspValue = addExact(directCost, ohProfitValue);

  return {
    kind: "OFFICIAL_AHSP",
    componentCosts,
    laborSubtotal: toCanonicalDecimal(labor),
    materialSubtotal: toCanonicalDecimal(material),
    equipmentSubtotal: toCanonicalDecimal(equipment),
    directCost: toCanonicalDecimal(directCost),
    ohProfitValue: toCanonicalDecimal(ohProfitValue),
    hspValue: toCanonicalDecimal(hspValue),
  };
}

export function calculateHsp(input: HspCalculationInput): HspCalculationResult {
  if (input.kind === "OFFICIAL_AHSP") {
    return calculateOfficialHsp(input);
  }

  createExactDecimal(input.projectOhProfitRate);
  const manualHsp = requireNonNegative(input.manualHsp, "INVALID_MANUAL_HSP");
  return {
    kind: "MANUAL_NON_AHSP",
    componentCosts: [],
    laborSubtotal: "0",
    materialSubtotal: "0",
    equipmentSubtotal: "0",
    directCost: "0",
    ohProfitValue: "0",
    hspValue: toCanonicalDecimal(manualHsp),
  };
}

export function calculateRabItem(input: RabItemCalculationInput): CalculatedRabItem {
  const volume = requireNonNegative(input.volume, "INVALID_VOLUME");
  const hspValue = requireNonNegative(input.hspValue, "INVALID_HSP");
  return {
    itemId: input.itemId,
    volume: toCanonicalDecimal(volume),
    hspValue: toCanonicalDecimal(hspValue),
    itemValue: toCanonicalDecimal(multiplyExact(volume, hspValue)),
  };
}

export function calculateSubgroupSubtotal(
  items: readonly CalculatedRabItem[],
): string {
  return toCanonicalDecimal(
    sumExact(items.map((item) => requireNonNegative(item.itemValue, "INVALID_ITEM_VALUE"))),
  );
}

export function calculateGroupSubtotal(input: GroupSubtotalInput): string {
  const directSubtotal = calculateSubgroupSubtotal(input.directItems);
  const subgroupSubtotal = sumExact(
    input.subgroupSubtotals.map((subtotal) =>
      requireNonNegative(subtotal, "INVALID_SUBGROUP_SUBTOTAL"),
    ),
  );
  return toCanonicalDecimal(addExact(createExactDecimal(directSubtotal), subgroupSubtotal));
}

export function roundHalfUpToThousands(totalInput: ProjectTotalsResult["totalBeforeRounding"]): string {
  const total = requireNonNegative(totalInput, "INVALID_TOTAL");
  const rounded = multiplyExact(
    floorExact(
      divideExact(addExact(total, createExactDecimal("500")), createExactDecimal("1000")),
    ),
    createExactDecimal("1000"),
  );
  return toCanonicalDecimal(rounded);
}

export function calculateProjectTotals(input: ProjectTotalsInput): ProjectTotalsResult {
  const ppnRate = requireNonNegative(input.ppnRate, "INVALID_PPN_RATE");
  const subtotalRab = sumExact(
    input.groupSubtotals.map((subtotal) =>
      requireNonNegative(subtotal, "INVALID_GROUP_SUBTOTAL"),
    ),
  );
  const ppnValue = multiplyExact(subtotalRab, ppnRate);
  const totalBeforeRounding = addExact(subtotalRab, ppnValue);
  const totalFinalText = roundHalfUpToThousands(toCanonicalDecimal(totalBeforeRounding));
  const totalFinal = createExactDecimal(totalFinalText);

  return {
    subtotalRab: toCanonicalDecimal(subtotalRab),
    ppnRate: toCanonicalDecimal(ppnRate),
    ppnValue: toCanonicalDecimal(ppnValue),
    totalBeforeRounding: toCanonicalDecimal(totalBeforeRounding),
    totalFinal: totalFinalText,
    roundingDifference: toCanonicalDecimal(subtractExact(totalFinal, totalBeforeRounding)),
  };
}
