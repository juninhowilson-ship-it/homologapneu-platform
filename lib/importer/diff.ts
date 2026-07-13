export type FieldChange = { before: unknown; after: unknown };
export type ChangeSet = Record<string, FieldChange>;

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a instanceof Date || b instanceof Date) {
    const aTime = a instanceof Date ? a.getTime() : new Date(a as string).getTime();
    const bTime = b instanceof Date ? b.getTime() : new Date(b as string).getTime();
    return aTime === bTime;
  }
  return a === b;
}

/**
 * Compares the persisted fields of a record against incoming values and
 * returns only the fields that actually changed. Used to decide whether an
 * imported row represents a real update (worth an AuditLog UPDATE entry) or
 * an unchanged duplicate (skipped, counted separately).
 */
export function diffRecords<T extends Record<string, unknown>>(
  before: T,
  after: Partial<T>
): ChangeSet | null {
  const changes: ChangeSet = {};

  for (const key of Object.keys(after) as (keyof T & string)[]) {
    const beforeValue = before[key] ?? null;
    const afterValue = after[key] ?? null;
    if (!valuesEqual(beforeValue, afterValue)) {
      changes[key] = { before: beforeValue, after: afterValue };
    }
  }

  return Object.keys(changes).length > 0 ? changes : null;
}
