import { describe, expect, it } from "vitest";
import { jsonToYaml, yamlToJson } from "./yaml-json";
import { expectConversionErrorCode } from "./test-helpers";

describe("yamlToJson", () => {
  it("converts scalars, preserving native types", () => {
    const yaml = "name: Alice\nage: 42\nactive: true\nnickname: null\n";
    const result = JSON.parse(yamlToJson(yaml)) as Record<string, unknown>;
    expect(result).toEqual({ name: "Alice", age: 42, active: true, nickname: null });
  });

  it("converts nested mappings and sequences", () => {
    const yaml = "user:\n  name: Bob\n  tags:\n    - admin\n    - beta\n";
    const result = JSON.parse(yamlToJson(yaml)) as {
      user: { name: string; tags: string[] };
    };
    expect(result.user.name).toBe("Bob");
    expect(result.user.tags).toEqual(["admin", "beta"]);
  });

  it("throws corrupted-file for malformed YAML", () => {
    const malformed = "a: [1, 2\nb: 3\n"; // unclosed flow sequence
    expectConversionErrorCode(() => yamlToJson(malformed), "corrupted-file");
  });
});

describe("jsonToYaml", () => {
  it("round-trips a flat object back to equivalent YAML", () => {
    const json = JSON.stringify({ name: "Alice", age: 42, active: true });
    const yaml = jsonToYaml(json);
    expect(JSON.parse(yamlToJson(yaml))).toEqual({ name: "Alice", age: 42, active: true });
  });

  it("round-trips an array of objects", () => {
    const json = JSON.stringify([{ id: 1 }, { id: 2 }]);
    const yaml = jsonToYaml(json);
    expect(JSON.parse(yamlToJson(yaml))).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it("throws corrupted-file for malformed JSON input", () => {
    expectConversionErrorCode(() => jsonToYaml("{not valid json"), "corrupted-file");
  });
});
