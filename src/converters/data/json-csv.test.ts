import { describe, expect, it } from "vitest";
import { csvToJson, jsonToCsv } from "./json-csv";
import { expectConversionErrorCode } from "./test-helpers";

describe("jsonToCsv", () => {
  it("builds a header row plus one row per object", () => {
    const json = JSON.stringify([
      { name: "Alice", age: 30 },
      { name: "Bob", age: 25 },
    ]);
    expect(jsonToCsv(json)).toBe("name,age\r\nAlice,30\r\nBob,25\r\n");
  });

  it("neutralizes a formula-trigger cell via the shared CSV guard", () => {
    const json = JSON.stringify([{ formula: "=SUM(A1)" }]);
    expect(jsonToCsv(json)).toBe("formula\r\n'=SUM(A1)\r\n");
  });

  it("renders null as an empty cell", () => {
    const json = JSON.stringify([{ note: null }]);
    expect(jsonToCsv(json)).toBe("note\r\n\r\n");
  });

  it("throws unsupported-conversion for a non-array top-level value", () => {
    expectConversionErrorCode(() => jsonToCsv(JSON.stringify({ a: 1 })), "unsupported-conversion");
  });

  it("throws unsupported-conversion for a nested object value, with an explicit detail", () => {
    let caught: unknown;
    try {
      jsonToCsv(JSON.stringify([{ a: { b: 1 } }]));
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toContain("nested");
  });

  it("throws corrupted-file for malformed JSON", () => {
    expectConversionErrorCode(() => jsonToCsv("[not json"), "corrupted-file");
  });
});

describe("csvToJson", () => {
  it("parses a comma-delimited CSV into an array of objects", () => {
    const csv = "name,age\r\nAlice,30\r\nBob,25\r\n";
    expect(JSON.parse(csvToJson(csv))).toEqual([
      { name: "Alice", age: "30" },
      { name: "Bob", age: "25" },
    ]);
  });

  it("auto-detects a semicolon delimiter", () => {
    const csv = "name;age\r\nAlice;30\r\n";
    expect(JSON.parse(csvToJson(csv))).toEqual([{ name: "Alice", age: "30" }]);
  });

  it("handles a quoted cell containing the delimiter", () => {
    const csv = 'name,note\r\nAlice,"hello, world"\r\n';
    expect(JSON.parse(csvToJson(csv))).toEqual([{ name: "Alice", note: "hello, world" }]);
  });

  it("returns an empty array for a header-only CSV", () => {
    expect(JSON.parse(csvToJson("name,age\r\n"))).toEqual([]);
  });
});

describe("json-csv round trip", () => {
  it("csvToJson(jsonToCsv(x)) reproduces the original flat rows", () => {
    const original = [
      { name: "Alice", age: "30" },
      { name: "Bob", age: "25" },
    ];
    const roundTripped: unknown = JSON.parse(csvToJson(jsonToCsv(JSON.stringify(original))));
    expect(roundTripped).toEqual(original);
  });
});
