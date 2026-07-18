import { parseCsv, stringifyCsv } from "../office/csv";
import { ConversionError } from "../../core/types";

// JSON <-> flat CSV. CSV encoding reuses office/csv.ts's stringifyCsv, which
// already implements RFC 4180 quoting plus the OWASP CSV-injection guard
// (apostrophe prefix applied before quoting -- see that file's header
// comment). That guard is security-sensitive, so this module imports it
// rather than duplicating it, to keep a single source of truth.

/** A JSON value this converter can put in a CSV cell without losing information. */
type FlatCsvValue = string | number | boolean | null;
type FlatCsvRow = Record<string, FlatCsvValue>;

function isFlatCsvValue(value: unknown): value is FlatCsvValue {
  return (
    value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean"
  );
}

function isFlatCsvRow(value: unknown): value is FlatCsvRow {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  return Object.values(value).every(isFlatCsvValue);
}

function cellText(value: FlatCsvValue): string {
  return value === null ? "" : String(value);
}

export function jsonToCsv(text: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new ConversionError("corrupted-file", `JSON parse failed: ${String(error)}`);
  }

  if (!Array.isArray(parsed)) {
    throw new ConversionError(
      "unsupported-conversion",
      "JSON to CSV requires a top-level array of flat objects",
    );
  }
  const items: unknown[] = parsed;

  const rows: FlatCsvRow[] = [];
  for (const item of items) {
    if (!isFlatCsvRow(item)) {
      throw new ConversionError(
        "unsupported-conversion",
        "JSON to CSV only supports flat objects with string/number/boolean/null values; " +
          "nested objects or arrays are not flattened automatically",
      );
    }
    rows.push(item);
  }

  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const table = [columns, ...rows.map((row) => columns.map((col) => cellText(row[col] ?? null)))];
  return stringifyCsv(table);
}

export function csvToJson(text: string): string {
  const { rows } = parseCsv(text);
  const [header, ...dataRows] = rows;
  if (header === undefined) return JSON.stringify([], null, 2);

  const records = dataRows.map((row) => {
    const record: FlatCsvRow = {};
    header.forEach((key, index) => {
      const columnKey = key.length > 0 ? key : `column_${String(index + 1)}`;
      record[columnKey] = row[index] ?? "";
    });
    return record;
  });
  return JSON.stringify(records, null, 2);
}
