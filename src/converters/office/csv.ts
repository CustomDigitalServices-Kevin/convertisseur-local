// CSV encode/decode: RFC 4180 quoting plus CSV formula-injection hardening.
//
// OWASP CSV Injection (https://owasp.org/www-community/attacks/CSV_Injection):
// a cell whose text starts with =, +, -, @, tab (0x09), CR (0x0D) or LF
// (0x0A) is interpreted as a formula by Excel/Sheets/LibreOffice when the
// CSV is reopened. The fix is to prefix such a cell with a single quote
// BEFORE RFC 4180 quoting is applied, so the apostrophe survives as literal
// content inside the quoted field rather than sitting outside it.

export type CsvDelimiter = "," | ";";

const FORMULA_TRIGGER = /^[=+\-@\t\r\n]/;

function neutralizeFormula(value: string): string {
  return FORMULA_TRIGGER.test(value) ? `'${value}` : value;
}

function needsQuoting(value: string, delimiter: CsvDelimiter): boolean {
  return (
    value.includes(delimiter) || value.includes('"') || value.includes("\n") || value.includes("\r")
  );
}

/** Formats a single cell: neutralize formula triggers, then RFC 4180 quote. */
export function formatCsvCell(rawValue: string, delimiter: CsvDelimiter = ","): string {
  const neutralized = neutralizeFormula(rawValue);
  if (!needsQuoting(neutralized, delimiter)) return neutralized;
  return `"${neutralized.replaceAll('"', '""')}"`;
}

export function stringifyCsvRow(cells: readonly string[], delimiter: CsvDelimiter = ","): string {
  return cells.map((cell) => formatCsvCell(cell, delimiter)).join(delimiter);
}

/** Joins rows with CRLF line endings, the RFC 4180 default. */
export function stringifyCsv(rows: readonly (readonly string[])[], delimiter: CsvDelimiter = ","): string {
  if (rows.length === 0) return "";
  return rows.map((row) => stringifyCsvRow(row, delimiter)).join("\r\n") + "\r\n";
}

/**
 * Detects comma vs semicolon by counting occurrences outside quoted spans on
 * the first line. Covers the two locales this app targets; anything more
 * elaborate (sniffing multiple lines, tab/pipe delimiters) is out of scope.
 */
export function detectDelimiter(text: string): CsvDelimiter {
  const newlineIndex = text.search(/\r\n|\r|\n/);
  const firstLine = newlineIndex === -1 ? text : text.slice(0, newlineIndex);
  let commaCount = 0;
  let semicolonCount = 0;
  let inQuotes = false;
  for (const char of firstLine) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (!inQuotes && char === ",") {
      commaCount += 1;
    } else if (!inQuotes && char === ";") {
      semicolonCount += 1;
    }
  }
  return semicolonCount > commaCount ? ";" : ",";
}

export interface ParsedCsv {
  rows: string[][];
  delimiter: CsvDelimiter;
}

/** RFC 4180 parser: handles quoted fields containing the delimiter, quotes
 * (escaped by doubling) and embedded newlines, plus CRLF/LF/CR line endings. */
export function parseCsv(text: string): ParsedCsv {
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let index = 0;

  const pushField = (): void => {
    row.push(field);
    field = "";
  };
  const pushRow = (): void => {
    pushField();
    rows.push(row);
    row = [];
  };

  while (index < text.length) {
    const char = text[index];
    if (char === undefined) break; // unreachable: guarded by the loop condition
    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 2;
          continue;
        }
        inQuotes = false;
        index += 1;
        continue;
      }
      field += char;
      index += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      index += 1;
      continue;
    }
    if (char === delimiter) {
      pushField();
      index += 1;
      continue;
    }
    if (char === "\r") {
      if (text[index + 1] === "\n") index += 1;
      pushRow();
      index += 1;
      continue;
    }
    if (char === "\n") {
      pushRow();
      index += 1;
      continue;
    }
    field += char;
    index += 1;
  }
  if (field.length > 0 || row.length > 0) pushRow();

  return { rows, delimiter };
}
