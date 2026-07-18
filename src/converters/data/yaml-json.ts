import { YAMLParseError, parse, stringify } from "yaml";
import { ConversionError } from "../../core/types";

// YAML <-> JSON via the `yaml` package (eemeli/yaml, ISC). `parse`/`stringify`
// both preserve JS's native scalar types (numbers, booleans, null), so no
// extra type coercion is needed on either side of the round trip.

export function yamlToJson(text: string): string {
  let value: unknown;
  try {
    value = parse(text);
  } catch (error) {
    if (error instanceof YAMLParseError) {
      const line = error.linePos?.[0]?.line;
      const location = line === undefined ? "" : ` (line ${String(line)})`;
      throw new ConversionError("corrupted-file", `YAML parse failed: ${error.message}${location}`);
    }
    throw new ConversionError("corrupted-file", `YAML parse failed: ${String(error)}`);
  }
  return JSON.stringify(value, null, 2);
}

export function jsonToYaml(text: string): string {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new ConversionError("corrupted-file", `JSON parse failed: ${String(error)}`);
  }
  return stringify(value);
}
