import { describe, expect, it } from "vitest";
import { jsonToXml, xmlToJson } from "./xml-json";
import { expectConversionErrorCode } from "./test-helpers";

describe("xmlToJson", () => {
  it("preserves attributes with the @_ prefix and text nodes", () => {
    const xml = '<root id="5"><child active="true">hello</child></root>';
    const result = JSON.parse(xmlToJson(xml)) as {
      root: { child: { "@_active": string; "#text": string }; "@_id": string };
    };
    expect(result.root["@_id"]).toBe("5");
    expect(result.root.child["@_active"]).toBe("true");
    expect(result.root.child["#text"]).toBe("hello");
  });

  it("turns repeated sibling tags into an array", () => {
    const xml = "<root><item>a</item><item>b</item></root>";
    const result = JSON.parse(xmlToJson(xml)) as { root: { item: string[] } };
    expect(result.root.item).toEqual(["a", "b"]);
  });

  it("throws corrupted-file for malformed XML (unclosed tag)", () => {
    expectConversionErrorCode(() => xmlToJson("<root><child></root>"), "corrupted-file");
  });
});

describe("jsonToXml", () => {
  it("round-trips attributes and text through xmlToJson", () => {
    const xml = '<root id="5"><child active="true">hello</child></root>';
    const rebuilt = jsonToXml(xmlToJson(xml));
    const reparsed = JSON.parse(xmlToJson(rebuilt)) as {
      root: { child: { "@_active": string; "#text": string }; "@_id": string };
    };
    expect(reparsed.root["@_id"]).toBe("5");
    expect(reparsed.root.child["@_active"]).toBe("true");
    expect(reparsed.root.child["#text"]).toBe("hello");
  });

  it("throws corrupted-file for malformed JSON input", () => {
    expectConversionErrorCode(() => jsonToXml("{not valid json"), "corrupted-file");
  });
});
