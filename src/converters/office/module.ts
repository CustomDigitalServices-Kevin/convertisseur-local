// Office converter module (T5): XLSX <-> CSV/JSON/HTML/PDF, CSV -> XLSX,
// DOCX -> PDF. Registered in ../../workers/module-loaders.ts under "office".
import type { ConverterModule } from "../../core/converter-module";
import type { ConversionOutputFile, ConversionRequest, Fidelity } from "../../core/types";
import { ConversionError } from "../../core/types";
import { xlsxToCsvFiles, xlsxToJsonFiles, xlsxToHtmlFiles } from "./xlsx-to-tabular";
import { csvToXlsxFiles } from "./csv-to-xlsx";
import { xlsxToPdfFile } from "./xlsx-to-pdf";
import { docxToPdfFile } from "./docx-to-pdf";

interface ConvertResult {
  files: ConversionOutputFile[];
  fidelity: Fidelity;
}

async function dispatch(
  request: ConversionRequest,
  reportProgress: (percent: number) => void,
): Promise<ConvertResult> {
  const { sourceFormat, targetFormat, data, fileName } = request;

  if (sourceFormat === "xlsx" && targetFormat === "csv") {
    return { files: await xlsxToCsvFiles(data, fileName), fidelity: "high" };
  }
  if (sourceFormat === "xlsx" && targetFormat === "json") {
    return { files: await xlsxToJsonFiles(data, fileName), fidelity: "high" };
  }
  if (sourceFormat === "xlsx" && targetFormat === "html") {
    return { files: await xlsxToHtmlFiles(data, fileName), fidelity: "high" };
  }
  if (sourceFormat === "xlsx" && targetFormat === "pdf") {
    const file = await xlsxToPdfFile(data, fileName, reportProgress);
    return { files: [file], fidelity: "medium" };
  }
  if (sourceFormat === "csv" && targetFormat === "xlsx") {
    return { files: await csvToXlsxFiles(data, fileName), fidelity: "high" };
  }
  if (sourceFormat === "docx" && targetFormat === "pdf") {
    const file = await docxToPdfFile(data, fileName, reportProgress);
    return { files: [file], fidelity: "preview" };
  }

  throw new ConversionError(
    "unsupported-conversion",
    `Office module cannot convert ${sourceFormat} to ${targetFormat}`,
  );
}

export const officeModule: ConverterModule = {
  async convert(request, reportProgress) {
    const result = await dispatch(request, reportProgress);
    reportProgress(100);
    return result;
  },
};
