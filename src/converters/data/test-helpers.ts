// Test-only helper shared by this directory's *-json.test.ts / json-csv.test.ts
// files. A plain `expect(() => fn()).toThrow(expect.objectContaining({code}))`
// would work too, but `expect.objectContaining`'s return type is untyped
// (vitest types it loosely), which trips `@typescript-eslint/no-unsafe-argument`
// under this project's strictTypeChecked ESLint config. Catching manually
// keeps every assertion fully typed.
import { expect } from "vitest";
import { ConversionError } from "../../core/types";
import type { ConversionErrorCode } from "../../core/types";

export function expectConversionErrorCode(fn: () => unknown, code: ConversionErrorCode): void {
  let caught: unknown;
  try {
    fn();
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(ConversionError);
  expect((caught as ConversionError).code).toBe(code);
}
