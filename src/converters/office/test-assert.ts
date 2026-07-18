// Test-only helper: unwraps a possibly-undefined value (as produced by
// array indexing/destructuring under noUncheckedIndexedAccess) without
// resorting to the banned non-null assertion operator.
export function expectDefined<T>(value: T | undefined, label = "value"): T {
  if (value === undefined) throw new Error(`Expected ${label} to be defined`);
  return value;
}
