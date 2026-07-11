export function normalizeToEnum<T extends string>(
  raw: string,
  values: readonly T[],
  labels: Record<T, string>
): T | null {
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return null;

  const byKey = values.find((value) => value.toLowerCase() === normalized);
  if (byKey) return byKey;

  const byLabel = values.find(
    (value) => labels[value].toLowerCase() === normalized
  );
  return byLabel ?? null;
}

const FALSY_VALUES = ["nao", "não", "false", "0", "inativo", "no"];

export function parseBooleanPtBr(
  raw: string | undefined,
  defaultValue = false
): boolean {
  const normalized = (raw ?? "").trim().toLowerCase();
  if (!normalized) return defaultValue;
  return !FALSY_VALUES.includes(normalized);
}
