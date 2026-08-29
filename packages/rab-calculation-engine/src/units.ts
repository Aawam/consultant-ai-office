export type UnitNormalizationResult =
  | { readonly kind: "CANONICAL"; readonly value: string }
  | { readonly kind: "REVIEW_REQUIRED"; readonly raw: string };

const aliases = new Map<string, string>([
  ["oh", "OH"],
  ["oj", "OJ"],
  ["jam", "jam"],
  ["hari", "hari"],
  ["liter", "liter"],
  ["m", "m"],
  ["m'", "m"],
  ["m’", "m"],
  ["cm", "cm"],
  ["m2", "m2"],
  ["m²", "m2"],
  ["m3", "m3"],
  ["m³", "m3"],
  ["kg", "kg"],
  ["bh", "buah"],
  ["buah", "buah"],
  ["lbr", "lembar"],
  ["lembar", "lembar"],
  ["batang", "batang"],
  ["btg", "batang"],
  ["unit", "unit"],
  ["set", "set"],
  ["ls", "LS"],
  ["psg", "pasang"],
  ["pasang", "pasang"],
  ["unit hari", "unit-hari"],
  ["unit/hari", "unit-hari"],
  ["unit-hari", "unit-hari"],
  ["ha", "Ha"],
  ["tube", "tube"],
  ["zak", "zak"],
  ["ikat", "ikat"],
  ["dus", "dus"],
  ["daun", "daun"],
  ["pohon", "pohon"],
]);

const reviewRequired = new Set(["l", "m1", "buah hari", "buah-hari", "bauh"]);

export function normalizeSafeUnit(raw: string): UnitNormalizationResult {
  const token = raw.trim();
  const lookup = token.toLocaleLowerCase("id-ID");

  if (reviewRequired.has(lookup) || (lookup === "m" && token === "M")) {
    return { kind: "REVIEW_REQUIRED", raw };
  }

  const canonical = aliases.get(lookup);
  return canonical === undefined
    ? { kind: "REVIEW_REQUIRED", raw }
    : { kind: "CANONICAL", value: canonical };
}

export function unitsAreCompatible(left: string, right: string): boolean {
  const normalizedLeft = normalizeSafeUnit(left);
  const normalizedRight = normalizeSafeUnit(right);
  return (
    normalizedLeft.kind === "CANONICAL" &&
    normalizedRight.kind === "CANONICAL" &&
    normalizedLeft.value === normalizedRight.value
  );
}
