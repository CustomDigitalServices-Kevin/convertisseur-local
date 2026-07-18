// Data converter module (T11): YAML<->JSON, XML<->JSON, JSON<->CSV.
// Registered in ../../workers/module-loaders.ts under "data".
import type { ConverterModule } from "../../core/converter-module";
import type { ConversionOutputFile, ConversionRequest } from "../../core/types";
import { ConversionError } from "../../core/types";
import { toArrayBuffer } from "../shared/binary";
import { csvToJson, jsonToCsv } from "./json-csv";
import { jsonToXml, xmlToJson } from "./xml-json";
import { jsonToYaml, yamlToJson } from "./yaml-json";

const MIME_TYPES = {
  yaml: "application/yaml",
  json: "application/json",
  xml: "application/xml",
  csv: "text/csv",
} as const;

type DataExtension = keyof typeof MIME_TYPES;

// File.name never contains a path separator in this app (same reasoning as
// image/mime.ts's withExtension), so stripping from the last dot is enough.
function withExtension(fileName: string, extension: DataExtension): string {
  const lastDot = fileName.lastIndexOf(".");
  const base = lastDot === -1 ? fileName : fileName.slice(0, lastDot);
  return `${base}.${extension}`;
}

function textFile(fileName: string, extension: DataExtension, content: string): ConversionOutputFile {
  return {
    name: withExtension(fileName, extension),
    mimeType: MIME_TYPES[extension],
    data: toArrayBuffer(new TextEncoder().encode(content)),
  };
}

function dispatch(request: ConversionRequest): ConversionOutputFile[] {
  const { sourceFormat, targetFormat, data, fileName } = request;
  const text = new TextDecoder("utf-8").decode(data);

  if (sourceFormat === "yaml" && targetFormat === "json") {
    return [textFile(fileName, "json", yamlToJson(text))];
  }
  if (sourceFormat === "json" && targetFormat === "yaml") {
    return [textFile(fileName, "yaml", jsonToYaml(text))];
  }
  if (sourceFormat === "xml" && targetFormat === "json") {
    return [textFile(fileName, "json", xmlToJson(text))];
  }
  if (sourceFormat === "json" && targetFormat === "xml") {
    return [textFile(fileName, "xml", jsonToXml(text))];
  }
  if (sourceFormat === "json" && targetFormat === "csv") {
    return [textFile(fileName, "csv", jsonToCsv(text))];
  }
  if (sourceFormat === "csv" && targetFormat === "json") {
    return [textFile(fileName, "json", csvToJson(text))];
  }

  throw new ConversionError(
    "unsupported-conversion",
    `Data module cannot convert ${sourceFormat} to ${targetFormat}`,
  );
}

export const dataModule: ConverterModule = {
  // Every operation this module performs (YAML/XML/CSV/JSON parsing and
  // serialization) is synchronous, so convert() has no await -- it still
  // returns a Promise to satisfy the ConverterModule contract shared with
  // async modules (pdf, office). dispatch() throws synchronously on any
  // expected failure (ConversionError) rather than rejecting, so it is
  // wrapped here to keep that a real promise rejection for every caller,
  // not just ones that happen to await it inside their own try/catch.
  convert(request, reportProgress) {
    reportProgress(20);
    try {
      const files = dispatch(request);
      reportProgress(100);
      return Promise.resolve({ files, fidelity: "high" });
    } catch (error) {
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
  },
};
