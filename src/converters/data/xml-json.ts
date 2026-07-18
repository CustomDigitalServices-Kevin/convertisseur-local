import { XMLBuilder, XMLParser, XMLValidator } from "fast-xml-parser";
import { ConversionError } from "../../core/types";

// XML <-> JSON via fast-xml-parser (MIT). `XMLBuilder` and `XMLValidator` are
// both marked deprecated upstream in favor of two now-separate packages
// (fast-xml-builder, fast-xml-validator per node_modules/fast-xml-parser's
// own README "Before using this library" section) -- but both classes are
// still shipped and fully functional in the installed 5.10.1, and pulling in
// either replacement would add a dependency beyond the ones approved for
// this task. Flagged for the team: a future fast-xml-parser major version
// may remove XMLBuilder/XMLValidator outright, which would need re-approval
// to add fast-xml-builder/fast-xml-validator at that point.
//
// ignoreAttributes: false + attributeNamePrefix: "@_" preserves attributes
// on both sides, matching the brief ("attributs préservés avec préfixe @_").
// Array handling is fast-xml-parser's own default: a tag repeated as a
// sibling becomes a JS array, a tag that appears once stays a scalar/object
// -- this is the well-known single-item-vs-array XML/JSON impedance
// mismatch, not something this module can resolve without a schema, so a
// round trip is only guaranteed stable for XML that already used a given
// tag consistently (always-one or always-many) within one document.
const PARSE_OPTIONS = { ignoreAttributes: false, attributeNamePrefix: "@_" };
const BUILD_OPTIONS = {
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  format: true,
  // Without this, XMLBuilder renders any attribute whose value is the
  // literal string "true"/"false" as a valueless HTML5-style boolean
  // attribute (e.g. `<child active>` instead of `<child active="true">`),
  // which XMLValidator then rejects by default on the way back in (verified
  // by xml-json.test.ts's round-trip test failing without this option).
  // Forcing an explicit value keeps output unambiguous for generic XML.
  suppressBooleanAttributes: false,
};

export function xmlToJson(text: string): string {
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- see the file header comment: no unapproved replacement dependency available yet.
  const validation = XMLValidator.validate(text);
  if (validation !== true) {
    throw new ConversionError(
      "corrupted-file",
      `XML parse failed: ${validation.err.msg} (line ${String(validation.err.line)}, col ${String(validation.err.col)})`,
    );
  }

  let value: unknown;
  try {
    value = new XMLParser(PARSE_OPTIONS).parse(text);
  } catch (error) {
    throw new ConversionError("corrupted-file", `XML parse failed: ${String(error)}`);
  }
  return JSON.stringify(value, null, 2);
}

export function jsonToXml(text: string): string {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new ConversionError("corrupted-file", `JSON parse failed: ${String(error)}`);
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- see the file header comment: no unapproved replacement dependency available yet.
    return new XMLBuilder(BUILD_OPTIONS).build(value);
  } catch (error) {
    throw new ConversionError("internal-error", `XML build failed: ${String(error)}`);
  }
}
